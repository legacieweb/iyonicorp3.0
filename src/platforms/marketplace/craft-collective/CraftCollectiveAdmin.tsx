import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, DollarSign, LayoutDashboard, ListFilter, Loader2,
  LogOut, Plus, RefreshCw, Scissors, Search, Send, Settings, Shield, Star, Trash2, Users, X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  defaultMarketSettings,
  getMarketSettings,
  isCraftCollective,
  MarketSettings,
  saveMarketSettings,
  timeAgo,
  VendorStatus,
} from './craftCollectiveTypes';
import './craft-collective.css';

type Section = 'overview' | 'vendors' | 'orders' | 'announcements' | 'settings';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'vendors', label: 'Vendors', icon: <Users size={18} /> },
  { id: 'orders', label: 'Orders', icon: <DollarSign size={18} /> },
  { id: 'announcements', label: 'Announcements', icon: <Settings size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Shield size={18} /> },
];

const CraftCollectiveAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allSellers, setAllSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState<MarketSettings>(defaultMarketSettings);
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorSearch, setVendorSearch] = useState('');
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', content: '' });

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate('/seller/dashboard', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [owner, allOrders, sellers, sellerProducts] = await Promise.all([
        sellersAPI.getMe(),
        ordersAPI.getBySellerId(user.sellerId),
        sellersAPI.getAll(),
        productsAPI.getBySellerId(user.sellerId),
      ]);
      if (!isCraftCollective(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettings(getMarketSettings(owner));
      setOrders(allOrders);
      setAllSellers(sellers);
      setProducts(sellerProducts);
    } catch {
      setError('We could not load your marketplace workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const totalRevenue = orders
    .filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  const vendorOrders = useMemo(() => {
    const vendorOrderMap: Record<string, Order[]> = {};
    orders.forEach((order) => {
      const orderData = order.deliveryLocation ? JSON.parse(order.deliveryLocation) : null;
      const vendorId = orderData?.vendorId || order.sellerId;
      if (!vendorOrderMap[vendorId]) vendorOrderMap[vendorId] = [];
      vendorOrderMap[vendorId].push(order);
    });
    return vendorOrderMap;
  }, [orders]);

  const vendorList = useMemo(() => {
    return allSellers
      .filter((s) => s.shopType === 'service' && s.id !== seller?.id)
      .filter((s) => {
        if (!vendorSearch) return true;
        return (
          s.storeName.toLowerCase().includes(vendorSearch.toLowerCase()) ||
          s.subdomain.toLowerCase().includes(vendorSearch.toLowerCase())
        );
      });
  }, [allSellers, vendorSearch, seller?.id]);

  const updateVendorStatus = async (sellerId: string, status: VendorStatus) => {
    setError('');
    setNotice('');
    try {
      const currentSettings = settings;
      const nextSettings = {
        ...currentSettings,
        vendorStatuses: { ...currentSettings.vendorStatuses, [sellerId]: status },
      };
      setSettings(nextSettings);
      if (seller) {
        await sellersAPI.updateMe(saveMarketSettings(seller, nextSettings));
      }
      setNotice('Vendor status updated.');
    } catch {
      setError('The vendor status was not changed. Please retry.');
    }
  };

  const toggleFeatured = async (vendorId: string, featured: boolean) => {
    const nextFeatured = featured
      ? settings.featuredVendorIds.filter((id) => id !== vendorId)
      : [...settings.featuredVendorIds, vendorId];
    const nextSettings = { ...settings, featuredVendorIds: nextFeatured };
    setSettings(nextSettings);
    if (seller) {
      await sellersAPI.updateMe(saveMarketSettings(seller, nextSettings));
    }
    setNotice(featured ? 'Removed from featured' : 'Added to featured');
  };

  const saveSettings = async () => {
    if (!seller) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await sellersAPI.updateMe(saveMarketSettings(seller, settings));
      setSeller(updated);
      setSettings(getMarketSettings(updated));
      setNotice('Settings saved.');
    } catch {
      setError('Settings could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addAnnouncement = async () => {
    if (!announcementDraft.title.trim() || !announcementDraft.content.trim()) return;
    const newAnnouncement = {
      id: Date.now().toString(),
      title: announcementDraft.title,
      content: announcementDraft.content,
      active: true,
    };
    const nextSettings = {
      ...settings,
      announcements: [...settings.announcements, newAnnouncement],
    };
    setSettings(nextSettings);
    if (seller) {
      await sellersAPI.updateMe(saveMarketSettings(seller, nextSettings));
    }
    setAnnouncementDraft({ title: '', content: '' });
    setNotice('Announcement added.');
  };

  const deleteAnnouncement = async (id: string) => {
    const nextSettings = {
      ...settings,
      announcements: settings.announcements.filter((a) => a.id !== id),
    };
    setSettings(nextSettings);
    if (seller) {
      await sellersAPI.updateMe(saveMarketSettings(seller, nextSettings));
    }
    setNotice('Announcement removed.');
  };

  const updateOrderStatus = async (order: Order, status: Order['status']) => {
    setError('');
    setNotice('');
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setOrders((items) => items.map((item) => (item.id === order.id ? updated : item)));
      setNotice('Order updated.');
    } catch {
      setError('The order status was not changed. Please retry.');
    }
  };

  const toggleSetting = (key: keyof MarketSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="nova-admin">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 className="button-spinner" />
          <p>Loading your marketplace…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="nova-admin">
        <div style={{ padding: '60px', textAlign: 'center' }} role="alert">
          {error || 'This marketplace is unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="nova-admin">
      <aside className="nova-admin-sidebar">
        <a href={`/shop/${seller.subdomain}`} className="nova-wordmark">
          <span className="wordmark-mark"><Scissors size={17} /></span>
          <span>{settings.marketplaceName || seller.storeName} <em>Collective</em></span>
        </a>
        <p className="admin-label">MARKETPLACE DESK</p>
        <nav aria-label="Marketplace workspace">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
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
            <span>Marketplace owner</span>
          </div>
        </div>
      </aside>

      <main className="nova-admin-main">
        <header className="nova-admin-topbar">
          <div>
            <p className="cc-kicker">MARKETPLACE / FLEET DESK</p>
            <h1>{NAV.find((item) => item.id === section)?.label || 'Overview'}</h1>
          </div>
          <div className="admin-top-actions">
            <a href={`/shop/${seller.subdomain}`} target="_blank" rel="noreferrer">
              View site <ArrowRight size={15} />
            </a>
            <button aria-label="Refresh" onClick={() => void load()}>
              <RefreshCw size={17} />
            </button>
            <button aria-label="Sign out" className="flow-button_outline" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {error && (
          <div className="nova-alert" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        )}
        {notice && (
          <div className="nova-notice" role="status">
            <Check size={15} /> {notice}
          </div>
        )}

        {section === 'overview' && (
          <section className="admin-section">
            <div className="admin-metrics">
              <article className="admin-metric">
                <span className="metric-label">Total vendors</span>
                <strong className="metric-value">{vendorList.length}</strong>
                <small className="metric-sub">{settings.featuredVendorIds.length} featured</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Pending applications</span>
                <strong className="metric-value">
                  {vendorList.filter((v) => (settings.vendorStatuses[v.id] || 'pending') === 'pending').length}
                </strong>
                <small className="metric-sub">Awaiting review</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Total orders</span>
                <strong className="metric-value">{orders.length}</strong>
                <small className="metric-sub">{pendingOrders.length} new</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Gross merchandise</span>
                <strong className="metric-value">{formatPrice(totalRevenue, settings.currency)}</strong>
                <small className="metric-sub">{settings.commissionRate}% commission</small>
              </article>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="cc-kicker">TOP VENDORS</p>
                  <h2>Featured makers</h2>
                </div>
                <button
                  onClick={() => setSection('vendors')}
                  className="nova-btn nova-btn-ghost nova-btn-sm"
                >
                  All vendors
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {vendorList
                  .filter((v) => settings.featuredVendorIds.includes(v.id))
                  .slice(0, 6)
                  .map((vendor) => (
                    <div
                      key={vendor.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--cc-border)' }}
                    >
                      {vendor.logo ? (
                        <img src={vendor.logo} alt={vendor.storeName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cc-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Scissors size={18} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <strong>{vendor.storeName}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--cc-charcoal-light)' }}>{vendor.subdomain}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div><Star size={14} fill="currentColor" style={{ color: 'var(--cc-gold)' }} /> 4.9</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {section === 'vendors' && (
          <section className="admin-section">
            <div className="admin-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cc-silver-dark)' }} />
                  <input
                    type="text"
                    placeholder="Search vendors…"
                    value={vendorSearch}
                    onChange={(event) => setVendorSearch(event.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </div>

            <div className="admin-panel" style={{ padding: '0', borderRadius: 'var(--cc-radius)', overflow: 'hidden' }}>
              <table className="vendor-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Products</th>
                    <th>Orders</th>
                    <th>Revenue share</th>
                    <th>Featured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorList.length ? vendorList.map((vendor) => {
                    const vStatus = (settings.vendorStatuses[vendor.id] || 'pending') as VendorStatus;
                    const vOrders: Order[] = vendorOrders[vendor.id] || [];
                    const vProducts = products.filter((p) => p.sellerId === vendor.id);
                    const vRevenue = vOrders
                      .filter((o) => ['processing', 'shipped', 'delivered'].includes(o.status))
                      .reduce((sum, o) => sum + o.total, 0);
                    return (
                      <tr key={vendor.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {vendor.logo ? (
                              <img src={vendor.logo} alt={vendor.storeName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--cc-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Scissors size={14} />
                              </div>
                            )}
                            <div>
                              <strong>{vendor.storeName}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--cc-silver-dark)' }}>{vendor.subdomain}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            value={vStatus}
                            onChange={(event) => updateVendorStatus(vendor.id, event.target.value as VendorStatus)}
                            style={{ fontSize: '0.85rem' }}
                          >
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td>{vProducts.length}</td>
                        <td>{vOrders.length}</td>
                        <td>{formatPrice(vRevenue, settings.currency)}</td>
                        <td>
                          <button
                            onClick={() => toggleFeatured(vendor.id, settings.featuredVendorIds.includes(vendor.id))}
                            style={{ color: settings.featuredVendorIds.includes(vendor.id) ? 'var(--cc-gold)' : 'var(--cc-silver-dark)' }}
                            aria-label={settings.featuredVendorIds.includes(vendor.id) ? 'Unfeature' : 'Feature'}
                          >
                            <Star size={16} fill={settings.featuredVendorIds.includes(vendor.id) ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={() => window.location.href = `/shop/${vendor.subdomain}`}
                            aria-label={`Visit ${vendor.storeName}`}
                          >
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>
                        <Scissors size={32} style={{ color: 'var(--cc-sage)', marginBottom: '12px' }} />
                        <p>No vendors found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'orders' && (
          <section className="admin-section">
            <div className="admin-toolbar">
              <p>{orders.length} order{orders.length === 1 ? '' : 's'}</p>
              <div className="filter-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ListFilter size={15} />
                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">New</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="admin-panel" style={{ padding: '0' }}>
              <table className="vendor-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Vendor</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter((order) => statusFilter === 'all' || order.status === statusFilter)
                    .slice()
                    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                    .slice(0, 50)
                    .map((order) => {
                      const orderData = order.deliveryLocation ? JSON.parse(order.deliveryLocation) : null;
                      return (
                        <tr key={order.id}>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>#{order.id.slice(0, 8)}</div>
                          </td>
                          <td>
                            <div>{order.customerName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cc-silver-dark)' }}>{order.customerEmail}</div>
                          </td>
                          <td>{orderData?.vendorName || 'Direct'}</td>
                          <td>{formatPrice(order.total, order.currency || settings.currency)}</td>
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
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'announcements' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="cc-kicker">COMMUNITY</p>
                <h2>Announcements</h2>
                <p>Create announcements that appear at the top of your marketplace.</p>
              </div>
            </div>

            <div className="admin-form">
              <div className="admin-form-grid">
                <input
                  type="text"
                  placeholder="Announcement title"
                  value={announcementDraft.title}
                  onChange={(event) => setAnnouncementDraft({ ...announcementDraft, title: event.target.value })}
                />
                <textarea
                  rows={3}
                  placeholder="Announcement content"
                  value={announcementDraft.content}
                  onChange={(event) => setAnnouncementDraft({ ...announcementDraft, content: event.target.value })}
                />
              </div>
              <div className="admin-form-actions">
                <button className="admin-primary-button" onClick={addAnnouncement} disabled={!announcementDraft.title.trim() || !announcementDraft.content.trim()}>
                  <Plus size={16} /> Add announcement
                </button>
              </div>
            </div>

            <div className="admin-panel" style={{ padding: '0' }}>
              <table className="vendor-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Content</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.announcements.map((announcement) => (
                    <tr key={announcement.id}>
                      <td>{announcement.title}</td>
                      <td>{announcement.content}</td>
                      <td>
                        <select
                          value={announcement.active ? 'active' : 'inactive'}
                          onChange={(event) => {
                            const updated = settings.announcements.map((a) =>
                              a.id === announcement.id
                                ? { ...a, active: event.target.value === 'active' }
                                : a
                            );
                            setSettings({ ...settings, announcements: updated });
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <button
                          aria-label={`Delete ${announcement.title}`}
                          onClick={() => deleteAnnouncement(announcement.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'settings' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="cc-kicker">MARKETPLACE SETTINGS</p>
                <h2>Configuration</h2>
                <p>Manage your marketplace brand, commission, and policies.</p>
              </div>
            </div>

            <form
              className="admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSettings();
              }}
            >
              <div className="admin-form-grid">
                <label>Marketplace name
                  <input
                    value={settings.marketplaceName}
                    onChange={(event) => toggleSetting('marketplaceName', event.target.value)}
                  />
                </label>
                <label>Description
                  <textarea
                    rows={2}
                    value={settings.marketplaceDescription}
                    onChange={(event) => toggleSetting('marketplaceDescription', event.target.value)}
                  />
                </label>
                <label>Commission rate (%)
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={settings.commissionRate}
                    onChange={(event) => toggleSetting('commissionRate', Number(event.target.value))}
                  />
                </label>
                <label>Currency
                  <input
                    value={settings.currency}
                    onChange={(event) => toggleSetting('currency', event.target.value.toUpperCase())}
                  />
                </label>
                <label>Vendor approval required
                  <input
                    type="checkbox"
                    checked={settings.vendorApprovalRequired}
                    onChange={(event) => toggleSetting('vendorApprovalRequired', event.target.checked)}
                  />
                </label>
              </div>

              <div className="admin-form-actions">
                <button className="admin-primary-button" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                  {saving ? <span className="button-spinner" /> : <Check size={16} />}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};

export default CraftCollectiveAdmin;
