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
    <article
      className="apex-kitchen-order"
      style={{ '--kitchen-urgency': urgencyColor } as React.CSSProperties}
    >
      <div className="apex-kitchen-order__header">
        <div>
          <div className="apex-kitchen-order__number">Order #{order.id.slice(0, 8)}</div>
          <div className="apex-kitchen-order__customer">
            {order.customerName || 'Walk-in'}
          </div>
          <div className="apex-kitchen-order__time">
            {formatTime(orderTime)} · {minutesAgo}m ago
          </div>
        </div>
        {allItemsComplete && (
          <span className="apex-kitchen-order__ready">
            READY
          </span>
        )}
      </div>

      <div className="apex-kitchen-order__items">
        {items.map((item: any) => {
          const key = `${order.id}-${item.productId || item.productName}`;
          const isComplete = completedItems.has(key);
          return (
            <div
              key={key}
              className={`apex-kitchen-order__item${isComplete ? ' is-complete' : ''}`}
            >
              <input
                type="checkbox"
                checked={isComplete}
                onChange={() => onItemComplete(order.id, item.productId || item.productName)}
                aria-label={`Mark ${item.productName || 'item'} ${isComplete ? 'incomplete' : 'complete'}`}
              />
              <span className="apex-kitchen-order__item-name">
                {item.quantity}x {item.productName || `Item #${item.productId?.slice(0, 6)}`}
              </span>
              {item.productId && (
                <span className="apex-kitchen-order__item-detail">
                  {item.productName || getCategoryName('default')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </article>
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
      <div className="apex-kitchen-empty">
        <p>No orders in the kitchen.</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>New orders will appear here.</p>
      </div>
    );
  }

  return (
    <div className="apex-kitchen-queue">
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
