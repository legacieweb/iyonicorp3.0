import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, Download, LogOut, MapPin, Scissors, ShoppingBag, User, Wallet } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Seller, sellersAPI, productsAPI, Product } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { CarRentalOrderData, getCarRentalSettings, isCarRental, readCarRentalOrder, getVehicleCategoryLabel, formatDate, getDaysDifference } from './carRentalTypes';
import './carRental.css';

const CarRentalClient: React.FC = () => {
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
      setLoading(true); setError('');
      try {
        const [allOrders, allSellers, allProducts] = await Promise.all([
          ordersAPI.getAll(),
          sellersAPI.getAll(),
          productsAPI.getBySellerId(user?.sellerId || ''),
        ]);
        const rentalOrders = allOrders.filter((order) => readCarRentalOrder(order));
        const rentalSeller = allSellers.find((s) => isCarRental(s));
        if (!active) return;
        setOrders(rentalOrders);
        setSeller(rentalSeller || null);
      } catch {
        if (active) setError('Could not load your reservations. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user?.sellerId]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'cr-badge-pending';
      case 'processing': return 'cr-badge-processing';
      case 'shipped': return 'cr-badge-active';
      case 'delivered': return 'cr-badge-completed';
      default: return 'cr-badge-pending';
    }
  };

  const getStatusLabel = (status: Order['status'], orderData?: CarRentalOrderData | null) => {
    if (status === 'pending') return 'Awaiting confirmation';
    if (status === 'processing') return 'Confirmed — ready for pickup';
    if (status === 'shipped') return 'Picked up';
    if (status === 'delivered') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    return status;
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
      setOrders((list) => list.map((item) =>
        item.id === order.id
          ? { ...item, amountPaid: (item.amountPaid || 0) + balance, remainingBalance: 0, status: 'delivered' }
          : item
      ));
      setNotice('Balance paid successfully. Thank you!');
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...order, amountPaid: (order.amountPaid || 0) + balance, remainingBalance: 0, status: 'delivered' });
      }
    } catch {
      setError('Could not process payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="cr-client-shell">
        <div className="cr-client-loading"><div className="loading-spinner" /><p>Loading your reservations…</p></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="cr-client-shell">
        <div className="cr-client-loading" role="alert">{error || 'No Apex Drive rental company found.'}</div>
      </div>
    );
  }

  const settings = getCarRentalSettings(seller);

  return (
    <div className="cr-client-shell cr-font-sans">
      <aside className="cr-sidebar">
        <div className="cr-sidebar-brand">
          <span className="cr-logo-icon"><Scissors size={18} /></span>
          <strong>Apex <em>Drive</em></strong>
          <small>CLIENT PORTAL</small>
        </div>
        <nav className="cr-sidebar-nav">
          <button
            className={selectedOrder ? '' : 'active'}
            onClick={() => setSelectedOrder(null)}
          >
            My reservations
          </button>
          {selectedOrder && (
            <button className="active" onClick={() => setSelectedOrder(null)}>
              Back to list
            </button>
          )}
        </nav>
        <div className="cr-sidebar-bottom">
          <div className="cr-sidebar-avatar">
            {user?.firstName?.slice(0, 1).toUpperCase() || user?.name?.slice(0, 1).toUpperCase() || 'U'}
          </div>
          <div className="cr-sidebar-user">
            <strong>{user?.firstName || user?.name?.split(' ')[0] || 'User'}</strong>
            <small>Client account</small>
          </div>
          <button onClick={logout} aria-label="Sign out" className="cr-sidebar-logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="cr-client-main">
        <header className="cr-client-topbar">
          <div className="cr-topbar-title">
            <span>APEX DRIVE</span>
            <i>/</i>
            <b>{selectedOrder ? 'RESERVATION' : 'MY RESERVATIONS'}</b>
          </div>
          <button onClick={() => window.location.href = `/shop/${seller.subdomain}`}>
            Back to fleet <ArrowRight size={14} />
          </button>
        </header>

        <div className="cr-dashboard-content">
          {notice && <div className="cr-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
          {error && <div className="cr-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

          {!selectedOrder ? (
            <>
              <div className="cr-dashboard-grid">
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><CalendarDays size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{orders.filter(o => o.status === 'pending' || o.status === 'processing').length}</strong>
                    <p className="cr-stat-label">Active reservations</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><Check size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{orders.filter(o => o.status === 'delivered').length}</strong>
                    <p className="cr-stat-label">Completed</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><Wallet size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{formatPrice(orders.reduce((sum, o) => sum + (o.remainingBalance || 0), 0), seller.currency || 'USD')}</strong>
                    <p className="cr-stat-label">Balance due</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><MapPin size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{settings.locations.length}</strong>
                    <p className="cr-stat-label">Pickup locations</p>
                  </div>
                </div>
              </div>

              {orders.length ? (
                <div className="cr-table-container">
                  <table className="cr-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Pickup</th>
                        <th>Return</th>
                        <th>Status</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">Balance</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const hwData = readCarRentalOrder(order);
                        const days = hwData ? getDaysDifference(hwData.pickupDate, hwData.returnDate) : 0;
                        return (
                          <tr key={order.id}>
                            <td>{order.items[0]?.productName || 'Vehicle'}</td>
                            <td>{hwData ? formatDate(hwData.pickupDate) : '—'}</td>
                            <td>{hwData ? formatDate(hwData.returnDate) : '—'} ({days} day{days !== 1 ? 's' : ''})</td>
                            <td><span className={`cr-badge ${getStatusColor(order.status)}`}>{getStatusLabel(order.status, hwData)}</span></td>
                            <td className="text-right">{formatPrice(order.total, order.currency || 'USD')}</td>
                            <td className="text-right">
                              {(order.remainingBalance || 0) > 0
                                ? formatPrice(order.remainingBalance || 0, order.currency || 'USD')
                                : '—'}
                            </td>
                            <td className="text-center">
                              <button className="cr-btn cr-btn-outline cr-btn-sm" onClick={() => setSelectedOrder(order)}>
                                View details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cr-empty">
                  <ShoppingBag size={40} />
                  <h3>No reservations yet.</h3>
                  <p>You haven't booked any vehicles with Apex Drive yet. Browse our fleet to get started.</p>
                  <a className="cr-btn cr-btn-primary" href={`/shop/${seller.subdomain}`}>
                    View fleet <ArrowRight size={15} />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="cr-card">
              <div className="cr-card-header">
                <h3><CalendarDays size={20} /> Reservation details</h3>
                <button className="cr-btn-ghost cr-btn-sm" onClick={() => setSelectedOrder(null)}>
                  Back to list
                </button>
              </div>

              {(() => {
                const hwData = readCarRentalOrder(selectedOrder);
                const days = hwData ? getDaysDifference(hwData.pickupDate, hwData.returnDate) : 0;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Vehicle</p>
                        <p style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedOrder.items[0]?.productName || 'Vehicle'}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Rental period</p>
                        <p style={{ fontSize: '1rem', fontWeight: 600 }}>
                          {hwData ? formatDate(hwData.pickupDate) : '—'} — {hwData ? formatDate(hwData.returnDate) : '—'} ({days} day{days !== 1 ? 's' : ''})
                        </p>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Pickup location</p>
                        <p style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <MapPin size={14} />{hwData?.pickupLocation || '—'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Status</p>
                        <span className={`cr-badge ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusLabel(selectedOrder.status, hwData)}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Insurance</p>
                        <p style={{ fontSize: '1rem', fontWeight: 600 }}>{hwData?.insuranceLevel || 'Premium'}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Payment</p>
                        <p style={{ fontSize: '1rem', fontWeight: 600 }}>
                          Deposit: {formatPrice(selectedOrder.amountPaid || 0, selectedOrder.currency || 'USD')}
                          {selectedOrder.remainingBalance && selectedOrder.remainingBalance > 0 && (
                            <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--cr-error)' }}>
                              Balance: {formatPrice(selectedOrder.remainingBalance, selectedOrder.currency || 'USD')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedOrder.remainingBalance && selectedOrder.remainingBalance > 0 && (
                      <button
                        className="cr-btn cr-btn-primary"
                        onClick={() => payBalance(selectedOrder)}
                        style={{ width: 'fit-content' }}
                      >
                        Pay balance {formatPrice(selectedOrder.remainingBalance, selectedOrder.currency || 'USD')} <ArrowRight size={14} />
                      </button>
                    )}

                    {hwData?.instructions && (
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Special instructions</p>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--cr-slate)' }}>{hwData.instructions}</p>
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

export default CarRentalClient;
