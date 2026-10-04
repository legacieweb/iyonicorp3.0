import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, Clock, DollarSign, Edit, LayoutDashboard, LogOut, Package, Send, Star, TrendingUp, Users, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { defaultMarketSettings, getMarketSettings, isCraftCollective, saveMarketSettings, timeAgo } from './craftCollectiveTypes';
import './craft-collective.css';

const CraftCollectiveVendor: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products'>('overview');

  useEffect(() => {
    let active = true;
    const loadVendorData = async () => {
      if (!user?.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setLoading(true);
      try {
        const [owner, allOrders, allProducts] = await Promise.all([
          sellersAPI.getMe(),
          ordersAPI.getAll(),
          productsAPI.getBySellerId(user.sellerId),
        ]);
        setSeller(owner);
        setProducts(allProducts.filter((p) => p.type === 'service' || p.type === 'product'));
        setOrders(allOrders.filter((order) => order.sellerId === user.sellerId));
      } catch {
        if (active) setError('Could not load vendor data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadVendorData();
    return () => { active = false; };
  }, [user?.sellerId, navigate]);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const shippedOrders = orders.filter((o) => o.status === 'shipped' || o.status === 'delivered');
  const totalRevenue = orders
    .filter((o) => ['processing', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  const updateOrderStatus = async (order: Order, status: Order['status']) => {
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setOrders((items) => items.map((item) => (item.id === order.id ? updated : item)));
    } catch {
      setError('Could not update order status.');
    }
  };

  if (loading) {
    return (
      <div className="nova-admin">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="button-spinner" />
          <p>Loading your vendor dashboard…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="nova-admin">
        <div style={{ padding: '60px', textAlign: 'center' }} role="alert">
          {error || 'This vendor portal is unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="nova-admin">
      <aside className="nova-admin-sidebar">
        <a href={`/shop/${seller.subdomain}`} className="nova-wordmark">
          <span className="wordmark-mark"><Package size={17} /></span>
          <span>{seller.storeName} <em>Vendor</em></span>
        </a>
        <p className="admin-label">VENDOR DESK</p>
        <nav aria-label="Vendor navigation">
          {[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
            { id: 'orders', label: 'Orders', icon: <Package size={18} /> },
            { id: 'products', label: 'Products', icon: <TrendingUp size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
              {item.id === 'orders' && pendingOrders.length > 0 && (
                <span className="count">{pendingOrders.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{seller.storeName}</strong>
            <span>Seller</span>
          </div>
        </div>
      </aside>

      <main className="nova-admin-main">
        <header className="nova-admin-topbar">
          <div>
            <p className="cc-kicker">NOVA DRIVE · CRAFT COLLECTIVE</p>
            <h1>Vendor dashboard</h1>
          </div>
          <div className="admin-top-actions">
            <a href="/marketplace/craft-collective" target="_blank" rel="noreferrer">
              Visit marketplace <ArrowLeft size={15} style={{ transform: 'scaleX(-1)' }} />
            </a>
            <button aria-label="Sign out" className="flow-button_outline" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {error && (
          <div className="nova-alert" role="alert">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <section className="admin-section">
            <div className="admin-metrics">
              <article className="admin-metric">
                <span className="metric-label">Total orders</span>
                <strong className="metric-value">{orders.length}</strong>
                <small className="metric-sub">{pendingOrders.length} awaiting action</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Pending</span>
                <strong className="metric-value">{pendingOrders.length}</strong>
                <small className="metric-sub">Need your attention</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Shipped</span>
                <strong className="metric-value">{shippedOrders.length}</strong>
                <small className="metric-sub">On the way</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Total revenue</span>
                <strong className="metric-value">{formatPrice(totalRevenue, seller.currency || 'USD')}</strong>
                <small className="metric-sub">After marketplace fees</small>
              </article>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="cc-kicker">YOUR PRODUCTS</p>
                  <h2>Inventory</h2>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {products.length ? (
                  products.slice(0, 6).map((product) => (
                    <div
                      key={product.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--cc-border)' }}
                    >
                      {product.images && product.images[0] ? (
                        <img src={product.images[0]} alt={product.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--cc-radius-sm)' }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', background: 'var(--cc-border)', borderRadius: 'var(--cc-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={20} style={{ color: 'var(--cc-terracotta)' }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <strong>{product.name}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--cc-silver-dark)' }}>
                          {product.category} · {formatPrice(product.price, seller.currency || 'USD')}
                        </div>
                      </div>
                      <span className={`vendor-status status-${product.status === 'active' ? 'active' : 'pending'}`}>
                        {product.status === 'active' ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <Package size={36} style={{ color: 'var(--cc-sage)' }} />
                    <p style={{ marginTop: '12px' }}>No products yet.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'orders' && (
          <section className="admin-section">
            <div className="admin-panel" style={{ padding: '0' }}>
              <table className="vendor-table">
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
                  {orders.length ? (
                    orders
                      .slice()
                      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                      .map((order) => (
                        <tr key={order.id}>
                          <td style={{ fontSize: '0.85rem' }}>#{order.id.slice(0, 8)}</td>
                          <td>
                            <div>{order.customerName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cc-silver-dark)' }}>{order.customerEmail}</div>
                          </td>
                          <td>{formatPrice(order.total, order.currency || seller.currency || 'USD')}</td>
                          <td>
                            <span className={`vendor-status status-${order.status}`}>
                              {order.status === 'pending' ? 'New' : order.status}
                            </span>
                          </td>
                          <td>{timeAgo(order.createdAt)}</td>
                          <td>
                            {order.status === 'pending' && (
                              <button aria-label="Confirm" onClick={() => updateOrderStatus(order, 'processing')}>
                                <Check size={16} />
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <button aria-label="Ship" onClick={() => updateOrderStatus(order, 'shipped')}>
                                <Send size={16} />
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button aria-label="Mark delivered" onClick={() => updateOrderStatus(order, 'delivered')}>
                                <Check size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px' }}>
                        <Package size={32} style={{ color: 'var(--cc-sage)', marginBottom: '12px' }} />
                        <p>No orders yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <section className="admin-section">
            <div className="admin-toolbar">
              <p>{products.length} product{products.length === 1 ? '' : 's'}</p>
            </div>
            <div className="admin-panel" style={{ padding: '0' }}>
              <table className="vendor-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length ? (
                    products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {product.images && product.images[0] ? (
                              <img src={product.images[0]} alt={product.name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: 'var(--cc-radius-sm)' }} />
                            ) : (
                              <Package size={16} style={{ color: 'var(--cc-sage)' }} />
                            )}
                            <strong>{product.name}</strong>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td>{formatPrice(product.price, seller.currency || 'USD')}</td>
                        <td>
                          <span className={`vendor-status status-${product.status === 'active' ? 'active' : 'pending'}`}>
                            {product.status === 'active' ? 'Live' : 'Draft'}
                          </span>
                        </td>
                        <td>
                          <a
                            href={`/seller/dashboard`}
                            aria-label={`Edit ${product.name}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--cc-terracotta)' }}
                          >
                            <Edit size={14} />
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '48px' }}>
                        <Package size={32} style={{ color: 'var(--cc-sage)', marginBottom: '12px' }} />
                        <p>No products yet. Add your first listing from your seller dashboard.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default CraftCollectiveVendor;
