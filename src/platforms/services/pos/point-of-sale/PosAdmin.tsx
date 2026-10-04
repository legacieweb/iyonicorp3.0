import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, DollarSign, LayoutDashboard, LogOut, Package, Plus, RefreshCw,
  Save, Search, Settings, Shield, ShoppingCart, Table, TrendingUp, Users, X,
  Edit, Trash2, Send, Calendar, Clock, Banknote, Percent,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../../services/api';
import { timeAgo } from '../../../../utils/currency';
import {
  calculateTotalWithTax,
  defaultPosSettings,
  formatCurrency,
  formatDateTime,
  getPosSettings,
  isPointOfSale,
  PosSettings,
  savePosSettings,
} from './posTypes';
import './pos.css';

type Section = 'dashboard' | 'menu' | 'orders' | 'customers' | 'analytics' | 'settings';

const PosAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string; email?: string; totalOrders?: number; totalSpent?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState<Section>('dashboard');
  const [settings, setSettings] = useState<PosSettings>(defaultPosSettings);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category: '', image: '' });
  const [dateFilter, setDateFilter] = useState('today');

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate('/seller/dashboard', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [owner, allOrders, allProducts] = await Promise.all([
        sellersAPI.getMe(),
        ordersAPI.getBySellerId(user.sellerId),
        productsAPI.getBySellerId(user.sellerId),
      ]);
      if (!isPointOfSale(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettings(getPosSettings(owner));
      setOrders(allOrders);
      setProducts(allProducts);
      setCustomers([
        { id: '1', name: 'Walk-in Customer', phone: '' },
      ]);
    } catch {
      setError('Could not load POS data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredOrders = useMemo(() => {
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return orders.filter((o) => (o.createdAt || '').startsWith(today));
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return orders.filter((o) => new Date(o.createdAt) >= weekAgo);
    }
    return orders;
  }, [orders, dateFilter]);

  const totalRevenue = orders
    .filter((o) => ['processing', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.name} ${product.category}`.toLocaleLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const updateOrderStatus = async (order: Order, status: Order['status']) => {
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setOrders((items) => items.map((item) => (item.id === order.id ? updated : item)));
      setNotice('Order status updated.');
    } catch {
      setError('Could not update order status.');
    }
  };

  const saveSettings = async () => {
    if (!seller) return;
    setSaving(true);
    try {
      const updated = await sellersAPI.updateMe(savePosSettings(seller, settings));
      setSeller(updated);
      setSettings(getPosSettings(updated));
      setNotice('Settings saved.');
    } catch {
      setError('Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const openProductModal = (product: Product | null) => {
    setEditingProduct(product);
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        category: product.category,
        image: product.images?.[0] || '',
      });
    } else {
      setProductForm({ name: '', description: '', price: '', category: '', image: '' });
    }
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!user?.sellerId || !productForm.name.trim() || !productForm.price) return;
    try {
      const productData = {
        sellerId: user.sellerId,
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        category: productForm.category || 'mains',
        type: 'service' as const,
        images: productForm.image ? [productForm.image] : [],
        stock: 0,
        status: 'active' as const,
      };
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
      } else {
        await productsAPI.create(productData);
      }
      setShowProductModal(false);
      setNotice(`Product ${editingProduct ? 'updated' : 'created'}.`);
      void load();
    } catch {
      setError('Could not save product.');
    }
  };

  if (loading) {
    return (
      <div className="pos-admin__container">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="button-spinner" />
          <p>Loading POS dashboard…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="pos-admin__container">
        <div style={{ padding: '60px', textAlign: 'center' }} role="alert">
          {error || 'This POS terminal is unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div
      className="pos-admin__container"
      style={{ '--pos-primary': seller.theme?.primaryColor || '#bb4e31' } as React.CSSProperties}
    >
      <aside className="pos-admin__sidebar">
        <div className="pos-admin__brand">
          <span className="pos-admin__brand-mark"><ShoppingCart size={18} /></span>
          <span className="pos-admin__brand-copy">
            <strong>{seller.storeName}</strong>
            <small>POINT OF SALE</small>
          </span>
        </div>
        <nav className="pos-admin__nav">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { id: 'menu', label: 'Menu', icon: <Package size={18} /> },
            { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
            { id: 'customers', label: 'Customers', icon: <Users size={18} /> },
            { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id as Section)}
              className={`pos-admin__nav-btn ${section === item.id ? 'active' : ''}`}
              aria-current={section === item.id ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
              {item.id === 'orders' && pendingOrders.length > 0 && (
                <span className="pos-badge pos-badge--danger" style={{ marginLeft: 'auto' }}>
                  {pendingOrders.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '12px', borderBottom: '1px solid #374151' }}>
          <button
            onClick={() => window.open(`/shop/${seller.subdomain}?theme=point-of-sale`, '_blank')}
            className="pos-admin__nav-btn"
          >
            <Table size={18} />
            Open Terminal
          </button>
        </div>
      </aside>

      <main className="pos-admin__main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <header className="pos-admin__topbar">
          <div className="pos-admin__topbar-title">
            <span className="pos-eyebrow">Operations workspace</span>
            <h1>{seller.storeName}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button aria-label="Refresh POS data" onClick={() => void load()} className="pos-admin__icon-btn">
              <RefreshCw size={16} />
            </button>
            <button aria-label="Sign out" className="pos-admin__icon-btn" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {error && <div className="pos-alert">{error} <button onClick={() => setError('')} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', float: 'right' }}><X size={14} /></button></div>}
        {notice && <div className="pos-notice"><Check size={15} /> {notice}</div>}

        <div className="pos-admin__content">
          {section === 'dashboard' && (
            <div className="pos-admin__section">
              <div className="pos-admin__section-heading">
                <div>
                  <p className="pos-eyebrow">Your service at a glance</p>
                  <h2>Today’s overview</h2>
                </div>
                <span className="pos-admin__date-stamp"><Clock size={14} /> {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="pos-admin__metrics">
                <div className="pos-metric">
                  <div className="pos-metric__value">{orders.length}</div>
                  <div className="pos-metric__label">Total Orders</div>
                </div>
                <div className="pos-metric">
                  <div className="pos-metric__value">{pendingOrders.length}</div>
                  <div className="pos-metric__label">Pending</div>
                </div>
                <div className="pos-metric">
                  <div className="pos-metric__value">{formatCurrency(totalRevenue, seller.currency || 'USD')}</div>
                  <div className="pos-metric__label">Gross Sales</div>
                </div>
                <div className="pos-metric">
                  <div className="pos-metric__value">{products.length}</div>
                  <div className="pos-metric__label">Menu Items</div>
                </div>
              </div>

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
                        <td>{formatCurrency(order.total, order.currency || seller.currency || 'USD')}</td>
                        <td>
                          <span className={`pos-badge pos-badge--${order.status === 'pending' ? 'warning' : order.status === 'processing' ? 'info' : 'success'}`}>
                            {order.status === 'pending' ? 'New' : order.status}
                          </span>
                        </td>
                        <td>{timeAgo(order.createdAt || '')}</td>
                        <td>
                          {order.status === 'pending' && (
                            <button onClick={() => updateOrderStatus(order, 'processing')} aria-label="Confirm">
                              <Check size={16} />
                            </button>
                          )}
                          {order.status === 'processing' && (
                            <button onClick={() => updateOrderStatus(order, 'delivered')} aria-label="Complete">
                              <Send size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'menu' && (
            <div className="pos-admin__section">
              <div className="pos-admin__section-heading">
                <div>
                  <p className="pos-eyebrow">Catalog management</p>
                  <h2>Menu items</h2>
                </div>
                <button className="pos-btn pos-btn--primary" style={{ width: 'auto' }} onClick={() => openProductModal(null)}>
                  <Plus size={16} /> Add Item
                </button>
              </div>
              <div className="pos-admin__card">
                <label className="pos-admin__search">
                  <Search size={16} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search menu items"
                    aria-label="Search menu items"
                  />
                </label>
                <table className="pos-orders-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length ? filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td>{formatCurrency(product.price, seller.currency || 'USD')}</td>
                        <td>
                          <span className={`pos-badge pos-badge--${product.status === 'active' ? 'success' : 'warning'}`}>
                            {product.status === 'active' ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => openProductModal(product)} aria-label={`Edit ${product.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>
                          <Package size={32} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                          <p>{searchQuery ? 'No menu items match your search.' : 'No menu items yet.'}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'orders' && (
            <div className="pos-admin__section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Orders</h2>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="all">All orders</option>
                </select>
              </div>
              <div className="pos-admin__card">
                <table className="pos-orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length ? filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id.slice(0, 8)}</td>
                        <td>{order.customerName || 'Walk-in'}</td>
                        <td>{order.items?.length || 0} items</td>
                        <td>{formatCurrency(order.total, order.currency || seller.currency || 'USD')}</td>
                        <td>
                          <span className={`pos-badge pos-badge--${order.status === 'pending' ? 'warning' : order.status === 'processing' ? 'info' : 'success'}`}>
                            {order.status === 'pending' ? 'New' : order.status}
                          </span>
                        </td>
                        <td>{formatDateTime(order.createdAt || '')}</td>
                        <td>
                          {order.status === 'pending' && (
                            <button onClick={() => updateOrderStatus(order, 'processing')} aria-label="Start preparing">
                              <Send size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                          <ShoppingCart size={32} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                          <p>No orders found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'customers' && (
            <div className="pos-admin__section">
              <h2>Customers</h2>
              <div className="pos-admin__card">
                <table className="pos-orders-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Orders</th>
                      <th>Lifetime Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length ? customers.map((customer: any) => (
                      <tr key={customer.id}>
                        <td>{customer.name}</td>
                        <td>{customer.phone || customer.email || '-'}</td>
                        <td>{customer.totalOrders || 0}</td>
                        <td>{formatCurrency(customer.totalSpent || 0, seller.currency || 'USD')}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>
                          <Users size={32} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                          <p>No customers found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'analytics' && (
            <div className="pos-admin__section">
              <h2>Sales Analytics</h2>
              <div className="pos-admin__metrics">
                <div className="pos-metric">
                  <div className="pos-metric__value">{formatCurrency(totalRevenue, seller.currency || 'USD')}</div>
                  <div className="pos-metric__label">Gross Sales</div>
                </div>
                <div className="pos-metric">
                  <div className="pos-metric__value">{orders.length ? (totalRevenue / orders.length).toFixed(2) : '0'}</div>
                  <div className="pos-metric__label">Avg Order</div>
                </div>
                <div className="pos-metric">
                  <div className="pos-metric__value">{pendingOrders.length}</div>
                  <div className="pos-metric__label">Open Orders</div>
                </div>
              </div>
              <div className="pos-admin__card">
                <h2>Daily Sales (Today)</h2>
                <p style={{ color: '#6b7280' }}>
                  {filteredOrders.length} orders totaling {formatCurrency(
                    filteredOrders.reduce((sum, o) => sum + o.total, 0),
                    seller.currency || 'USD'
                  )}
                </p>
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div className="pos-admin__section">
              <form
                className="pos-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveSettings();
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="pos-form__field">
                    <label>Currency</label>
                    <input
                      type="text"
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="pos-form__field">
                    <label>Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.taxRate}
                      onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="pos-form__field">
                    <label>Service Charge (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.serviceCharge}
                      onChange={(e) => setSettings({ ...settings, serviceCharge: Number(e.target.value) })}
                    />
                  </div>
                  <div className="pos-form__field">
                    <label>Rounding</label>
                    <select
                      value={settings.rounding}
                      onChange={(e) => setSettings({ ...settings, rounding: e.target.value as PosSettings['rounding'] })}
                    >
                      <option value="none">None</option>
                      <option value="up">Round Up</option>
                      <option value="down">Round Down</option>
                      <option value="nearest">Round to Nearest</option>
                    </select>
                  </div>
                  <div className="pos-form__field">
                    <label>Table Count</label>
                    <input
                      type="number"
                      value={settings.tableNumbers}
                      onChange={(e) => setSettings({ ...settings, tableNumbers: Number(e.target.value) })}
                    />
                  </div>
                  <div className="pos-form__field">
                    <label>Receipt Header</label>
                    <input
                      type="text"
                      value={settings.receiptHeader}
                      onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                    />
                  </div>
                  <div className="pos-form__full">
                    <label>Receipt Footer</label>
                    <textarea
                      rows={2}
                      value={settings.receiptFooter}
                      onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <button type="submit" className="pos-btn pos-btn--primary" style={{ width: 'auto' }} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Settings'}
                    {saving ? null : <Save size={16} />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {showProductModal && (
        <div style={{
          position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="pos-admin__card" style={{ maxWidth: '480px', width: '100%', margin: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>{editingProduct ? 'Edit Item' : 'New Item'}</h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="pos-form__field">
              <label>Name</label>
              <input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>
            <div className="pos-form__field">
              <label>Description</label>
              <textarea
                rows={2}
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="pos-form__field">
                <label>Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </div>
              <div className="pos-form__field">
                <label>Category</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                >
                  <option value="drink">Drinks</option>
                  <option value="appetizer">Starters</option>
                  <option value="main">Mains</option>
                  <option value="dessert">Desserts</option>
                  <option value="special">Chef's Specials</option>
                  <option value="sides">Sides</option>
                </select>
              </div>
            </div>
            <div className="pos-form__field">
              <label>Image URL</label>
              <input
                type="url"
                value={productForm.image}
                onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button className="pos-btn pos-btn--secondary" style={{ flex: 1 }} onClick={() => setShowProductModal(false)}>
                Cancel
              </button>
              <button className="pos-btn pos-btn--primary" style={{ flex: 1 }} onClick={saveProduct}>
                {editingProduct ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosAdmin;
