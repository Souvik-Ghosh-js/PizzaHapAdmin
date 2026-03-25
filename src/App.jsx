import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, ToastProvider, useAuth } from './context';
import { getNotifications } from './services/api';

import Sidebar   from './components/Sidebar';
import Header    from './components/Header';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders    from './pages/Orders';
import InHouse   from './pages/InHouse';
import { Users, Menu, Categories, Crusts, Toppings, Locations, Coupons } from './pages/Entities';
import { Refunds, Support, Notifications } from './pages/Misc';
import Riders from './pages/Riders';
import Reviews from './pages/Reviews';
import SalesReport from './pages/SalesReport';

function Layout() {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread]         = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = () => {
      getNotifications()
        .then(r => { if (!cancelled) setUnread(r.data?.unread_count || 0); })
        .catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} unreadCount={unread}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Header unreadCount={unread} onNotifClick={() => navigate('/notifications')}
          onMenuClick={() => setMobileOpen(o => !o)} />
        <div className="page-body">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/orders"        element={<Orders />} />
            <Route path="/inhouse"       element={<InHouse />} />
            <Route path="/users"         element={<Users />} />
            <Route path="/menu"          element={<Menu />} />
            <Route path="/categories"    element={<Categories />} />
            <Route path="/crusts"        element={<Crusts />} />
            <Route path="/toppings"      element={<Toppings />} />
            <Route path="/locations"     element={<Locations />} />
            <Route path="/coupons"       element={<Coupons />} />
            <Route path="/riders"        element={<Riders />} />
            <Route path="/refunds"       element={<Refunds />} />
            <Route path="/support"       element={<Support />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/sales-report"  element={<SalesReport />} />
            <Route path="/reviews"       element={<Reviews />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <MobileBottomNav onMoreClick={() => setMobileOpen(o => !o)} unread={unread} />
      </div>
    </div>
  );
}

const BOTTOM_TABS = [
  { to: '/',        icon: '◈',  label: 'Home'    },
  { to: '/orders',  icon: '📦', label: 'Orders'  },
  { to: '/inhouse', icon: '🧾', label: 'Billing' },
  { to: '/menu',    icon: '🍕', label: 'Menu'    },
];

function MobileBottomNav({ onMoreClick, unread }) {
  const { pathname } = useLocation();
  const isActive = (to) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <nav className="mobile-bottom-nav">
      {BOTTOM_TABS.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} className={`mobile-tab ${isActive(to) ? 'active' : ''}`}>
          <span className="mobile-tab-icon">{icon}</span>
          <span className="mobile-tab-label">{label}</span>
        </NavLink>
      ))}
      <button className="mobile-tab" onClick={onMoreClick}>
        <span className="mobile-tab-icon" style={{ position: 'relative' }}>
          ☰
          {unread > 0 && <span className="mobile-tab-dot" />}
        </span>
        <span className="mobile-tab-label">More</span>
      </button>
    </nav>
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
