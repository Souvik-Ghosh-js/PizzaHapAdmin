import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context';

const TITLES = {
  '/': 'Dashboard', '/orders': 'Orders', '/inhouse': 'In-House Billing',
  '/users': 'Users', '/menu': 'Products', '/toppings': 'Toppings',
  '/locations': 'Locations', '/coupons': 'Coupons', '/refunds': 'Refunds',
  '/support': 'Support', '/notifications': 'Notifications',
};

export default function Header({ unreadCount, onNotifClick }) {
  const { pathname } = useLocation();
  const { admin } = useAuth();
  const key = Object.keys(TITLES).find(k => k === '/' ? pathname === '/' : pathname.startsWith(k)) || '/';

  return (
    <header className="app-header">
      <div className="header-title">{TITLES[key]}</div>
      <div className="header-actions">
        <button className="notif-btn" onClick={onNotifClick} title="Notifications">
          🔔
          {unreadCount > 0 && (
            <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <span className="role-chip">{(admin?.role || 'admin').replace(/_/g,' ')}</span>
      </div>
    </header>
  );
}
