import { useState } from 'react';
import { useAuth } from '../context';
import { Spinner } from '../components/UI';

export default function Login() {
  const { signIn, selectLocation, pendingLogin, locations, loadingLocs, loading } = useAuth();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Step 1: email + password
  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setError('');
    const res = await signIn(form.email, form.password);
    if (!res.ok) setError(res.message || 'Invalid credentials');
  };

  // Step 2: location picker (super_admin only)
  const chooseLocation = async (location_id) => {
    await selectLocation(location_id || null);
  };

  // ── Location picker screen ────────────────────────────────────
  if (pendingLogin) {
    return (
      <div className="login-page">
        <div className="login-bg-glow" style={{ width: 500, height: 500, top: '10%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(204,31,31,0.09) 0%, transparent 65%)' }} />
        <div className="login-card" style={{ maxWidth: 480 }}>
          <div className="login-logo">
            <div className="login-logo-icon">📍</div>
            <h1>Select Branch</h1>
            <p>Welcome, {pendingLogin.adminData.name}. Choose a location to manage.</p>
          </div>

          {loadingLocs ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem', color: 'var(--text-muted)' }}>
              <Spinner /> Loading locations…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {/* All branches option for super admin */}
              <button
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', padding: '0.875rem 1rem', textAlign: 'left', gap: '0.75rem', border: '1px solid var(--border-md)', borderRadius: 'var(--r-md)' }}
                onClick={() => chooseLocation(null)}
              >
                <span style={{ fontSize: '1.25rem' }}>🌐</span>
                <div>
                  <div className="font-semi" style={{ fontSize: '0.875rem' }}>All Branches</div>
                  <div className="text-xs text-muted">Super admin — view all locations</div>
                </div>
              </button>

              {locations.map(loc => (
                <button
                  key={loc.id}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '0.875rem 1rem', textAlign: 'left', gap: '0.75rem', border: '1px solid var(--border-md)', borderRadius: 'var(--r-md)' }}
                  onClick={() => chooseLocation(loc.id)}
                >
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <div style={{ flex: 1 }}>
                    <div className="font-semi" style={{ fontSize: '0.875rem' }}>{loc.name}</div>
                    <div className="text-xs text-muted">{[loc.city, loc.address].filter(Boolean).join(' · ').slice(0, 50)}</div>
                  </div>
                  {!loc.is_active && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4 }}>Inactive</span>}
                </button>
              ))}

              {locations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No locations found. Continuing with all-branch access.
                  <br />
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => chooseLocation(null)}>
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}
            onClick={() => { /* go back */ window.location.reload(); }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  // ── Login form ────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-bg-glow" style={{ width: 500, height: 500, top: '10%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(204,31,31,0.08) 0%, transparent 65%)' }} />
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
                placeholder="••••••••" required autoComplete="current-password" style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', cursor: 'pointer' }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-box">
              <span>✕</span><span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '0.25rem', justifyContent: 'center' }} disabled={loading}>
            {loading ? <><Spinner /> Signing in…</> : <><span>Sign In</span><span>→</span></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          PizzaHap Admin Panel · v4.0
        </p>
      </div>
    </div>
  );
}
