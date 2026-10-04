import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, DollarSign, LayoutDashboard, ListFilter, Loader2, LogOut, Plus, RefreshCw, Scissors, Settings, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultPlannerSettings, getPlannerSettings, isEventFlow, readEventBooking, PlannerSettings, savePlannerSettings } from './eventPlannerTypes';
import './event-planner.css';

type Section = 'overview' | 'events' | 'services' | 'team' | 'settings';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'events', label: 'Event Requests', icon: <CalendarDays size={18} /> },
  { id: 'services', label: 'Services', icon: <Settings size={18} /> },
  { id: 'team', label: 'Team', icon: <Users size={18} /> },
  { id: 'settings', label: 'Availability', icon: <Clock3 size={18} /> },
];

const EventPlannerAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [serviceEditing, setServiceEditing] = useState<Product | null>(null);
  const [isServiceFormOpen, setServiceFormOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', category: '', price: '', duration: '60', description: '', active: true });
  const [serviceImageFiles, setServiceImageFiles] = useState<File[]>([]);
  const [staffDraft, setStaffDraft] = useState({ name: '', specialty: '' });
  const [settings, setSettings] = useState<PlannerSettings>(defaultPlannerSettings);

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
      if (!isEventFlow(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettings(getPlannerSettings(owner));
      setOrders(
        allOrders
          .filter((order) => readEventBooking(order))
          .sort((a, b) => (readEventBooking(a)?.eventDate || '').localeCompare(readEventBooking(b)?.eventDate || ''))
      );
      setServices(allProducts.filter((product) => product.type === 'service'));
    } catch {
      setError('We could not load your event workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = orders.filter((order) => {
    const booking = readEventBooking(order);
    if (!booking) return false;
    return (
      (!dateFilter || booking.eventDate === dateFilter) &&
      (statusFilter === 'all' || order.status === statusFilter)
    );
  });

  const today = new Date().toISOString().slice(0, 10);
  const todaysEvents = orders.filter((order) => readEventBooking(order)?.eventDate === today);
  const upcomingEvents = orders.filter((order) => {
    const booking = readEventBooking(order);
    return booking && booking.eventDate >= today && order.status !== 'cancelled';
  });
  const pendingRequests = orders.filter((order) => order.status === 'pending');
  const confirmedRevenue = orders
    .filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  const saveSettings = async (next: PlannerSettings) => {
    if (!seller) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await sellersAPI.updateMe(savePlannerSettings(seller, next));
      setSeller(updated);
      setSettings(getPlannerSettings(updated));
      setNotice('Changes saved.');
    } catch {
      setError('These changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (patch: Partial<PlannerSettings>) =>
    setSettings((current) => ({ ...current, ...patch }));

  const setStatus = async (order: Order, status: Order['status']) => {
    setError('');
    setNotice('');
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setOrders((items) => items.map((item) => (item.id === order.id ? updated : item)));
      setNotice('Event request updated.');
    } catch {
      setError('The event status was not changed. Please retry.');
    }
  };

  const assignPlanner = async (orderId: string, plannerName: string) => {
    await saveSettings({
      ...settings,
      assignments: { ...settings.assignments, [orderId]: plannerName },
    });
  };

  const openService = (service?: Product) => {
    setServiceEditing(service || null);
    setServiceFormOpen(true);
    setServiceImageFiles([]);
    const durationMatch = service?.description.match(/Duration:\s*(\d+)/i);
    const duration = durationMatch ? durationMatch[1] : '60';
    setServiceForm({
      name: service?.name || '',
      category: service?.category || '',
      price: service ? String(service.price) : '',
      duration,
      description: service?.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim() || '',
      active: service?.status !== 'draft' && service?.status !== 'archived',
    });
  };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!seller) return;
    setSaving(true);

    let imageUrls: string[] = serviceEditing?.images || [];

    try {
      if (serviceImageFiles.length > 0) {
        const uploaded = await uploadAPI.upload(serviceImageFiles);
        imageUrls = [...uploaded];
      }

      const description = `${serviceForm.description.trim()}${serviceForm.description.trim() ? '\n' : ''}Duration: ${serviceForm.duration} min`;
      const values = {
        sellerId: seller.id,
        name: serviceForm.name.trim(),
        description,
        price: Number(serviceForm.price),
        category: serviceForm.category.trim() || 'Event Planning',
        type: 'service' as const,
        images: imageUrls,
        stock: -1,
        status: serviceForm.active ? 'active' as const : 'draft' as const,
      };

      let result: Product;
      if (serviceEditing) {
        result = await productsAPI.update(serviceEditing.id, values);
        setServices((list) => list.map((item) => (item.id === result.id ? result : item)));
      } else {
        result = await productsAPI.create(values);
        setServices((list) => [...list, result]);
      }

      setServiceEditing(null);
      setServiceFormOpen(false);
      setServiceImageFiles([]);
      setServiceForm({ name: '', category: '', price: '', duration: '60', description: '', active: true });
      setNotice('Service saved.');
    } catch {
      setError('The service was not saved. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service: Product) => {
    if (!window.confirm(`Remove ${service.name}? This cannot be undone.`)) return;
    try {
      await productsAPI.delete(service.id);
      setServices((list) => list.filter((item) => item.id !== service.id));
      setNotice('Service removed.');
    } catch {
      setError('This service could not be removed. Please try again.');
    }
  };

  const saveStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffDraft.name.trim()) return;
    await saveSettings({
      ...settings,
      planners: [...settings.planners, { name: staffDraft.name.trim(), specialty: staffDraft.specialty.trim() }],
    });
    setStaffDraft({ name: '', specialty: '' });
  };

  if (loading) {
    return (
      <div className="flow-admin">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 className="button-spinner" />
          <p>Loading your event workspace…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flow-admin">
        <div style={{ padding: '60px', textAlign: 'center' }} role="alert">
          {error || 'This workspace is unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flow-admin">
      <aside className="flow-admin-sidebar">
        <a href={`/shop/${seller.subdomain}`} className="flow-wordmark">
          <span className="wordmark-mark"><CalendarDays size={17} /></span>
          <span>Event <em>Flow</em></span>
        </a>
        <p className="admin-label">STUDIO DESK</p>
        <nav aria-label="Event workspace">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
              {item.id === 'events' && pendingRequests.length > 0 && (
                <span className="count">{pendingRequests.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{seller.storeName}</strong>
            <span>Event planner</span>
          </div>
        </div>
      </aside>

      <main className="flow-admin-main">
        <header className="admin-topbar">
          <div>
            <p className="flow-kicker">EVENT FLOW / STUDIO DESK</p>
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
          <div className="flow-alert" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button>
          </div>
        )}
        {notice && (
          <div className="flow-notice" role="status">
            <Check size={15} /> {notice}
          </div>
        )}

        {section === 'overview' && (
          <section className="admin-section">
            <div className="admin-metrics">
              <article className="admin-metric">
                <span className="metric-label">Today's events</span>
                <strong className="metric-value">{todaysEvents.length}</strong>
                <small className="metric-sub">{todaysEvents.filter((o) => o.status === 'pending').length} awaiting confirmation</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Pending requests</span>
                <strong className="metric-value">{pendingRequests.length}</strong>
                <small className="metric-sub">Need a quick look</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Upcoming bookings</span>
                <strong className="metric-value">{upcomingEvents.length}</strong>
                <small className="metric-sub">On your calendar</small>
              </article>
              <article className="admin-metric">
                <span className="metric-label">Confirmed revenue</span>
                <strong className="metric-value">{formatPrice(confirmedRevenue, seller.currency || 'USD')}</strong>
                <small className="metric-sub">Confirmed and completed</small>
              </article>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="flow-kicker">TODAY</p>
                  <h2>Today's schedule</h2>
                </div>
                <button onClick={() => setSection('events')} className="flow-button-outline" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                  All events
                </button>
              </div>
              {todaysEvents.length ? (
                <div className="admin-agenda">
                  {todaysEvents.map((order) => (
                    <EventRow
                      key={order.id}
                      order={order}
                      settings={settings}
                      onStatus={setStatus}
                      onAssign={assignPlanner}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <CalendarDays size={32} style={{ color: 'var(--flow-gold)' }} />
                  <p style={{ marginTop: '12px' }}>A quiet day. Nothing is booked today.</p>
                </div>
              )}
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <p className="flow-kicker">JUST IN</p>
                  <h2>Recent requests</h2>
                </div>
                <span>{pendingRequests.length} pending</span>
              </div>
              {orders
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 5)
                .length ? (
                <div className="flow-recent-list">
                  {orders
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
                  <CalendarDays size={32} style={{ color: 'var(--flow-gold)' }} />
                  <p>No requests yet.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {section === 'events' && (
          <section className="admin-section">
            <div className="admin-toolbar">
              <p>{filtered.length} event request{filtered.length === 1 ? '' : 's'}</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                  <EventRow
                    key={order.id}
                    order={order}
                    settings={settings}
                    onStatus={setStatus}
                    onAssign={assignPlanner}
                  />
                ))
              ) : (
                <div className="admin-empty">
                  <CalendarDays size={48} style={{ color: 'var(--flow-gold)' }} />
                  <h2>No events match.</h2>
                  <p>Try another date or status, or check back when a new request arrives.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {section === 'services' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="flow-kicker">YOUR OFFERINGS</p>
                <h2>Event services</h2>
                <p>Define your packages and what each includes.</p>
              </div>
              <button className="admin-primary-button" onClick={() => openService()}>
                <Plus size={16} /> Add a service
              </button>
            </div>

            {isServiceFormOpen ? (
              <form className="admin-form service-editor" onSubmit={saveService}>
                <div className="admin-form-heading">
                  <h3>{serviceEditing ? 'Edit service' : 'New service'}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setServiceEditing(null);
                      setServiceFormOpen(false);
                      setServiceImageFiles([]);
                      setServiceForm({ name: '', category: '', price: '', duration: '60', description: '', active: true });
                    }}
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label>Service name
                    <input
                      required
                      value={serviceForm.name}
                      onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })}
                    />
                  </label>
                  <label>Category
                    <input
                      value={serviceForm.category}
                      onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })}
                      placeholder="Weddings, Corporate, Private…"
                    />
                  </label>
                  <label>Price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={serviceForm.price}
                      onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })}
                    />
                  </label>
                  <label>Duration (minutes)
                    <input
                      type="number"
                      min="15"
                      step="15"
                      required
                      value={serviceForm.duration}
                      onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>Description
                    <textarea
                      rows={3}
                      value={serviceForm.description}
                      onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })}
                    />
                  </label>
                  <label>Available to book
                    <input
                      type="checkbox"
                      checked={serviceForm.active}
                      onChange={(event) => setServiceForm({ ...serviceForm, active: event.target.checked })}
                    />
                  </label>
                  {serviceImageFiles.length > 0 && (
                    <div className="upload-preview-row">
                      {serviceImageFiles.map((file, index) => (
                        <img key={index} src={URL.createObjectURL(file)} alt="Preview" className="upload-preview-thumb" />
                      ))}
                    </div>
                  )}
                  <label>Cover photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setServiceImageFiles([...(event.target.files || [])])}
                    />
                  </label>
                </div>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => {
                      setServiceEditing(null);
                      setServiceFormOpen(false);
                      setServiceImageFiles([]);
                      setServiceForm({ name: '', category: '', price: '', duration: '60', description: '', active: true });
                    }}
                  >
                    Cancel
                  </button>
                  <button className="admin-primary-button" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : serviceEditing ? 'Update service' : 'Create service'}
                    {saving ? <span className="button-spinner" /> : <Plus size={16} />}
                  </button>
                </div>
              </form>
            ) : (
              <div className="admin-service-list">
                {services.length ? (
                  services.map((service) => (
                    <article key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--flow-gray)' }}>
                      {service.images && service.images.length > 0 ? (
                        <img src={service.images[0]} alt={service.name} className="admin-service-thumb" />
                      ) : (
                        <Settings size={24} style={{ color: 'var(--flow-gold)' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3>{service.name}</h3>
                        <p style={{ color: 'var(--flow-gray-dark)', fontSize: '0.85rem' }}>{service.category}</p>
                      </div>
                      <strong>{formatPrice(service.price, seller.currency || 'USD')}</strong>
                      <span className={`service-availability ${service.status === 'active' ? 'is-live' : ''}`}>
                        {service.status === 'active' ? 'Live' : 'Draft'}
                      </span>
                      <button aria-label={`Edit ${service.name}`} onClick={() => openService(service)}>
                        <DollarSign size={16} />
                      </button>
                      <button aria-label={`Delete ${service.name}`} onClick={() => deleteService(service)}>
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <Settings size={32} style={{ color: 'var(--flow-gold)' }} />
                    <p>Your service menu is empty.</p>
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
                <p className="flow-kicker">GOOD PEOPLE, GOOD EVENTS</p>
                <h2>Your team</h2>
                <p>Add team members who can be assigned to event requests.</p>
              </div>
            </div>
            <form className="admin-form" onSubmit={saveStaff}>
              <div className="admin-form-grid">
                <label>Planner name
                  <input
                    value={staffDraft.name}
                    onChange={(event) => setStaffDraft({ ...staffDraft, name: event.target.value })}
                    required
                  />
                </label>
                <label>Specialty
                  <input
                    value={staffDraft.specialty}
                    onChange={(event) => setStaffDraft({ ...staffDraft, specialty: event.target.value })}
                    placeholder="Weddings, corporate, design…"
                  />
                </label>
                <button className="admin-primary-button" type="submit" disabled={saving}>
                  <Plus size={16} /> Add to team
                </button>
              </div>
            </form>

            {settings.planners.length ? (
              <div className="admin-team-list">
                {settings.planners.map((person, index) => (
                  <article key={`${person.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--flow-gray)' }}>
                    <span className="team-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{person.name}</strong>
                      <span style={{ color: 'var(--flow-gray-dark)', fontSize: '0.85rem' }}>{person.specialty || 'Event planner'}</span>
                    </div>
                    <button
                      aria-label={`Remove ${person.name}`}
                      onClick={() =>
                        void saveSettings({
                          ...settings,
                          planners: settings.planners.filter((_, itemIndex) => itemIndex !== index),
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
                <Users size={48} style={{ color: 'var(--flow-gold)' }} />
                <h2>A good team makes great events.</h2>
                <p>Add your planners so you can assign requests from the Events board.</p>
              </div>
            )}
          </section>
        )}

        {section === 'settings' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div>
                <p className="flow-kicker">WORKING HOURS</p>
                <h2>Availability</h2>
                <p>Set your working days and response windows.</p>
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
                <label>Minimum notice (days)
                  <input
                    type="number"
                    min="0"
                    value={settings.minimumNoticeDays}
                    onChange={(event) => updateSettings({ minimumNoticeDays: Number(event.target.value) })}
                    required
                  />
                </label>
                <label>Booking lead time (hours)
                  <input
                    type="number"
                    min="0"
                    value={settings.bookingLeadTime}
                    onChange={(event) => updateSettings({ bookingLeadTime: Number(event.target.value) })}
                    required
                  />
                </label>
              </div>
              <div style={{ marginTop: '24px' }}>
                <p className="flow-kicker">WORKING DAYS</p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {Object.entries({
                    monday: 'Mon',
                    tuesday: 'Tue',
                    wednesday: 'Wed',
                    thursday: 'Thu',
                    friday: 'Fri',
                    saturday: 'Sat',
                    sunday: 'Sun',
                  }).map(([day, label]) => (
                    <label key={day} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {label}
                      <input
                        type="text"
                        value={settings.availability[day as keyof PlannerSettings['availability']]}
                        onChange={(event) =>
                          updateSettings({
                            availability: {
                              ...settings.availability,
                              [day]: event.target.value,
                            },
                          })
                        }
                        placeholder="9:00-18:00 or closed"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="admin-form-actions" style={{ marginTop: '24px' }}>
                <button className="admin-primary-button" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save availability'}
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

const EventRow: React.FC<{
  order: Order;
  settings: PlannerSettings;
  onStatus: (order: Order, status: Order['status']) => void;
  onAssign: (orderId: string, plannerName: string) => void;
}> = ({ order, settings, onStatus, onAssign }) => {
  const booking = readEventBooking(order)!;
  const eventDate = new Date(`${booking.eventDate}T12:00:00`);
  const isFuture = booking.eventDate >= new Date().toISOString().slice(0, 10);
  return (
    <article className="admin-appointment-row">
      <div className="agenda-time">
        <strong>{booking.eventTime}</strong>
        <span>{eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="agenda-client">
        <strong>{order.customerName}</strong>
        <span>{order.customerEmail} · {booking.guestCount} guests</span>
      </div>
      <div className="agenda-service">
        <strong>{order.items.map((item) => item.productName).join(', ')}</strong>
        <span>{formatPrice(order.total, order.currency || 'USD')}</span>
      </div>
      <label className="agenda-staff">
        <span className="sr-only">Assign planner</span>
        <select
          value={settings.assignments[order.id] || ''}
          onChange={(event) => onAssign(order.id, event.target.value)}
          aria-label={`Assign planner to ${order.customerName}`}
        >
          <option value="">No planner</option>
          {settings.planners.map((person) => (
            <option key={person.name} value={person.name}>{person.name} · {person.specialty || 'Planner'}</option>
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

export default EventPlannerAdmin;
