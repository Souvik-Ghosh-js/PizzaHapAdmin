import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { login as apiLogin, setToken, clearToken, getToken } from '../services/api';

// ── Auth ──────────────────────────────────────────────────
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_info') || 'null'); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) { setAdmin(null); localStorage.removeItem('admin_info'); }
  }, []);

  const signIn = async (email, password, location_id) => {
    setLoading(true);
    try {
      const res = await apiLogin(email, password, location_id);
      setToken(res.data.token);
      setAdmin(res.data.admin);
      localStorage.setItem('admin_info', JSON.stringify(res.data.admin));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    } finally { setLoading(false); }
  };

  const signOut = () => {
    clearToken();
    setAdmin(null);
  };

  return <AuthCtx.Provider value={{ admin, loading, signIn, signOut }}>{children}</AuthCtx.Provider>;
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
