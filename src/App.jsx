import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, ToastProvider, useAuth } from './context';
import { getNotifications } from './services/api';

import Sidebar     from './components/Sidebar';
import Header      from './components/Header';
import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Orders      from './pages/Orders';
import InHouse     from './pages/InHouse';
import { Users, Menu, Toppings, Locations, Coupons } from './pages/Entities';
import { Refunds, Support, Notifications } from './pages/Misc';

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread]       = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = () => {
      getNotifications()
        .then(r => { if(!cancelled) setUnread(r.data?.unread_count || 0); })
        .catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} unreadCount={unread} />
      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Header unreadCount={unread} onNotifClick={() => navigate('/notifications')} />
        <div className="page-body">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/orders"        element={<Orders />} />
            <Route path="/inhouse"       element={<InHouse />} />
            <Route path="/users"         element={<Users />} />
            <Route path="/menu"          element={<Menu />} />
            <Route path="/toppings"      element={<Toppings />} />
            <Route path="/locations"     element={<Locations />} />
            <Route path="/coupons"       element={<Coupons />} />
            <Route path="/refunds"       element={<Refunds />} />
            <Route path="/support"       element={<Support />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Guard({ children }) {
  const { admin } = useAuth();
  return admin ? children : <Navigate to="/login" replace />;
}

function LoginGuard() {
  const { admin } = useAuth();
  return admin ? <Navigate to="/" replace /> : <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginGuard />} />
      <Route path="/*"     element={<Guard><Layout /></Guard>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
