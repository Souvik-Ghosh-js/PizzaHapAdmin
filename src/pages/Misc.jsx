import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getRefunds, processRefund,
  getSupportTickets, replyToTicket,
  getNotifications, markAllNotifsRead, markOneNotifRead, broadcastNotification,
} from '../services/api';
import { Badge, Pagination, Select, Spinner, EmptyState, Modal, Field, PageHeader, Avatar, Tabs } from '../components/UI';
import { fmt, statusLabel } from '../utils';
import { useToast } from '../context';

// ═══════════════════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════════════════
export function Refunds() {
  const toast = useToast();
  const [refunds, setRefunds] = useState([]);
  const [loading, setL]       = useState(true);
  const [status, setStatus]   = useState('');
  const [modal, setModal]     = useState(null);
  const [notes, setNotes]     = useState('');
  const [acting, setActing]   = useState(false);

  const load = async (s=status) => {
    setL(true);
    try { const r=await getRefunds(s); setRefunds(r.data||[]); }
    catch(e) { toast(e.message,'error'); }
    finally { setL(false); }
  };

  useEffect(()=>{ load(); },[status]);

  const handle = async (action) => {
    setActing(true);
    try {
      await processRefund(modal.id, action, notes||undefined);
      toast(`Refund ${action==='approve'?'approved':'rejected'}`,'success');
      setModal(null); setNotes(''); load();
    } catch(e) { toast(e.message,'error'); }
    finally { setActing(false); }
  };

  const STATUS_OPTS=[{value:'pending',label:'Pending'},{value:'processing',label:'Processing'},{value:'completed',label:'Completed'},{value:'failed',label:'Failed'}];
  const PRIORITY_COLOR = { pending:'var(--amber)', processing:'var(--blue)', completed:'var(--green)', failed:'var(--red)' };

  return (
    <div className="page-enter">
      <PageHeader title="Refunds" subtitle="Process customer refund requests"
        actions={<Select value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="All Statuses" style={{minWidth:150}}/>}
      />
      <div className="card">
        {loading ? <div className="loading-center"><Spinner/></div>
          : refunds.length===0 ? <EmptyState icon="↩️" title="No refunds found"/>
          : <div className="table-wrap"><table>
              <thead><tr>
                <th>Order</th><th>Customer</th><th>Amount</th>
                <th>Reason</th><th>Status</th><th>Date</th><th>Action</th>
              </tr></thead>
              <tbody>
                {refunds.map(r=>(
                  <tr key={r.id}>
                    <td>
                      <div className="font-semi text-accent" style={{fontSize:'0.8rem'}}>{r.order_number}</div>
                      {r.coins_earned>0 && <div className="text-xs text-amber">🪙 {r.coins_earned} coins to revert</div>}
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                        <Avatar name={r.user_name} size={28}/>
                        <div>
                          <div className="font-semi text-sm">{r.user_name}</div>
                          <div className="text-xs text-muted">{r.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-bold">{fmt.currency(r.amount)}</span></td>
                    <td><div className="text-sm text-secondary truncate" style={{maxWidth:180}}>{r.reason||'—'}</div></td>
                    <td><Badge status={r.status}>{statusLabel(r.status)}</Badge></td>
                    <td><span className="text-xs text-muted">{fmt.datetime(r.requested_at)}</span></td>
                    <td>
                      {r.status==='pending' && (
                        <button className="btn btn-sm btn-primary" onClick={()=>{setModal(r);setNotes('');}}>Review</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
        }
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title="Process Refund Request"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(null)} disabled={acting}>Cancel</button>
          <button className="btn btn-danger" onClick={()=>handle('reject')} disabled={acting}>
            {acting?<Spinner className="spinner-sm"/>:'Reject'}
          </button>
          <button className="btn btn-success" onClick={()=>handle('approve')} disabled={acting}>
            {acting?<Spinner className="spinner-sm"/>:'Approve & Refund'}
          </button>
        </>}>
        {modal&&(
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div style={{background:'var(--bg-elevated)',border:'1px solid var(--border-md)',borderRadius:'var(--r-md)',padding:'1rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span className="text-xs text-muted">Order</span>
                <span className="font-semi text-accent">{modal.order_number}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span className="text-xs text-muted">Refund Amount</span>
                <span className="font-bold" style={{fontSize:'1.125rem'}}>{fmt.currency(modal.amount)}</span>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Customer Reason</div>
                <p className="text-sm text-secondary" style={{lineHeight:1.5}}>{modal.reason||'—'}</p>
              </div>
              {modal.coins_earned>0 && (
                <div style={{marginTop:10,padding:'0.5rem 0.75rem',background:'var(--amber-dim)',border:'1px solid var(--amber-border)',borderRadius:'var(--r-sm)',fontSize:'0.8rem',color:'var(--amber)',display:'flex',gap:6,alignItems:'center'}}>
                  <span>⚠</span>
                  <span>Approving will revert <strong>{modal.coins_earned}</strong> coins from user wallet</span>
                </div>
              )}
            </div>
            <Field label="Admin Notes (optional)">
              <textarea className="input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Reason for your decision…" rows={2}/>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUPPORT
// ═══════════════════════════════════════════════════════
export function Support() {
  const toast = useToast();
  const [tickets, setTickets]   = useState([]);
  const [pag, setPag]           = useState(null);
  const [loading, setL]         = useState(true);
  const [tab, setTab]           = useState('open');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const [reply, setReply]       = useState('');
  const [newStatus, setNewSt]   = useState('');
  const [sending, setSending]   = useState(false);

  const load = async (t=tab, p=page) => {
    setL(true);
    try {
      const r=await getSupportTickets({ status:t==='all'?'':t, page:p, limit:20 });
      setTickets(r.data||[]); setPag(r.pagination);
    } catch(e) { toast(e.message,'error'); }
    finally { setL(false); }
  };

  useEffect(()=>{ load(); },[tab,page]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyToTicket(selected.id, reply, newStatus||undefined);
      toast('Reply sent','success');
      const sentMsg = { id:Date.now(), sender_role:'admin', message:reply, created_at:new Date().toISOString() };
      setSelected(s=>({...s, messages:[...(s.messages||[]),sentMsg], status:newStatus||s.status }));
      setReply(''); setNewSt('');
      load();
    } catch(e) { toast(e.message,'error'); }
    finally { setSending(false); }
  };

  const PRIORITY_COLOR = { low:'var(--blue)', medium:'var(--amber)', high:'#fb923c', urgent:'var(--red)' };
  const STATUS_OPTS=[{value:'in_progress',label:'In Progress'},{value:'resolved',label:'Resolved'},{value:'closed',label:'Closed'}];
  const TABS = [
    {value:'open',label:'Open'},{value:'in_progress',label:'In Progress'},
    {value:'resolved',label:'Resolved'},{value:'closed',label:'Closed'},{value:'all',label:'All'},
  ];

  return (
    <div className="page-enter">
      <PageHeader title="Support Tickets"/>
      <div className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={t=>{setTab(t);setPage(1);setSelected(null);}}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 420px':'1fr',gap:'1.25rem',alignItems:'start'}}>
        <div className="card">
          {loading ? <div className="loading-center"><Spinner/></div>
            : tickets.length===0 ? <EmptyState icon="💬" title="No tickets" subtitle={`No ${tab==='all'?'':tab} tickets`}/>
            : <>
              <div className="table-wrap"><table>
                <thead><tr>
                  <th>Ticket</th><th>User</th><th>Category</th>
                  <th>Priority</th><th>Status</th><th>Created</th>
                </tr></thead>
                <tbody>
                  {tickets.map(t=>(
                    <tr key={t.id} className={`clickable ${selected?.id===t.id?'selected':''}`} onClick={()=>setSelected(t)}>
                      <td>
                        <div className="font-semi text-accent" style={{fontSize:'0.8rem'}}>{t.ticket_number}</div>
                        <div className="text-xs text-secondary truncate" style={{maxWidth:190}}>{t.subject}</div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                          <Avatar name={t.user_name} size={26}/>
                          <div>
                            <div className="font-semi text-sm">{t.user_name}</div>
                            <div className="text-xs text-muted">{t.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-sm text-secondary" style={{textTransform:'capitalize'}}>{(t.category||'').replace(/_/g,' ')}</span></td>
                      <td>
                        <span style={{fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:PRIORITY_COLOR[t.priority]||'var(--text-muted)'}}>
                          {t.priority}
                        </span>
                      </td>
                      <td><Badge status={t.status}>{statusLabel(t.status)}</Badge></td>
                      <td><span className="text-xs text-muted">{fmt.datetime(t.created_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <Pagination pagination={pag} onPage={setPage}/>
            </>}
        </div>

        {selected && (
          <div className="card" style={{position:'sticky',top:'calc(var(--header-h) + 1.75rem)',display:'flex',flexDirection:'column',maxHeight:'80vh'}}>
            <div className="card-header">
              <div>
                <div className="font-bold text-accent" style={{fontSize:'0.875rem'}}>{selected.ticket_number}</div>
                <div className="text-sm text-secondary mt-1 truncate" style={{maxWidth:240}}>{selected.subject}</div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <Badge status={selected.status}>{statusLabel(selected.status)}</Badge>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setSelected(null)}>✕</button>
              </div>
            </div>

            <div style={{flex:1,overflowY:'auto',padding:'1rem'}}>
              {(selected.messages||[]).length===0
                ? <p className="text-sm text-muted" style={{textAlign:'center',padding:'1.5rem 0'}}>No messages yet</p>
                : (selected.messages||[]).map((m,i)=>(
                  <div key={i} style={{marginBottom:'0.875rem',display:'flex',flexDirection:'column',alignItems:m.sender_role==='admin'?'flex-end':'flex-start'}}>
                    <div style={{
                      maxWidth:'86%',padding:'0.625rem 0.875rem',lineHeight:1.5,fontSize:'0.8125rem',
                      background:m.sender_role==='admin'?'var(--accent-dim)':'var(--bg-elevated)',
                      border:`1px solid ${m.sender_role==='admin'?'var(--border-accent)':'var(--border)'}`,
                      borderRadius:m.sender_role==='admin'?'12px 12px 4px 12px':'12px 12px 12px 4px',
                      color:'var(--text-secondary)',
                    }}>
                      {m.message}
                    </div>
                    <span className="text-xs text-muted" style={{marginTop:4}}>
                      {m.sender_role==='admin'?'You':(m.sender_name||'User')} · {fmt.relative(m.created_at)}
                    </span>
                  </div>
                ))
              }
            </div>

            <div style={{padding:'0.875rem',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:'0.625rem'}}>
              <textarea className="input" value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write your reply…" rows={3}
                onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) sendReply(); }}/>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                <select className="input" style={{flex:1}} value={newStatus} onChange={e=>setNewSt(e.target.value)}>
                  <option value="">Keep status</option>
                  {STATUS_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button className="btn btn-primary" onClick={sendReply} disabled={sending||!reply.trim()}>
                  {sending?<Spinner className="spinner-sm"/>:'Send'}
                </button>
              </div>
              <div className="text-xs text-muted" style={{textAlign:'right'}}>Ctrl+Enter to send</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════
export function Notifications() {
  const toast = useToast();
  const navigate = useNavigate();
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setL]       = useState(true);
  const [bModal, setBM]       = useState(false);
  const [bForm, setBForm]     = useState({ title:'', message:'', type:'promo', user_ids_raw:'' });
  const [sending, setSending] = useState(false);
  const [tab, setTab]         = useState('all');

  const load = async () => {
    setL(true);
    try {
      const r=await getNotifications();
      setNotifs(r.data?.notifications||[]);
      setUnread(r.data?.unread_count||0);
    } catch(e) { toast(e.message,'error'); }
    finally { setL(false); }
  };
  useEffect(()=>{ load(); },[]);

  const markAll = async () => {
    try {
      await markAllNotifsRead();
      setNotifs(n=>n.map(x=>({...x,is_read:true}))); setUnread(0);
      toast('All marked as read','success');
    } catch(e) { toast(e.message,'error'); }
  };

  const markOne = async (id) => {
    try {
      await markOneNotifRead(id);
      setNotifs(n=>n.map(x=>x.id===id?{...x,is_read:true}:x));
      setUnread(u=>Math.max(0,u-1));
    } catch {}
  };

  const handleNotifClick = (n) => {
    if (!n.is_read) markOne(n.id);
    
    // If notification has order data, navigate to orders with order_id
    if (n.type === 'order' && n.data?.order_id) {
      navigate('/orders', { state: { openOrderId: n.data.order_id } });
    } else if (n.type === 'payment' && n.data?.order_id) {
      navigate('/orders', { state: { openOrderId: n.data.order_id } });
    } else if (n.type === 'refund') {
      navigate('/refunds');
    }
  };

  const broadcast = async () => {
    if (!bForm.title||!bForm.message) { toast('Title and message required','warning'); return; }
    setSending(true);
    try {
      const user_ids = bForm.user_ids_raw
        ? bForm.user_ids_raw.split(',').map(s=>parseInt(s.trim())).filter(Boolean)
        : undefined;
      const r = await broadcastNotification({ title:bForm.title, message:bForm.message, type:bForm.type, ...(user_ids?.length?{user_ids}:{}) });
      toast(`Sent to ${r.data?.sent_to||0} users`,'success');
      setBM(false); setBForm({title:'',message:'',type:'promo',user_ids_raw:''});
    } catch(e) { toast(e.message,'error'); }
    finally { setSending(false); }
  };

  const EMOJI = { order:'📦', payment:'💳', system:'⚙️', refund:'↩️', promo:'🎁' };
  const filtered = tab==='unread' ? notifs.filter(n=>!n.is_read) : notifs;
  const TABS=[{value:'all',label:'All',count:notifs.length},{value:'unread',label:'Unread',count:unread}];

  return (
    <div className="page-enter">
      <PageHeader title="Notifications"
        actions={<>
          {unread>0 && <button className="btn btn-ghost" onClick={markAll}>✓ Mark all read</button>}
          <button className="btn btn-primary" onClick={()=>setBM(true)}>📢 Broadcast</button>
        </>}
      />

      <div className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab}/>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><Spinner/></div>
          : filtered.length===0 ? <EmptyState icon="🔔" title="No notifications" subtitle={tab==='unread'?'All caught up!':'No notifications yet'}/>
          : <div>
              {filtered.map((n,i)=>(
                <div key={n.id} onClick={() => handleNotifClick(n)}
                  style={{
                    display:'flex', gap:'0.875rem', padding:'1rem 1.25rem',
                    borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',
                    background:!n.is_read?'rgba(224,85,40,0.04)':'transparent',
                    cursor:'pointer',
                    transition:'background var(--dur-fast)',
                  }}
                  onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-elevated)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=!n.is_read?'rgba(224,85,40,0.04)':'transparent'; }}
                >
                  <div style={{width:42,height:42,borderRadius:11,background:'var(--bg-elevated)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.125rem',flexShrink:0}}>
                    {EMOJI[n.type]||'🔔'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontWeight:n.is_read?500:700,fontSize:'0.875rem'}}>{n.title}</span>
                      <span className="text-xs text-muted nowrap" style={{marginLeft:12}}>{fmt.relative(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-secondary" style={{lineHeight:1.5}}>{n.message}</p>
                    {n.location_id&&<span className="text-xs text-muted mt-1" style={{display:'block'}}>📍 Location #{n.location_id}</span>}
                    {(n.type === 'order' || n.type === 'payment' || n.type === 'refund') && (
                      <div className="text-xs" style={{marginTop:6,color:'var(--orange)',fontWeight:600}}>
                        Click to view →
                      </div>
                    )}
                  </div>
                  {!n.is_read&&<div style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)',marginTop:8,flexShrink:0,boxShadow:'0 0 6px var(--accent-glow)'}}/>}
                </div>
              ))}
            </div>
        }
      </div>

      <Modal open={bModal} onClose={()=>setBM(false)} title="📢 Broadcast to Users"
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setBM(false)} disabled={sending}>Cancel</button>
          <button className="btn btn-primary" onClick={broadcast} disabled={sending}>
            {sending?<><Spinner className="spinner-sm"/>Sending…</>:'Send Broadcast'}
          </button>
        </>}>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{background:'var(--amber-dim)',border:'1px solid var(--amber-border)',borderRadius:'var(--r-md)',padding:'0.75rem 1rem',fontSize:'0.8rem',color:'var(--amber)',display:'flex',gap:6,alignItems:'flex-start'}}>
            <span>⚠</span>
            <span>Leave "Target Users" empty to broadcast to <strong>all active users</strong>.</span>
          </div>
          <Field label="Title" required>
            <input className="input" value={bForm.title} onChange={e=>setBForm(f=>({...f,title:e.target.value}))} placeholder="Weekend Special Offer!"/>
          </Field>
          <Field label="Message" required>
            <textarea className="input" value={bForm.message} onChange={e=>setBForm(f=>({...f,message:e.target.value}))} rows={3} placeholder="Get 20% off on all large pizzas this weekend…"/>
          </Field>
          <div className="grid-2">
            <Field label="Notification Type">
              <select className="input" value={bForm.type} onChange={e=>setBForm(f=>({...f,type:e.target.value}))}>
                <option value="promo">Promo</option>
                <option value="system">System</option>
                <option value="order">Order</option>
              </select>
            </Field>
            <Field label="Target User IDs" hint="Comma separated, e.g. 1,2,3">
              <input className="input" value={bForm.user_ids_raw} onChange={e=>setBForm(f=>({...f,user_ids_raw:e.target.value}))} placeholder="Leave empty for all"/>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
