import { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { Spinner } from '../components/UI';
import { getLocations } from '../services/api';

export default function Login() {
  const { signIn } = useAuth();
  const [form, setForm]   = useState({ email: '', password: '', location_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(true);

  useEffect(() => {
    // Fetch locations for super admin selection
    getLocations()
      .then(r => setLocations(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingLocs(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setError(''); setLoading(true);
    const res = await signIn(form.email, form.password, form.location_id ? parseInt(form.location_id) : undefined);
    setLoading(false);
    if (!res.ok) setError(res.message || 'Invalid credentials');
  };

  return (
    <div className="login-page">
      {/* Background glows */}
      <div className="login-bg-glow" style={{ width: 500, height: 500, top: '10%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(224,85,40,0.08) 0%, transparent 65%)' }} />
      <div className="login-bg-glow" style={{ width: 300, height: 300, bottom: '5%', right: '10%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 65%)', animationDelay: '4s' }} />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🍕</div>
          <h1>PizzaHap</h1>
          <p>Admin Command Center</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div className="form-group">
            <label className="form-label">Email Address<span className="req">*</span></label>
            <input className="input" type="email" value={form.email} onChange={set('email')}
              placeholder="admin@pizzahap.com" required autoFocus autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label">Password<span className="req">*</span></label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                placeholder="••••••••" required autoComplete="current-password"
                style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Branch Location
              <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>optional — super admin only</span>
            </label>
            {loadingLocs ? (
              <div className="input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <Spinner className="spinner-sm" /> Loading locations...
              </div>
            ) : (
              <select className="input" value={form.location_id} onChange={set('location_id')}>
                <option value="">All branches (super admin)</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.city ? `— ${loc.city}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="error-box">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '0.25rem', justifyContent: 'center' }} disabled={loading}>
            {loading ? <><Spinner /> Signing in…</> : <><span>Sign In</span><span>→</span></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          PizzaHap Admin Panel · v3.0
        </p>
      </div>
    </div>
  );
}
