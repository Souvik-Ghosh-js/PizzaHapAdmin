import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context';

/* ── Inline SVG Icon helper ─────────────────────────────── */
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)
      ? d.map((seg, i) => <path key={i} d={seg} />)
      : <path d={d} />}
  </svg>
);

const ICONS = {
  dashboard:     ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  orders:        ['M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2','M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2','M12 12h.01','M12 16h.01','M8 12h.01','M8 16h.01','M16 12h.01','M16 16h.01'],
  inhouse:       ['M3 3h18v18H3z','M3 9h18','M9 21V9'],
  categories:    ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  products:      ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z','M7 7h.01'],
  crusts:        ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z','M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  toppings:      ['M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 13.98 5 22 8 22c1.25 0 2.5-1.06 4-1.06z','M10 2c1 .5 2 2 2 5'],
  locations:     ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z','M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  coupons:       ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z','M7 7h.01'],
  users:         ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
  riders:        ['M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5','M14 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0','M5 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0'],
  refunds:       ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8','M3 3v5h5'],
  support:       ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  notifications: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'],
  mapPin:        ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z','M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  signout:       ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'],
  chevronLeft:   'M15 18l-6-6 6-6',
  chevronRight:  'M9 18l6-6-6-6',
  reviews:       'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  sales:         'M18 20V10M12 20V4M6 20v-6'
};

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/',        icon: 'dashboard',     label: 'Dashboard' },
      { to: '/orders',  icon: 'orders',        label: 'Orders'    },
      { to: '/inhouse', icon: 'inhouse',       label: 'In-House'  },
    ]
  },
  {
    label: 'Catalog',
    items: [
      { to: '/categories', icon: 'categories', label: 'Categories' },
      { to: '/menu',       icon: 'products',   label: 'Products'   },
      { to: '/crusts',     icon: 'crusts',     label: 'Crust Types'},
      { to: '/toppings',   icon: 'toppings',   label: 'Toppings'   },
      { to: '/locations',  icon: 'locations',  label: 'Locations'  },
      { to: '/coupons',    icon: 'coupons',    label: 'Coupons'    },
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/users',         icon: 'users',         label: 'Users'         },
      { to: '/riders',        icon: 'riders',        label: 'Riders'        },
      { to: '/refunds',       icon: 'refunds',       label: 'Refunds'       },
      { to: '/support',       icon: 'support',       label: 'Support'       },
      { to: '/sales-report',  icon: 'sales',         label: 'Sales Report'  },
      { to: '/reviews',       icon: 'reviews',       label: 'User Reviews'  },
      { to: '/notifications', icon: 'notifications', label: 'Notifications' },
    ]
  },
];

export default function Sidebar({ collapsed, onToggle, unreadCount, mobileOpen, onMobileClose }) {
  const { admin, signOut } = useAuth();
  const { pathname } = useLocation();
  const isActive = (to) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img src="/logo.png" alt="PizzaHap" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <strong>PizzaHap</strong>
              <span>Admin Panel</span>
            </div>
          )}
          <button className="collapse-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
            <Icon d={collapsed ? ICONS.chevronRight : ICONS.chevronLeft} size={15} />
          </button>
        </div>

        {/* Location chip */}
        {!collapsed && (
          <div className="sidebar-location">
            <div className="location-chip">
              <Icon d={ICONS.mapPin} size={12} />
              <span className="truncate">{admin?.location_name || 'All Branches'}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map(sec => (
            <div className="nav-section" key={sec.label}>
              {!collapsed && <div className="nav-section-label">{sec.label}</div>}
              {sec.items.map(({ to, icon, label }) => {
                const active   = isActive(to);
                const hasNotif = to === '/notifications' && unreadCount > 0;
                return (
                  <NavLink
                    key={to} to={to}
                    className={`nav-item ${active ? 'active' : ''}`}
                    title={collapsed ? label : undefined}
                    onClick={() => { if (collapsed) onToggle(); onMobileClose?.(); }}
                  >
                    <span className="nav-icon"><Icon d={ICONS[icon]} size={17} /></span>
                    {!collapsed && <span className="nav-label">{label}</span>}
                    {hasNotif && !collapsed && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    {hasNotif && collapsed && (
                      <span style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, background: 'var(--accent)', borderRadius: '50%' }} />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed ? (
            <>
              <div className="admin-card">
                <div className="admin-avatar">{(admin?.name || 'A').charAt(0).toUpperCase()}</div>
                <div className="admin-info">
                  <div className="admin-name">{admin?.name || 'Admin'}</div>
                  <div className="admin-role">{(admin?.role || '').replace(/_/g, ' ')}</div>
                </div>
              </div>
              <button className="signout-btn" onClick={signOut}>
                <Icon d={ICONS.signout} size={15} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button className="signout-btn-collapsed" onClick={signOut} title="Sign out">
              <Icon d={ICONS.signout} size={17} />
            </button>
          )}
        </div>

      </aside>
    </>
  );
}
