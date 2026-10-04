import React from 'react';
import { Order } from "../../../../../../services/api";
import { PosSettings, formatTime } from "../../apexTypes";
import { getCategoryName } from "../../apexTypes";

interface KitchenOrderCardProps {
  order: Order;
  settings: PosSettings;
  onItemComplete: (orderId: string, itemId: string) => void;
  completedItems: Set<string>;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  order,
  settings,
  onItemComplete,
  completedItems,
}) => {
  const orderTime = order.createdAt || '';
  const minutesAgo = orderTime
    ? Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000)
    : 0;

  const urgencyColor =
    minutesAgo < 5 ? '#10b981' : minutesAgo < 10 ? '#f59e0b' : '#ef4444';

  const items = order.items || [];
  const allItemsComplete = items.length > 0 && items.every((item) => completedItems.has(`${order.id}-${item.productId || item.productName}`));

  return (
    <div
      className="apex-pos__menu-item"
      style={{
        border: `2px solid ${urgencyColor}`,
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '10px',
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.96))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Order #{order.id.slice(0, 8)}</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
            {order.customerName || 'Walk-in'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {formatTime(orderTime)} · {minutesAgo}m ago
          </div>
        </div>
        {allItemsComplete && (
          <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '12px' }}>
            READY
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item: any) => {
          const key = `${order.id}-${item.productId || item.productName}`;
          const isComplete = completedItems.has(key);
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 0',
                textDecoration: isComplete ? 'line-through' : 'none',
                opacity: isComplete ? 0.5 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={isComplete}
                onChange={() => onItemComplete(order.id, item.productId || item.productName)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>
                {item.quantity}x {item.productName || `Item #${item.productId?.slice(0, 6)}`}
              </span>
              {item.productId && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {item.productName || getCategoryName('default')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface KitchenOrderQueueProps {
  orders: Order[];
  settings: PosSettings;
  completedItems: Set<string>;
  onItemComplete: (orderId: string, itemId: string) => void;
}

export const KitchenOrderQueue: React.FC<KitchenOrderQueueProps> = ({
  orders,
  settings,
  completedItems,
  onItemComplete,
}) => {
  if (orders.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <p>No orders in the kitchen.</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>New orders will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px' }}>
      {orders.map((order) => (
        <KitchenOrderCard
          key={order.id}
          order={order}
          settings={settings}
          onItemComplete={onItemComplete}
          completedItems={completedItems}
        />
      ))}
    </div>
  );
};
