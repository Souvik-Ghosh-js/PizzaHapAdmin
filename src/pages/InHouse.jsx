import { useEffect, useState } from 'react';
import { getProducts, placeInhouseOrder, getToppings } from '../services/api';
import { Field, SearchInput, Spinner, PageHeader, SectionCard, Toggle, Modal } from '../components/UI';
import { fmt } from '../utils';
import { useToast } from '../context';

export default function InHouse() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [loadingP, setLP]       = useState(true);
  const [loadingT, setLT]       = useState(true);
  const [cart, setCart]         = useState([]);
  const [search, setSearch]     = useState('');
  const [payMethod, setPayMethod] = useState('cash_on_delivery');
  const [userId, setUserId]     = useState('');
  const [placing, setPlacing]   = useState(false);
  const [success, setSuccess]   = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customizing, setCustomizing] = useState({
    size_id: null,
    crust_id: null,
    quantity: 1,
    toppings: [],
    special_instructions: ''
  });

  useEffect(() => {
    getProducts({ limit:100, show_unavailable:'false' })
      .then(r => setProducts(r.data || []))
      .catch(e => toast(e.message,'error'))
      .finally(() => setLP(false));
    
    getToppings()
      .then(r => setToppings(r.data?.filter(t => t.is_available) || []))
      .catch(e => toast(e.message,'error'))
      .finally(() => setLT(false));
  }, []);

  const filtered = products.filter(p =>
    p.is_available && (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const openProductModal = (p) => {
    if (!p.sizes?.length) {
      // If no sizes available, add directly to cart with base price
      const key = `${p.id}-no-size`;
      const existingIdx = cart.findIndex(i => i.key === key);
      
      if (existingIdx >= 0) {
        const newCart = [...cart];
        newCart[existingIdx] = { ...newCart[existingIdx], qty: newCart[existingIdx].qty + 1 };
        setCart(newCart);
      } else {
        setCart([...cart, {
          key,
          product: p,
          size: { id: null, size_name: 'Regular', price: p.base_price || 0 },
          crust_id: null,
          qty: 1,
          toppings: [],
          special_instructions: ''
        }]);
      }
      toast('Added to cart', 'success');
      return;
    }
    
    setSelectedProduct(p);
    setCustomizing({
      size_id: p.sizes[0].id,
      crust_id: null,
      quantity: 1,
      toppings: [],
      special_instructions: ''
    });
  };

  const addToCart = () => {
    if (!selectedProduct || !customizing.size_id) return;
    
    const size = selectedProduct.sizes.find(s => s.id === customizing.size_id);
    const key = `${selectedProduct.id}-${customizing.size_id}-${customizing.crust_id || 'none'}-${customizing.toppings.sort().join(',')}`;
    
    const existingIdx = cart.findIndex(i => i.key === key);
    if (existingIdx >= 0) {
      const newCart = [...cart];
      newCart[existingIdx] = { ...newCart[existingIdx], qty: newCart[existingIdx].qty + customizing.quantity };
      setCart(newCart);
    } else {
      setCart([...cart, {
        key,
        product: selectedProduct,
        size,
        crust_id: customizing.crust_id,
        qty: customizing.quantity,
        toppings: customizing.toppings.map(tid => toppings.find(t => t.id === tid)).filter(Boolean),
        special_instructions: customizing.special_instructions
      }]);
    }
    
    setSelectedProduct(null);
    toast('Added to cart', 'success');
  };

  const setQty = (key, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.key !== key));
    else setCart(c => c.map(i => i.key===key ? {...i,qty} : i));
  };

  const subtotal = cart.reduce((s,i) => {
    const toppingTotal = (i.toppings || []).reduce((sum, t) => sum + (t.price || 0), 0);
    return s + (i.size.price + toppingTotal) * i.qty;
  }, 0);
  const tax = +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const place = async () => {
    if (!cart.length) { toast('Add at least one item','warning'); return; }
    setPlacing(true);
    try {
      const items = cart.map(i => ({
        product_id: i.product.id,
        size_id: i.size.id,
        quantity: i.qty,
        crust_id: i.crust_id || undefined,
        toppings: i.toppings?.map(t => t.id) || [],
        special_instructions: i.special_instructions || undefined
      }));
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
                  <button key={p.id} className="product-cell" onClick={() => openProductModal(p)}>
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
                        {i.toppings && i.toppings.length > 0 && (
                          <div className="text-xs" style={{color:'var(--orange)',marginTop:2}}>
                            + {i.toppings.map(t => t.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:3}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setQty(i.key,i.qty-1)} style={{width:24,height:24,padding:0,borderRadius:'var(--r-sm)'}}>−</button>
                        <span style={{width:22,textAlign:'center',fontWeight:700,fontSize:'0.875rem'}}>{i.qty}</span>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setQty(i.key,i.qty+1)} style={{width:24,height:24,padding:0,borderRadius:'var(--r-sm)'}}>+</button>
                      </div>
                      <div className="font-bold text-accent nowrap" style={{fontSize:'0.875rem'}}>
                        {fmt.currency((i.size.price + (i.toppings || []).reduce((s, t) => s + (t.price || 0), 0)) * i.qty)}
                      </div>
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

      {/* Product Customization Modal */}
      {selectedProduct && (
        <Modal 
          open={!!selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.name}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setSelectedProduct(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={addToCart} disabled={!customizing.size_id}>
                Add to Cart · {fmt.currency(
                  (selectedProduct.sizes?.find(s => s.id === customizing.size_id)?.price || 0) +
                  customizing.toppings.reduce((sum, tid) => sum + (toppings.find(t => t.id === tid)?.price || 0), 0)
                )}
              </button>
            </>
          }
        >
          <div style={{display:'flex',flexDirection:'column',gap:'1.125rem'}}>
            {/* Size Selection */}
            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
              <Field label="Select Size" required>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))',gap:'0.5rem'}}>
                  {selectedProduct.sizes.map(size => (
                    <button
                      key={size.id}
                      className={`btn ${customizing.size_id === size.id ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setCustomizing(c => ({...c, size_id: size.id}))}
                      style={{flexDirection:'column',padding:'0.75rem',height:'auto',justifyContent:'center'}}
                    >
                      <div className="font-semi" style={{fontSize:'0.8rem'}}>{size.size_name}</div>
                      <div className="font-bold" style={{fontSize:'0.875rem',marginTop:2}}>{fmt.currency(size.price)}</div>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {/* Crust Selection (if available) */}
            {selectedProduct.crusts && selectedProduct.crusts.length > 0 && (
              <Field label="Crust Type (Optional)">
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:'0.5rem'}}>
                  <button
                    className={`btn ${!customizing.crust_id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCustomizing(c => ({...c, crust_id: null}))}
                    style={{fontSize:'0.8rem'}}
                  >
                    Regular
                  </button>
                  {selectedProduct.crusts.map(crust => (
                    <button
                      key={crust.id}
                      className={`btn ${customizing.crust_id === crust.id ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setCustomizing(c => ({...c, crust_id: crust.id}))}
                      style={{fontSize:'0.8rem'}}
                    >
                      {crust.crust_name}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {/* Toppings Selection */}
            {toppings.length > 0 && (
              <Field label="Add Toppings (Optional)">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',maxHeight:200,overflowY:'auto',padding:'0.25rem'}}>
                  {toppings.map(topping => (
                    <button
                      key={topping.id}
                      className={`btn ${customizing.toppings.includes(topping.id) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => {
                        setCustomizing(c => ({
                          ...c,
                          toppings: c.toppings.includes(topping.id)
                            ? c.toppings.filter(id => id !== topping.id)
                            : [...c.toppings, topping.id]
                        }));
                      }}
                      style={{justifyContent:'space-between',fontSize:'0.8rem'}}
                    >
                      <span>{topping.name}</span>
                      <span className="font-bold">+{fmt.currency(topping.price)}</span>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {/* Quantity */}
            <Field label="Quantity">
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setCustomizing(c => ({...c, quantity: Math.max(1, c.quantity - 1)}))}
                  style={{width:40,height:40,padding:0,fontSize:'1.125rem'}}
                >
                  −
                </button>
                <span className="font-bold" style={{fontSize:'1.25rem',minWidth:40,textAlign:'center'}}>
                  {customizing.quantity}
                </span>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setCustomizing(c => ({...c, quantity: c.quantity + 1}))}
                  style={{width:40,height:40,padding:0,fontSize:'1.125rem'}}
                >
                  +
                </button>
              </div>
            </Field>

            {/* Special Instructions */}
            <Field label="Special Instructions (Optional)">
              <textarea
                className="input"
                value={customizing.special_instructions}
                onChange={e => setCustomizing(c => ({...c, special_instructions: e.target.value}))}
                placeholder="Any special requests..."
                rows={2}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}