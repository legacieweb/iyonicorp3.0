import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, DollarSign, LayoutDashboard, ListFilter, Loader2, LogOut, Plus, RefreshCw, Settings, Shield, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { defaultNovaSettings, getNovaSettings, isNovaDrive, readNovaBooking, NovaBooking, NovaSettings, saveNovaSettings } from './novaDriveTypes';
import './nova-drive.css';

type Section = 'overview' | 'bookings' | 'fleet' | 'team' | 'settings';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'bookings', label: 'Bookings', icon: <CalendarDays size={18} /> },
  { id: 'fleet', label: 'Fleet', icon: <Settings size={18} /> },
  { id: 'team', label: 'Team', icon: <Users size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Shield size={18} /> },
];

const NovaDriveAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [bookings, setBookings] = useState<Order[]>([]);
  const [fleet, setFleet] = useState<Product[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [vehicleEditing, setVehicleEditing] = useState<Product | null>(null);
  const [isVehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    name: '', category: '', price: '', description: '', active: true,
  });
  const [vehicleImageFiles, setVehicleImageFiles] = useState<File[]>([]);
  const [staffDraft, setStaffDraft] = useState({ name: '', phone: '' });
  const [settings, setSettings] = useState<NovaSettings>(defaultNovaSettings);

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
      if (!isNovaDrive(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettings(getNovaSettings(owner));
      setBookings(
        allOrders
          .filter((order) => readNovaBooking(order))
          .sort((a, b) => {
            const aDate = readNovaBooking(a)?.pickupDate || '';
            const bDate = readNovaBooking(b)?.pickupDate || '';
            return aDate.localeCompare(bDate);
          })
      );
      setFleet(allProducts.filter((product) => product.type === 'service'));
    } catch {
      setError('We could not load your event workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = bookings.filter((order) => {
    const booking = readNovaBooking(order);
    if (!booking) return false;
    return (
      (!dateFilter || booking.pickupDate === dateFilter) &&
      (statusFilter === 'all' || order.status === statusFilter)
    );
  });

  const today = new Date().toISOString().slice(0, 10);
  const todaysBookings = bookings.filter((order) => readNovaBooking(order)?.pickupDate === today);
  const upcoming = bookings.filter((order) => {
    const booking = readNovaBooking(order);
    return booking && booking.pickupDate >= today && order.status !== 'cancelled';
  });
  const pending = bookings.filter((order) => order.status === 'pending');
  const confirmedRevenue = bookings
    .filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  const saveSettings = async (next: NovaSettings) => {
    if (!seller) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await sellersAPI.updateMe(saveNovaSettings(seller, next));
      setSeller(updated);
      setSettings(getNovaSettings(updated));
      setNotice('Changes saved.');
    } catch {
      setError('These changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (patch: Partial<NovaSettings>) =>
    setSettings((current) => ({ ...current, ...patch }));

  const setStatus = async (order: Order, status: Order['status']) => {
    setError('');
    setNotice('');
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setBookings((items) =>
        items.map((item) => (item.id === order.id ? updated : item))
      );
      setNotice('Booking updated.');
    } catch {
      setError('The booking status was not changed. Please retry.');
    }
  };

  const assignFleetManager = async (orderId: string, managerName: string) => {
    await saveSettings({
      ...settings,
      assignments: { ...settings.assignments, [orderId]: managerName },
    });
  };

  const openVehicle = (vehicle?: Product) => {
    setVehicleEditing(vehicle || null);
    setVehicleFormOpen(true);
    setVehicleImageFiles([]);
    setVehicleForm({
      name: vehicle?.name || '',
      category: vehicle?.category || '',
      price: vehicle ? String(vehicle.price) : '',
      description: vehicle?.description || '',
      active: vehicle?.status !== 'draft' && vehicle?.status !== 'archived',
    });
  };

  const saveVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!seller) return;
    setSaving(true);

    let imageUrls: string[] = vehicleEditing?.images || [];

    try {
      if (vehicleImageFiles.length > 0) {
        const uploaded = await uploadAPI.upload(vehicleImageFiles);
        imageUrls = [...uploaded];
      }

      const values = {
        sellerId: seller.id,
        name: vehicleForm.name.trim(),
        description: vehicleForm.description.trim(),
        price: Number(vehicleForm.price),
        category: vehicleForm.category.trim() || 'Economy',
        type: 'service' as const,
        images: imageUrls,
        stock: -1,
        status: vehicleForm.active ? 'active' as const : 'draft' as const,
      };

      let result: Product;
      if (vehicleEditing) {
        result = await productsAPI.update(vehicleEditing.id, values);
        setFleet((list) => list.map((item) => (item.id === result.id ? result : item)));
      } else {
        result = await productsAPI.create(values);
        setFleet((list) => [...list, result]);
      }

      setVehicleEditing(null);
      setVehicleFormOpen(false);
      setVehicleImageFiles([]);
      setVehicleForm({ name: '', category: '', price: '', description: '', active: true });
      setNotice('Vehicle saved.');
    } catch {
      setError('The vehicle was not saved. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (vehicle: Product) => {
    if (!window.confirm(`Remove ${vehicle.name}? This cannot be undone.`)) return;
    try {
      await productsAPI.delete(vehicle.id);
      setFleet((list) => list.filter((item) => item.id !== vehicle.id));
      setNotice('Vehicle removed.');
    } catch {
      setError('This vehicle could not be removed. Please try again.');
    }
  };

  const saveStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffDraft.name.trim()) return;
    await saveSettings({
      ...settings,
      fleetManagers: [...settings.fleetManagers, { id: Date.now().toString(), name: staffDraft.name.trim(), phone: staffDraft.phone.trim() }],
    });
    setStaffDraft({ name: '', phone: '' });
  };

  if (loading) {
    return (
      <div className="nova-admin">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 className="button-spinner" />
          <p>Loading your drive workspace…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="nova-admin">
        <div style={{ padding: '60px', textAlign: 'center' }} role="alert">
          {error || 'This workspace is unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="nova-admin">
      <aside className="nova-admin-sidebar">
        <a href={`/shop/${seller.subdomain}`} className="nova-wordmark">
          <span className="wordmark-mark"><CalendarDays size={17} /></span>
          <span>Nova <em>Drive</em></span>
        </a>
        <p className="admin-label">STUDIO DESK</p>

        <nav aria-label="Drive workspace">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
              {item.id === 'bookings' && pending.length > 0 && (
                <span className="count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <span className="admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{seller.storeName}</strong>
            <span>Fleet manager</span>
          </div>
        </div>
      </aside>

      <main className="nova-admin-main">
        <header className="nova-admin-topbar">
          <div>
            <p className="nova-kicker">NOVA DRIVE / FLEET DESK</p>
            <h1>{NAV.find((item) => item.id === section)?.label || 'Overview'}</h1>
          </div>
          <div className="admin-top-actions">
            <a href={`/shop/${seller.subdomain}`} target="_blank" rel="noreferrer">
              View site <ArrowRight size={15} />
            </a>
            <button aria-label="Refresh" onClick={() => void load()}>
              <RefreshCw size={17} />
            </button>
            <button aria-label="Sign out" className="aurelia-logout-button" onClick={logout}>
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
                <span className="metric-label">Today's bookings</span>
                <strong className="metric-value">{todaysBookings.length}</strong>
                <small className="metric-sub">{todaysBookings.filter((o) => o.status === 'pending').length} awaiting dispatch</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Pending requests</span>
                <strong className="metric-value">{pending.length}</strong>
                <small className="metric-sub">Need confirmation</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Upcoming pickups</span>
                <strong className="metric-value">{upcoming.length}</strong>
                <small className="metric-sub">Scheduled</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Confirmed revenue</span>
                <strong className="metric-value">{formatPrice(confirmedRevenue, seller.currency || 'USD')}</strong>
                <small className="metric-sub">Completed bookings</small>
              </article>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="nova-kicker">TODAY</p>
                  <h2>Today's pickups</h2>
                </div>
                <button
                  onClick={() => setSection('bookings')}
                  className="flow-button_outline"
                  style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                >
                  All bookings
                </button>
              </div>

              {todaysBookings.length ? (
                <div className="admin-agenda">
                  {todaysBookings.map((order) => (
                    <BookingRow
                      key={order.id}
                      order={order}
                      settings={settings}
                      onStatus={setStatus}
                      onAssign={assignFleetManager}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <CalendarDays size={32} style={{ color: 'var(--nova-blue)' }} />
                  <p style={{ marginTop: '12px' }}>No pickups scheduled for today.</p>
                </div>
              )}
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="nova-kicker">JUST IN</p>
                  <h2>Recent requests</h2>
                </div>
                <span>{pending.length} pending</span>
              </div>

              {bookings
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 5)
                .length ? (
                <div className="flow-recent-list">
                  {bookings
                    .slice()
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .slice(0, 5)
                    .map((order) => (
                      <div className="admin-recent" key={order.id}>
                        <span className="recent-dot" />
                        <div>
                          <strong>{order.customerName}</strong>
                          <span>{order.items.map((item) => item.productName).join(', ')}</span>
                        </div>
                        <span className={`event-status status-${order.status}`}>
                          {order.status === 'pending' ? 'New' : order.status}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <CalendarDays size={32} style={{ color: 'var(--nova-blue)' }} />
                  <p>No requests yet.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {section === 'bookings' && (
          <section className="admin-section">
            <div className="admin-toolbar">
              <p>{filtered.length} booking{filtered.length === 1 ? '' : 's'}</p>
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
                    <option value="processing">Confirmed</option>
                    <option value="delivered">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <input
                  aria-label="Filter by date"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                />
              </div>
            </div>

            <div className="admin-appointment-list">
              {filtered.length ? (
                filtered.map((order) => (
                  <BookingRow
                    key={order.id}
                    order={order}
                    settings={settings}
                    onStatus={setStatus}
                    onAssign={assignFleetManager}
                  />
                ))
              ) : (
                <div className="admin-empty">
                  <CalendarDays size={48} style={{ color: 'var(--nova-blue)' }} />
                  <h2>No bookings match.</h2>
                  <p>Try another date or status, or check back when a new request arrives.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {section === 'fleet' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="nova-kicker">YOUR FLEET</p>
                <h2>Vehicles</h2>
                <p>Manage your vehicle inventory, pricing, and availability.</p>
              </div>
              <button className="admin-primary-button" onClick={() => openVehicle()}>
                <Plus size={16} /> Add a vehicle
              </button>
            </div>

            {isVehicleFormOpen ? (
              <form className="admin-form service-editor" onSubmit={saveVehicle}>
                <div className="admin-form-heading">
                  <h3>{vehicleEditing ? 'Edit vehicle' : 'New vehicle'}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleEditing(null);
                      setVehicleFormOpen(false);
                      setVehicleImageFiles([]);
                      setVehicleForm({ name: '', category: '', price: '', description: '', active: true });
                    }}
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label>Vehicle name
                    <input
                      required
                      value={vehicleForm.name}
                      onChange={(event) => setVehicleForm({ ...vehicleForm, name: event.target.value })}
                    />
                  </label>
                  <label>Category
                    <input
                      value={vehicleForm.category}
                      onChange={(event) => setVehicleForm({ ...vehicleForm, category: event.target.value })}
                      placeholder="Economy, Luxury, SUV…"
                    />
                  </label>
                  <label>Daily rate
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={vehicleForm.price}
                      onChange={(event) => setVehicleForm({ ...vehicleForm, price: event.target.value })}
                    />
                  </label>
                  <label>Description
                    <textarea
                      rows={3}
                      value={vehicleForm.description}
                      onChange={(event) => setVehicleForm({ ...vehicleForm, description: event.target.value })}
                    />
                  </label>
                  <label>Available to book
                    <input
                      type="checkbox"
                      checked={vehicleForm.active}
                      onChange={(event) => setVehicleForm({ ...vehicleForm, active: event.target.checked })}
                    />
                  </label>
                  {vehicleImageFiles.length > 0 && (
                    <div className="upload-preview-row">
                      {vehicleImageFiles.map((file, index) => (
                        <img
                          key={index}
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="upload-preview-thumb"
                        />
                      ))}
                    </div>
                  )}
                  <label>Vehicle photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => setVehicleImageFiles([...(event.target.files || [])])}
                    />
                  </label>
                </div>
                <div className="admin-form-actions">
                  <button
                    className="admin-secondary-button"
                    type="button"
                    onClick={() => {
                      setVehicleEditing(null);
                      setVehicleFormOpen(false);
                      setVehicleImageFiles([]);
                      setVehicleForm({ name: '', category: '', price: '', description: '', active: true });
                    }}
                  >
                    Cancel
                  </button>
                  <button className="admin-primary-button" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : vehicleEditing ? 'Update vehicle' : 'Add vehicle'}
                    {saving ? <span className="button-spinner" /> : <Plus size={16} />}
                  </button>
                </div>
              </form>
            ) : (
              <div className="admin-service-list">
                {fleet.length ? (
                  fleet.map((vehicle) => (
                    <article
                      key={vehicle.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px 0',
                        borderBottom: '1px solid var(--nova-gray)',
                      }}
                    >
                      {vehicle.images && vehicle.images.length > 0 ? (
                        <img src={vehicle.images[0]} alt={vehicle.name} className="admin-service-thumb" />
                      ) : (
                        <Settings size={24} style={{ color: 'var(--nova-blue)' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3>{vehicle.name}</h3>
                        <p style={{ color: 'var(--nova-silver-dark)', fontSize: '0.85rem' }}>{vehicle.category}</p>
                      </div>
                      <strong>{formatPrice(vehicle.price, seller.currency || 'USD')}/day</strong>
                      <span className={`service-availability ${vehicle.status === 'active' ? 'is-live' : ''}`}>
                        {vehicle.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                      <button aria-label={`Edit ${vehicle.name}`} onClick={() => openVehicle(vehicle)}>
                        <DollarSign size={16} />
                      </button>
                      <button aria-label={`Delete ${vehicle.name}`} onClick={() => deleteVehicle(vehicle)}>
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <Settings size={32} style={{ color: 'var(--nova-blue)' }} />
                    <p>Your fleet is empty.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {section === 'team' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="nova-kicker">YOUR TEAM</p>
                <h2>Fleet managers</h2>
                <p>Add team members who can be assigned to bookings.</p>
              </div>
            </div>
            <form className="admin-form" onSubmit={saveStaff}>
              <div className="admin-form-grid">
                <label>Manager name
                  <input
                    value={staffDraft.name}
                    onChange={(event) => setStaffDraft({ ...staffDraft, name: event.target.value })}
                    required
                  />
                </label>
                <label>Phone number
                  <input
                    type="tel"
                    value={staffDraft.phone}
                    onChange={(event) => setStaffDraft({ ...staffDraft, phone: event.target.value })}
                  />
                </label>
                <button className="admin-primary-button" type="submit" disabled={saving}>
                  <Plus size={16} /> Add to team
                </button>
              </div>
            </form>

            {settings.fleetManagers.length ? (
              <div className="admin-team-list">
                {settings.fleetManagers.map((person, index) => (
                  <article
                    key={`${person.name}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--nova-gray)',
                    }}
                  >
                    <span className="team-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{person.name}</strong>
                      <span style={{ color: 'var(--nova-silver-dark)', fontSize: '0.85rem' }}>{person.phone || 'No phone'}</span>
                    </div>
                    <button
                      aria-label={`Remove ${person.name}`}
                      onClick={() =>
                        void saveSettings({
                          ...settings,
                          fleetManagers: settings.fleetManagers.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty">
                <Users size={48} style={{ color: 'var(--nova-blue)' }} />
                <h2>Build your team.</h2>
                <p>Add fleet managers so you can assign bookings from the reservations board.</p>
              </div>
            )}
          </section>
        )}

        {section === 'settings' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="nova-kicker">RENTAL SETTINGS</p>
                <h2>Business settings</h2>
                <p>Configure pickup locations, hours, deposit terms, and insurance tiers.</p>
              </div>
            </div>

            <form
              className="admin-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveSettings(settings);
              }}
            >
              <div className="admin-form-grid">
                <label>Deposit percentage
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.depositPercent}
                    onChange={(event) => updateSettings({ depositPercent: Number(event.target.value) })}
                  />
                </label>
                <label>Currency
                  <input
                    value={settings.currency}
                    onChange={(event) => updateSettings({ currency: event.target.value.toUpperCase() })}
                  />
                </label>
                <label>Operating hours
                  <input
                    value={`${settings.operatingHours.open} - ${settings.operatingHours.close}`}
                    onChange={(event) => {
                      const [open, close] = event.target.value.split(' - ');
                      updateSettings({ operatingHours: { open: open || '08:00', close: close || '18:00' } });
                    }}
                    placeholder="08:00 - 20:00"
                  />
                </label>
              </div>

              <div style={{ marginTop: '24px' }}>
                <p className="nova-kicker">PICKUP LOCATIONS</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {settings.locations.map((location, index) => (
                    <span
                      key={index}
                      className="nova-badge"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {location}
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({
                            locations: settings.locations.filter((_, i) => i !== index),
                          })
                        }
                        aria-label={`Remove ${location}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <LocationInput
                    onAdd={(value) => {
                      if (value.trim()) {
                        updateSettings({ locations: [...settings.locations, value.trim()] });
                      }
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <p className="nova-kicker">INSURANCE TIERS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(settings.insuranceOptions).map(([key, option]) => (
                    <div key={key} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={option.name}
                        onChange={(event) =>
                          updateSettings({
                            ...settings,
                            insuranceOptions: {
                              ...settings.insuranceOptions,
                              [key]: { ...option, name: event.target.value },
                            },
                          })
                        }
                        readOnly
                        style={{ width: '160px' }}
                      />
                      <input
                        type="text"
                        value={option.description}
                        onChange={(event) =>
                          updateSettings({
                            ...settings,
                            insuranceOptions: {
                              ...settings.insuranceOptions,
                              [key]: { ...option, description: event.target.value },
                            },
                          })
                        }
                        placeholder="Description"
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-form-actions" style={{ marginTop: '24px' }}>
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

const LocationInput: React.FC<{ onAdd: (value: string) => void }> = ({ onAdd }) => {
  const [value, setValue] = useState('');
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Add location…"
      onBlur={() => {
        onAdd(value);
        setValue('');
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onAdd(value);
          setValue('');
        }
      }}
      style={{ flex: 1, minWidth: '200px' }}
    />
  );
};

const BookingRow: React.FC<{
  order: Order;
  settings: NovaSettings;
  onStatus: (order: Order, status: Order['status']) => void;
  onAssign: (orderId: string, managerName: string) => void;
}> = ({ order, settings, onStatus, onAssign }) => {
  const booking = readNovaBooking(order)!;
  const pickupDate = new Date(`${booking.pickupDate}T12:00:00`);
  const isFuture = booking.pickupDate >= new Date().toISOString().slice(0, 10);

  return (
    <article className="admin-appointment-row">
      <div className="agenda-time">
        <strong>{booking.pickupTime || 'AM'}</strong>
        <span>{pickupDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="agenda-client">
        <strong>{order.customerName}</strong>
        <span>
          {order.customerEmail} · {booking.totalDays} {booking.totalDays === 1 ? 'day' : 'days'} · {booking.driverAge}+
        </span>
      </div>
      <div className="agenda-service">
        <strong>{order.items.map((item) => item.productName).join(', ')}</strong>
        <span>{formatPrice(order.total, order.currency || 'USD')}</span>
      </div>
      <label className="agenda-staff">
        <span className="sr-only">Assign fleet manager</span>
        <select
          value={settings.assignments[order.id] || ''}
          onChange={(event) => onAssign(order.id, event.target.value)}
          aria-label={`Assign manager to ${order.customerName}`}
        >
          <option value="">No manager</option>
          {settings.fleetManagers.map((person) => (
            <option key={person.id} value={person.name}>
              {person.name} · {person.phone || 'Manager'}
            </option>
          ))}
        </select>
      </label>
      <span className={`event-status status-${order.status}`}>
        {order.status === 'pending' ? 'New' : order.status}
      </span>
      <div className="agenda-actions">
        {order.status === 'pending' && (
          <button aria-label="Confirm" onClick={() => onStatus(order, 'processing')}>
            <Check size={16} />
          </button>
        )}
        {isFuture && !['cancelled', 'delivered'].includes(order.status) && (
          <button aria-label="Cancel" onClick={() => onStatus(order, 'cancelled')}>
            <X size={16} />
          </button>
        )}
        {!isFuture && !['cancelled', 'delivered'].includes(order.status) && (
          <button aria-label="Mark complete" onClick={() => onStatus(order, 'delivered')}>
            <Check size={16} />
          </button>
        )}
      </div>
    </article>
  );
};

export default NovaDriveAdmin;
