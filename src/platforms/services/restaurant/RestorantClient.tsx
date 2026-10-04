import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, Download, LogOut, MapPin,
  ShoppingBag, Wallet
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Seller, sellersAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  getRestaurantSettings,
  isRestaurant,
  readRestaurantOrder,
  formatDate,
  formatTime,
  DAY_NAMES,
} from './restaurantTypes';
import './restaurant.css';

const RestorantClient: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [allOrders, allSellers] = await Promise.all([
          ordersAPI.getAll(),
          sellersAPI.getAll(),
        ]);
        const restaurantOrders = allOrders.filter(
          (order) =>
            readRestaurantOrder(order) &&
            (order.customerEmail === user?.email || order.customerId === user?.id)
        );
        const restaurantSeller = allSellers.find((s) => isRestaurant(s));
        if (!active) return;
        setOrders(restaurantOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setSeller(restaurantSeller || null);
      } catch {
        if (active) setError('Could not load your orders. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user?.email, user?.id]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'resto-badge-pending';
      case 'processing': return 'resto-badge-processing';
      case 'shipped': return 'resto-badge-active';
      case 'delivered': return 'resto-badge-completed';
      case 'cancelled': return 'resto-badge-cancelled';
      default: return 'resto-badge-pending';
    }
  };

  const getStatusLabel = (status: Order['status'], orderData?: { orderType?: string } | null) => {
    if (orderData?.orderType === 'table-service') {
      switch (status) {
        case 'pending': return 'Awaiting confirmation';
        case 'processing': return 'Confirmed';
        case 'shipped': return 'Seated';
        case 'delivered': return 'Completed';
        case 'cancelled': return 'Cancelled';
      }
    }
    switch (status) {
      case 'pending': return 'New';
      case 'processing': return 'Confirmed';
      case 'shipped': return 'Preparing';
      case 'delivered': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const payBalance = async (order: Order) => {
    const balance = order.remainingBalance || 0;
    if (balance <= 0) return;
    try {
      await ordersAPI.update(order.id, {
        amountPaid: (order.amountPaid || 0) + balance,
        remainingBalance: 0,
        status: 'delivered',
      });
      setOrders((list) =>
        list.map((item) =>
          item.id === order.id
            ? { ...item, amountPaid: (item.amountPaid || 0) + balance, remainingBalance: 0, status: 'delivered' }
            : item
        )
      );
      setNotice('Balance paid successfully. Thank you!');
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...order, amountPaid: (order.amountPaid || 0) + balance, remainingBalance: 0, status: 'delivered' });
      }
    } catch {
      setError('Could not process payment. Please try again.');
    }
  };

  const downloadReceipt = (order: Order) => {
    const receipt = `
Order #${order.id.slice(-6)}
Customer: ${order.customerName}
Email: ${order.customerEmail}
Phone: ${order.customerPhone || 'N/A'}
Date: ${order.createdAt}
Status: ${order.status}
Total: ${formatPrice(order.total || 0, order.currency || 'USD')}
Items:
${order.items.map((item) => `  - ${item.productName} x${item.quantity} @ ${formatPrice(item.price, order.currency || 'USD')}`).join('\n')}
    `;
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.id.slice(-6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="resto-client-shell">
        <div className="resto-client-loading">
          <div className="loading-spinner" />
          <p>Loading your orders and reservations…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="resto-client-shell">
        <div className="resto-client-loading" role="alert">
          {error || 'No restaurant found.'}
        </div>
      </div>
    );
  }

  const settings = getRestaurantSettings(seller);
  const restaurantName = seller.storeName || 'Restaurant';
  const currency = seller.currency || 'USD';

  const activeReservations = orders.filter((o) => {
    const data = readRestaurantOrder(o);
    return data?.orderType === 'table-service' && (o.status === 'pending' || o.status === 'processing');
  });

  const pastOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'shipped');
  const upcomingReservations = orders.filter((o) => {
    const data = readRestaurantOrder(o);
    return data?.orderType === 'table-service';
  });

  return (
    <div className="resto-client-shell">
      <aside className="resto-sidebar">
        <div className="resto-sidebar-brand">
          <span className="resto-logo-icon">🍽️</span>
          <strong>{restaurantName}</strong>
          <small>CLIENT PORTAL</small>
        </div>
        <nav className="resto-sidebar-nav">
          <button
            className={!selectedOrder ? 'active' : ''}
            onClick={() => setSelectedOrder(null)}
          >
            My reservations
          </button>
          <button
            className={!selectedOrder ? '' : 'active'}
            onClick={() => setSelectedOrder(null)}
          >
            Order history
          </button>
          {selectedOrder && (
            <button className="active" onClick={() => setSelectedOrder(null)}>
              Back to list
            </button>
          )}
        </nav>
        <div className="resto-sidebar-bottom">
          <div className="resto-sidebar-avatar">
            {user?.firstName?.slice(0, 1).toUpperCase() || user?.name?.slice(0, 1).toUpperCase() || 'C'}
          </div>
          <div>
            <strong>{user?.firstName || user?.name?.split(' ')[0] || 'Customer'}</strong>
            <small>Client account</small>
          </div>
          <button onClick={logout} aria-label="Sign out" className="resto-sidebar-logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="resto-client-main">
        <header className="resto-client-topbar">
          <div className="resto-topbar-title">
            <span>{restaurantName.toUpperCase()}</span>
            <i>/</i>
            <b>{selectedOrder ? 'ORDER' : 'MY RESERVATIONS'}</b>
          </div>
          <button onClick={() => (window.location.href = `/shop/${seller.subdomain}`)}>
            Back to restaurant <ArrowRight size={14} />
          </button>
        </header>

        <div className="resto-dashboard-content">
          {notice && (
            <div className="resto-notice" role="status">
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
            </div>
          )}
          {error && (
            <div className="resto-alert" role="alert">
              {error}
              <button onClick={() => setError('')} aria-label="Dismiss">×</button>
            </div>
          )}

          {!selectedOrder ? (
            <>
              <div className="resto-stat-grid">
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><CalendarDays size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{activeReservations.length}</strong>
                    <p className="resto-stat-label">Active reservations</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><Check size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{pastOrders.length}</strong>
                    <p className="resto-stat-label">Completed visits</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><Wallet size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">
                      {formatPrice(
                        orders.reduce((sum, o) => sum + (o.remainingBalance || 0), 0),
                        currency
                      )}
                    </strong>
                    <p className="resto-stat-label">Balance due</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><MapPin size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{settings.locations.length}</strong>
                    <p className="resto-stat-label">Locations</p>
                  </div>
                </div>
              </div>

              {upcomingReservations.length ? (
                <div className="resto-card scoot">
                  <div className="resto-card-header">
                    <h3><CalendarDays size={18} /> Upcoming reservations</h3>
                  </div>
                  <div className="resto-table-container">
                    <table className="resto-admin-table">
                      <thead>
                        <tr>
                          <th>Table</th>
                          <th>Date</th>
                          <th>Party</th>
                          <th>Status</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingReservations.map((order) => {
                          const data = readRestaurantOrder(order);
                          return (
                            <tr key={order.id}>
                              <td>{data?.tableNumber || '—'}</td>
                              <td>
                                {data?.reservationId || formatDate(order.createdAt)}
                              </td>
                              <td>{order.items[0]?.quantity || 1}</td>
                              <td>
                                <span className={`resto-badge ${getStatusColor(order.status)}`}>
                                  {getStatusLabel(order.status, data)}
                                </span>
                              </td>
                              <td className="text-right">
                                {formatPrice(order.total || 0, order.currency || currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="resto-card scoot">
                  <div className="resto-card-header">
                    <h3><CalendarDays size={18} /> Upcoming reservations</h3>
                  </div>
                  <div className="resto-empty">
                    <CalendarDays size={40} />
                    <h3>No upcoming reservations.</h3>
                    <p>Book a table on the restaurant storefront to see it here.</p>
                    <a
                      className="resto-btn resto-btn-primary"
                      href={`/shop/${seller.subdomain}`}
                    >
                      Book a table <ArrowRight size={15} />
                    </a>
                  </div>
                </div>
              )}

              {orders.length > upcomingReservations.length && (
              <div className="resto-card scoot">
                <div className="resto-card-header">
                  <h3><ShoppingBag size={18} /> Order history</h3>
                </div>
                  <div className="resto-table-container">
                    <table className="resto-admin-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th className="text-right">Total</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders
                          .filter((o) => o.status === 'delivered' || o.status === 'shipped')
                          .map((order) => {
                            const data = readRestaurantOrder(order);
                            return (
                              <tr key={order.id}>
                                <td>
                                  {order.items[0]?.productName ||
                                    (data?.orderType === 'table-service' ? 'Table reservation' : 'Order')}
                                </td>
                                <td>{formatDate(order.createdAt)}</td>
                                <td>
                                  <span className={`resto-badge ${getStatusColor(order.status)}`}>
                                    {getStatusLabel(order.status, data)}
                                  </span>
                                </td>
                                <td className="text-right">{formatPrice(order.total || 0, order.currency || currency)}</td>
                                <td className="text-center">
                                  <button
                                    className="resto-btn-ghost resto-btn-sm"
                                    onClick={() => downloadReceipt(order)}
                                    title="Download receipt"
                                  >
                                    <Download size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="resto-card">
              <div className="resto-card-header">
                <h3><CalendarDays size={18} /> Reservation details</h3>
                <button
                  className="resto-btn-ghost resto-btn-sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Back to list
                </button>
              </div>
              {(() => {
                const data = readRestaurantOrder(selectedOrder);
                return (
                  <div className="resto-detail-grid">
                    <div className="resto-detail-row">
                      <div className="resto-detail-item">
                        <p className="resto-detail-label">Customer</p>
                        <p className="resto-detail-value">{selectedOrder.customerName}</p>
                        <p className="resto-detail-subtle">{selectedOrder.customerEmail}</p>
                      </div>
                      {data && (
                        <>
                          <div className="resto-detail-item">
                            <p className="resto-detail-label">Table</p>
                            <p className="resto-detail-value">{data.tableNumber || '—'}</p>
                          </div>
                          <div className="resto-detail-item">
                            <p className="resto-detail-label">Status</p>
                            <span className={`resto-badge ${getStatusColor(selectedOrder.status)}`}>
                              {getStatusLabel(selectedOrder.status, data)}
                            </span>
                          </div>
                          <div className="resto-detail-item">
                            <p className="resto-detail-label">Total</p>
                            <p className="resto-detail-value">{formatPrice(selectedOrder.total || 0, selectedOrder.currency || currency)}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {data?.specialInstructions && (
                      <div className="resto-detail-item">
                        <p className="resto-detail-label">Special instructions</p>
                        <p className="resto-detail-subtle">{data.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RestorantClient;
