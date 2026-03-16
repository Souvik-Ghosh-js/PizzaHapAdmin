import { useEffect, useState } from 'react';
import { getProducts, placeInhouseOrder } from '../services/api';
import { Field, SearchInput, Spinner, PageHeader, SectionCard, Toggle } from '../components/UI';
import { fmt } from '../utils';
import { useToast } from '../context';

export default function InHouse() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loadingP, setLP]       = useState(true);
  const [cart, setCart]         = useState([]);
  const [search, setSearch]     = useState('');
  const [payMethod, setPayMethod] = useState('cash_on_delivery');
  const [userId, setUserId]     = useState('');
  const [placing, setPlacing]   = useState(false);
  const [success, setSuccess]   = useState(null);

  useEffect(() => {
    getProducts({ limit:100, show_unavailable:'false' })
      .then(r => setProducts(r.data || []))
      .catch(e => toast(e.message,'error'))
      .finally(() => setLP(false));
  }, []);

  const filtered = products.filter(p =>
    p.is_available && (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addItem = (p) => {
    if (!p.sizes?.length) return;
    const size = p.sizes[0];
    const key = `${p.id}-${size.id}`;
    setCart(c => {
      const idx = c.findIndex(i => i.key === key);
      if (idx >= 0) { const n=[...c]; n[idx]={...n[idx],qty:n[idx].qty+1}; return n; }
      return [...c, { key, product:p, size, qty:1 }];
    });
  };

  const setQty = (key, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.key !== key));
    else setCart(c => c.map(i => i.key===key ? {...i,qty} : i));
  };

  const subtotal = cart.reduce((s,i) => s + i.size.price * i.qty, 0);
  const tax = +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const place = async () => {
    if (!cart.length) { toast('Add at least one item','warning'); return; }
    setPlacing(true);
    try {
      const items = cart.map(i => ({ product_id:i.product.id, size_id:i.size.id, quantity:i.qty, toppings:[] }));
      const r = await placeInhouseOrder({
        items, payment_method:payMethod, delivery_type:'pickup',
        ...(userId ? { user_id:parseInt(userId) } : {}),
      });
      setSuccess(r.data);
      setCart([]);
      setUserId('');
      toast(`Order ${r.data.order_number} placed!`, 'success');
    } catch(e) { toast(e.message,'error'); }
    finally { setPlacing(false); }
  };

  return (
    <div className="page-enter">
      <PageHeader title="In-House Billing" subtitle="Counter orders for walk-in customers" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.25rem', alignItems:'start' }}>
        {/* Products */}
        <SectionCard title="Select Items"
          noPad
          actions={<SearchInput value={search} onChange={setSearch} placeholder="Search menu…" />}
        >
          {loadingP
            ? <div className="loading-center"><Spinner /></div>
            : filtered.length === 0
            ? <div style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>No products found</div>
            : <div className="product-grid">
                {filtered.map(p => (
                  <button key={p.id} className="product-cell" onClick={() => addItem(p)}>
                    <div style={{textAlign:'center',marginBottom:'0.25rem'}}>
                      {p.image_url
                        ? <img src={`${p.image_url}`} alt="" style={{width:42,height:42,borderRadius:10,objectFit:'cover'}} />
                        : <span style={{fontSize:'1.75rem'}}>🍕</span>}
                    </div>
                    <div className="truncate font-semi" style={{fontSize:'0.8125rem',lineHeight:1.3}}>{p.name}</div>
                    {p.sizes?.[0] && (
                      <div className="font-bold text-accent" style={{fontSize:'0.875rem'}}>{fmt.currency(p.sizes[0].price)}</div>
                    )}
                    <div style={{fontSize:'0.6rem',fontWeight:700,color:p.is_veg?'var(--green)':'var(--red)',textTransform:'uppercase',letterSpacing:'0.04em'}}>
                      ● {p.is_veg?'Veg':'Non-veg'}
                    </div>
                  </button>
                ))}
              </div>
          }
        </SectionCard>

        {/* Cart + billing */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem', position:'sticky', top:'calc(var(--header-h) + 1.75rem)' }}>
          <SectionCard title={`🛒 Cart ${cart.length ? `(${cart.length})` : ''}`} noPad>
            {cart.length === 0
              ? <div style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>
                  <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🛒</div>
                  <div className="text-sm">Tap products to add</div>
                </div>
              : <div>
                  {cart.map(i => (
                    <div key={i.key} style={{display:'flex',alignItems:'center',gap:'0.625rem',padding:'0.75rem 1rem',borderBottom:'1px solid var(--border)'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="truncate font-semi" style={{fontSize:'0.8125rem'}}>{i.product.name}</div>
                        <div className="text-xs text-muted">{i.size.size_name} · {fmt.currency(i.size.price)}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:3}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setQty(i.key,i.qty-1)} style={{width:24,height:24,padding:0,borderRadius:'var(--r-sm)'}}>−</button>
                        <span style={{width:22,textAlign:'center',fontWeight:700,fontSize:'0.875rem'}}>{i.qty}</span>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setQty(i.key,i.qty+1)} style={{width:24,height:24,padding:0,borderRadius:'var(--r-sm)'}}>+</button>
                      </div>
                      <div className="font-bold text-accent nowrap" style={{fontSize:'0.875rem'}}>{fmt.currency(i.size.price*i.qty)}</div>
                    </div>
                  ))}
                  <div style={{padding:'0.875rem 1rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',color:'var(--text-muted)',marginBottom:4}}>
                      <span>Subtotal</span><span>{fmt.currency(subtotal)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',color:'var(--text-muted)',marginBottom:10}}>
                      <span>Tax (5%)</span><span>{fmt.currency(tax)}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:'1.0625rem',fontFamily:'var(--font-head)',paddingTop:'0.625rem',borderTop:'1px solid var(--border)'}}>
                      <span>Total</span>
                      <span className="text-accent">{fmt.currency(total)}</span>
                    </div>
                  </div>
                </div>
            }
          </SectionCard>

          <div className="card card-pad" style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
            <Field label="Customer User ID" hint="Leave blank for anonymous walk-in">
              <input className="input" type="number" value={userId} onChange={e=>setUserId(e.target.value)} placeholder="e.g. 42" />
            </Field>

            <div>
              <div className="form-label mb-2">Payment Method</div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                {[['cash_on_delivery','💵 Cash'],['online','🏦 Online']].map(([v,l]) => (
                  <button key={v} className={`btn flex-1 ${payMethod===v?'btn-primary':'btn-ghost'}`} onClick={()=>setPayMethod(v)}
                    style={{justifyContent:'center'}}>{l}</button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-lg w-full" style={{justifyContent:'center'}} onClick={place} disabled={placing||cart.length===0}>
              {placing ? <><Spinner className="spinner-sm"/>Placing…</> : `Place Order · ${fmt.currency(total)}`}
            </button>
          </div>

          {success && (
            <div style={{background:'var(--green-dim)',border:'1px solid var(--green-border)',borderRadius:'var(--r-lg)',padding:'1.125rem'}}>
              <div style={{color:'var(--green)',fontWeight:700,fontSize:'0.9rem',marginBottom:6}}>✓ Order Placed Successfully</div>
              <div className="text-sm text-secondary" style={{lineHeight:1.6}}>
                <strong style={{color:'var(--text-primary)'}}>{success.order_number}</strong><br/>
                Total: {fmt.currency(success.total_amount)}<br/>
                Payment: {success.payment_method==='cash_on_delivery'?'Cash on Delivery':'Online'}
              </div>
              <button className="btn btn-ghost btn-sm mt-3" onClick={()=>setSuccess(null)}>Dismiss</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
