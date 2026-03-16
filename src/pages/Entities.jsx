import { useEffect, useState, useCallback } from 'react';
import {
  getUsers, blockUser,
  getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage,
  getToppings, createTopping, updateTopping,
  getLocations, createLocation, updateLocation,
  getCoupons, createCoupon, updateCoupon,
} from '../services/api';
import { Badge, Pagination, SearchInput, Select, Spinner, EmptyState, Modal, Field, Toggle, PageHeader, SectionCard, Avatar } from '../components/UI';
import { fmt, debounce, statusLabel } from '../utils';
import { useToast } from '../context';

// ── USERS ────────────────────────────────────────────────
export function Users() {
  const toast = useToast();
  const [users, setUsers]   = useState([]);
  const [pag, setPag]       = useState(null);
  const [loading, setL]     = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [actId, setActId]   = useState(null);

  const load = async (s=search, p=page) => {
    setL(true);
    try {
      const r = await getUsers({ search:s||undefined, page:p, limit:20 });
      setUsers(r.data||[]); setPag(r.pagination);
    } catch(e) { toast(e.message,'error'); }
    finally { setL(false); }
  };

  const dSearch = useCallback(debounce((s)=>{ setPage(1); load(s,1); },400),[]);
  useEffect(() => { load(); }, [page]);

  const toggleBlock = async (u) => {
    setActId(u.id);
    try {
      await blockUser(u.id, !u.is_blocked);
      toast(`User ${u.is_blocked?'unblocked':'blocked'}`,'success');
      load();
    } catch(e) { toast(e.message,'error'); }
    finally { setActId(null); }
  };

  return (
    <div className="page-enter">
      <PageHeader title="Users" subtitle="Manage customer accounts"
        actions={<SearchInput value={search} onChange={s=>{setSearch(s);dSearch(s);}} placeholder="Name, email or mobile…"/>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner/></div>
          : users.length===0 ? <EmptyState icon="👥" title="No users found"/>
          : <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>User</th><th>Contact</th><th>Address</th>
                  <th>Coins</th><th>Joined</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
                          <Avatar name={u.name} size={32}/>
                          <div>
                            <div className="font-semi" style={{fontSize:'0.875rem'}}>{u.name}</div>
                            <div className="text-xs text-muted">#{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">{u.email||'—'}</div>
                        <div className="text-xs text-muted">{u.mobile||'—'}</div>
                      </td>
                      <td>
                        <div className="text-xs text-secondary">
                          {[u.address_town,u.address_state,u.address_pincode].filter(Boolean).join(', ')||'—'}
                        </div>
                      </td>
                      <td>
                        {u.coin_balance>0
                          ? <span className="font-semi text-amber" style={{fontSize:'0.8125rem'}}>🪙 {u.coin_balance}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td><span className="text-xs text-muted">{fmt.date(u.created_at)}</span></td>
                      <td><Badge status={u.is_blocked?'blocked':'active'}>{u.is_blocked?'Blocked':'Active'}</Badge></td>
                      <td>
                        <button className={`btn btn-sm ${u.is_blocked?'btn-success':'btn-danger'}`}
                          onClick={()=>toggleBlock(u)} disabled={actId===u.id}>
                          {actId===u.id?<Spinner className="spinner-sm"/>:u.is_blocked?'Unblock':'Block'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pag} onPage={setPage}/>
          </>}
      </div>
    </div>
  );
}

// ── MENU ─────────────────────────────────────────────────
export function Menu() {
  const toast = useToast();
  const [products, setProds] = useState([]);
  const [pag, setPag]        = useState(null);
  const [loading, setL]      = useState(true);
  const [search, setSearch]  = useState('');
  const [page, setPage]      = useState(1);
  const [modal, setModal]    = useState(null); // null | 'create' | 'edit'
  const [form, setForm]      = useState({});
  const [imgFile, setImgFile]= useState(null);
  const [saving, setSaving]  = useState(false);

  const load = async (s=search, p=page) => {
    setL(true);
    try {
      const r = await getProducts({ search:s||undefined, page:p, limit:20, show_unavailable:'true' });
      setProds(r.data||[]); setPag(r.pagination);
    } catch(e) { toast(e.message,'error'); }
    finally { setL(false); }
  };

  const dSearch = useCallback(debounce((s)=>{ setPage(1); load(s,1); },400),[]);
  useEffect(() => { load(); }, [page]);

  const save = async () => {
    if (!form.name || !form.base_price || !form.category_id) { toast('Name, price and category are required','warning'); return; }
    setSaving(true);
    try {
      if (modal==='create') {
        const r = await createProduct({ name:form.name, description:form.description||undefined, base_price:parseFloat(form.base_price), category_id:parseInt(form.category_id), is_veg:!!form.is_veg, is_featured:!!form.is_featured });
        if (imgFile && r.data?.product_id) await uploadProductImage(r.data.product_id, imgFile).catch(()=>{});
        toast('Product created','success');
      } else {
        await updateProduct(form.id, { name:form.name, description:form.description||undefined, base_price:parseFloat(form.base_price), is_veg:!!form.is_veg, is_featured:!!form.is_featured, is_available:!!form.is_available });
        if (imgFile) await uploadProductImage(form.id, imgFile).catch(()=>{});
        toast('Product updated','success');
      }
      setModal(null); load();
    } catch(e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const hide = async (id) => {
    try { await deleteProduct(id); toast('Product hidden','success'); load(); }
    catch(e) { toast(e.message,'error'); }
  };

  const F = (k) => ({ value:form[k]??'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  return (
    <div className="page-enter">
      <PageHeader title="Products"
        actions={<>
          <SearchInput value={search} onChange={s=>{setSearch(s);dSearch(s);}} placeholder="Search products…"/>
          <button className="btn btn-primary" onClick={()=>{setForm({is_veg:true,is_featured:false,is_available:true});setImgFile(null);setModal('create');}}>+ Add Product</button>
        </>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner/></div>
          : products.length===0 ? <EmptyState icon="🍕" title="No products" action={<button className="btn btn-primary" onClick={()=>{setForm({is_veg:true,is_featured:false});setModal('create');}}>Add First</button>}/>
          : <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Product</th><th>Category</th><th>Price</th>
                  <th>Type</th><th>Featured</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {products.map(p=>(
                    <tr key={p.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
                          <div style={{width:42,height:42,borderRadius:10,overflow:'hidden',background:'var(--bg-overlay)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem'}}>
                            {p.image_url?<img src={`${p.image_url}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'🍕'}
                          </div>
                          <div>
                            <div className="font-semi" style={{fontSize:'0.875rem'}}>{p.name}</div>
                            <div className="text-xs text-muted truncate" style={{maxWidth:160}}>{p.description?.slice(0,40)||'—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-sm text-secondary">{p.category_name||'—'}</span></td>
                      <td><span className="font-bold">{fmt.currency(p.base_price)}</span></td>
                      <td><Badge status={p.is_veg?'veg':'nonveg'}>{p.is_veg?'Veg':'Non-Veg'}</Badge></td>
                      <td>{p.is_featured?<span className="text-amber">⭐</span>:<span className="text-muted">—</span>}</td>
                      <td><Badge status={p.is_available?'active':'inactive'}>{p.is_available?'Active':'Hidden'}</Badge></td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn btn-sm btn-ghost" onClick={()=>{setForm({...p});setImgFile(null);setModal('edit');}}>Edit</button>
                          {p.is_available&&<button className="btn btn-sm btn-danger" onClick={()=>hide(p.id)}>Hide</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pag} onPage={setPage}/>
          </>}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='create'?'Add Product':'Edit Product'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<><Spinner className="spinner-sm"/>Saving…</>:'Save Product'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="grid-2">
            <Field label="Product Name" required>
              <input className="input" {...F('name')} placeholder="Margherita Pizza"/>
            </Field>
            <Field label="Category ID" required>
              <input className="input" type="number" {...F('category_id')} placeholder="1"/>
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" {...F('description')} rows={2} placeholder="Describe the product…"/>
          </Field>
          <div className="grid-2">
            <Field label="Base Price (₹)" required>
              <input className="input" type="number" step="0.01" {...F('base_price')} placeholder="299"/>
            </Field>
            <Field label="Product Image" hint="JPEG, PNG or WebP · max 5MB">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="input"
                style={{padding:'0.375rem 0.75rem',cursor:'pointer'}}
                onChange={e=>setImgFile(e.target.files?.[0]||null)}/>
            </Field>
          </div>
          <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap'}}>
            <Toggle checked={!!form.is_veg}       onChange={v=>setForm(f=>({...f,is_veg:v}))}       label="Vegetarian"/>
            <Toggle checked={!!form.is_featured}  onChange={v=>setForm(f=>({...f,is_featured:v}))}  label="Featured"/>
            {modal==='edit' && <Toggle checked={!!form.is_available} onChange={v=>setForm(f=>({...f,is_available:v}))} label="Available"/>}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── TOPPINGS ──────────────────────────────────────────────
export function Toppings() {
  const toast = useToast();
  const [toppings, setTops] = useState([]);
  const [loading, setL]     = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setL(true);
    getToppings().then(r=>setTops(r.data||[])).catch(e=>toast(e.message,'error')).finally(()=>setL(false));
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal==='create') { await createTopping({ name:form.name, price:parseFloat(form.price), is_veg:!!form.is_veg }); toast('Topping added','success'); }
      else { await updateTopping(form.id, { name:form.name, price:parseFloat(form.price), is_veg:form.is_veg, is_available:form.is_available }); toast('Topping updated','success'); }
      setModal(null); load();
    } catch(e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value:form[k]??'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  return (
    <div className="page-enter">
      <PageHeader title="Toppings"
        actions={<button className="btn btn-primary" onClick={()=>{setForm({is_veg:true,is_available:true});setModal('create');}}>+ Add Topping</button>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner/></div>
          : toppings.length===0 ? <EmptyState icon="🫑" title="No toppings yet"/>
          : <div className="table-wrap"><table>
              <thead><tr><th>Name</th><th>Price</th><th>Type</th><th>Available</th><th>Action</th></tr></thead>
              <tbody>
                {toppings.map(t=>(
                  <tr key={t.id}>
                    <td><span className="font-semi">{t.name}</span></td>
                    <td><span className="font-bold">{fmt.currency(t.price)}</span></td>
                    <td><Badge status={t.is_veg?'veg':'nonveg'}>{t.is_veg?'Veg':'Non-Veg'}</Badge></td>
                    <td><Badge status={t.is_available?'active':'inactive'}>{t.is_available?'Yes':'No'}</Badge></td>
                    <td><button className="btn btn-sm btn-ghost" onClick={()=>{setForm({...t,is_veg:!!t.is_veg,is_available:!!t.is_available});setModal('edit');}}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
        }
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='create'?'Add Topping':'Edit Topping'}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<><Spinner className="spinner-sm"/>Saving…</>:'Save'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="grid-2">
            <Field label="Name" required><input className="input" {...F('name')} placeholder="Extra Cheese"/></Field>
            <Field label="Price (₹)" required><input className="input" type="number" step="0.01" {...F('price')} placeholder="30"/></Field>
          </div>
          <div style={{display:'flex',gap:'1.5rem'}}>
            <Toggle checked={!!form.is_veg} onChange={v=>setForm(f=>({...f,is_veg:v}))} label="Vegetarian"/>
            {modal==='edit' && <Toggle checked={!!form.is_available} onChange={v=>setForm(f=>({...f,is_available:v}))} label="Available"/>}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── LOCATIONS ─────────────────────────────────────────────
export function Locations() {
  const toast = useToast();
  const [locs, setLocs]   = useState([]);
  const [loading, setL]   = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setL(true);
    getLocations().then(r=>setLocs(r.data||[])).catch(e=>toast(e.message,'error')).finally(()=>setL(false));
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal==='create') { await createLocation(form); toast('Location created','success'); }
      else { await updateLocation(form.id, form); toast('Location updated','success'); }
      setModal(null); load();
    } catch(e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value:form[k]??'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  return (
    <div className="page-enter">
      <PageHeader title="Locations"
        actions={<button className="btn btn-primary" onClick={()=>{setForm({opening_time:'10:00',closing_time:'23:00',is_active:true});setModal('create');}}>+ Add Location</button>}
      />
      {loading
        ? <div className="loading-center"><Spinner/></div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1rem'}}>
            {locs.map(loc=>(
              <div key={loc.id} className="card card-pad">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
                  <div>
                    <h4 style={{fontFamily:'var(--font-head)',marginBottom:2}}>{loc.name}</h4>
                    <div className="text-xs text-muted">{loc.city}</div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <Badge status={loc.is_active?'active':'inactive'}>{loc.is_active?'Active':'Inactive'}</Badge>
                    <button className="btn btn-sm btn-ghost" onClick={()=>{setForm({...loc,opening_time:(loc.opening_time||'10:00:00').slice(0,5),closing_time:(loc.closing_time||'23:00:00').slice(0,5),is_active:!!loc.is_active});setModal('edit');}}>Edit</button>
                  </div>
                </div>
                <div className="text-sm text-secondary mb-2" style={{lineHeight:1.5}}>{loc.address}</div>
                <div style={{display:'flex',gap:'1rem',fontSize:'0.75rem',color:'var(--text-muted)',flexWrap:'wrap'}}>
                  {loc.phone&&<span>📞 {loc.phone}</span>}
                  <span>⏰ {(loc.opening_time||'').slice(0,5)} – {(loc.closing_time||'').slice(0,5)}</span>
                </div>
              </div>
            ))}
          </div>
      }

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='create'?'Add Location':'Edit Location'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<><Spinner className="spinner-sm"/>Saving…</>:'Save'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="grid-2">
            <Field label="Branch Name" required><input className="input" {...F('name')} placeholder="Koramangala Branch"/></Field>
            <Field label="City" required><input className="input" {...F('city')} placeholder="Bengaluru"/></Field>
          </div>
          <Field label="Address" required><input className="input" {...F('address')} placeholder="123 Main Street"/></Field>
          <div className="grid-2">
            <Field label="Latitude" required><input className="input" type="number" step="any" {...F('latitude')} placeholder="12.9352"/></Field>
            <Field label="Longitude" required><input className="input" type="number" step="any" {...F('longitude')} placeholder="77.6245"/></Field>
          </div>
          <div className="grid-2">
            <Field label="Phone"><input className="input" type="tel" {...F('phone')} placeholder="+91 9999999999"/></Field>
            <Field label="Email"><input className="input" type="email" {...F('email')} placeholder="branch@pizzahap.com"/></Field>
          </div>
          <div className="grid-2">
            <Field label="Opening Time"><input className="input" type="time" {...F('opening_time')}/></Field>
            <Field label="Closing Time"><input className="input" type="time" {...F('closing_time')}/></Field>
          </div>
          {modal==='edit' && <Toggle checked={form.is_active===true||form.is_active===1} onChange={v=>setForm(f=>({...f,is_active:v}))} label="Location Active"/>}
        </div>
      </Modal>
    </div>
  );
}

// ── COUPONS ───────────────────────────────────────────────
export function Coupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setL]       = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setL(true);
    getCoupons().then(r=>setCoupons(r.data||[])).catch(e=>toast(e.message,'error')).finally(()=>setL(false));
  };
  useEffect(()=>{ load(); },[]);

  const save = async () => {
    setSaving(true);
    try {
      if (modal==='create') {
        await createCoupon({
          code:form.code?.toUpperCase(), description:form.description||undefined,
          discount_type:form.discount_type||'percentage',
          discount_value:parseFloat(form.discount_value),
          min_order_value:parseFloat(form.min_order_value||0),
          max_discount:form.max_discount?parseFloat(form.max_discount):undefined,
          usage_limit:form.usage_limit?parseInt(form.usage_limit):undefined,
          per_user_limit:parseInt(form.per_user_limit||1),
          valid_from:new Date(form.valid_from).toISOString(),
          valid_until:new Date(form.valid_until).toISOString(),
        });
        toast('Coupon created','success');
      } else {
        await updateCoupon(form.id, {
          is_active:form.is_active,
          description:form.description||undefined,
          discount_value:form.discount_value?parseFloat(form.discount_value):undefined,
          min_order_value:form.min_order_value?parseFloat(form.min_order_value):undefined,
          max_discount:form.max_discount?parseFloat(form.max_discount):undefined,
          usage_limit:form.usage_limit?parseInt(form.usage_limit):undefined,
          valid_until:form.valid_until?new Date(form.valid_until).toISOString():undefined,
        });
        toast('Coupon updated','success');
      }
      setModal(null); load();
    } catch(e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value:form[k]??'', onChange:e=>setForm(f=>({...f,[k]:e.target.value})) });

  // Convert ISO to datetime-local value
  const toLocal = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = n=>String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  };

  return (
    <div className="page-enter">
      <PageHeader title="Coupons"
        actions={<button className="btn btn-primary" onClick={()=>{setForm({discount_type:'percentage',per_user_limit:1,is_active:true});setModal('create');}}>+ Create Coupon</button>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner/></div>
          : coupons.length===0 ? <EmptyState icon="🎫" title="No coupons yet"/>
          : <div className="table-wrap"><table>
              <thead><tr>
                <th>Code</th><th>Type</th><th>Value</th><th>Min Order</th>
                <th>Usage</th><th>Valid Until</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>
                {coupons.map(c=>(
                  <tr key={c.id}>
                    <td>
                      <div style={{display:'inline-block',background:'var(--bg-overlay)',border:'1px solid var(--border-md)',padding:'2px 8px',borderRadius:5,fontFamily:'monospace',fontSize:'0.8rem',fontWeight:700,color:'var(--accent-bright)',letterSpacing:'0.05em'}}>{c.code}</div>
                      {c.description&&<div className="text-xs text-muted mt-1" style={{maxWidth:160}}>{c.description.slice(0,35)}</div>}
                    </td>
                    <td><span className="text-sm text-secondary capitalize">{c.discount_type}</span></td>
                    <td><span className="font-bold">{c.discount_type==='percentage'?`${c.discount_value}%`:fmt.currency(c.discount_value)}</span></td>
                    <td><span className="text-sm">{fmt.currency(c.min_order_value)}</span></td>
                    <td><span className="text-sm">{c.used_count} / {c.usage_limit||'∞'}</span></td>
                    <td><span className="text-xs text-muted">{fmt.date(c.valid_until)}</span></td>
                    <td><Badge status={c.is_active?'active':'inactive'}>{c.is_active?'Active':'Inactive'}</Badge></td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={()=>{
                        setForm({
                          ...c,
                          is_active:!!c.is_active,
                          valid_until:toLocal(c.valid_until),
                        });
                        setModal('edit');
                      }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
        }
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='create'?'Create Coupon':'Edit Coupon'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<><Spinner className="spinner-sm"/>Saving…</>:'Save Coupon'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {modal==='create' && (
            <div className="grid-2">
              <Field label="Code" required>
                <input className="input" {...F('code')} placeholder="SAVE20" style={{textTransform:'uppercase',fontFamily:'monospace',letterSpacing:'0.05em'}}
                  onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))}/>
              </Field>
              <Field label="Discount Type" required>
                <select className="input" value={form.discount_type||'percentage'} onChange={e=>setForm(f=>({...f,discount_type:e.target.value}))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </Field>
            </div>
          )}
          <Field label="Description">
            <input className="input" {...F('description')} placeholder="e.g. Get 20% off on all orders"/>
          </Field>
          <div className="grid-2">
            <Field label={`Discount Value ${form.discount_type==='flat'?'(₹)':'(%)'}`} required>
              <input className="input" type="number" step="0.01" {...F('discount_value')} placeholder={form.discount_type==='flat'?'50':'20'}/>
            </Field>
            <Field label="Min Order Value (₹)">
              <input className="input" type="number" step="0.01" {...F('min_order_value')} placeholder="200"/>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Max Discount (₹)" hint="For percentage coupons">
              <input className="input" type="number" step="0.01" {...F('max_discount')} placeholder="100 (optional)"/>
            </Field>
            <Field label="Usage Limit" hint="Total uses">
              <input className="input" type="number" {...F('usage_limit')} placeholder="Unlimited"/>
            </Field>
          </div>
          {modal==='create' && (
            <>
              <div className="grid-2">
                <Field label="Per User Limit">
                  <input className="input" type="number" {...F('per_user_limit')} placeholder="1"/>
                </Field>
                <div/>
              </div>
              <div className="grid-2">
                <Field label="Valid From" required>
                  <input className="input" type="datetime-local" {...F('valid_from')}/>
                </Field>
                <Field label="Valid Until" required>
                  <input className="input" type="datetime-local" {...F('valid_until')}/>
                </Field>
              </div>
            </>
          )}
          {modal==='edit' && (
            <div className="grid-2">
              <Field label="Extend Valid Until">
                <input className="input" type="datetime-local" {...F('valid_until')}/>
              </Field>
              <Field label=" ">
                <div style={{paddingTop:'1.625rem'}}>
                  <Toggle checked={form.is_active===true||form.is_active===1} onChange={v=>setForm(f=>({...f,is_active:v}))} label="Coupon Active"/>
                </div>
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
