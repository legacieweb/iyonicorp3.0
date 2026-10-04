import React from 'react';
import { Order } from "../../../../../../services/api";
import { PosSettings, formatCurrency, timeAgo } from "../../apexTypes";

interface OrderStatusBadgeProps {
  status: Order['status'];
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const badgeClass =
    status === 'pending'
      ? 'apex-badge--warning'
      : status === 'processing'
      ? 'apex-badge--info'
      : status === 'shipped' || status === 'delivered'
      ? 'apex-badge--success'
      : status === 'cancelled' || status === 'refunded'
      ? 'apex-badge--danger'
      : 'apex-badge--info';

  const label =
    status === 'pending' ? 'New' : status === 'processing' ? 'Preparing' : status;

  return (
    <span className={`apex-badge ${badgeClass}`}>{label}</span>
  );
};

interface RecentOrdersTableProps {
  orders: Order[];
  seller: import('../../../../../../services/api').Seller | null;
  settings: PosSettings;
  onStatusChange: (order: Order, status: Order['status']) => void;
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  seller,
  settings,
  onStatusChange,
}) => {
  const currency = seller?.currency || settings.currency || 'USD';

  return (
    <div className="pos-admin__card">
      <h2>Recent Orders</h2>
      <table className="pos-orders-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.slice(0, 10).map((order) => (
            <tr key={order.id}>
              <td>#{order.id.slice(0, 8)}</td>
              <td>{order.customerName || 'Walk-in'}</td>
              <td>{formatCurrency(order.total, order.currency || currency)}</td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
              <td>{timeAgo(order.createdAt || '')}</td>
              <td>
                {order.status === 'pending' && (
                  <button
                    onClick={() => onStatusChange(order, 'processing')}
                    aria-label="Confirm"
                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                  >
                    ✓
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { OrderStatusBadge };

export default RecentOrdersTable;
