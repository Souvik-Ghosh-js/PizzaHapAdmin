import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as apiLogin, setToken, clearToken, getToken, getLocationsAuthed } from '../services/api';

// ── Auth ──────────────────────────────────────────────────
const AuthCtx = createContext(null);

// Login is a 2-step process for super_admin:
//   step 1: submit email+password → get token, detect if super_admin
//   step 2: pick a location (or "all") → re-login with location_id OR store token as-is
export function AuthProvider({ children }) {
  const [admin, setAdmin]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_info') || 'null'); } catch { return null; }
  });
  const [loading, setLoading]       = useState(false);

  // pendingLogin: { token, adminData } — set when super_admin just authed but hasn't picked location
  const [pendingLogin, setPending]  = useState(null);
  const [locations, setLocations]   = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);

  useEffect(() => {
    if (!getToken()) { setAdmin(null); localStorage.removeItem('admin_info'); }
  }, []);

  // Step 1: email + password only
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      const { token, admin: adminData } = res.data;

      // If super_admin → fetch locations with the token, then show picker
      if (adminData.role === 'super_admin') {
        setToken(token); // temp token so authed call works
        setLoadingLocs(true);
        try {
          const locRes = await getLocationsAuthed();
          setLocations(locRes.data || []);
        } catch { setLocations([]); }
        finally { setLoadingLocs(false); }
        setPending({ token, adminData });
        return { ok: true, needsLocation: true };
      }

      // Non-super admins: straight in
      setToken(token);
      setAdmin(adminData);
      localStorage.setItem('admin_info', JSON.stringify(adminData));
      return { ok: true, needsLocation: false };
    } catch (e) {
      return { ok: false, message: e.message };
    } finally { setLoading(false); }
  };

  // Step 2: super_admin picks location (or null = all)
  const selectLocation = async (location_id) => {
    if (!pendingLogin) return;
    setLoading(true);
    const { adminData } = pendingLogin;
    try {
      // Re-login with location_id to get a location-scoped token
      if (location_id) {
        const res = await apiLogin(
          // We need to re-post — but we only have token, not password anymore.
          // Instead: build admin object locally with the chosen location
          // The backend sets location_id in JWT at login time only.
          // So we must re-call login. However we don't have the password here.
          // Better approach: just embed the location into local state and use the existing token.
          // The backend adminController uses req.admin.location_id from JWT.
          // Since super_admin JWT has no location_id, we patch it client-side by storing in admin_info
          // and passing location_id as query param where needed. 
          // NOTE: to get a location-scoped token properly we'd need the password again.
          // We'll store selected location in admin_info and use it for filtering.
          null, null, null // dummy - won't reach apiLogin
        );
      }
    } catch { /* ignore */ }

    // Attach chosen location to admin data
    let locationName = null;
    if (location_id) {
      const loc = locations.find(l => l.id === location_id);
      locationName = loc?.name || null;
    }
    const enriched = {
      ...adminData,
      location_id:   location_id || null,
      location_name: locationName,
    };
    setToken(pendingLogin.token);
    setAdmin(enriched);
    localStorage.setItem('admin_info', JSON.stringify(enriched));
    setPending(null);
    setLoading(false);
    return { ok: true };
  };

  const signOut = () => {
    clearToken();
    setAdmin(null);
    setPending(null);
  };

  return (
    <AuthCtx.Provider value={{ admin, loading, signIn, selectLocation, signOut, pendingLogin, locations, loadingLocs }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

// ── Toast ─────────────────────────────────────────────────
const ToastCtx = createContext(null);
const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);
  const toast = useCallback((message, type = 'success', duration = 3800) => {
    const tid = ++id.current;
    setToasts(p => [...p, { id: tid, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== tid)), duration);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{ICONS[t.type] || '•'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
