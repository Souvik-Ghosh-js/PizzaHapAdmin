import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/',        icon: '◈',  label: 'Dashboard' },
      { to: '/orders',  icon: '📦', label: 'Orders'    },
      { to: '/inhouse', icon: '🧾', label: 'In-House'  },
    ]
  },
  {
    label: 'Catalog',
    items: [
      { to: '/categories', icon: '🗂️', label: 'Categories' },
      { to: '/menu',       icon: '🍕',  label: 'Products'   },
      { to: '/crusts',     icon: '🍞',  label: 'Crust Types'},
      { to: '/toppings',   icon: '🫑',  label: 'Toppings'   },
      { to: '/locations',  icon: '📍',  label: 'Locations'  },
      { to: '/coupons',    icon: '🎫',  label: 'Coupons'    },
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/users',         icon: '👥', label: 'Users'         },
      { to: '/refunds',       icon: '↩️', label: 'Refunds'       },
      { to: '/support',       icon: '💬', label: 'Support'       },
      { to: '/notifications', icon: '🔔', label: 'Notifications' },
    ]
  },
];

export default function Sidebar({ collapsed, onToggle, unreadCount }) {
  const { admin, signOut } = useAuth();
  const { pathname } = useLocation();
  const isActive = (to) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🍕</div>
        {!collapsed && (
          <div className="logo-text">
            <strong>PizzaHap</strong>
            <span>Admin Panel</span>
          </div>
        )}
        <button className="collapse-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Location chip */}
      {!collapsed && (
        <div className="sidebar-location">
          <div className="location-chip">
            <span>📍</span>
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
              const active    = isActive(to);
              const hasNotif  = to === '/notifications' && unreadCount > 0;
              return (
                <NavLink key={to} to={to} className={`nav-item ${active ? 'active' : ''}`}>
                  <span className="nav-icon">{icon}</span>
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
          <div className="admin-card">
            <div className="admin-avatar">{(admin?.name || 'A').charAt(0).toUpperCase()}</div>
            <div className="admin-info">
              <div className="admin-name">{admin?.name || 'Admin'}</div>
              <div className="admin-role">{(admin?.role || '').replace(/_/g, ' ')}</div>
            </div>
            <button className="logout-btn" onClick={signOut} title="Sign out">⎋</button>
          </div>
        ) : (
          <button className="logout-btn" onClick={signOut} title="Sign out" style={{ width: '100%', padding: '6px' }}>⎋</button>
        )}
      </div>
    </aside>
  );
}
