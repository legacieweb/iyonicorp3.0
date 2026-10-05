import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Order, ordersAPI } from '../../../../../services/api';
import { getPosSettings } from '../apexTypes';
import { useApexStore } from '../store/apexStore';
import { KitchenOrderQueue } from '../components/kitchen/KitchenOrderQueue';
import '../apex-pos.css';

const KitchenDisplay: React.FC = () => {
  const navigate = useNavigate();

  const {
    seller,
    orders,
    settings,
    connectWebSocket,
    disconnectWebSocket,
    setOrders,
  } = useApexStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const primaryColor = seller?.theme?.primaryColor || '#7c3609';
  const kitchenOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing');

  const loadOrders = useCallback(async () => {
    if (!seller?.id) return;
    setLoading(true);
    setError('');
    try {
      const allOrders = await ordersAPI.getBySellerId(seller.id);
      setOrders(allOrders);
    } catch {
      setError('Could not load kitchen orders.');
    } finally {
      setLoading(false);
    }
  }, [seller?.id, setOrders]);

  useEffect(() => {
    if (seller?.id) {
      connectWebSocket(seller.id);
    }
    return () => disconnectWebSocket();
  }, [seller?.id, connectWebSocket, disconnectWebSocket]);

  const handleItemComplete = (orderId: string, itemId: string) => {
    const key = `${orderId}-${itemId}`;
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const refreshOrders = async () => {
    await loadOrders();
    setCompletedItems(new Set());
  };

  if (loading) {
    return (
      <div className="pos-terminal apex-pos-app apex-pos-app--kitchen" style={{ '--apex-primary': primaryColor } as React.CSSProperties}>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="button-spinner" />
          <p>Loading Kitchen Display…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-terminal apex-pos-app apex-pos-app--kitchen" style={{ '--apex-primary': primaryColor } as React.CSSProperties}>
      <div className="apex-admin__topbar" style={{ padding: '12px 20px', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600 }}>
          Kitchen Display — {seller?.storeName || 'Apex POS'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            aria-label="Refresh"
            onClick={refreshOrders}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            aria-label="Back"
            onClick={() => navigate('/pos/apex-pos/admin')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            Back
          </button>
        </div>
      </div>

      {error && <div className="apex-alert" style={{ margin: '12px 20px' }}>{error}</div>}

      <div className="apex-admin__content">
        <div style={{ marginBottom: '12px', padding: '0 20px', fontSize: '12px', color: '#94a3b8' }}>
          {kitchenOrders.length} active order{kitchenOrders.length !== 1 ? 's' : ''} in the kitchen
        </div>
        <KitchenOrderQueue
          orders={kitchenOrders}
          settings={settings || getPosSettings(seller)}
          completedItems={completedItems}
          onItemComplete={handleItemComplete}
        />
      </div>
    </div>
  );
};

export default KitchenDisplay;
