export const fmt = {
  currency: (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
  date: (s) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return s; }
  },
  datetime: (s) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return s; }
  },
  relative: (s) => {
    if (!s) return '—';
    const diff = Date.now() - new Date(s).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return fmt.date(s);
  },
  number: (v) => Number(v || 0).toLocaleString('en-IN'),
  // Convert JS Date to datetime-local input value
  toDatetimeLocal: (d) => {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    const pad = n => String(n).padStart(2,'0');
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  },
  // Parse datetime-local input to ISO string
  fromDatetimeLocal: (s) => s ? new Date(s).toISOString() : null,
};

export const statusLabel = (s) => {
  const map = {
    pending:'Pending', confirmed:'Confirmed', preparing:'Preparing',
    out_for_delivery:'Out for Delivery', delivered:'Delivered',
    cancelled:'Cancelled', refunded:'Refunded', refund_requested:'Refund Requested',
    paid:'Paid', failed:'Failed', pending_pay:'Pending',
    active:'Active', inactive:'Inactive', blocked:'Blocked',
    open:'Open', in_progress:'In Progress', resolved:'Resolved', closed:'Closed',
    low:'Low', medium:'Medium', high:'High', urgent:'Urgent',
    cash_on_delivery:'Cash on Delivery', online:'Online',
    processing:'Processing', completed:'Completed',
    earned:'Earned', redeemed:'Redeemed', reverted:'Reverted',
  };
  return map[s] || (s || '').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
};

export const debounce = (fn, ms) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export const clsx = (...args) => args.filter(Boolean).join(' ');
