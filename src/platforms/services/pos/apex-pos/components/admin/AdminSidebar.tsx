import React from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Table, Users,
  BarChart3, Settings, ShoppingCart, LogOut,
} from 'lucide-react';

export type AdminSection = 'dashboard' | 'menu' | 'orders' | 'tables' | 'employees' | 'analytics' | 'inventory' | 'settings' | 'shifts';

interface AdminSidebarProps {
  storeName: string;
  section: AdminSection;
  pendingCount: number;
  lowStockCount: number;
  onSelectSection: (section: AdminSection) => void;
  onOpenTerminal: () => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  storeName,
  section,
  pendingCount,
  lowStockCount,
  onSelectSection,
  onOpenTerminal,
  onLogout,
}) => {
  const items: Array<{ id: AdminSection; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    { id: 'menu', label: 'Menu', icon: <Package size={18} /> },
    { id: 'tables', label: 'Tables', icon: <Table size={18} /> },
    { id: 'employees', label: 'Employees', icon: <Users size={18} /> },
    { id: 'shifts', label: 'Shifts', icon: <Table size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="apex-admin__sidebar">
      <div className="apex-admin__brand">
        <div className="apex-admin__brand-name">
          <ShoppingCart size={18} />
          {storeName} POS
        </div>
      </div>
      <nav className="apex-admin__nav">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectSection(item.id)}
            className={`apex-admin__nav-btn ${section === item.id ? 'active' : ''}`}
            aria-current={section === item.id ? 'page' : undefined}
          >
            {item.icon}
            {item.label}
            {item.id === 'orders' && pendingCount > 0 && (
              <span className="apex-badge apex-badge--danger" style={{ marginLeft: 'auto' }}>
                {pendingCount}
              </span>
            )}
            {item.id === 'inventory' && lowStockCount > 0 && (
              <span className="apex-badge apex-badge--warning" style={{ marginLeft: 'auto' }}>
                {lowStockCount}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid #334159' }}>
        <button className="apex-admin__nav-btn" onClick={onOpenTerminal}>
          <Table size={18} />
          Open Terminal
        </button>
        <button className="apex-admin__nav-btn" onClick={onLogout}>
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
