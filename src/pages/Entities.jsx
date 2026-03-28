import { useEffect, useState, useCallback } from 'react';
import {
  getUsers, blockUser,
  getCategories, createCategory, updateCategory, deleteCategory, uploadCategoryImage,
  getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage,
  getProductSizes, createProductSize, updateProductSize, deleteProductSize,
  getToppings, createTopping, updateTopping, deleteTopping,
  getCrusts, createCrust, updateCrust, deleteCrust,
  getLocations, createLocation, updateLocation,
  getCoupons, createCoupon, updateCoupon,
} from '../services/api';
import {
  Badge, Pagination, SearchInput, Select, Spinner, EmptyState,
  Modal, Field, Toggle, PageHeader, SectionCard, Avatar,
} from '../components/UI';
import { fmt, debounce, statusLabel } from '../utils';
import { useToast } from '../context';

// ── USERS ─────────────────────────────────────────────────────────
export function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [pag, setPag]     = useState(null);
  const [loading, setL]   = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage]   = useState(1);
  const [actId, setActId] = useState(null);

  const load = async (s = search, p = page) => {
    setL(true);
    try {
      const r = await getUsers({ search: s || undefined, page: p, limit: 20 });
      setUsers(r.data || []); setPag(r.pagination);
    } catch (e) { toast(e.message, 'error'); }
    finally { setL(false); }
  };
  const dSearch = useCallback(debounce((s) => { setPage(1); load(s, 1); }, 400), []);
  useEffect(() => { load(); }, [page]);

  const toggleBlock = async (u) => {
    setActId(u.id);
    try {
      await blockUser(u.id, !u.is_blocked);
      toast(`User ${u.is_blocked ? 'unblocked' : 'blocked'}`, 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setActId(null); }
  };

  return (
    <div className="page-enter">
      <PageHeader title="Users" subtitle="Manage customer accounts"
        actions={<SearchInput value={search} onChange={s => { setSearch(s); dSearch(s); }} placeholder="Name, email or mobile…" />}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner /></div>
          : users.length === 0 ? <EmptyState icon="👥" title="No users found" />
          : <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>User</th><th>Contact</th><th>Address</th>
                  <th>Coins</th><th>Joined</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <Avatar name={u.name} size={32} />
                          <div>
                            <div className="font-semi" style={{ fontSize: '0.875rem' }}>{u.name}</div>
                            <div className="text-xs text-muted">#{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">{u.email || '—'}</div>
                        <div className="text-xs text-muted">{u.mobile || '—'}</div>
                      </td>
                      <td>
                        <div className="text-xs text-secondary">
                          {[u.address_town, u.address_state, u.address_pincode].filter(Boolean).join(', ') || '—'}
                        </div>
                      </td>
                      <td>
                        {u.coin_balance > 0
                          ? <span className="font-semi text-amber" style={{ fontSize: '0.8125rem' }}>🪙 {u.coin_balance}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td><span className="text-xs text-muted">{fmt.date(u.created_at)}</span></td>
                      <td><Badge status={u.is_blocked ? 'blocked' : 'active'}>{u.is_blocked ? 'Blocked' : 'Active'}</Badge></td>
                      <td>
                        <button className={`btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-danger'}`}
                          onClick={() => toggleBlock(u)} disabled={actId === u.id}>
                          {actId === u.id ? <Spinner className="spinner-sm" /> : u.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pag} onPage={setPage} />
          </>}
      </div>
    </div>
  );
}

// ── CATEGORIES ─────────────────────────────────────────────────────
export function Categories() {
  const toast = useToast();
  const [cats, setCats]   = useState([]);
  const [loading, setL]   = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({});
  const [imgFile, setImg] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setL(true);
    getCategories().then(r => setCats(r.data || [])).catch(e => toast(e.message, 'error')).finally(() => setL(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) { toast('Category name is required', 'warning'); return; }
    setSaving(true);
    try {
      let catId = form.id;
      if (modal === 'create') {
        const r = await createCategory({
          name: form.name, description: form.description || undefined,
          sort_order: parseInt(form.sort_order || 0),
          has_toppings: !!form.has_toppings, has_crust: !!form.has_crust,
        });
        catId = r.data?.category_id;
        toast('Category created', 'success');
      } else {
        await updateCategory(form.id, {
          name: form.name, description: form.description || undefined,
          sort_order: parseInt(form.sort_order || 0),
          has_toppings: !!form.has_toppings, has_crust: !!form.has_crust,
          is_active: !!form.is_active,
        });
        toast('Category updated', 'success');
      }
      if (imgFile && catId) await uploadCategoryImage(catId, imgFile).catch(() => {});
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="page-enter">
      <PageHeader title="Categories" subtitle="Manage menu categories and their settings"
        actions={<button className="btn btn-primary" onClick={() => { setForm({ has_toppings: false, has_crust: false, is_active: true, sort_order: 0 }); setImg(null); setModal('create'); }}>+ Add Category</button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {loading ? <div className="loading-center" style={{ gridColumn: '1/-1' }}><Spinner /></div>
          : cats.length === 0 ? <EmptyState icon="🗂️" title="No categories yet" />
          : cats.map(cat => (
            <div key={cat.id} className="card card-pad">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {cat.image_url
                  ? <img src={cat.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🗂️</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div className="font-semi" style={{ fontSize: '0.9375rem' }}>{cat.name}</div>
                    <Badge status={cat.is_active ? 'active' : 'inactive'}>{cat.is_active ? 'Active' : 'Off'}</Badge>
                  </div>
                  <div className="text-xs text-muted" style={{ marginBottom: 8 }}>{cat.description || '—'}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {cat.has_toppings ? <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--green-border)' }}>TOPPINGS</span> : null}
                    {cat.has_crust    ? <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--blue-dim)', color: 'var(--blue)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--blue-border)' }}>CRUST</span> : null}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Order: {cat.sort_order}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn-sm btn-ghost" style={{ flex: 1 }}
                  onClick={() => { setForm({ ...cat, has_toppings: !!cat.has_toppings, has_crust: !!cat.has_crust, is_active: !!cat.is_active }); setImg(null); setModal('edit'); }}>
                  Edit
                </button>
                <button className="btn btn-sm btn-ghost btn-danger-text" style={{ padding: '0 0.5rem' }}
                  onClick={() => remove(cat)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Category' : 'Edit Category'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : 'Save Category'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <Field label="Category Name" required>
              <input className="input" {...F('name')} placeholder="Pizzas" />
            </Field>
            <Field label="Sort Order" hint="Lower = shown first">
              <input className="input" type="number" {...F('sort_order')} placeholder="0" />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" {...F('description')} rows={2} placeholder="Short description…" />
          </Field>
          <Field label="Category Image" hint="JPEG, PNG or WebP · max 5MB">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="input"
              style={{ padding: '0.375rem 0.75rem', cursor: 'pointer' }}
              onChange={e => setImg(e.target.files?.[0] || null)} />
          </Field>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
            <Toggle checked={!!form.has_toppings} onChange={v => setForm(f => ({ ...f, has_toppings: v }))} label="Show Toppings Selector" />
            <Toggle checked={!!form.has_crust}    onChange={v => setForm(f => ({ ...f, has_crust: v }))}    label="Show Crust Selector" />
            {modal === 'edit' && <Toggle checked={!!form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── PRODUCTS ──────────────────────────────────────────────────────
export function Menu() {
  const toast = useToast();
  const [products, setProds] = useState([]);
  const [categories, setCats] = useState([]);
  const [pag, setPag]         = useState(null);
  const [loading, setL]       = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [imgFile, setImgFile] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [sizesModal, setSizesModal] = useState(null); // productId
  const [sizes, setSizes]     = useState([]);
  const [sizeForm, setSizeForm] = useState({});
  const [sizeSaving, setSS]   = useState(false);

  const load = async (s = search, p = page) => {
    setL(true);
    try {
      const r = await getProducts({ search: s || undefined, page: p, limit: 20, show_unavailable: 'true' });
      setProds(r.data || []); setPag(r.pagination);
    } catch (e) { toast(e.message, 'error'); }
    finally { setL(false); }
  };
  const dSearch = useCallback(debounce((s) => { setPage(1); load(s, 1); }, 400), []);
  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    getCategories().then(r => setCats(r.data || [])).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.name || !form.base_price || !form.category_id) { toast('Name, price and category required', 'warning'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        const sizes = form.sizes_raw
          ? form.sizes_raw.split('\n').map(l => {
              const [size_name, price] = l.split(',').map(s => s.trim());
              return size_name && price ? { size_name, size_code: size_name.slice(0, 3).toUpperCase(), price: parseFloat(price) } : null;
            }).filter(Boolean)
          : undefined;
        const r = await createProduct({
          name: form.name, description: form.description || undefined,
          base_price: parseFloat(form.base_price), category_id: parseInt(form.category_id),
          is_veg: !!form.is_veg, is_featured: !!form.is_featured,
          stock_quantity: parseInt(form.stock_quantity || 0),
          ...(sizes?.length ? { sizes } : {}),
        });
        if (imgFile && r.data?.product_id) await uploadProductImage(r.data.product_id, imgFile).catch(() => {});
        toast('Product created', 'success');
      } else {
        await updateProduct(form.id, {
          name: form.name, description: form.description || undefined,
          base_price: parseFloat(form.base_price), category_id: parseInt(form.category_id),
          is_veg: !!form.is_veg, is_featured: !!form.is_featured, is_available: !!form.is_available,
          stock_quantity: parseInt(form.stock_quantity || 0),
        });
        if (imgFile) await uploadProductImage(form.id, imgFile).catch(() => {});
        toast('Product updated', 'success');
      }
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const hide = async (id) => {
    try { await deleteProduct(id); toast('Product hidden', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const openSizes = async (productId) => {
    setSizesModal(productId);
    try { const r = await getProductSizes(productId); setSizes(r.data || []); }
    catch (e) { toast(e.message, 'error'); }
  };

  const addSize = async () => {
    if (!sizeForm.size_name || !sizeForm.price) { toast('Name and price required', 'warning'); return; }
    setSS(true);
    try {
      await createProductSize(sizesModal, { size_name: sizeForm.size_name, size_code: sizeForm.size_code || sizeForm.size_name.slice(0,3).toUpperCase(), price: parseFloat(sizeForm.price) });
      toast('Size added', 'success');
      setSizeForm({});
      const r = await getProductSizes(sizesModal); setSizes(r.data || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setSS(false); }
  };

  const removeSize = async (sizeId) => {
    try {
      await deleteProductSize(sizesModal, sizeId);
      setSizes(s => s.filter(x => x.id !== sizeId));
      toast('Size removed', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="page-enter">
      <PageHeader title="Products"
        actions={<>
          <SearchInput value={search} onChange={s => { setSearch(s); dSearch(s); }} placeholder="Search products…" />
          <button className="btn btn-primary" onClick={() => { setForm({ is_veg: true, is_featured: false, is_available: true }); setImgFile(null); setModal('create'); }}>+ Add Product</button>
        </>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner /></div>
          : products.length === 0 ? <EmptyState icon="🍕" title="No products" />
          : <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Product</th><th>Category</th><th>Price</th>
                  <th>Stock</th><th>Type</th><th>Featured</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{ width: 42, height: 42, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                            {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍕'}
                          </div>
                          <div>
                            <div className="font-semi" style={{ fontSize: '0.875rem' }}>{p.name}</div>
                            <div className="text-xs text-muted truncate" style={{ maxWidth: 160 }}>{p.description?.slice(0, 40) || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-sm text-secondary">{p.category_name || '—'}</span></td>
                      <td><span className="font-bold">{fmt.currency(p.base_price)}</span></td>
                      <td>
                        <Badge status={p.stock_quantity > 0 ? 'active' : 'inactive'}>
                          {p.stock_quantity || 0}
                        </Badge>
                      </td>
                      <td><Badge status={p.is_veg ? 'veg' : 'nonveg'}>{p.is_veg ? 'Veg' : 'Non-Veg'}</Badge></td>
                      <td>{p.is_featured ? <span className="text-amber">⭐</span> : <span className="text-muted">—</span>}</td>
                      <td><Badge status={p.is_available ? 'active' : 'inactive'}>{p.is_available ? 'Active' : 'Hidden'}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => { setForm({ ...p }); setImgFile(null); setModal('edit'); }}>Edit</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => openSizes(p.id)}>Sizes</button>
                          {p.is_available && <button className="btn btn-sm btn-danger" onClick={() => hide(p.id)}>Hide</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pag} onPage={setPage} />
          </>}
      </div>

      {/* Product modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Product' : 'Edit Product'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : 'Save Product'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <Field label="Product Name" required>
              <input className="input" {...F('name')} placeholder="Margherita Pizza" />
            </Field>
            <Field label="Category" required>
              <select className="input" value={form.category_id ?? ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" {...F('description')} rows={2} placeholder="Describe the product…" />
          </Field>
          <div className="grid-2">
            <Field label="Base Price (₹)" required>
              <input className="input" type="number" step="0.01" {...F('base_price')} placeholder="299" />
            </Field>
            <Field label="Stock Quantity" required hint="Current inventory count">
              <input className="input" type="number" {...F('stock_quantity')} placeholder="100" />
            </Field>
          </div>
          <Field label="Product Image" hint="JPEG, PNG or WebP · max 5MB">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="input"
              style={{ padding: '0.375rem 0.75rem', cursor: 'pointer' }}
              onChange={e => setImgFile(e.target.files?.[0] || null)} />
          </Field>
          {modal === 'create' && (
            <Field label="Sizes" hint="One per line: Name, Price — e.g. Regular, 199">
              <textarea className="input" {...F('sizes_raw')} rows={3}
                placeholder={'Regular, 199\nMedium, 269\nLarge, 329'} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
            </Field>
          )}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Toggle checked={!!form.is_veg}       onChange={v => setForm(f => ({ ...f, is_veg: v }))}       label="Vegetarian" />
            <Toggle checked={!!form.is_featured}   onChange={v => setForm(f => ({ ...f, is_featured: v }))}  label="Featured" />
            {modal === 'edit' && <Toggle checked={!!form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} label="Available" />}
          </div>
        </div>
      </Modal>

      {/* Sizes modal */}
      <Modal open={!!sizesModal} onClose={() => setSizesModal(null)} title="Manage Sizes" size="modal-lg"
        footer={<button className="btn btn-ghost" onClick={() => setSizesModal(null)}>Done</button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sizes.length === 0 ? <div className="text-sm text-muted" style={{ padding: '0.75rem 0' }}>No sizes yet. Add one below.</div>
              : sizes.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', background: 'var(--bg-muted)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                  <span className="font-semi" style={{ flex: 1 }}>{s.size_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 40 }}>{s.size_code}</span>
                  <span className="font-bold" style={{ width: 70, textAlign: 'right' }}>{fmt.currency(s.price)}</span>
                  <Badge status={s.is_available ? 'active' : 'inactive'}>{s.is_available ? 'On' : 'Off'}</Badge>
                  <button className="btn btn-sm btn-danger" onClick={() => removeSize(s.id)}>✕</button>
                </div>
              ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div className="text-xs text-muted font-semi" style={{ marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add New Size</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px auto', gap: '0.5rem', alignItems: 'end' }}>
              <Field label="Size Name">
                <input className="input" value={sizeForm.size_name || ''} onChange={e => setSizeForm(f => ({ ...f, size_name: e.target.value }))} placeholder="Large" />
              </Field>
              <Field label="Code">
                <input className="input" value={sizeForm.size_code || ''} onChange={e => setSizeForm(f => ({ ...f, size_code: e.target.value }))} placeholder="LG" />
              </Field>
              <Field label="Price (₹)">
                <input className="input" type="number" value={sizeForm.price || ''} onChange={e => setSizeForm(f => ({ ...f, price: e.target.value }))} placeholder="329" />
              </Field>
              <button className="btn btn-primary" onClick={addSize} disabled={sizeSaving} style={{ height: 42 }}>
                {sizeSaving ? <Spinner className="spinner-sm" /> : '+ Add'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── CRUST TYPES ────────────────────────────────────────────────────
export function Crusts() {
  const toast = useToast();
  const [crusts, setCrusts] = useState([]);
  const [loading, setL]     = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setL(true);
    getCrusts().then(r => setCrusts(r.data || [])).catch(e => toast(e.message, 'error')).finally(() => setL(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) { toast('Name is required', 'warning'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await createCrust({ name: form.name, extra_price: parseFloat(form.extra_price || 0), sort_order: parseInt(form.sort_order || 0) });
        toast('Crust type created', 'success');
      } else {
        await updateCrust(form.id, { name: form.name, extra_price: parseFloat(form.extra_price || 0), is_available: !!form.is_available, sort_order: parseInt(form.sort_order || 0) });
        toast('Crust type updated', 'success');
      }
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const disable = async (id) => {
    try { await deleteCrust(id); toast('Crust type disabled', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="page-enter">
      <PageHeader title="Crust Types" subtitle="Manage crust options shown on pizza products"
        actions={<button className="btn btn-primary" onClick={() => { setForm({ extra_price: 0, sort_order: 0, is_available: true }); setModal('create'); }}>+ Add Crust</button>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner /></div>
          : crusts.length === 0 ? <EmptyState icon="🍞" title="No crust types yet" />
          : <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Extra Price</th><th>Sort Order</th><th>Available</th><th>Action</th></tr></thead>
            <tbody>
              {crusts.map(c => (
                <tr key={c.id}>
                  <td><span className="font-semi">{c.name}</span></td>
                  <td><span className="font-bold">{c.extra_price > 0 ? `+${fmt.currency(c.extra_price)}` : 'No extra'}</span></td>
                  <td><span className="text-sm text-muted">{c.sort_order}</span></td>
                  <td><Badge status={c.is_available ? 'active' : 'inactive'}>{c.is_available ? 'Yes' : 'No'}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setForm({ ...c, is_available: !!c.is_available }); setModal('edit'); }}>Edit</button>
                      {c.is_available && <button className="btn btn-sm btn-danger" onClick={() => disable(c.id)}>Disable</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Crust Type' : 'Edit Crust Type'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : 'Save'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <Field label="Crust Name" required><input className="input" {...F('name')} placeholder="Stuffed Crust" /></Field>
            <Field label="Extra Price (₹)" hint="0 for no extra charge"><input className="input" type="number" step="0.01" {...F('extra_price')} placeholder="50" /></Field>
          </div>
          <div className="grid-2">
            <Field label="Sort Order"><input className="input" type="number" {...F('sort_order')} placeholder="0" /></Field>
            {modal === 'edit' && (
              <Field label=" "><div style={{ paddingTop: '1.625rem' }}>
                <Toggle checked={!!form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} label="Available" />
              </div></Field>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── TOPPINGS ────────────────────────────────────────────────────────
export function Toppings() {
  const toast = useToast();
  const [toppings, setTops] = useState([]);
  const [loading, setL]     = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setL(true);
    getToppings().then(r => setTops(r.data || [])).catch(e => toast(e.message, 'error')).finally(() => setL(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.price) { toast('Name and price required', 'warning'); return; }
    setSaving(true);
    try {
      if (modal === 'create') { await createTopping({ name: form.name, price: parseFloat(form.price), is_veg: !!form.is_veg }); toast('Topping added', 'success'); }
      else { await updateTopping(form.id, { name: form.name, price: parseFloat(form.price), is_veg: form.is_veg, is_available: form.is_available }); toast('Topping updated', 'success'); }
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="page-enter">
      <PageHeader title="Toppings" subtitle="Available toppings for topping-enabled categories"
        actions={<button className="btn btn-primary" onClick={() => { setForm({ is_veg: true, is_available: true }); setModal('create'); }}>+ Add Topping</button>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner /></div>
          : toppings.length === 0 ? <EmptyState icon="🫑" title="No toppings yet" />
          : <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Price</th><th>Type</th><th>Available</th><th>Action</th></tr></thead>
            <tbody>
              {toppings.map(t => (
                <tr key={t.id}>
                  <td><span className="font-semi">{t.name}</span></td>
                  <td><span className="font-bold">{fmt.currency(t.price)}</span></td>
                  <td><Badge status={t.is_veg ? 'veg' : 'nonveg'}>{t.is_veg ? 'Veg' : 'Non-Veg'}</Badge></td>
                  <td><Badge status={t.is_available ? 'active' : 'inactive'}>{t.is_available ? 'Yes' : 'No'}</Badge></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => { setForm({ ...t, is_veg: !!t.is_veg, is_available: !!t.is_available }); setModal('edit'); }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Topping' : 'Edit Topping'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : 'Save'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <Field label="Name" required><input className="input" {...F('name')} placeholder="Extra Cheese" /></Field>
            <Field label="Price (₹)" required><input className="input" type="number" step="0.01" {...F('price')} placeholder="30" /></Field>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Toggle checked={!!form.is_veg} onChange={v => setForm(f => ({ ...f, is_veg: v }))} label="Vegetarian" />
            {modal === 'edit' && <Toggle checked={!!form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} label="Available" />}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── LOCATIONS ──────────────────────────────────────────────────────
export function Locations() {
  const toast = useToast();
  const [locs, setLocs]   = useState([]);
  const [loading, setL]   = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setL(true);
    getLocations().then(r => setLocs(r.data || [])).catch(e => toast(e.message, 'error')).finally(() => setL(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.address || !form.latitude || !form.longitude) { toast('Name, address and coordinates required', 'warning'); return; }
    setSaving(true);
    try {
      if (modal === 'create') { await createLocation(form); toast('Location created', 'success'); }
      else { await updateLocation(form.id, form); toast('Location updated', 'success'); }
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="page-enter">
      <PageHeader title="Locations"
        actions={<button className="btn btn-primary" onClick={() => { setForm({ opening_time: '10:00', closing_time: '23:00', is_active: true }); setModal('create'); }}>+ Add Location</button>}
      />
      {loading ? <div className="loading-center"><Spinner /></div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {locs.map(loc => (
            <div key={loc.id} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-head)', marginBottom: 2 }}>{loc.name}</h4>
                  <div className="text-xs text-muted">{loc.city}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge status={loc.is_active ? 'active' : 'inactive'}>{loc.is_active ? 'Active' : 'Inactive'}</Badge>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setForm({ ...loc, opening_time: (loc.opening_time || '10:00:00').slice(0, 5), closing_time: (loc.closing_time || '23:00:00').slice(0, 5), is_active: !!loc.is_active }); setModal('edit'); }}>Edit</button>
                </div>
              </div>
              <div className="text-sm text-secondary mb-2" style={{ lineHeight: 1.5 }}>{loc.address}</div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {loc.phone && <span>📞 {loc.phone}</span>}
                <span>⏰ {(loc.opening_time || '').slice(0, 5)} – {(loc.closing_time || '').slice(0, 5)}</span>
              </div>
            </div>
          ))}
        </div>
      }

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Location' : 'Edit Location'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : 'Save'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <Field label="Branch Name" required><input className="input" {...F('name')} placeholder="Koramangala Branch" /></Field>
            <Field label="City" required><input className="input" {...F('city')} placeholder="Bengaluru" /></Field>
          </div>
          <Field label="Address" required><input className="input" {...F('address')} placeholder="123 Main Street" /></Field>
          <div className="grid-2">
            <Field label="Latitude" required><input className="input" type="number" step="any" {...F('latitude')} placeholder="12.9352" /></Field>
            <Field label="Longitude" required><input className="input" type="number" step="any" {...F('longitude')} placeholder="77.6245" /></Field>
          </div>
          <div className="grid-2">
            <Field label="Phone"><input className="input" type="tel" {...F('phone')} placeholder="+91 9999999999" /></Field>
            <Field label="Email"><input className="input" type="email" {...F('email')} placeholder="branch@pizzahap.com" /></Field>
          </div>
          <div className="grid-2">
            <Field label="Opening Time"><input className="input" type="time" {...F('opening_time')} /></Field>
            <Field label="Closing Time"><input className="input" type="time" {...F('closing_time')} /></Field>
          </div>
          {modal === 'edit' && <Toggle checked={form.is_active === true || form.is_active === 1} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Location Active" />}
        </div>
      </Modal>
    </div>
  );
}

// ── COUPONS ─────────────────────────────────────────────────────────
export function Coupons() {
  const toast = useToast();
  const [coupons, setCoupons]     = useState([]);
  const [loading, setL]           = useState(true);
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [products, setProducts]   = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [loadingProds, setLP]     = useState(false);

  const load = () => {
    setL(true);
    getCoupons().then(r => setCoupons(r.data || [])).catch(e => toast(e.message, 'error')).finally(() => setL(false));
  };
  useEffect(() => { load(); }, []);

  // Fetch products when BOGO type is selected
  useEffect(() => {
    if (form.discount_type === 'buy_1_get_1' && products.length === 0) {
      setLP(true);
      getProducts({ limit: 200 })
        .then(r => setProducts(r.data || []))
        .catch(() => {})
        .finally(() => setLP(false));
    }
  }, [form.discount_type]);

  const toggleProduct = (id) => {
    setForm(f => {
      const ids = f.applicable_product_ids || [];
      return { ...f, applicable_product_ids: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        await createCoupon({
          code: form.code?.toUpperCase(), description: form.description || undefined,
          discount_type: form.discount_type || 'percentage',
          discount_value: form.discount_type === 'buy_1_get_1' ? null : parseFloat(form.discount_value),
          min_order_value: parseFloat(form.min_order_value || 0),
          max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
          usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
          per_user_limit: parseInt(form.per_user_limit || 1),
          valid_from: new Date(form.valid_from).toISOString(),
          valid_until: new Date(form.valid_until).toISOString(),
          ...(form.discount_type === 'buy_1_get_1' ? { applicable_product_ids: form.applicable_product_ids || [] } : {}),
        });
        toast('Coupon created', 'success');
      } else {
        await updateCoupon(form.id, {
          is_active: form.is_active,
          description: form.description || undefined,
          discount_value: form.discount_value ? parseFloat(form.discount_value) : undefined,
          min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : undefined,
          max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
          usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
          valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : undefined,
          ...(form.discount_type === 'buy_1_get_1' ? { applicable_product_ids: form.applicable_product_ids || [] } : {}),
        });
        toast('Coupon updated', 'success');
      }
      setModal(null); load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const F = k => ({ value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const toLocal = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso), pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  };

  return (
    <div className="page-enter">
      <PageHeader title="Coupons"
        actions={<button className="btn btn-primary" onClick={() => { setProdSearch(''); setForm({ discount_type: 'percentage', per_user_limit: 1, is_active: true, applicable_product_ids: [] }); setModal('create'); }}>+ Create Coupon</button>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner /></div>
          : coupons.length === 0 ? <EmptyState icon="🎫" title="No coupons yet" />
          : <div className="table-wrap"><table>
            <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Usage</th><th>Valid Until</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'inline-block', background: 'var(--bg-muted)', border: '1px solid var(--border-md)', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--red)', letterSpacing: '0.05em' }}>{c.code}</div>
                    {c.description && <div className="text-xs text-muted mt-1" style={{ maxWidth: 160 }}>{c.description.slice(0, 35)}</div>}
                  </td>
                  <td>
                    {c.discount_type === 'buy_1_get_1'
                      ? <span style={{ background: 'var(--blue-dim)', color: 'var(--blue)', padding: '2px 8px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700 }}>Buy 1 Get 1</span>
                      : <span className="text-sm text-secondary capitalize">{c.discount_type}</span>}
                  </td>
                  <td>
                    {c.discount_type === 'buy_1_get_1'
                      ? <span className="text-xs text-muted">
                          {c.applicable_product_ids?.length ? `${c.applicable_product_ids.length} item${c.applicable_product_ids.length > 1 ? 's' : ''}` : 'All items'}
                        </span>
                      : <span className="font-bold">{c.discount_type === 'percentage' ? `${c.discount_value}%` : fmt.currency(c.discount_value)}</span>
                    }
                  </td>
                  <td><span className="text-sm">{fmt.currency(c.min_order_value)}</span></td>
                  <td><span className="text-sm">{c.used_count} / {c.usage_limit || '∞'}</span></td>
                  <td><span className="text-xs text-muted">{fmt.date(c.valid_until)}</span></td>
                  <td><Badge status={c.is_active ? 'active' : 'inactive'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => { setProdSearch(''); setForm({ ...c, is_active: !!c.is_active, valid_until: toLocal(c.valid_until), applicable_product_ids: c.applicable_product_ids || [] }); setModal('edit'); }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Create Coupon' : 'Edit Coupon'} size="modal-lg"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="spinner-sm" />Saving…</> : 'Save Coupon'}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {modal === 'create' && (
            <div className="grid-2">
              <Field label="Code" required>
                <input className="input" {...F('code')} placeholder="SAVE20" style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Discount Type" required>
                <select className="input" value={form.discount_type || 'percentage'} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                  <option value="buy_1_get_1">Buy 1 Get 1</option>
                </select>
              </Field>
            </div>
          )}
          <Field label="Description">
            <input className="input" {...F('description')} placeholder="e.g. Get 20% off on all orders" />
          </Field>
          <div className="grid-2">
            {form.discount_type !== 'buy_1_get_1' && (
            <Field label={`Discount Value ${form.discount_type === 'flat' ? '(₹)' : '(%)'}`} required>
              <input className="input" type="number" step="0.01" {...F('discount_value')} placeholder={form.discount_type === 'flat' ? '50' : '20'} />
            </Field>
            )}
            <Field label="Min Order Value (₹)">
              <input className="input" type="number" step="0.01" {...F('min_order_value')} placeholder="200" />
            </Field>
          </div>
          {form.discount_type === 'buy_1_get_1' && (
            <Field label="BOGO applies to" hint={(form.applicable_product_ids?.length ?? 0) === 0 ? 'Applies to all items' : `${form.applicable_product_ids.length} product${form.applicable_product_ids.length > 1 ? 's' : ''} selected`}>
              <div style={{ border: '1px solid var(--border-md)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <input className="input" style={{ height: 32 }} value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)} placeholder="Search products…" />
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {loadingProds
                    ? <div style={{ padding: '1rem', textAlign: 'center' }}><Spinner className="spinner-sm" /></div>
                    : products
                        .filter(p => !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                        .map(p => {
                          const sel = (form.applicable_product_ids || []).includes(p.id);
                          return (
                            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', cursor: 'pointer', background: sel ? 'var(--accent-dim)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                              <input type="checkbox" checked={sel} onChange={() => toggleProduct(p.id)} style={{ flexShrink: 0 }} />
                              {p.image_url && <img src={p.image_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                              <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: sel ? 600 : 400 }}>{p.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt.currency(p.base_price)}</span>
                            </label>
                          );
                        })
                  }
                  {!loadingProds && products.filter(p => !prodSearch || p.name.toLowerCase().includes(prodSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No products found</div>
                  )}
                </div>
                {(form.applicable_product_ids?.length ?? 0) > 0 && (
                  <div style={{ padding: '0.375rem 0.75rem', background: 'var(--bg-muted)', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{form.applicable_product_ids.length} selected</span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      onClick={() => setForm(f => ({ ...f, applicable_product_ids: [] }))}>Clear all</button>
                  </div>
                )}
              </div>
            </Field>
          )}

          <div className="grid-2">
            <Field label="Max Discount (₹)" hint="For % coupons">
              <input className="input" type="number" step="0.01" {...F('max_discount')} placeholder="100 (optional)" />
            </Field>
            <Field label="Usage Limit">
              <input className="input" type="number" {...F('usage_limit')} placeholder="Unlimited" />
            </Field>
          </div>
          {modal === 'create' && (
            <div className="grid-2">
              <Field label="Valid From" required><input className="input" type="datetime-local" {...F('valid_from')} /></Field>
              <Field label="Valid Until" required><input className="input" type="datetime-local" {...F('valid_until')} /></Field>
            </div>
          )}
          {modal === 'edit' && (
            <div className="grid-2">
              <Field label="Extend Valid Until"><input className="input" type="datetime-local" {...F('valid_until')} /></Field>
              <Field label=" "><div style={{ paddingTop: '1.625rem' }}>
                <Toggle checked={form.is_active === true || form.is_active === 1} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Coupon Active" />
              </div></Field>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
