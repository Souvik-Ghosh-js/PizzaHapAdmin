import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getOrders, getOrderDetail, updateOrderStatus, updatePaymentStatus, getRiders, assignRider, acceptRejectOrder } from '../services/api';
import { Badge, Pagination, Select, Spinner, EmptyState, Modal, Field, PageHeader, OrderProgress, InfoRow, SectionCard } from '../components/UI';
import { fmt, statusLabel, debounce } from '../utils';
import { useToast, useAuth } from '../context';

const STATUS_OPTS = [
  {value:'pending',label:'Pending'},{value:'confirmed',label:'Confirmed'},
  {value:'preparing',label:'Preparing'},{value:'out_for_delivery',label:'Out for Delivery'},
  {value:'delivered',label:'Delivered'},{value:'cancelled',label:'Cancelled'},
  {value:'refund_requested',label:'Refund Req.'},{value:'refunded',label:'Refunded'},
];
const PAY_OPTS = [
  {value:'pending',label:'Pending'},{value:'paid',label:'Paid'},
  {value:'failed',label:'Failed'},{value:'refunded',label:'Refunded'},
];
const TRANSITIONS = {
  pending:['confirmed','cancelled'], confirmed:['preparing','cancelled'],
  preparing:['out_for_delivery','cancelled'], out_for_delivery:['delivered'],
  delivered:['refund_requested'], cancelled:[], refund_requested:['refunded'], refunded:[],
};

export default function Orders() {
  const toast = useToast();
  const { admin } = useAuth();
  const location = useLocation();
  const [orders, setOrders]   = useState([]);
  const [pag, setPag]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status:'', payment_status:'', page:1 });
  const [drawer, setDrawer]   = useState(null);
  const [actLoading, setAL]   = useState(false);
  const [statusModal, setSM]  = useState(null);
  const [payModal, setPM]     = useState(null);
  const [rejectModal, setRM]  = useState(null);
  const [note, setNote]       = useState('');
  const [sel, setSel]         = useState('');

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const r = await getOrders(f);
      setOrders(r.data || []);
      setPag(r.pagination);
    } catch(e) { toast(e.message,'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filters); }, [filters]);

  useEffect(() => {
    if (location.state?.openOrderId && !loading) {
      const orderId = location.state.openOrderId;
      openDrawer(orderId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

  const setF = (k,v) => setFilters(f => ({...f,[k]:v,page:1}));

  const openDrawer = async (id) => {
    setDrawer({ id, _loading:true });
    try {
      const r = await getOrderDetail(id);
      setDrawer(r.data);
    } catch(e) { toast(e.message,'error'); setDrawer(null); }
  };

  const refreshDrawer = (id) => openDrawer(id);

  const doStatusUpdate = async () => {
    if (!sel) return;
    setAL(true);
    try {
      await updateOrderStatus(statusModal.id, sel, note || undefined);
      toast('Order status updated','success');
      setSM(null); setNote(''); setSel('');
      load(filters);
      if (drawer?.id === statusModal.id) refreshDrawer(statusModal.id);
    } catch(e) { toast(e.message,'error'); }
    finally { setAL(false); }
  };

  const doAcceptReject = async (action, orderId, reason) => {
    setAL(true);
    try {
      await acceptRejectOrder(orderId, { action, reason });
      toast(`Order ${action}ed successfully`, 'success');
      if (action === 'reject') setRM(null);
      load(filters);
      if (drawer?.id === orderId) refreshDrawer(orderId);
    } catch(e) { toast(e.message, 'error'); }
    finally { setAL(false); }
  };

  const doPayUpdate = async () => {
    if (!sel) return;
    setAL(true);
    try {
      await updatePaymentStatus(payModal.id, sel, note || undefined);
      toast('Payment status updated','success');
      setPM(null); setNote(''); setSel('');
      load(filters);
      if (drawer?.id === payModal.id) refreshDrawer(payModal.id);
    } catch(e) { toast(e.message,'error'); }
    finally { setAL(false); }
  };

  return (
    <div className="page-enter">
      <PageHeader title="Orders" subtitle={`Manage customer orders · ${admin?.location_name || 'All Branches'}`}
        actions={
          <div style={{ display:'flex', gap:'0.625rem', flexWrap:'wrap' }}>
            <Select value={filters.status} onChange={v=>setF('status',v)} options={STATUS_OPTS} placeholder="All Statuses" style={{minWidth:150}} />
            <Select value={filters.payment_status} onChange={v=>setF('payment_status',v)} options={PAY_OPTS} placeholder="All Payments" style={{minWidth:140}} />
          </div>
        }
      />

      <div className="card">
        {loading
          ? <div className="loading-center"><Spinner /></div>
          : orders.length === 0
          ? <EmptyState icon="📦" title="No orders found" subtitle="Try adjusting filters" />
          : <>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Order</th><th>Customer</th><th>Branch</th>
                  <th>Amount</th><th>Status</th><th>Payment</th>
                  <th>Date</th><th></th>
                </tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="clickable" onClick={() => openDrawer(o.id)}>
                      <td>
                        <div className="font-semi text-accent" style={{fontSize:'0.8rem'}}>{o.order_number}</div>
                        <div className="text-xs text-muted" style={{textTransform:'capitalize'}}>{(o.payment_method||'').replace(/_/g,' ')}</div>
                      </td>
                      <td>
                        <div className="font-medium" style={{fontSize:'0.875rem'}}>{o.user_name||'Walk-in'}</div>
                        <div className="text-xs text-muted">{o.user_mobile||'—'}</div>
                      </td>
                      <td><span className="text-sm text-secondary">{o.location_name||'—'}</span></td>
                      <td>
                        <div className="font-bold">{fmt.currency(o.total_amount)}</div>
                      </td>
                      <td><Badge status={o.status} /></td>
                      <td><Badge status={o.payment_status} /></td>
                      <td><span className="text-xs text-muted nowrap">{fmt.datetime(o.created_at)}</span></td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {o.status === 'pending' ? (
                            <>
                              <button className="btn btn-sm btn-success" onClick={()=>doAcceptReject('accept', o.id)}>✓ Accept</button>
                              <button className="btn btn-sm" style={{background:'var(--red)',color:'white',border:'none'}} onClick={()=>{setRM(o);setNote('');}}>✕ Reject</button>
                            </>
                          ) : (
                            (TRANSITIONS[o.status]||[]).length > 0 && (
                              <button className="btn btn-sm btn-ghost" onClick={()=>{setSM(o);setSel(TRANSITIONS[o.status][0]);setNote('');}}>↑ Status</button>
                            )
                          )}
                          {o.payment_status !== 'paid' && o.payment_status !== 'refunded' && (
                            <button className="btn btn-sm btn-success" onClick={()=>{setPM(o);setSel('paid');setNote('');}}>$ Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pag} onPage={p=>setFilters(f=>({...f,page:p}))} />
          </>
        }
      </div>

      <Modal open={!!drawer} onClose={()=>setDrawer(null)} title={`Order: ${drawer?.order_number || ''}`} size="lg"
        footer={<div style={{ width: '100%', display: 'flex', gap: '0.75rem' }}>
          {drawer && (
            <>
              {drawer.status === 'pending' ? (
                <>
                  <button className="btn btn-success" style={{ flex: 1.5, height: 44 }} onClick={() => doAcceptReject('accept', drawer.id)}>✓ Accept Order</button>
                  <button className="btn btn-danger" style={{ flex: 1, height: 44 }} onClick={() => { setRM(drawer); setNote(''); }}>✕ Reject</button>
                </>
              ) : (
                (TRANSITIONS[drawer.status] || []).length > 0 && (
                  <button className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={() => { setSM(drawer); setSel(TRANSITIONS[drawer.status]?.[0] || ''); setNote(''); }}>🚀 Update Status</button>
                )
              )}
              {drawer.payment_status !== 'paid' && drawer.payment_status !== 'refunded' && (
                <button className="btn btn-success" style={{ height: 44, padding: '0 1.25rem' }} onClick={() => { setPM(drawer); setSel('paid'); setNote(''); }}>
                  {drawer.payment_method === 'cash_on_delivery' ? '💵 Mark Paid' : '💰 Confirm Payment'}
                </button>
              )}
            </>
          )}
        </div>}>
        {drawer && (
          drawer._loading
            ? <div className="loading-center" style={{ minHeight: 200 }}><Spinner size="spinner-lg" /></div>
            : <OrderDetail order={drawer} onRefresh={() => refreshDrawer(drawer.id)} />
        )}
      </Modal>

      <Modal open={!!statusModal} onClose={()=>setSM(null)} title={`Update Status — ${statusModal?.order_number}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={()=>setSM(null)} disabled={actLoading}>Cancel</button>
            <button className="btn btn-primary" onClick={doStatusUpdate} disabled={actLoading||!sel}>Update Status</button>
          </>
        }>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="New Status" required>
            <Select value={sel} onChange={setSel} options={(TRANSITIONS[statusModal?.status]||[]).map(s=>({value:s,label:statusLabel(s)}))} />
          </Field>
          <Field label="Note (optional)">
            <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} rows={2}/>
          </Field>
        </div>
      </Modal>

      <Modal open={!!payModal} onClose={()=>setPM(null)} title={`Update Payment — ${payModal?.order_number}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={()=>setPM(null)} disabled={actLoading}>Cancel</button>
            <button className="btn btn-success" onClick={doPayUpdate} disabled={actLoading||!sel}>Update Payment</button>
          </>
        }>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="Payment Status" required>
            <Select value={sel} onChange={setSel} options={PAY_OPTS} />
          </Field>
          <Field label="Note">
            <input className="input" value={note} onChange={e=>setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <Modal open={!!rejectModal} onClose={()=>setRM(null)} title={`Reject Order — ${rejectModal?.order_number}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={()=>setRM(null)} disabled={actLoading}>Cancel</button>
            <button className="btn btn-danger" onClick={()=>doAcceptReject('reject', rejectModal.id, note)} disabled={actLoading||!note}>Reject Order</button>
          </>
        }>
        <Field label="Rejection Reason" required>
          <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} rows={3}/>
        </Field>
      </Modal>
    </div>
  );
}

const RIDER_STATUSES = new Set(['confirmed', 'preparing', 'out_for_delivery']);

function OrderDetail({ order, onRefresh }) {
  const toast = useToast();
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(order.rider_id ?? '');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (RIDER_STATUSES.has(order.status)) {
      getRiders().then(r => setRiders((r.data || []).filter(rd => rd.is_active))).catch(() => {});
    }
  }, [order.status]);

  const doAssign = async () => {
    setAssigning(true);
    try {
      await assignRider(order.id, selectedRider === '' ? null : parseInt(selectedRider));
      toast('Rider updated', 'success');
      onRefresh();
    } catch (e) { toast(e.message, 'error'); }
    finally { setAssigning(false); }
  };

  return (
    <div className="order-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '1rem' }}>
      <OrderProgress status={order.status} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <SectionCard title="👤 Customer Details">
          <InfoRow label="Name">{order.user_name || 'Walk-in'}</InfoRow>
          <InfoRow label="Mobile">{order.user_mobile || '—'}</InfoRow>
          <InfoRow label="Email">{order.user_email || '—'}</InfoRow>
          <InfoRow label="Branch">{order.location_name || '—'}</InfoRow>
          <InfoRow label="Type">{order.delivery_type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}</InfoRow>
          {order.delivery_address && <InfoRow label="Address">{order.delivery_address}</InfoRow>}
        </SectionCard>

        <SectionCard title="🧾 Payment Info">
          <InfoRow label="Method">
             <span style={{textTransform:'capitalize'}}>{(order.payment_method||'').replace(/_/g,' ')}</span>
          </InfoRow>
          <InfoRow label="Order Status"><Badge status={order.status} /></InfoRow>
          <InfoRow label="Payment Status"><Badge status={order.payment_status} /></InfoRow>
          <InfoRow label="Order Amount">{fmt.currency(order.total_amount)}</InfoRow>
          <InfoRow label="Order Date">{fmt.datetime(order.created_at)}</InfoRow>
        </SectionCard>
      </div>

      <SectionCard title={`🍕 Items (${order.items?.length || 0})`} noPad>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr><th>Product</th><th style={{textAlign:'center'}}>Qty</th><th style={{textAlign:'right'}}>Total</th></tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {item.image_url && <img src={item.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />}
                      <div>
                        <div className="font-bold">{item.product_name}</div>
                        <div className="text-xs text-muted">{item.size_name}{item.crust_name ? ` · ${item.crust_name}` : ''}</div>
                        {item.toppings?.length > 0 && (
                          <div className="text-xs" style={{ color: 'var(--orange)', marginTop: 2 }}>
                            + {item.toppings.map(t => t.topping_name || t.name).join(', ')}
                          </div>
                        )}
                        {item.special_instructions && <div className="text-2xs italic text-muted mt-1">"{item.special_instructions}"</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{textAlign:'center'}}>x{item.quantity}</td>
                  <td style={{textAlign:'right', fontWeight:700}}>{fmt.currency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <SectionCard title="📊 Bill Summary">
          <InfoRow label="Subtotal">{fmt.currency(order.subtotal)}</InfoRow>
          {order.discount_amount > 0 && <InfoRow label="Discount"><span className="text-green">- {fmt.currency(order.discount_amount)}</span></InfoRow>}
          {order.coins_redeemed > 0 && <InfoRow label="Coins Used"><span className="text-amber">- {fmt.currency(order.coins_redeemed)}</span></InfoRow>}
          <InfoRow label="Delivery Fee">{fmt.currency(order.delivery_fee)}</InfoRow>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="font-bold">Total Payable</span>
            <span className="text-accent font-bold text-lg">{fmt.currency(order.total_amount)}</span>
          </div>
        </SectionCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {RIDER_STATUSES.has(order.status) && (
            <SectionCard title="🛵 Assign Rider">
              {order.rider_name && (
                <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--blue-dim)', borderRadius: 8, fontSize: '0.875rem' }}>
                  Currently Assigned: <strong style={{ color: 'var(--blue)' }}>{order.rider_name}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select className="input" style={{ flex: 1 }} value={selectedRider} onChange={e => setSelectedRider(e.target.value)}>
                  <option value="">No rider</option>
                  {riders.map(r => <option key={r.id} value={r.id}>{r.name} · {r.phone}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={doAssign} disabled={assigning}>Assign</button>
              </div>
            </SectionCard>
          )}

          {order.status_history?.length > 0 && (
            <SectionCard title="🕒 Status History">
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {order.status_history.map((h, i) => (
                  <div key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: i < order.status_history.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-bold text-xs">{statusLabel(h.status)}</span>
                      <span className="text-2xs text-muted">{fmt.datetime(h.created_at)}</span>
                    </div>
                    {h.note && <div className="text-2xs text-muted mt-0.5">{h.note}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}