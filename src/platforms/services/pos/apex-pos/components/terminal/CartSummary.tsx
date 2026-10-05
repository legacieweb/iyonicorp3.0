import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Table as TableIcon } from 'lucide-react';
import { PosSettings, formatCurrency } from '../../apexTypes';
import { CartItem } from '../../types/order';

interface CartSummaryProps {
  cart: CartItem[];
  settings: PosSettings;
  selectedTable: string | null;
  selectedTableLabel?: string | null;
  availableTableCount?: number;
  subtotal: number;
  tax: number;
  serviceFee: number;
  grandTotal: number;
  tipAmount: number;
  customerInfo: { name: string; phone: string; email: string };
  tableCount: number;
  onUpdateQuantity: (item: CartItem, delta: number) => void;
  onRemoveItem: (item: CartItem) => void;
  onCustomerInfoChange: (info: { name: string; phone: string; email: string }) => void;
  onShowTables: () => void;
  onPay: () => void;
  onClear: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  settings,
  selectedTable,
  selectedTableLabel,
  availableTableCount = 0,
  subtotal,
  tax,
  serviceFee,
  grandTotal,
  tipAmount,
  customerInfo,
  tableCount,
  onUpdateQuantity,
  onRemoveItem,
  onCustomerInfoChange,
  onShowTables,
  onPay,
  onClear,
}) => {
  return (
    <div className="apex-pos__cart">
      <div className="apex-pos__cart-header">
        <h2>New Order</h2>
        {selectedTable && (
          <span className="apex-pos__table-badge">
            <TableIcon size={13} /> {selectedTableLabel || `Table ${selectedTable}`}
          </span>
        )}
        {!selectedTable && settings.enableTableManagement && (
          <button
            onClick={onShowTables}
            style={{
              background: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '4px 8px',
              border: '1px solid #334159',
              borderRadius: '6px',
            }}
          >
            <TableIcon size={14} /> <span>Assign table</span>
            <small>{availableTableCount} available</small>
          </button>
        )}
      </div>

      <div className="apex-pos__cart-items">
        {cart.length ? (
          cart.map((item) => (
            <div key={`${item.id}-${item.notes || ''}`} className="apex-pos__cart-item">
              <div className="apex-pos__cart-item-img">
                {item.images && item.images[0] ? (
                  <img src={item.images[0]} alt={item.name} />
                ) : (
                  <ShoppingCart size={20} style={{ color: '#64748b' }} />
                )}
              </div>
              <div className="apex-pos__cart-item-details">
                <div className="apex-pos__cart-item-name">{item.name}</div>
                {item.notes && <div className="apex-pos__cart-item-notes">{item.notes}</div>}
              </div>
              <div className="apex-pos__cart-item-price">
                {formatCurrency(item.price * item.quantity, settings.currency)}
              </div>
              <div className="apex-pos__cart-item-qty">
                <button
                  className="apex-pos__qty-btn"
                  onClick={() => onUpdateQuantity(item, -1)}
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: '12px' }}>{item.quantity}</span>
                <button
                  className="apex-pos__qty-btn"
                  onClick={() => onUpdateQuantity(item, 1)}
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus size={12} />
                </button>
              </div>
              <button
                className="apex-pos__cart-item-remove"
                onClick={() => onRemoveItem(item)}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="apex-pos__empty">
            <ShoppingCart size={36} />
            <p style={{ marginTop: '12px' }}>No items in cart.</p>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <>
          {settings.requireCustomerInfo && (
            <div style={{ padding: '0 16px', borderBottom: '1px solid #334159' }}>
              <input
                type="text"
                placeholder="Customer name (optional)"
                value={customerInfo.name}
                onChange={(e) => onCustomerInfoChange({ ...customerInfo, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  background: '#0f172a',
                  border: '1px solid #334159',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  marginTop: '6px',
                }}
              />
            </div>
          )}
          <div className="apex-pos__cart-totals">
            <div className="apex-pos__cart-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, settings.currency)}</span>
            </div>
            {settings.taxRate > 0 && (
              <div className="apex-pos__cart-total-row">
                <span>Tax ({settings.taxRate}%)</span>
                <span>{formatCurrency(tax, settings.currency)}</span>
              </div>
            )}
            {settings.serviceCharge > 0 && (
              <div className="apex-pos__cart-total-row">
                <span>Service ({settings.serviceCharge}%)</span>
                <span>{formatCurrency(serviceFee, settings.currency)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="apex-pos__cart-total-row">
                <span>Tip</span>
                <span>{formatCurrency(tipAmount, settings.currency)}</span>
              </div>
            )}
            <div className="apex-pos__cart-total-row">
              <span>Total</span>
              <span>{formatCurrency(grandTotal, settings.currency)}</span>
            </div>
          </div>
          <div className="apex-pos__cart-actions">
            <button className="apex-pos__btn apex-pos__btn--secondary" onClick={onClear}>
              <Trash2 size={16} />
            </button>
            <button className="apex-pos__btn apex-pos__btn--primary" onClick={onPay}>
              <ShoppingCart size={16} /> Pay
            </button>
          </div>
        </>
      )}
    </div>
  );
};
