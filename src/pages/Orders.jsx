import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getOrders, getOrderDetail, updateOrderStatus, updatePaymentStatus, getRiders, assignRider, acceptRejectOrder } from '../services/api';
import { Badge, Pagination, Select, Spinner, EmptyState, Modal, Field, PageHeader, OrderProgress, InfoRow } from '../components/UI';
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

  // Auto-open order drawer if navigated from notification
  useEffect(() => {
    if (location.state?.openOrderId && !loading) {
      const orderId = location.state.openOrderId;
      openDrawer(orderId);
      // Clear the state so it doesn't re-trigger
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
      if (action === 'reject') {
        setRM(null); setNote('');
      }
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
                        {o.coins_redeemed > 0 && <div className="text-xs text-amber">🪙 -{o.coins_redeemed}</div>}
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
                          {/* Payment status update button - Show for all orders where payment is pending */}
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

      {/* Status modal */}
      <Modal open={!!statusModal} onClose={()=>setSM(null)} title={`Update Status — ${statusModal?.order_number}`}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setSM(null)} disabled={actLoading}>Cancel</button>
          <button className="btn btn-primary" onClick={doStatusUpdate} disabled={actLoading||!sel}>
            {actLoading?<><Spinner className="spinner-sm"/>Updating…</>:'Update Status'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <Field label="New Status" required>
            <Select value={sel} onChange={setSel}
              options={(TRANSITIONS[statusModal?.status]||[]).map(s=>({value:s,label:statusLabel(s)}))}
              placeholder="Select status" />
          </Field>
          <Field label="Note (optional)">
            <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note for this update…" rows={2}/>
          </Field>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payModal} onClose={()=>setPM(null)} title={`Update Payment — ${payModal?.order_number}`}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setPM(null)} disabled={actLoading}>Cancel</button>
          <button className="btn btn-success" onClick={doPayUpdate} disabled={actLoading||!sel}>
            {actLoading?<><Spinner className="spinner-sm"/>Updating…</>:'Update Payment'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{
            background: payModal?.payment_status === 'paid' ? 'var(--green-dim)' : 'var(--yellow-dim)',
            border: '1px solid ' + (payModal?.payment_status === 'paid' ? 'var(--green-border)' : 'var(--yellow-border)'),
            borderRadius: 'var(--r-md)',
            padding: '0.75rem 1rem',
            fontSize: '0.8rem',
            color: payModal?.payment_status === 'paid' ? 'var(--green)' : 'var(--yellow-dark)'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Current Payment Status:</span>
              <Badge status={payModal?.payment_status} />
            </div>
            <div style={{marginTop:'0.5rem',fontWeight:600}}>
              Order: {payModal?.order_number} · {fmt.currency(payModal?.total_amount)}
            </div>
          </div>
          <Field label="Payment Status" required>
            <Select value={sel} onChange={setSel} options={PAY_OPTS} placeholder="Select status" />
          </Field>
          <Field label="Note (optional)">
            <input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Cash received at counter / Online payment confirmed"/>
          </Field>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={()=>setRM(null)} title={`Reject Order — ${rejectModal?.order_number}`}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setRM(null)} disabled={actLoading}>Cancel</button>
          <button className="btn" style={{background:'var(--red)',color:'white',border:'none'}} onClick={()=>doAcceptReject('reject', rejectModal.id, note)} disabled={actLoading||!note}>
            {actLoading?<><Spinner className="spinner-sm"/>Rejecting…</>:'Confirm Rejection'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="text-sm text-secondary">Please enter a reason for rejecting this order. Customers may be notified.</div>
          <Field label="Rejection Reason" required>
            <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Items out of stock, shop closed…" rows={3}/>
          </Field>
        </div>
      </Modal>

      {/* Drawer */}
      {drawer && (
        <div className="drawer-backdrop" onClick={()=>setDrawer(null)}>
          <div className="drawer" onClick={e=>e.stopPropagation()}>
            {drawer._loading
              ? <div className="loading-center"><Spinner size="spinner-lg"/></div>
              : <OrderDetail order={drawer} onClose={()=>setDrawer(null)}
                  onStatus={o=>{setSM(o);setSel(TRANSITIONS[o.status]?.[0]||'');setNote('');}}
                  onAccept={o=>doAcceptReject('accept', o.id)}
                  onReject={o=>{setRM(o);setNote('');}}
                  onPay={o=>{setPM(o);setSel('paid');setNote('');}}
                  onRefresh={()=>refreshDrawer(drawer.id)} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

const RIDER_STATUSES = new Set(['confirmed', 'preparing', 'out_for_delivery']);

function OrderDetail({ order, onClose, onStatus, onAccept, onReject, onPay, onRefresh }) {
  const toast = useToast();
  const [riders, setRiders]         = useState([]);
  const [selectedRider, setSelectedRider] = useState(order.rider_id ?? '');
  const [assigning, setAssigning]   = useState(false);
  const [expanded, setExpanded]     = useState({ customer:true, items:true, bill:true, rider:true, history:false });

  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }));

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
    <>
      <div className="drawer-header">
        <div style={{flex:1}}>
          <div className="font-bold text-accent" style={{fontFamily:'var(--font-head)',fontSize:'1rem'}}>{order.order_number}</div>
          <div className="text-xs text-muted">{fmt.datetime(order.created_at)}</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <Badge status={order.status}/>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="drawer-body" style={{display:'flex',flexDirection:'column',gap:'1rem', scrollBehavior:'smooth'}}>
        {/* Progress Card */}
        <div className="card card-pad" style={{background:'white', boxShadow:'var(--shadow-sm)'}}>
          <OrderProgress status={order.status}/>
        </div>

        {/* Quick Stats Row */}
        <div style={{display:'flex',gap:'0.75rem'}}>
          <div style={{flex:1,background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:'0.875rem',textAlign:'center',boxShadow:'var(--shadow-xs)'}}>
            <div className="text-xs text-muted mb-1 font-bold uppercase letter-spacing-05">Method</div>
            <div className="font-bold text-sm" style={{textTransform:'capitalize'}}>{(order.payment_method||'').replace(/_/g,' ')}</div>
          </div>
          <div style={{flex:1,background:order.payment_status==='paid'?'var(--green-dim)':'var(--amber-dim)',border:`1px solid ${order.payment_status==='paid'?'var(--green-border)':'var(--amber-border)'}`,borderRadius:'var(--r-md)',padding:'0.875rem',textAlign:'center',boxShadow:'var(--shadow-xs)'}}>
            <div className="text-xs text-muted mb-1 font-bold uppercase letter-spacing-05">Payment</div>
            <div className={`font-bold text-sm ${order.payment_status==='paid'?'text-success':'text-amber'}`}>{statusLabel(order.payment_status)}</div>
          </div>
          <div style={{flex:1,background:'var(--accent-dim)',border:'1px solid var(--border-accent)',borderRadius:'var(--r-md)',padding:'0.875rem',textAlign:'center',boxShadow:'var(--shadow-xs)'}}>
            <div className="text-xs text-muted mb-1 font-bold uppercase letter-spacing-05">Total</div>
            <div className="font-bold text-accent text-sm" style={{fontFamily:'var(--font-head)'}}>{fmt.currency(order.total_amount)}</div>
          </div>
        </div>

        {/* Collapsible Sections */}
        <CollapsibleSection title="Customer Details" icon="👤" isOpen={expanded.customer} onToggle={()=>toggle('customer')}>
           <div style={{padding:'0.25rem 0.5rem'}}>
              <InfoRow label="Name">{order.user_name||'Walk-in'}</InfoRow>
              <InfoRow label="Mobile">{order.user_mobile||'—'}</InfoRow>
              <InfoRow label="Email">{order.user_email||'—'}</InfoRow>
              <InfoRow label="Branch">{order.location_name||'—'}</InfoRow>
              <InfoRow label="Type">{order.delivery_type==='delivery'?'🛵 Delivery':'🏪 Pickup'}</InfoRow>
              {order.delivery_address && <InfoRow label="Address">{order.delivery_address}</InfoRow>}
           </div>
        </CollapsibleSection>

        <CollapsibleSection title={`Items (${order.items?.length||0})`} icon="🍕" isOpen={expanded.items} onToggle={()=>toggle('items')}>
          {(order.items||[]).map((item,i) => (
            <div key={i} style={{display:'flex',gap:'0.875rem',padding:'1rem 0.5rem',borderBottom:i<order.items.length-1?`1px solid var(--border)`:'none'}}>
              <div style={{width:52,height:52,borderRadius:12,overflow:'hidden',background:'var(--bg-muted)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',border:'1px solid var(--border)'}}>
                {item.image_url?<img src={`${item.image_url}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span>📦</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div className="font-bold" style={{fontSize:'0.9rem',color:'var(--text-primary)',marginBottom:2}}>{item.product_name}</div>
                <div className="text-xs font-medium" style={{color:'var(--text-secondary)'}}>
                  {item.size_name}{item.crust_name?` · ${item.crust_name}`:''} × {item.quantity}
                </div>
                {item.toppings?.length>0 && (
                  <div className="text-xs" style={{color:'var(--orange)',marginTop:5,fontWeight:700}}>
                    + {item.toppings.map(t=>t.topping_name||t.name).join(', ')}
                  </div>
                )}
                {item.special_instructions && (
                  <div className="text-xs" style={{color:'var(--text-muted)',marginTop:5,fontStyle:'italic',background:'rgba(0,0,0,0.03)',padding:'4px 8px',borderRadius:6}}>
                    "{item.special_instructions}"
                  </div>
                )}
              </div>
              <div className="font-bold nowrap" style={{fontSize:'0.95rem',color:'var(--accent)'}}>{fmt.currency(item.total_price)}</div>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Bill Summary" icon="🧾" isOpen={expanded.bill} onToggle={()=>toggle('bill')}>
           <div style={{padding:'0.25rem 0.5rem 0.5rem'}}>
              <InfoRow label="Subtotal">{fmt.currency(order.subtotal)}</InfoRow>
              {order.discount_amount>0 && <InfoRow label="Discount"><span className="text-green font-bold">−{fmt.currency(order.discount_amount)}</span></InfoRow>}
              {order.coins_redeemed>0 && <InfoRow label="🪙 Coins Used"><span className="text-amber font-bold">−{fmt.currency(order.coins_redeemed)}</span></InfoRow>}
              <InfoRow label="Delivery Fee">{fmt.currency(order.delivery_fee)}</InfoRow>
              
              <div style={{display:'flex',justifyContent:'space-between',padding:'1rem 0.75rem',marginTop:'0.75rem',background:'var(--accent-dim)',borderRadius:10,fontWeight:800,fontSize:'1.1rem',fontFamily:'var(--font-head)',border:'1px dashed var(--accent-light)'}}>
                <span style={{color:'var(--text-secondary)',fontSize:'0.9rem'}}>Total Amount</span>
                <span className="text-accent">{fmt.currency(order.total_amount)}</span>
              </div>
           </div>
        </CollapsibleSection>

        {/* Feedback Section */}
        {order.feedback && (
          <CollapsibleSection title="Customer Feedback" icon="⭐" isOpen={true} onToggle={()=>{}}>
            <div style={{padding:'0.5rem'}}>
              <div style={{display:'flex',gap:'1.5rem',marginBottom:'1rem',flexWrap:'wrap'}}>
                {[['Food',order.feedback.food_rating],order.feedback.delivery_rating&&['Delivery',order.feedback.delivery_rating],['Overall',order.feedback.overall_rating]].filter(Boolean).map(([lbl,n])=>(
                  <div key={lbl}>
                    <div className="text-xs text-muted mb-1 font-bold">{lbl}</div>
                    <div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=n?'var(--amber)':'var(--bg-muted)',fontSize:'1.1rem'}}>★</span>)}</div>
                  </div>
                ))}
              </div>
              {order.feedback.comment && <p className="text-sm" style={{color:'var(--text-secondary)',fontStyle:'italic',lineHeight:1.6,background:'var(--bg-muted)',padding:'0.875rem',borderRadius:8}}>"{order.feedback.comment}"</p>}
            </div>
          </CollapsibleSection>
        )}

        {/* Rider assign section */}
        {RIDER_STATUSES.has(order.status) && (
          <CollapsibleSection title="Assign Delivery Rider" icon="🛵" isOpen={expanded.rider} onToggle={()=>toggle('rider')}>
            <div style={{padding:'0.5rem',display:'flex',flexDirection:'column',gap:'0.875rem'}}>
              {order.rider_name && (
                <div className="text-sm" style={{padding:'0.75rem',background:'var(--blue-dim)',borderRadius:8, border:'1px solid var(--blue-border)'}}>
                  Currently: <strong style={{color:'var(--blue)'}}>{order.rider_name}</strong>
                  {order.rider_phone && <span style={{marginLeft:8, opacity:0.7}}>({order.rider_phone})</span>}
                </div>
              )}
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                <select className="input" style={{flex:1}} value={selectedRider}
                  onChange={e => setSelectedRider(e.target.value)}>
                  <option value="">Unassign / No rider</option>
                  {riders.map(r => (
                    <option key={r.id} value={r.id}>{r.name} · {r.phone}</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={doAssign} disabled={assigning}>
                  {assigning ? <Spinner className="spinner-sm" /> : 'Assign'}
                </button>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Status history Section */}
        {order.status_history?.length > 0 && (
          <CollapsibleSection title="Status History" icon="🕒" isOpen={expanded.history} onToggle={()=>toggle('history')}>
            <div style={{padding:'0.25rem 0'}}>
              {order.status_history.map((h,i) => (
                <div key={i} style={{display:'flex',gap:'1rem',padding:'0.75rem 0.5rem',borderBottom:i<order.status_history.length-1?'1px solid var(--border)':'none',alignItems:'flex-start'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:h.status.includes('payment')?'var(--green)':'var(--accent)',marginTop:5,flexShrink:0,boxShadow:'0 0 0 3px rgba(0,0,0,0.03)'}}/>
                  <div style={{flex:1}}>
                    <div className="font-bold text-sm" style={{color:'var(--text-primary)'}}>
                      {h.status.includes('payment') 
                        ? `Payment ${h.status.replace('payment_','')}` 
                        : statusLabel(h.status)}
                    </div>
                    {h.note && <div className="text-xs text-muted" style={{marginTop:2}}>{h.note}</div>}
                    <div className="text-2xs text-muted uppercase mt-1 letter-spacing-05" style={{fontSize:10, opacity:0.6}}>{fmt.datetime(h.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      <div className="drawer-footer" style={{padding:'1.25rem 1.5rem', background:'white', boxShadow:'0 -4px 12px rgba(0,0,0,0.03)'}}>
        <div style={{width:'100%', display:'flex', gap:'0.75rem'}}>
          {order.status === 'pending' ? (
            <>
              <button className="btn btn-success" style={{flex:1.5, height:44, fontSize:'0.9rem'}} onClick={()=>onAccept(order)}>✓ Accept Order</button>
              <button className="btn" style={{flex:1,height:44,background:'var(--red)',color:'white',border:'none', fontSize:'0.9rem'}} onClick={()=>onReject(order)}>✕ Reject</button>
            </>
          ) : (
            (TRANSITIONS[order.status]||[]).length>0 && (
              <button className="btn btn-primary" style={{flex:1, height:44, fontSize:'0.9rem'}} onClick={()=>onStatus(order)}>🚀 Update Status</button>
            )
          )}
          {order.payment_status !== 'paid' && order.payment_status !== 'refunded' && (
            <button className="btn btn-success" style={{height:44, padding:'0 1.25rem', fontSize:'0.9rem'}} onClick={()=>onPay(order)}>
              {order.payment_method === 'cash_on_delivery' ? '💵 Mark Paid' : '💰 Confirm Payment'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function CollapsibleSection({ title, icon, children, isOpen, onToggle }) {
  return (
    <div className="card" style={{overflow:'hidden', border:'1px solid var(--border)', background:'white'}}>
      <div className="card-header clickable" onClick={onToggle} style={{padding:'0.875rem 1.25rem', background:isOpen ? 'var(--bg-muted)' : 'white'}}>
        <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
           {icon && <span style={{fontSize:'1.1rem'}}>{icon}</span>}
           <h4 style={{fontSize:'0.9rem', flex:1}}>{title}</h4>
        </div>
        <span style={{fontSize:'0.75rem', opacity:0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s'}}>▼</span>
      </div>
      {isOpen && <div className="card-body" style={{padding:'1rem 1.25rem'}}>{children}</div>}
    </div>
  );
}