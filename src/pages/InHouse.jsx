import { useEffect, useState } from 'react';
import {
  getProducts, getCategories, placeInhouseOrder,
  getToppings, getCrusts, getProductSizes, updatePaymentStatus, validateCoupon,
} from '../services/api';
import { Field, SearchInput, Spinner, PageHeader, SectionCard, Modal } from '../components/UI';
import { fmt } from '../utils';
import { useToast, useAuth } from '../context';

export default function InHouse() {
  const toast         = useToast();
  const { admin }     = useAuth();

  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [toppings, setToppings]     = useState([]);
  const [crusts, setCrusts]         = useState([]);
  const [loading, setLoading]       = useState(true);

  const [cart, setCart]             = useState([]);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [payMethod, setPayMethod]   = useState('cash_on_delivery');
  const [userId, setUserId]         = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [placing, setPlacing]       = useState(false);
  const [success, setSuccess]       = useState(null);

  // Coupon
  const [couponInput, setCouponInput]     = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // validated response
  const [couponError, setCouponError]     = useState('');
  const [validating, setValidating]       = useState(false);

  // Modal state
  const [selectedProduct, setSP]    = useState(null);   // full product object
  const [modalSizes, setModalSizes] = useState([]);     // sizes fetched on open
  const [modalPricing, setModalPricing] = useState({ crusts: [], toppings: [] });
  const [loadingSizes, setLS]       = useState(false);
  const [customizing, setCustomizing] = useState({
    size_id: null, crust_id: null, quantity: 1, toppings: [], special_instructions: '',
  });

  // ── Initial data load ───────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getProducts({ limit: 200, show_unavailable: 'false' }),
      getCategories(),
      getToppings(),
      getCrusts(),
    ]).then(([p, c, t, cr]) => {
      setProducts(p.data || []);
      setCategories(c.data || []);
      setToppings((t.data || []).filter(x => x.is_available));
      setCrusts((cr.data || []).filter(x => x.is_available));
    }).catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.is_available &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || String(p.category_id) === catFilter)
  );

  const getCat = (product) => categories.find(c => c.id === product.category_id) || {};

  // ── Open modal — fetch sizes fresh from API ─────────────────────
  const openProductModal = async (p) => {
    setSP(p);
    setModalSizes([]);
    setCustomizing({ size_id: null, crust_id: null, quantity: 1, toppings: [], special_instructions: '' });
    setLS(true);
    try {
      const r = await getProductSizes(p.id);
      const sizes = r.data?.sizes || [];
      const crustPricing = r.data?.crust_pricing || [];
      const toppingPricing = r.data?.topping_pricing || [];
      
      setModalSizes(sizes);
      setModalPricing({ crusts: crustPricing, toppings: toppingPricing });
      // Auto-select first size
      setCustomizing(c => ({ ...c, size_id: sizes[0]?.id ?? null }));
    } catch {
      setModalSizes([]);
      setModalPricing({ crusts: [], toppings: [] });
    } finally {
      setLS(false);
    }
  };

  const closeModal = () => { setSP(null); setModalSizes([]); };

  // ── Add to cart ─────────────────────────────────────────────────
  const addToCart = () => {
    if (!selectedProduct) return;

    const sizeRaw = modalSizes.find(s => s.id === customizing.size_id)
              || { id: null, size_name: 'Regular', price: selectedProduct.base_price || 0 };
    // Always store prices as numbers — mysql2 returns DECIMAL as string
    const price = sizeRaw.location_price != null ? parseFloat(sizeRaw.location_price) : parseFloat(sizeRaw.price);
    const size = { ...sizeRaw, price: price || 0 };

    const toppingsList = customizing.toppings
      .map(tid => {
        const top = toppings.find(t => t.id === tid);
        if (!top) return null;
        // Use size specific price if available
        const sPrice = modalPricing.toppings.find(tp => tp.topping_id === tid && tp.size_code === size.size_code);
        return { ...top, price: sPrice ? parseFloat(sPrice.price) : (parseFloat(top.price) || 0) };
      })
      .filter(Boolean);

    const crustObj   = crusts.find(c => c.id === customizing.crust_id) || null;
    const sCrustPrice = modalPricing.crusts.find(cp => cp.crust_id === customizing.crust_id && cp.size_code === size.size_code);
    const crustPrice = sCrustPrice ? parseFloat(sCrustPrice.extra_price) : (parseFloat(crustObj?.extra_price) || 0);

    // Key is stable — built from IDs, not from the customizing object reference
    const key = [
      selectedProduct.id,
      size.id   ?? 'none',
      customizing.crust_id ?? 'none',
      [...customizing.toppings].sort().join(',') || 'none',
    ].join('|');

    setCart(prev => {
      const idx = prev.findIndex(i => i.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + customizing.quantity };
        return next;
      }
      return [...prev, {
        key,
        product:              selectedProduct,
        size,
        crust_id:             customizing.crust_id,
        crust_name:           crustObj?.name || null,
        crust_price:          crustPrice,
        qty:                  customizing.quantity,
        toppings:             toppingsList,
        special_instructions: customizing.special_instructions,
      }];
    });

    closeModal();
    toast('Added to cart', 'success');
  };

  const setQty = (key, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.key !== key));
    else          setCart(c => c.map(i => i.key === key ? { ...i, qty } : i));
  };

  const itemTotal = (i) => {
    const sp = parseFloat(i.size.price)     || 0;
    const cp = parseFloat(i.crust_price)    || 0;
    const tp = (i.toppings || []).reduce((s, t) => s + (parseFloat(t.price) || 0), 0);
    return (sp + cp + tp) * i.qty;
  };

  const subtotal = parseFloat(cart.reduce((s, i) => s + itemTotal(i), 0).toFixed(2));
  const bogoDiscount = (() => {
    if (!appliedCoupon?.is_bogo) return 0;
    const ids = appliedCoupon.applicable_product_ids || [];
    const eligible = ids.length > 0
      ? cart.filter(i => ids.includes(i.product.id))
      : cart;
    if (!eligible.length) return 0;
    const unitPrice = (i) => {
      const sp = parseFloat(i.size.price) || 0;
      const cp = parseFloat(i.crust_price) || 0;
      const tp = (i.toppings || []).reduce((s, t) => s + (parseFloat(t.price) || 0), 0);
      return sp + cp + tp;
    };
    return Math.min(...eligible.map(unitPrice));
  })();
  const discount = appliedCoupon?.is_bogo ? bogoDiscount : (appliedCoupon?.calculated_discount || 0);
  const total    = parseFloat(Math.max(0, subtotal - discount).toFixed(2));

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setValidating(true);
    try {
      const r = await validateCoupon(code, subtotal);
      setAppliedCoupon(r.data);
      setCouponInput('');
    } catch (e) {
      setCouponError(e.message);
      setAppliedCoupon(null);
    } finally {
      setValidating(false);
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponError(''); setCouponInput(''); };

  // ── Place order ─────────────────────────────────────────────────
  const place = async () => {
    if (!cart.length) { toast('Add at least one item', 'warning'); return; }
    const locationId = admin?.location_id;
    if (!locationId) { toast('No branch selected. Log out and pick a branch.', 'error'); return; }

    setPlacing(true);
    try {
      const items = cart.map(i => ({
        product_id:           i.product.id,
        size_id:              i.size.id,
        quantity:             i.qty,
        crust_id:             i.crust_id  || undefined,
        toppings:             i.toppings?.map(t => t.id) || [],
        special_instructions: i.special_instructions || undefined,
      }));

      const r = await placeInhouseOrder({
        items,
        location_id:    locationId,
        payment_method: payMethod,
        delivery_type:  'pickup',
        ...(userId ? { user_id: parseInt(userId) } : {}),
        ...(customerName.trim() ? { customer_name: customerName.trim() } : {}),
        ...(customerPhone.trim() ? { customer_phone: customerPhone.trim() } : {}),
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
      });

      setSuccess(r.data);
      setCart([]); setUserId(''); setCustomerName(''); setCustomerPhone('');
      setAppliedCoupon(null); setCouponInput(''); setCouponError('');
      toast(`Order ${r.data.order_number} placed!`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setPlacing(false); }
  };

  const markAsPaid = async (orderId) => {
    try {
      await updatePaymentStatus(orderId, 'paid', 'Payment received at counter');
      setSuccess(prev => ({ ...prev, payment_status: 'paid' }));
      toast('Marked as paid', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="page-enter">
      <PageHeader
        title="In-House Billing"
        subtitle={`Counter orders · ${admin?.location_name || 'All branches'} · No tax · Auto-confirmed`}
      />

      <div className="inhouse-layout">

        {/* ── Product picker ─────────────────────────────────────── */}
        <SectionCard title="Select Items" noPad
          actions={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select className="input" style={{ minWidth: 140, height: 36, fontSize: '0.8125rem' }}
                value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All categories</option>
                {categories.filter(c => c.is_active).map(c =>
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                )}
              </select>
              <SearchInput value={search} onChange={setSearch} placeholder="Search…" />
            </div>
          }
        >
          {loading
            ? <div className="loading-center"><Spinner /></div>
            : filtered.length === 0
            ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No products found</div>
            : <div className="product-grid">
              {filtered.map(p => {
                const cat         = getCat(p);
                const hasToppings = cat.has_toppings || p.has_toppings;
                const hasCrust    = cat.has_crust    || p.has_crust;
                return (
                  <button key={p.id} className="product-cell" onClick={() => openProductModal(p)}>
                    <div style={{ textAlign: 'center', marginBottom: '0.25rem' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1.75rem' }}>🍕</span>}
                    </div>
                    <div className="truncate font-semi" style={{ fontSize: '0.8125rem', lineHeight: 1.3 }}>{p.name}</div>
                    <div className="font-bold text-accent" style={{ fontSize: '0.875rem' }}>
                      {fmt.currency(p.base_price)}
                    </div>
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: p.is_veg ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase' }}>
                        ● {p.is_veg ? 'Veg' : 'Non-veg'}
                      </span>
                      {hasToppings && <span style={{ fontSize: '0.55rem', background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 4px', borderRadius: 3 }}>+toppings</span>}
                      {hasCrust    && <span style={{ fontSize: '0.55rem', background: 'var(--blue-dim)',  color: 'var(--blue)',  padding: '1px 4px', borderRadius: 3 }}>+crust</span>}
                      <span style={{ fontSize: '0.55rem', background: p.stock_quantity > 0 ? 'var(--bg-muted)' : 'var(--red-dim)', color: p.stock_quantity > 0 ? 'var(--text-muted)' : 'var(--red)', padding: '1px 4px', borderRadius: 3 }}>
                        📦 {p.stock_quantity || 0}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          }
        </SectionCard>

        {/* ── Cart + billing ─────────────────────────────────────── */}
        <div className="inhouse-sidebar">

          {!admin?.location_id && (
            <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-border)', borderRadius: 'var(--r-md)', padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--amber-dark)', display: 'flex', gap: '0.5rem' }}>
              <span>⚠</span><span>No branch selected. Log out and log back in choosing a branch.</span>
            </div>
          )}

          <SectionCard title={`🛒 Cart ${cart.length ? `(${cart.length})` : ''}`} noPad>
            {cart.length === 0
              ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛒</div>
                  <div className="text-sm">Tap products to add</div>
                </div>
              : <div>
                {cart.map(i => (
                  <div key={i.key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate font-semi" style={{ fontSize: '0.8125rem' }}>{i.product.name}</div>
                      <div className="text-xs text-muted">{i.size.size_name} · {fmt.currency(i.size.price)}</div>
                      {i.crust_name && (
                        <div className="text-xs" style={{ color: 'var(--blue)', marginTop: 2 }}>
                          🍞 {i.crust_name}{i.crust_price > 0 ? ` (+${fmt.currency(i.crust_price)})` : ''}
                        </div>
                      )}
                      {i.toppings?.length > 0 && (
                        <div className="text-xs" style={{ color: 'var(--orange)', marginTop: 2 }}>
                          + {i.toppings.map(t => t.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setQty(i.key, i.qty - 1)} style={{ width: 24, height: 24, padding: 0 }}>−</button>
                      <span style={{ width: 22, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>{i.qty}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => setQty(i.key, i.qty + 1)} style={{ width: 24, height: 24, padding: 0 }}>+</button>
                    </div>
                    <div className="font-bold text-accent nowrap" style={{ fontSize: '0.875rem' }}>{fmt.currency(itemTotal(i))}</div>
                  </div>
                ))}
                <div style={{ padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Subtotal</span><span>{fmt.currency(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4, color: 'var(--green)' }}>
                      <span>🎫 {appliedCoupon.code}</span>
                      <span>{appliedCoupon.is_bogo ? `BOGO −${fmt.currency(discount)}` : `−${fmt.currency(discount)}`}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.0625rem', fontFamily: 'var(--font-head)', paddingTop: '0.625rem', borderTop: '1px solid var(--border)' }}>
                    <span>Total</span><span className="text-accent">{fmt.currency(total)}</span>
                  </div>
                </div>
              </div>
            }
          </SectionCard>

          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <Field label="Coupon Code">
              {appliedCoupon ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--green-dim)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-sm)', padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--green)' }}>{appliedCoupon.code}</span>
                    <span style={{ color: 'var(--green)', fontSize: '0.75rem' }}>
                      {appliedCoupon.is_bogo ? '· Buy 1 Get 1 Free' : `· −${fmt.currency(discount)}`}
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={removeCoupon} style={{ padding: '0 0.5rem', flexShrink: 0 }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="input" style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    placeholder="Enter code…" />
                  <button className="btn btn-ghost btn-sm" onClick={applyCoupon} disabled={validating || !couponInput.trim()} style={{ flexShrink: 0 }}>
                    {validating ? <Spinner className="spinner-sm" /> : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <div style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: '0.25rem' }}>{couponError}</div>}
            </Field>
            <Field label="Customer Name">
              <input className="input" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in customer name" />
            </Field>
            <Field label="Phone Number">
              <input className="input" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="e.g. 9876543210" />
            </Field>
            <Field label="Customer User ID" hint="Leave blank for walk-in">
              <input className="input" type="number" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. 42" />
            </Field>
            <div>
              <div className="form-label mb-2">Payment Method</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['cash_on_delivery', '💵 Cash'], ['online', '🏦 Online']].map(([v, l]) => (
                  <button key={v} className={`btn flex-1 ${payMethod === v ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPayMethod(v)} style={{ justifyContent: 'center' }}>{l}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center' }}
              onClick={place} disabled={placing || cart.length === 0 || !admin?.location_id}>
              {placing ? <><Spinner className="spinner-sm" />Placing…</> : `Place Order · ${fmt.currency(total)}`}
            </button>
          </div>

          {success && (
            <div style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)', borderRadius: 'var(--r-lg)', padding: '1.125rem' }}>
              <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>✓ Order Placed</div>
              <div className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{success.order_number}</strong><br />
                Total: {fmt.currency(success.total_amount)}<br />
                {success.payment_method === 'cash_on_delivery' ? 'Cash' : 'Online'} · Auto-confirmed
              </div>
              {success.payment_method === 'online' && success.payment_status !== 'paid' && (
                <button className="btn btn-success btn-sm" style={{ marginTop: '0.75rem', marginRight: '0.5rem' }}
                  onClick={() => markAsPaid(success.order_id)}>
                  💰 Mark as Paid
                </button>
              )}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setSuccess(null)}>Dismiss</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Customization modal ───────────────────────────────────── */}
      {selectedProduct && (() => {
        const cat         = getCat(selectedProduct);
        const hasToppings = cat.has_toppings || selectedProduct.has_toppings;
        const hasCrust    = cat.has_crust    || selectedProduct.has_crust;
        const _selSize    = modalSizes.find(s => s.id === customizing.size_id)
                          || { id: null, size_name: 'Regular', price: selectedProduct.base_price || 0 };
        
        const _sPrice = _selSize.location_price != null ? parseFloat(_selSize.location_price) : parseFloat(_selSize.price);
        const selectedSize = { ..._selSize, price: _sPrice || 0 };
        
        // Dynamic prices based on size
        const sCrustPrice = modalPricing.crusts.find(cp => cp.crust_id === customizing.customizing?.crust_id || customizing.crust_id === cp.crust_id && cp.size_code === selectedSize.size_code);
        // Better crust search:
        const currentCrust = modalPricing.crusts.find(cp => cp.crust_id === customizing.crust_id && cp.size_code === selectedSize.size_code);
        const crustExtra = currentCrust ? parseFloat(currentCrust.extra_price) : (parseFloat(crusts.find(c => c.id === customizing.crust_id)?.extra_price) || 0);

        const toppingsCost = customizing.toppings.reduce((s, tid) => {
          const sPrice = modalPricing.toppings.find(tp => tp.topping_id === tid && tp.size_code === selectedSize.size_code);
          const topPrice = sPrice ? parseFloat(sPrice.price) : (parseFloat(toppings.find(t => t.id === tid)?.price) || 0);
          return s + topPrice;
        }, 0);

        const lineCost    = (selectedSize.price + crustExtra + toppingsCost) * customizing.quantity;

        return (
          <Modal open onClose={closeModal} title={selectedProduct.name}
            footer={<>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={addToCart} disabled={loadingSizes}>
                Add to Cart · {fmt.currency(lineCost)}
              </button>
            </>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

              {/* Sizes — fetched fresh from API */}
              {loadingSizes ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <Spinner className="spinner-sm" /> Loading sizes…
                </div>
              ) : modalSizes.length > 0 ? (
                <Field label="Select Size" required>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                    {modalSizes.map(size => (
                      <button key={size.id}
                        className={`btn ${customizing.size_id === size.id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCustomizing(c => ({ ...c, size_id: size.id }))}
                        style={{ flexDirection: 'column', padding: '0.75rem', height: 'auto', justifyContent: 'center' }}>
                        <div className="font-semi" style={{ fontSize: '0.8rem' }}>{size.size_name}</div>
                        <div className="font-bold" style={{ fontSize: '0.875rem', marginTop: 2 }}>{fmt.currency(size.price)}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              ) : (
                /* No sizes on record — show base price as fixed size */
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-muted)', borderRadius: 'var(--r-sm)', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>Price: <strong>{fmt.currency(selectedProduct.base_price)}</strong></div>
                  <div style={{ color: selectedProduct.stock_quantity > 0 ? 'var(--text-muted)' : 'var(--red)' }}>
                    In stock: <strong>{selectedProduct.stock_quantity || 0}</strong>
                  </div>
                </div>
              )}

              {/* Crust — only for has_crust categories */}
              {hasCrust && crusts.length > 0 && (
                <Field label="Crust Type">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    <button className={`btn ${!customizing.crust_id ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setCustomizing(c => ({ ...c, crust_id: null }))}
                      style={{ fontSize: '0.8rem' }}>
                      Regular (no extra)
                    </button>
                    {crusts.map(crust => (
                      <button key={crust.id}
                        className={`btn ${customizing.crust_id === crust.id ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCustomizing(c => ({ ...c, crust_id: crust.id }))}
                        style={{ flexDirection: 'column', height: 'auto', padding: '0.5rem', fontSize: '0.8rem' }}>
                        <span>{crust.name}</span>
                        {crust.extra_price > 0 && (
                          <span style={{ fontSize: '0.7rem', color: customizing.crust_id === crust.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginTop: 2 }}>
                            +{fmt.currency(crust.extra_price)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {/* Toppings — only for has_toppings categories */}
              {hasToppings && toppings.length > 0 && (
                <Field label="Add Toppings">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: 220, overflowY: 'auto', padding: '0.25rem' }}>
                    {toppings.map(topping => {
                      const sel = customizing.toppings.includes(topping.id);
                      return (
                        <button key={topping.id}
                          className={`btn ${sel ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setCustomizing(c => ({
                            ...c,
                            toppings: sel
                              ? c.toppings.filter(id => id !== topping.id)
                              : [...c.toppings, topping.id],
                          }))}
                          style={{ justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: '0.65rem', color: topping.is_veg ? 'var(--green)' : 'var(--red)' }}>●</span>
                            {topping.name}
                          </span>
                          <span className="font-bold">+{fmt.currency(topping.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}

              {/* Quantity */}
              <Field label="Quantity">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="btn btn-ghost"
                    onClick={() => setCustomizing(c => ({ ...c, quantity: Math.max(1, c.quantity - 1) }))}
                    style={{ width: 40, height: 40, padding: 0, fontSize: '1.125rem' }}>−</button>
                  <span className="font-bold" style={{ fontSize: '1.25rem', minWidth: 40, textAlign: 'center' }}>{customizing.quantity}</span>
                  <button className="btn btn-ghost"
                    onClick={() => setCustomizing(c => ({ ...c, quantity: c.quantity + 1 }))}
                    style={{ width: 40, height: 40, padding: 0, fontSize: '1.125rem' }}>+</button>
                </div>
              </Field>

              {/* Special instructions */}
              <Field label="Special Instructions">
                <textarea className="input" value={customizing.special_instructions}
                  onChange={e => setCustomizing(c => ({ ...c, special_instructions: e.target.value }))}
                  placeholder="Any special requests…" rows={2} />
              </Field>

              {/* Live price summary */}
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 3 }}>
                  <span>{selectedSize.size_name}</span><span>{fmt.currency(selectedSize.price)}</span>
                </div>
                {crustExtra > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 3 }}>
                    <span>Crust extra</span><span>+{fmt.currency(crustExtra)}</span>
                  </div>
                )}
                {toppingsCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 3 }}>
                    <span>Toppings ({customizing.toppings.length})</span><span>+{fmt.currency(toppingsCost)}</span>
                  </div>
                )}
                {customizing.quantity > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 3 }}>
                    <span>× {customizing.quantity}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '0.5rem', borderTop: '1px solid var(--border-md)', color: 'var(--text-primary)' }}>
                  <span>Line total</span><span className="text-accent">{fmt.currency(lineCost)}</span>
                </div>
              </div>

            </div>
          </Modal>
        );
      })()}
    </div>
  );
}