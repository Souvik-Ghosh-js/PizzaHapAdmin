import { useEffect } from 'react';
import { statusLabel as sl } from '../utils';

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = '' }) {
  return <div className={`spinner ${size}`} />;
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ status, children, className = '' }) {
  const s = (status || '').toLowerCase().replace(/\s+/g,'_');
  return <span className={`badge badge-${s} ${className}`}>{children || sl(s)}</span>;
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Confirm ───────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message, danger = false, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirm'}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
          {loading ? <><Spinner className="spinner-sm" /> Processing…</> : 'Confirm'}
        </button>
      </>}>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ── Pagination ────────────────────────────────────────────
export function Pagination({ pagination, onPage }) {
  if (!pagination) return null;
  const { page, total, limit, totalPages } = pagination;
  const from = Math.min((page - 1) * limit + 1, total);
  const to   = Math.min(page * limit, total);
  const range = 2;
  const pages = [];
  for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) pages.push(i);
  return (
    <div className="pagination">
      <span className="page-info">Showing {from}–{to} of {total.toLocaleString()}</span>
      <div className="page-btns">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
        {pages[0] > 1 && <><button className="page-btn" onClick={() => onPage(1)}>1</button>{pages[0] > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 3px', lineHeight: '30px' }}>…</span>}</>}
        {pages.map(p => <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>)}
        {pages[pages.length - 1] < totalPages && <><span style={{ color: 'var(--text-muted)', padding: '0 3px', lineHeight: '30px' }}>…</span><button className="page-btn" onClick={() => onPage(totalPages)}>{totalPages}</button></>}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>›</button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon || '📋'}</span>
      <h3>{title || 'Nothing here yet'}</h3>
      {subtitle && <p className="mt-1">{subtitle}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────
export function Field({ label, hint, children, required }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span className="req">*</span>}</label>}
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

// ── SearchInput ───────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-wrap">
      <svg className="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <input className="input" type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ value, onChange, options, placeholder = 'All', style }) {
  return (
    <select className="input" value={value} onChange={e => onChange(e.target.value)} style={style}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <div className="toggle-wrap" onClick={() => onChange(!checked)} role="switch" aria-checked={checked} tabIndex={0}
      onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && onChange(!checked)}>
      <div className={`toggle-track ${checked ? 'on' : ''}`}>
        <div className="toggle-thumb" />
      </div>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs-container">
      {tabs.map(t => (
        <button key={t.value} className={`tab-btn ${active === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ name, size = 32 }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = [...(name || '')].reduce((h, c) => (h + c.charCodeAt(0)) % 360, 0);
  return (
    <div className="avatar" style={{
      width: size, height: size,
      background: `hsl(${hue},50%,22%)`,
      borderColor: `hsl(${hue},55%,32%)`,
      fontSize: size * 0.34,
      color: `hsl(${hue},75%,72%)`,
    }}>{initials}</div>
  );
}

// ── KPI card ──────────────────────────────────────────────
export function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color || 'var(--accent)' }}>
      <div className="stat-card-glow" />
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── Page header ───────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-right">{actions}</div>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────
export function SectionCard({ title, actions, children, noPad }) {
  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <h4>{title}</h4>
          {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'card-body'}>{children}</div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────
export function InfoRow({ label, value, children }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{children ?? value ?? '—'}</span>
    </div>
  );
}

// ── Order progress ────────────────────────────────────────
const STEPS = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
const STEP_LABELS = ['Placed', 'Confirmed', 'Preparing', 'On Way', 'Delivered'];

export function OrderProgress({ status }) {
  const idx = STEPS.indexOf(status);
  const cancelled = ['cancelled', 'refunded', 'refund_requested'].includes(status);
  return (
    <div>
      <div className="order-steps">
        {STEPS.map((s, i) => {
          const done   = !cancelled && i <= idx;
          const active = !cancelled && i === idx;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div className={`step-node ${cancelled ? 'cancelled' : done ? 'done' : active ? 'active' : ''}`}>
                {done && i < idx ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${done && i < idx ? 'done' : ''}`} />}
            </div>
          );
        })}
      </div>
      {!cancelled && idx >= 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', padding: '0 2px' }}>
          {STEP_LABELS.map((l, i) => (
            <div key={l} style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: i <= idx ? 'var(--accent-bright)' : 'var(--text-muted)', textAlign: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>{l}</div>
          ))}
        </div>
      )}
      {cancelled && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>⊘ {sl(status)}</div>}
    </div>
  );
}