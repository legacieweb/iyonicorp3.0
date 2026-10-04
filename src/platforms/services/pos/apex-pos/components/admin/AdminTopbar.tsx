import React from 'react';
import { RefreshCw, LogOut } from 'lucide-react';

interface AdminTopbarProps {
  title: string;
  onRefresh: () => void;
  onLogout: () => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ title, onRefresh, onLogout }) => {
  return (
    <header className="apex-admin__topbar">
      <h1>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          aria-label="Refresh"
          onClick={onRefresh}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
          }}
        >
          <RefreshCw size={16} />
        </button>
        <button
          aria-label="Sign out"
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
