import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context';

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)
      ? d.map((seg, i) => <path key={i} d={seg} />)
      : <path d={d} />}
  </svg>
);

const ICONS = {
  bell:     ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'],
  menu:     ['M3 12h18','M3 6h18','M3 18h18'],
  back:     'M19 12H5M12 5l-7 7 7 7',
};

const TITLES = {
  '/': 'Dashboard', '/orders': 'Orders', '/inhouse': 'In-House Billing',
  '/users': 'Users', '/menu': 'Products', '/toppings': 'Toppings', '/crusts': 'Crust Types',
  '/categories': 'Categories', '/locations': 'Locations', '/coupons': 'Coupons',
  '/riders': 'Riders', '/refunds': 'Refunds', '/support': 'Support', '/notifications': 'Notifications',
};

export default function Header({ unreadCount, onNotifClick, onMenuClick }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { admin }    = useAuth();
  const key    = Object.keys(TITLES).find(k => k === '/' ? pathname === '/' : pathname.startsWith(k)) || '/';
  const isHome = pathname === '/';

  return (
    <header className="app-header">
      <div className="header-left">
        {!isHome && (
          <button className="back-btn mobile-only" onClick={() => navigate(-1)} aria-label="Go back">
            <Icon d={ICONS.back} size={18} />
          </button>
        )}
        <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <Icon d={ICONS.menu} size={20} />
        </button>
      </div>

      <div className="header-logo-wrap">
        <img src="/logo.png" alt="PizzaHap" className="header-logo-img" />
      </div>

      <div className="header-title">{TITLES[key]}</div>

      <div className="header-actions">
        <button className="notif-btn" onClick={onNotifClick} title="Notifications">
          <Icon d={ICONS.bell} size={19} />
          {unreadCount > 0 && (
            <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <span className="role-chip mobile-hide">{(admin?.role || 'admin').replace(/_/g,' ')}</span>
      </div>
    </header>
  );
}
