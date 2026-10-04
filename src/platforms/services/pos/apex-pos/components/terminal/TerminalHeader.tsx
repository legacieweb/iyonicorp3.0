import React, { useState } from 'react';
import { LogOut, Users, Clock } from 'lucide-react';
import { PosEmployee, getRoleLabel, formatTime, PosShift } from '../../apexTypes';

interface TerminalHeaderProps {
  storeName: string;
  primaryColor: string;
  currentEmployee: PosEmployee | null;
  onSwitchEmployee: () => void;
  onLogout: () => void;
  activeShift: PosShift | null;
  onOpenShift: () => void;
  onCloseShift: () => void;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  storeName,
  primaryColor,
  currentEmployee,
  onSwitchEmployee,
  onLogout,
  activeShift,
  onOpenShift,
  onCloseShift,
}) => {
  return (
    <header
      className="apex-pos__topbar"
      style={{ '--apex-primary': primaryColor } as React.CSSProperties}
    >
      <div className="apex-pos__topbar-left">
        <div className="apex-pos__terminal-name">{storeName}</div>
        <div className="apex-pos__status">
          <span className="apex-pos__status-dot" />
          <span>Ready</span>
        </div>
      </div>
      <div className="apex-pos__topbar-left">
        {currentEmployee && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {currentEmployee.name} (Tap to switch)
          </span>
        )}
        <button
          onClick={onSwitchEmployee}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '12px',
          }}
        >
          <Users size={14} /> Switch
        </button>
        {activeShift ? (
          <button
            onClick={onCloseShift}
            style={{
              background: 'none',
              border: '1px solid #ef4444',
              color: '#fca5a7',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '10px',
              borderRadius: '6px',
            }}
          >
            <Clock size={12} /> Close Shift
          </button>
        ) : (
          <button
            onClick={onOpenShift}
            style={{
              background: 'none',
              border: '1px solid #22c55e',
              color: '#4ade80',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '10px',
              borderRadius: '6px',
            }}
          >
            <Clock size={12} /> Open Shift
          </button>
        )}
        <button
          aria-label="Sign out"
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
};
