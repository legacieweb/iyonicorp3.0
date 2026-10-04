import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, Clock, LogOut, MapPin, Plus, Save,
  Scissors, Send, ShoppingBag, Star, Trash2, TrendingUp, Users,
  Wallet, X, Upload, Edit3, DollarSign
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { getThemeDashboardRoute } from '../../../utils/themeDashboard';
import {
  getRestaurantSettings,
  isRestaurant,
  readRestaurantOrder,
  saveRestaurantSettings,
  DAY_NAMES,
  MenuItemCategory,
  getCategoryLabel,
} from './restaurantTypes';
import './restaurant.css';

type Tab = 'dashboard' | 'menu' | 'reservations' | 'orders' | 'settings';

interface MenuForm {
  name: string;
  description: string;
  price: string;
  category: MenuItemCategory;
  images: string[];
  file: File | null;
}

const RestorantAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [settingsDraft, setSettingsDraft] = useState(getRestaurantSettings(null));
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const [menuForm, setMenuForm] = useState<MenuForm>({
    name: '',
    description: '',
    price: '',
    category: 'main',
    images: [],
    file: null,
  });

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate(getThemeDashboardRoute(), { replace: true });
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
      if (!isRestaurant(owner) || owner.id !== user.sellerId) {
        navigate(getThemeDashboardRoute(owner.themeId || owner.theme?.selectedTheme), { replace: true });
        return;
      }
      setSeller(owner);
      setMenuItems(allProducts.filter((p) => p.type === 'service'));
      setOrders(allOrders.filter((order) => readRestaurantOrder(order)));
      setSettingsDraft(getRestaurantSettings(owner));
    } catch {
      setError('Could not load the admin workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);

  const resetMenuForm = () => {
    setMenuForm({ name: '', description: '', price: '', category: 'main', images: [], file: null });
    setEditingItem(null);
  };

  const openMenuModal = (item?: Product) => {
    if (item) {
      setEditingItem(item);
      setMenuForm({
        name: item.name,
        description: item.description || '',
        price: String(item.price),
        category: (item.category || 'main') as MenuItemCategory,
        images: item.images || [],
        file: null,
      });
    } else {
      resetMenuForm();
    }
    setShowMenuModal(true);
  };

  const saveMenuItem = async () => {
    if (!menuForm.name.trim() || !menuForm.price || !seller) return;
    setSaving(true);
    setError('');
    try {
      let imageUrls = menuForm.images;
      if (menuForm.file) {
        imageUrls = await uploadAPI.upload([menuForm.file]);
      }
      const itemData = {
        name: menuForm.name.trim(),
        description: menuForm.description.trim(),
        price: Number(menuForm.price),
        category: menuForm.category,
        type: 'service' as const,
        status: 'active' as const,
        images: imageUrls,
        stock: 0,
        sellerId: seller.id,
      };
      if (editingItem) {
        await productsAPI.update(editingItem.id, itemData);
      } else {
        await productsAPI.create(itemData);
      }
      setShowMenuModal(false);
      resetMenuForm();
      setNotice(editingItem ? 'Menu item updated.' : 'Menu item added.');
      await load();
    } catch {
      setError('Could not save this menu item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMenuItem = async (item: Product) => {
    if (!confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    try {
      await productsAPI.delete(item.id);
      setNotice('Menu item removed.');
      await load();
    } catch {
      setError('Could not delete this menu item.');
    }
  };

  const updateOrderStatus = async (order: Order, status: Order['status']) => {
    try {
      const updated = await ordersAPI.update(order.id, { status });
      setOrders((list) => list.map((item) => (item.id === order.id ? updated : item)));
      setNotice(`Order marked as ${status}.`);
    } catch {
      setError('Could not update this order.');
    }
  };

  const saveSettings = async () => {
    if (!seller) return;
    setSettingsSaving(true);
    setSettingsError('');
    try {
      await sellersAPI.updateMe(saveRestaurantSettings(seller, settingsDraft));
      setNotice('Settings saved.');
      await load();
    } catch {
      setSettingsError('Could not save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const confirmedCount = orders.filter((o) => o.status === 'processing' || o.status === 'shipped').length;
    const completedCount = orders.filter((o) => o.status === 'delivered').length;
    return { totalRevenue, pendingCount, confirmedCount, completedCount };
  }, [orders]);

  const sidebarItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
    { id: 'menu', label: 'Menu', icon: <ShoppingBag size={18} /> },
    { id: 'reservations', label: 'Reservations', icon: <CalendarDays size={18} /> },
    { id: 'orders', label: 'Orders', icon: <Send size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Scissors size={18} /> },
  ];

  if (loading) {
    return (
      <div className="resto-admin-shell">
        <div className="resto-admin-loading">
          <div className="loading-spinner" />
          <p>Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="resto-admin-shell">
        <div className="resto-admin-loading">
          {error || 'This workspace is unavailable.'}
        </div>
      </div>
    );
  }

  const restaurantName = seller.storeName || 'Restaurant';
  const currency = seller.currency || 'USD';

  return (
    <div className="resto-admin-shell resto-admin-font-sans">
      <aside className="resto-sidebar">
        <div className="resto-sidebar-brand">
          <span className="resto-logo-icon">🍽️</span>
          <strong>{restaurantName}</strong>
          <small>RESTAURANT ADMIN</small>
        </div>
        <nav className="resto-sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => { setTab(item.id); setSelectedOrder(null); }}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="resto-sidebar-bottom">
          <div className="resto-sidebar-avatar">
            {seller.storeName?.slice(0, 1).toUpperCase() || 'R'}
          </div>
          <div>
            <strong>{seller.storeName || 'Restaurant'}</strong>
            <small>Owner account</small>
          </div>
          <button onClick={logout} aria-label="Sign out" className="resto-sidebar-logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="resto-admin-main">
        <header className="resto-admin-topbar">
          <div className="resto-topbar-title">
            <span>{restaurantName.toUpperCase()}</span>
            <i>/</i>
            <b>
              {selectedOrder
                ? 'ORDER'
                : tab === 'dashboard' ? 'DASHBOARD'
                : tab === 'menu' ? 'MENU'
                : tab === 'reservations' ? 'RESERVATIONS'
                : tab === 'orders' ? 'ORDERS'
                : 'SETTINGS'}
            </b>
          </div>
          {selectedOrder && (
            <button className="resto-btn-ghost resto-btn-sm" onClick={() => setSelectedOrder(null)}>
              Back to list
            </button>
          )}
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

          {tab === 'dashboard' && (
            <>
              <div className="resto-stat-grid">
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><Wallet size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{formatPrice(stats.totalRevenue, currency)}</strong>
                    <p className="resto-stat-label">Lifetime revenue</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><Clock size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{stats.pendingCount}</strong>
                    <p className="resto-stat-label">Pending requests</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><Check size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{stats.confirmedCount}</strong>
                    <p className="resto-stat-label">Confirmed</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><ShoppingBag size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{stats.completedCount}</strong>
                    <p className="resto-stat-label">Completed</p>
                  </div>
                </div>
                <div className="resto-stat-card">
                  <div className="resto-stat-icon"><Scissors size={20} /></div>
                  <div>
                    <strong className="resto-stat-value">{menuItems.length}</strong>
                    <p className="resto-stat-label">Menu items</p>
                  </div>
                </div>
              </div>

              <div className="resto-card scoot">
                <div className="resto-card-header">
                  <h3><Clock size={18} /> Recent orders & reservations</h3>
                </div>
                <div className="resto-table-container">
                  <table className="resto-admin-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => {
                        const restoData = readRestaurantOrder(order);
                        return (
                          <tr key={order.id}>
                            <td>
                              {restoData?.orderType === 'table-service' ? 'Table reservation' : restoData?.orderType}
                              {order.items[0]?.productName}
                            </td>
                            <td>{order.customerName}</td>
                            <td>
                              <span className={`resto-badge ${order.status === 'pending' ? 'resto-badge-pending' : order.status === 'processing' ? 'resto-badge-processing' : order.status === 'delivered' ? 'resto-badge-completed' : 'resto-badge-pending'}`}>
                                {order.status === 'pending' ? 'Awaiting' : order.status === 'processing' ? 'Confirmed' : order.status === 'delivered' ? 'Completed' : order.status}
                              </span>
                            </td>
                            <td className="text-right">{formatPrice(order.total || 0, order.currency || currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'menu' && !selectedOrder && (
            <div>
              <div className="resto-actions-row">
                <h3 className="resto-section-title">Your menu</h3>
                <button className="resto-btn resto-btn-primary resto-btn-md" onClick={() => openMenuModal()}>
                  <Plus size={16} /> Add item
                </button>
              </div>

              {menuItems.length ? (
                <div className="resto-menu-grid-admin">
                  {menuItems.map((item) => (
                    <div key={item.id} className="resto-menu-admin-card">
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.name} />
                      ) : (
                        <div className="resto-menu-placeholder-admin">{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</div>
                      )}
                      <div className="resto-menu-admin-body">
                        <h3>{item.name}</h3>
                        <p className="resto-menu-admin-category">{getCategoryLabel((item.category || 'main') as MenuItemCategory)}</p>
                        <p className="resto-menu-admin-price">{formatPrice(item.price, currency)}</p>
                      </div>
                      <div className="resto-menu-admin-actions">
                        <button className="resto-btn-ghost resto-btn-sm" onClick={() => openMenuModal(item)}>
                          Edit
                        </button>
                          <button
                            className="resto-btn-ghost resto-btn-sm resto-text-error"
                            onClick={() => deleteMenuItem(item)}>
                            <Trash2 size={14} />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="resto-empty">
                  <ShoppingBag size={40} />
                  <h3>No menu items yet.</h3>
                  <p>Add your first dish to start accepting orders and reservations.</p>
                  <button className="resto-btn resto-btn-primary" onClick={() => openMenuModal()}>
                    Add menu item <Plus size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'reservations' && (
            <div>
              <h3 className="resto-section-title">All reservations</h3>
              {orders.filter((o) => {
                const data = readRestaurantOrder(o);
                return data?.orderType === 'table-service';
              }).length ? (
                <div className="resto-table-container">
                  <table className="resto-admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Date & Time</th>
                        <th>Party</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const data = readRestaurantOrder(order);
                        if (!data || data.orderType !== 'table-service') return null;
                        return (
                          <tr key={order.id}>
                            <td>{order.customerName}</td>
                            <td>
                              {data.reservationId || '—'}
                              {order.items[0]?.productName && <span className="resto-muted">{order.items[0].productName}</span>}
                            </td>
                            <td>—</td>
                            <td>
                              <select
                                className="resto-select"
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order, e.target.value as Order['status'])}
                              >
                                <option value="pending">Awaiting confirmation</option>
                                <option value="processing">Confirmed</option>
                                <option value="shipped">Seated</option>
                                <option value="delivered">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="resto-empty">
                  <CalendarDays size={40} />
                  <h3>No reservations yet.</h3>
                  <p>Reservations will appear here once customers start booking.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'orders' && !selectedOrder && (
            <div>
              <h3 className="resto-section-title">All orders</h3>
              {orders.filter((o) => {
                const data = readRestaurantOrder(o);
                return data && data.orderType !== 'table-service';
              }).length ? (
                <div className="resto-table-container">
                  <table className="resto-admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const data = readRestaurantOrder(order);
                        if (!data || data.orderType === 'table-service') return null;
                        return (
                          <tr key={order.id}>
                            <td>{order.customerName}</td>
                            <td>{order.items[0]?.productName || '—'}</td>
                            <td>{data.orderType}</td>
                            <td>
                              <select
                                className="resto-select"
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order, e.target.value as Order['status'])}
                              >
                                <option value="pending">New</option>
                                <option value="processing">Confirmed</option>
                                <option value="shipped">Preparing</option>
                                <option value="delivered">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="text-right">{formatPrice(order.total || 0, order.currency || currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="resto-empty">
                  <Send size={40} />
                  <h3>No orders yet.</h3>
                  <p>Online orders will appear here once customers place them.</p>
                </div>
              )}
            </div>
          )}

          {selectedOrder && (
            <div className="resto-card">
              <div className="resto-card-header">
                <h3><CalendarDays size={18} /> Order #{selectedOrder.id.slice(-6)}</h3>
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
                        {selectedOrder.customerPhone && (
                          <p className="resto-detail-subtle">{selectedOrder.customerPhone}</p>
                        )}
                      </div>
                      {data && (
                        <>
                          <div className="resto-detail-item">
                            <p className="resto-detail-label">Order type</p>
                            <p className="resto-detail-value">{data.orderType}</p>
                            {data.tableNumber && (
                              <p className="resto-detail-subtle">Table: {data.tableNumber}</p>
                            )}
                          </div>
                          <div className="resto-detail-item">
                            <p className="resto-detail-label">Status</p>
                            <select
                              className="resto-select"
                              value={selectedOrder.status}
                              onChange={(e) => updateOrderStatus(selectedOrder, e.target.value as Order['status'])}
                            >
                              <option value="pending">Awaiting</option>
                              <option value="processing">Confirmed</option>
                              <option value="shipped">Preparing</option>
                              <option value="delivered">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
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

          {tab === 'settings' && (
            <div className="resto-card">
              <div className="resto-card-header">
                <h3><Scissors size={18} /> Restaurant settings</h3>
              </div>
              {settingsError && <div className="resto-alert" role="alert">{settingsError}<button onClick={() => setSettingsError('')} aria-label="Dismiss">×</button></div>}

              <div className="resto-detail-grid">
                <div className="resto-field-group">
                  <div className="resto-field">
                    <label className="resto-form-label">Cuisine type</label>
                    <input
                      type="text"
                      className="resto-input"
                      value={settingsDraft.cuisineType}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, cuisineType: e.target.value })}
                      placeholder="e.g., French, Italian, Japanese"
                    />
                  </div>
                  <div className="resto-field">
                    <label className="resto-form-label">Service style</label>
                    <select
                      className="resto-select"
                      value={settingsDraft.serviceStyle}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, serviceStyle: e.target.value as 'sit-down' | 'casual' | 'fine-dining' })}
                    >
                      <option value="sit-down">Sit-down</option>
                      <option value="casual">Casual</option>
                      <option value="fine-dining">Fine dining</option>
                    </select>
                  </div>
                </div>

                <div className="resto-field-group">
                  <div className="resto-field sm">
                    <label className="resto-form-label">Table count</label>
                    <input
                      type="number"
                      className="resto-input"
                      value={settingsDraft.tableCount}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, tableCount: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                  <div className="resto-field sm">
                    <label className="resto-form-label">Max party size</label>
                    <input
                      type="number"
                      className="resto-input"
                      value={settingsDraft.maxPartySize}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, maxPartySize: parseInt(e.target.value) || 1 })}
                      min={1}
                    />
                  </div>
                  <div className="resto-field sm">
                    <label className="resto-form-label">Deposit (%)</label>
                    <input
                      type="number"
                      className="resto-input"
                      value={settingsDraft.depositPercent}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, depositPercent: parseInt(e.target.value) || 0 })}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="resto-field sm">
                    <label className="resto-form-label">Lead time (min)</label>
                    <input
                      type="number"
                      className="resto-input"
                      value={settingsDraft.leadTimeMinutes}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, leadTimeMinutes: parseInt(e.target.value) || 15 })}
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="resto-form-label">Opening hours</label>
                  <div className="resto-stack">
                    {settingsDraft.openingHours.map((day, index) => (
                      <div key={day.day} className="resto-hours-row">
                        <span className="resto-day-label">{DAY_NAMES[day.day]}</span>
                        <input
                          type="time"
                          className="resto-input"
                          value={day.open}
                          onChange={(e) => {
                            const newHours = [...settingsDraft.openingHours];
                            newHours[index] = { ...day, open: e.target.value };
                            setSettingsDraft({ ...settingsDraft, openingHours: newHours });
                          }}
                          disabled={day.closed}
                        />
                        <span>—</span>
                        <input
                          type="time"
                          className="resto-input"
                          value={day.close}
                          onChange={(e) => {
                            const newHours = [...settingsDraft.openingHours];
                            newHours[index] = { ...day, close: e.target.value };
                            setSettingsDraft({ ...settingsDraft, openingHours: newHours });
                          }}
                          disabled={day.closed}
                        />
                        <label className="resto-field-check">
                          <input
                            type="checkbox"
                            checked={day.closed}
                            onChange={(e) => {
                              const newHours = [...settingsDraft.openingHours];
                              newHours[index] = { ...day, closed: e.target.checked };
                              setSettingsDraft({ ...settingsDraft, openingHours: newHours });
                            }}
                          />
                          Closed
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="resto-field-group">
                  <div className="resto-field">
                    <label className="resto-form-label">Locations</label>
                    <input
                      type="text"
                      className="resto-input"
                      value={settingsDraft.locations.join(', ')}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, locations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="Comma-separated locations"
                    />
                  </div>
                  <div className="resto-field">
                    <label className="resto-form-label">Currency</label>
                    <input type="text" className="resto-input" value={settingsDraft.currency} onChange={(e) => setSettingsDraft({ ...settingsDraft, currency: e.target.value.toUpperCase() })} />
                  </div>
                </div>

                <div>
                  <label className="resto-form-label">Delivery radius (km)</label>
                  <input
                    type="number"
                    className="resto-input resto-input-narrow"
                    value={settingsDraft.deliveryRadius}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, deliveryRadius: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div className="resto-field-check">
                  <label className="resto-field-check">
                    <input
                      type="checkbox"
                      checked={settingsDraft.pickupEnabled}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, pickupEnabled: e.target.checked })}
                    />
                    Pickup enabled
                  </label>
                  <label className="resto-field-check">
                    <input
                      type="checkbox"
                      checked={settingsDraft.deliveryEnabled}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, deliveryEnabled: e.target.checked })}
                    />
                    Delivery enabled
                  </label>
                </div>

                <button className="resto-btn resto-btn-primary" onClick={saveSettings} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving…' : 'Save settings'} {settingsSaving ? <span className="button-spinner" /> : <Save size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showMenuModal && (
        <div className="resto-modal-overlay">
          <div className="resto-modal">
            <div className="resto-modal-header">
              <h3>{editingItem ? 'Edit menu item' : 'Add menu item'}</h3>
              <button
                className="resto-modal-close"
                onClick={() => { setShowMenuModal(false); resetMenuForm(); }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="resto-modal-body">
              <div className="resto-form-field">
                <label className="resto-form-label">Item name</label>
                <input
                  type="text"
                  className="resto-input"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  placeholder="e.g., Seared Salmon"
                />
              </div>
                <div className="resto-form-field resto-mt">
                  <label className="resto-form-label">Description</label>
                  <textarea
                    className="resto-input"
                    rows={3}
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    placeholder="Describe the dish, ingredients, or preparation..."
                  />
                </div>
                <div className="resto-form-row resto-mt">
                  <div className="resto-form-field">
                    <label className="resto-form-label">Price</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="resto-input"
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                      placeholder="e.g., 28.00"
                    />
                  </div>
                  <div className="resto-form-field">
                    <label className="resto-form-label">Category</label>
                    <select
                      className="resto-select"
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value as MenuItemCategory })}
                    >
                      <option value="appetizer">Starters</option>
                      <option value="main">Mains</option>
                      <option value="dessert">Desserts</option>
                      <option value="drink">Drinks</option>
                      <option value="special">Chef's Specials</option>
                    </select>
                  </div>
                </div>
                <div className="resto-form-field resto-mt">
                  <label className="resto-form-label">Item image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="resto-input"
                    onChange={(e) => setMenuForm({ ...menuForm, file: e.target.files?.[0] || null })}
                  />
                  {menuForm.images.length > 0 && (
                    <div className="resto-thumb-row">
                      {menuForm.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="resto-thumb" />
                      ))}
                    </div>
                  )}
                </div>
            </div>
            <div className="resto-modal-footer">
              <button
                className="resto-btn resto-btn-ghost"
                onClick={() => { setShowMenuModal(false); resetMenuForm(); }}
              >
                Cancel
              </button>
              <button className="resto-btn resto-btn-primary" onClick={saveMenuItem} disabled={saving}>
                {saving ? 'Saving…' : editingItem ? 'Update item' : 'Add item'} {saving ? <span className="button-spinner" /> : <Save size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestorantAdmin;
