import React from 'react';
import { TableStatus, getTableStatusColor, getTableStatusLabel } from "../../apexTypes";

interface StatusBadgeProps {
  status: TableStatus;
  size?: 'sm' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'default' }) => {
  const color = getTableStatusColor(status);
  return (
    <span
      className="apex-badge"
      style={{
        background: `${color}20`,
        color: color,
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '2px 6px' : '2px 8px',
      }}
    >
      {getTableStatusLabel(status)}
    </span>
  );
};
