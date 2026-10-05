import React from 'react';
import { PosTable, TableStatus, getTableStatusColor } from '../../apexTypes';

interface TableSelectorProps {
  tables: PosTable[];
  primaryColor: string;
  onSelectTable: (table: PosTable) => void;
  onClose: () => void;
  assignedTable: string | null;
}

export const TableSelector: React.FC<TableSelectorProps> = ({
  tables,
  primaryColor,
  onSelectTable,
  onClose,
  assignedTable,
}) => {
  return (
    <div
      className="pos-modal-backdrop"
      style={{ '--apex-primary': primaryColor } as React.CSSProperties}
    >
      <div className="pos-modal" style={{ maxWidth: '640px' }}>
        <div className="pos-modal__header">
          <div>
          <h3 className="pos-modal__title">Select Table</h3>
          <p className="apex-table-selector__hint">Choose a floor seat for this order</p>
          </div>
          <button onClick={onClose} className="pos-modal__close">
            ✕
          </button>
        </div>
        <div className="pos-modal__content">
          <div className="apex-table-legend" aria-label="Table availability">
            <span><i className="is-available" /> Available</span>
            <span><i className="is-reserved" /> Reserved</span>
            <span><i className="is-occupied" /> In service</span>
          </div>
          <div className="apex-pos__tables-grid">
            {tables
              .slice()
              .sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber))
              .map((table) => {
                const isAssigned = assignedTable === table.id;
                const isSelectable = !['occupied', 'seated', 'ordering'].includes(table.status);
                return (
                  <button
                    type="button"
                    key={table.id}
                    className={`apex-pos__table-card ${table.status} ${
                      isAssigned ? 'assigned' : ''
                    }`}
                    onClick={() => (isSelectable || isAssigned) && onSelectTable(table)}
                    style={{
                      cursor: isSelectable || isAssigned ? 'pointer' : 'not-allowed',
                      opacity: isSelectable || isAssigned ? 1 : 0.5,
                      '--table-color': getTableStatusColor(table.status),
                    } as React.CSSProperties}
                    aria-disabled={!isSelectable && !isAssigned}
                    disabled={!isSelectable && !isAssigned}
                  >
                    <span
                      className="apex-pos__table-card--number"
                      style={{ color: getTableStatusColor(table.status) }}
                    >
                      {table.tableNumber}
                    </span>
                    <span className="apex-pos__table-card--status">{table.status}</span>
                    {table.seats && (
                      <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {table.seats} seats
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
