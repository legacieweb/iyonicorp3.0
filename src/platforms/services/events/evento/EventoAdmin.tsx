import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, LayoutDashboard, LogOut, Loader2, PiggyBank, Plus, Settings, Star, Ticket, TicketCheck, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultEventoSettings, EventoSettings, getEventoSettings, isEvento, readEventoBooking, saveEventoSettings, parseEventMeta } from './eventoTypes';
import './evento.css';

type Section = 'overview' | 'events' | 'bookings' | 'cohosts' | 'settings' | 'store-settings' | 'billing' | 'themes' | 'bots' | 'pay';
const nav: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'bookings', label: 'Tickets', icon: <CalendarDays size={18} /> },
  { id: 'events', label: 'Events', icon: <Ticket size={18} /> },
  { id: 'cohosts', label: 'Co-hosts', icon: <Users size={18} /> },
  { id: 'settings', label: 'Venue', icon: <Settings size={18} /> },
  { id: 'store-settings', label: 'Store settings', icon: <Settings size={18} /> },
  { id: 'billing', label: 'Billing', icon: <PiggyBank size={18} /> },
  { id: 'themes', label: 'Themes', icon: <LayoutDashboard size={18} /> },
  { id: 'bots', label: 'IyonicBots', icon: <Star size={18} /> },
  { id: 'pay', label: 'IyonicPay', icon: <TicketCheck size={18} /> },
];

type EventForm = {
  name: string;
  category: string;
  price: string;
  date: string;
  time: string;
  duration: string;
  capacity: string;
  description: string;
  active: boolean;
};

const buildEventDescription = (form: EventForm) => {
  const lines: string[] = [];
  if (form.description.trim()) lines.push(form.description.trim());
  if (form.date) lines.push(`Date: ${form.date}`);
  if (form.time) lines.push(`Time: ${form.time}`);
  if (form.duration) lines.push(`Duration: ${form.duration} min`);
  if (form.capacity) lines.push(`Capacity: ${form.capacity}`);
  return lines.join('\n');
};

const EventoAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [bookings, setBookings] = useState<Order[]>([]);
  const [events, setEvents] = useState<Product[]>([]);
  const [section, setSectionState] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [eventEditing, setEventEditing] = useState<Product | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>({ name: '', category: '', price: '', date: '', time: '', duration: '', capacity: '', description: '', active: true });
  const [eventImageFiles, setEventImageFiles] = useState<File[]>([]);
  const [eventVideoFile, setEventVideoFile] = useState<File | null>(null);
  const [cohortDraft, setCohortDraft] = useState({ name: '', specialty: '' });
  const [settings, setSettings] = useState<EventoSettings>(defaultEventoSettings);

  const setSection = (nextSection: Section) => {
    const destinations: Partial<Record<Section, string>> = {
      themes: '/themes',
      bots: '/iyonicbots',
      pay: '/iyonicpay',
    };
    const destination = destinations[nextSection];
    if (destination) {
      navigate(destination, { state: { from: '/evento/admin' } });
      return;
    }
    setSectionState(nextSection);
  };

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate('/seller/dashboard', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [owner, orders, products] = await Promise.all([
        sellersAPI.getMe(),
        ordersAPI.getBySellerId(user.sellerId),
        productsAPI.getBySellerId(user.sellerId),
      ]);
      if (!isEvento(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettings(getEventoSettings(owner));
      setBookings(orders.filter((order) => !!readEventoBooking(order)).sort((a, b) => (readEventoBooking(a)?.eventDate || '').localeCompare(readEventoBooking(b)?.eventDate || '')));
      setEvents(products.filter((product) => product.type === 'service'));
    } catch {
      setError('We could not load the event desk. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const filteredBookings = bookings.filter((order) => {
    const booking = readEventoBooking(order);
    return (!dateFilter || booking?.eventDate === dateFilter) && (statusFilter === 'all' || order.status === statusFilter);
  });
  const todays = bookings.filter((order) => readEventoBooking(order)?.eventDate === today);
  const upcoming = bookings.filter((order) => {
    const booking = readEventoBooking(order);
    return booking && booking.eventDate >= today && !['cancelled', 'refunded'].includes(order.status);
  });
  const pending = bookings.filter((order) => order.status === 'pending');
  const revenue = bookings.filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + order.total, 0);

  const saveSettings = async (next: EventoSettings) => {
    if (!seller) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await sellersAPI.updateMe(saveEventoSettings(seller, next));
      setSeller(updated);
      setSettings(getEventoSettings(updated));
      setNotice('Changes saved.');
    } catch {
      setError('These changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (order: Order, status: Order['status']) => {
    setError('');
    setNotice('');
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setBookings((items) => items.map((item) => (item.id === order.id ? updated : item)));
      setNotice('Ticket updated.');
    } catch {
      setError('The ticket status was not changed. Please retry.');
    }
  };

  const assignCohort = async (orderId: string, hostName: string) => {
    await saveSettings({ ...settings, assignments: { ...settings.assignments, [orderId]: hostName } });
  };

  const openEvent = (item?: Product) => {
    setEventEditing(item || null);
    setIsEventFormOpen(true);
    setEventImageFiles([]);
    setEventVideoFile(null);
    const meta = item ? parseEventMeta(item.description) : { date: '', time: '', duration: '', capacity: '' };
    setEventForm({
      name: item?.name || '',
      category: item?.category || '',
      price: item ? String(item.price) : '',
      date: meta.date,
      time: meta.time,
      duration: meta.duration,
      capacity: meta.capacity,
      description: (item?.description || '').replace(/\n?Date:\s*[\d-]+/i, '').replace(/\n?Time:\s*[\d:]+/i, '').replace(/\n?Duration:\s*\d+\s*min/i, '').replace(/\n?Capacity:\s*\d+/i, '').replace(/\n{3,}/g, '\n\n').trim(),
      active: item?.status !== 'draft' && item?.status !== 'archived',
    });
  };

  const resetEventForm = () => {
    setEventEditing(null);
    setIsEventFormOpen(false);
    setEventImageFiles([]);
    setEventVideoFile(null);
    setEventForm({ name: '', category: '', price: '', date: '', time: '', duration: '', capacity: '', description: '', active: true });
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller) return;
    setError('');
    setNotice('');
    setSaving(true);
    let imageUrls: string[] = eventEditing?.images || [];
    let videoUrls: string[] = eventEditing?.videos || [];
    try {
      if (eventImageFiles.length > 0 || eventVideoFile) {
        const files: File[] = [];
        if (eventImageFiles.length > 0) files.push(...eventImageFiles);
        if (eventVideoFile) files.push(eventVideoFile);
        const uploaded = await uploadAPI.upload(files);
        if (eventImageFiles.length > 0) imageUrls = [...uploaded.slice(0, eventImageFiles.length)];
        if (eventVideoFile) videoUrls = [uploaded[uploaded.length - 1]];
      }
      const description = buildEventDescription(eventForm);
      const values = {
        sellerId: seller.id,
        name: eventForm.name.trim(),
        description,
        price: Number(eventForm.price),
        category: eventForm.category.trim() || 'Event',
        type: 'service' as const,
        images: imageUrls,
        videos: videoUrls,
        stock: -1,
        status: eventForm.active ? 'active' as const : 'draft' as const,
      };
      let result: Product;
      if (eventEditing) {
        result = await productsAPI.update(eventEditing.id, values);
        setEvents((list) => list.map((item) => (item.id === result.id ? result : item)));
      } else {
        result = await productsAPI.create(values);
        setEvents((list) => [...list, result]);
      }
      resetEventForm();
      setNotice('Event saved.');
    } catch {
      setError('The event was not saved. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (item: Product) => {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    try {
      await productsAPI.delete(item.id);
      setEvents((list) => list.filter((current) => current.id !== item.id));
      setNotice('Event deleted.');
    } catch {
      setError('This event could not be deleted. Please try again.');
    }
  };

  const saveCohort = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cohortDraft.name.trim()) return;
    await saveSettings({ ...settings, cohosts: [...settings.cohosts, { name: cohortDraft.name.trim(), specialty: cohortDraft.specialty.trim() }] });
    setCohortDraft({ name: '', specialty: '' });
  };

  const saveTier = async () => {
    const raw = prompt('New tier (format: Name,Price e.g. "Early Bird,25")');
    if (!raw) return;
    const [name, priceStr] = raw.split(',');
    if (!name || !priceStr) {
      alert('Use the format Name,Price.');
      return;
    }
    await saveSettings({ ...settings, ticketTiers: [...settings.ticketTiers, { name: name.trim(), price: Number(priceStr) }] });
  };

  const removeTier = async (index: number, tier: { name: string; price: number }) => {
    if (!window.confirm(`Remove tier "${tier.name}"?`)) return;
    await saveSettings({ ...settings, ticketTiers: settings.ticketTiers.filter((_, itemIndex) => itemIndex !== index) });
  };

  const updateSettingsPatch = (patch: Partial<EventoSettings>) => setSettings((current) => ({ ...current, ...patch }));

  const displayedTitle = useMemo(() => nav.find((item) => item.id === section)?.label || 'Overview', [section]);

  const displayedStatus = (status: string) => {
    if (status === 'pending') return 'Pending';
    if (status === 'processing') return 'Confirmed';
    if (status === 'delivered') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    return status;
  };

  if (loading) {
    return <div className="ev-admin"><div className="ev-loading"><Loader2 className="ev-spinner" /> Loading your event desk…</div></div>;
  }
  if (!seller) {
    return <div className="ev-admin"><div className="ev-loading" role="alert">{error || 'This event desk is unavailable.'}</div></div>;
  }

  return (
    <div className="ev-admin">
      <aside className="ev-admin-sidebar">
        <a href={`/shop/${seller.subdomain}`} className="ev-wordmark"><span className="ev-emblem"><Ticket size={18} /></span><span>Evento <em>Live</em></span></a>
        <p className="ev-label">EVENT DESK</p>
        <nav aria-label="Event desk workspace">{nav.map((item) => (
          <button key={item.id} onClick={() => { setSection(item.id); setError(''); setNotice(''); }} className={section === item.id ? 'ev-admin-nav active' : 'ev-admin-nav'}>
            {item.icon}{item.label}{item.id === 'bookings' && pending.length > 0 && <span className="ev-count">{pending.length}</span>}
          </button>
        ))}</nav>
        <div className="ev-admin-bottom">
          <span className="ev-admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span>
          <div><strong className="ev-name">{seller.storeName}</strong><span className="ev-sub">Organizer</span></div>
        </div>
      </aside>

      <main className="ev-admin-main">
        <header className="ev-topbar">
          <div><p className="ev-kicker">EVENTO / EVENT DESK</p><h1>{displayedTitle}</h1></div>
          <div className="ev-top-actions">
            <a href={`/shop/${seller.subdomain}`} target="_blank" rel="noreferrer" className="ev-btn ev-btn-ghost ev-btn-pill">View site <ArrowRight size={15} /></a>
            <button aria-label="Refresh" className="ev-btn ev-btn-ghost ev-btn-pill" onClick={() => void load()}><Loader2 size={17} /> Refresh</button>
            <button aria-label="Sign out" className="ev-btn ev-btn-ghost ev-btn-pill" onClick={logout}><LogOut size={16} /> Sign out</button>
          </div>
        </header>

        {error && <div className="ev-alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        {notice && <div className="ev-alert notice" role="status"><Check size={15} />{notice}</div>}

        {section === 'overview' && (
          <section>
            <div className="ev-metrics">
              <div className="ev-metric"><span className="ev-m-label">Today</span><strong>{todays.length}</strong><small>{todays.filter((item) => item.status === 'pending').length} awaiting confirmation</small></div>
              <div className="ev-metric"><span className="ev-m-label">Pending</span><strong>{pending.length}</strong><small>Requests to review</small></div>
              <div className="ev-metric"><span className="ev-m-label">Upcoming</span><strong>{upcoming.length}</strong><small>On your schedule</small></div>
              <div className="ev-metric"><span className="ev-m-label">Confirmed revenue</span><strong>{formatPrice(revenue, seller.currency || 'USD')}</strong><small>Completed tickets</small></div>
            </div>

            <div className="ev-panel">
              <div className="ev-panel-head"><h2>Your day</h2><button className="ev-view" onClick={() => setSection('bookings')}>All tickets <ArrowRight size={14} /></button></div>
              <div className="ev-panel-body">
                {todays.length ? <div className="ev-agenda">{todays.map((order) => <BookingRow key={order.id} order={order} settings={settings} onStatus={setStatus} onAssign={assignCohort} />)}</div>
                  : <div className="ev-loading"><CalendarDays size={28} /> A little breathing room. Nothing is on the docket today.</div>}
              </div>
            </div>

            <div className="ev-panel" style={{ marginTop: '20px' }}>
              <div className="ev-panel-head"><h2>Recent requests</h2><span>{pending.length} pending</span></div>
              <div className="ev-panel-body">
                {bookings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).length ? bookings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((order) => (
                  <div key={order.id} className="ev-agenda-item" style={{ justifyContent: 'space-between' }}>
                    <div className="ev-agenda-client"><strong>{order.customerName}</strong><span className="ev-t-sub">{order.items.map((item) => item.productName).join(', ')}</span></div>
                    <span className={`ev-status status-${order.status}`}>{displayedStatus(order.status)}</span>
                  </div>
                )) : <div className="ev-loading"><Ticket size={24} /> No new requests yet.</div>}
              </div>
            </div>
          </section>
        )}

        {section === 'bookings' && (
          <section>
            <div className="ev-toolbar">
              <p>{filteredBookings.length} ticket{filteredBookings.length === 1 ? '' : 's'}</p>
              <div className="ev-filters">
                <label><Clock3 size={13} /><select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option><option value="pending">Pending</option><option value="processing">Confirmed</option><option value="delivered">Completed</option><option value="cancelled">Cancelled</option>
                </select></label>
                <label><CalendarDays size={13} /><input aria-label="Filter by date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></label>
              </div>
            </div>
            <div>
              {filteredBookings.length ? filteredBookings.map((order) => <BookingRow key={order.id} order={order} settings={settings} onStatus={setStatus} onAssign={assignCohort} />) : (
                <div className="ev-loading"><CalendarDays size={32} /><h2>No tickets match.</h2><p>Try another date or status, or check back when a new request arrives.</p></div>
              )}
            </div>
          </section>
        )}

        {section === 'events' && (
          <section>
            <div className="ev-panel-head">
              <div><p className="ev-kicker">YOUR LINEUP</p><h2>Events</h2><p>Create live events with date, time, capacity, and ticket pricing.</p></div>
              <button className="ev-btn ev-btn-primary" onClick={() => openEvent()}><Plus size={15} /> Add an event</button>
            </div>
            {isEventFormOpen ? (
              <form className="ev-form-editor" onSubmit={saveEvent}>
                <div className="ev-form-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}><h3>{eventEditing ? 'Edit event' : 'New event'}</h3><button type="button" onClick={resetEventForm} aria-label="Close editor"><X size={18} /></button></div>
                <div className="ev-grid2">
                  <label>Event name<input required value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} /></label>
                  <label>Category<input value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} placeholder="Workshop, concert, pop-up…" /></label>
                  <label>Price<input type="number" min="0" step="0.01" required value={eventForm.price} onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })} /></label>
                  <label>Date<input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></label>
                  <label>Time<input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} /></label>
                  <label>Duration (minutes)<input type="number" min="15" step="15" value={eventForm.duration} onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })} placeholder="90" /></label>
                  <label>Capacity<input type="number" min="1" step="1" value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} placeholder="e.g. 30" /></label>
                  <label className="ev-wide">Description<textarea rows={3} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="What happens at this event?" /></label>
                  <label className="ev-wide">Media<input type="file" accept="image/*" multiple onChange={(e) => setEventImageFiles(Array.from(e.target.files || []))} /></label>
                  {eventImageFiles.length > 0 && <div className="upload-preview-row">{eventImageFiles.map((file, index) => <img key={index} src={URL.createObjectURL(file)} alt="preview" className="upload-preview-thumb" />)}</div>}
                  {eventEditing?.images && eventEditing.images.length > 0 && <div className="upload-preview-row">{eventEditing.images.map((url, index) => <img key={index} src={url} alt="existing" className="upload-preview-thumb" />)}</div>}
                  <label className="ev-wide">Video<input type="file" accept="video/*" onChange={(e) => setEventVideoFile(e.target.files?.[0] || null)} /></label>
                  <div className="ev-wide ev-toggle"><input type="checkbox" checked={eventForm.active} onChange={(e) => setEventForm({ ...eventForm, active: e.target.checked })} /> Available to request</div>
                </div>
                <div className="ev-actions"><button className="ev-btn ev-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : eventEditing ? 'Update event' : 'Create event'}</button><button type="button" className="ev-btn ev-btn-ghost" onClick={resetEventForm}>Cancel</button></div>
              </form>
            ) : events.length ? (
              <div className="ev-list">
                {events.map((item) => {
                  const meta = parseEventMeta(item.description);
                  return <article key={item.id}>
                    <div className="ev-thumb">{item.images && item.images.length > 0 && <img src={item.images[0]} alt={item.name} />}<Ticket size={20} /></div>
                    <div className="ev-info">
                      <h3>{item.name}</h3>
                      <p className="ev-t-sub">{meta.date ? new Date(`${meta.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA'}{meta.time && ` at ${meta.time}`}</p>
                      <p className="ev-t-sub">{meta.duration && `${meta.duration} min`}{meta.capacity && ` · ${meta.capacity} capacity`}</p>
                    </div>
                    <strong className="ev-price-tag">{formatPrice(item.price, seller.currency || 'USD')}</strong>
                    <span className={`ev-badge ${item.status === 'active' ? 'is-live' : 'is-draft'}`}>{item.status === 'active' ? 'Live' : 'Draft'}</span>
                    <button aria-label={`Edit ${item.name}`} onClick={() => openEvent(item)} className="ev-btn ev-btn-ghost ev-btn-pill"><Plus size={14} /></button>
                    <button aria-label={`Delete ${item.name}`} onClick={() => void deleteEvent(item)} className="ev-btn ev-btn-ghost ev-btn-pill" style={{ color: 'var(--ev-accent)' }}><Trash2 size={14} /></button>
                  </article>;
                })}
              </div>
            ) : (
              <div className="ev-loading"><Ticket size={36} /><h2>No events yet.</h2><p>Add your first event and start filling the schedule.</p></div>
            )}
          </section>
        )}

        {section === 'cohosts' && (
          <section>
            <div className="ev-panel-head">
              <div><p className="ev-kicker">GOOD PEOPLE, GOOD VIBES</p><h2>Your co-hosts</h2><p>Attendees can request their favorite host. Add team members and assign requests from Tickets.</p></div>
            </div>
            <form className="ev-staff-form" onSubmit={saveCohort}>
              <label style={{ flex: 1 }}>Host name<input value={cohortDraft.name} onChange={(e) => setCohortDraft({ ...cohortDraft, name: e.target.value })} required /></label>
              <label style={{ flex: 1 }}>Specialty<input value={cohortDraft.specialty} onChange={(e) => setCohortDraft({ ...cohortDraft, specialty: e.target.value })} placeholder="DJ, host, MC…" /></label>
              <button className="ev-btn ev-btn-primary ev-add" type="submit" disabled={saving}><Plus size={15} /> Add</button>
            </form>
            {settings.cohosts.length ? (
              <div className="ev-list">
                {settings.cohosts.map((person, index) => (
                  <article key={`${person.name}-${index}`}>
                    <span className="ev-admin-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
                    <div className="ev-info"><strong>{person.name}</strong><span className="ev-t-sub">{person.specialty || 'Event host'}</span></div>
                    <button aria-label={`Remove ${person.name}`} onClick={() => void saveSettings({ ...settings, cohosts: settings.cohosts.filter((_, itemIndex) => itemIndex !== index) })} className="ev-btn ev-btn-ghost ev-btn-pill" style={{ color: 'var(--ev-accent)' }}><Trash2 size={14} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ev-loading"><Users size={28} /><h2>A strong team makes a strong show.</h2><p>Add your co-hosts so attendees can request their favorite.</p></div>
            )}
          </section>
        )}

        {section === 'settings' && (
          <section>
            <div className="ev-panel-head">
              <div><p className="ev-kicker">THE VENUE DETAILS</p><h2>Venue & availability</h2><p>These appear on the event site and shape how tickets are requested.</p></div>
            </div>
            <form className="ev-form-editor" onSubmit={(e) => { e.preventDefault(); void saveSettings(settings); }}>
              <div className="ev-grid2">
                <label>Venue name<input value={settings.venue} onChange={(e) => updateSettingsPatch({ venue: e.target.value })} /></label>
                <label>Box office phone<input value={settings.phone} onChange={(e) => updateSettingsPatch({ phone: e.target.value })} /></label>
                <label>Email<input type="email" value={settings.email} onChange={(e) => updateSettingsPatch({ email: e.target.value })} /></label>
                <label>Booking lead time<select value={String(settings.leadTimeHours)} onChange={(e) => updateSettingsPatch({ leadTimeHours: Number(e.target.value) })}>
                  <option value="0">No minimum</option><option value="2">2 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option>
                </select></label>
                <label className="ev-wide">Address<textarea rows={2} value={settings.address} onChange={(e) => updateSettingsPatch({ address: e.target.value })} /></label>
              </div>
              <div className="ev-actions"><button className="ev-btn ev-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save venue & availability'}</button></div>
            </form>

            <div className="ev-panel-head" style={{ marginTop: '24px' }}>
              <div><p className="ev-kicker">TICKET TIERS</p><h2>Pricing tiers</h2><p>Offer early-bird, door, or VIP pricing. With no tiers, each event uses its own price.</p></div>
              <button className="ev-btn ev-btn-ghost ev-btn-pill" onClick={saveTier}><Plus size={14} /> Add tier</button>
            </div>
            {settings.ticketTiers.length ? (
              <div className="ev-list">
                {settings.ticketTiers.map((tier, index) => (
                  <article key={tier.name}>
                    <span className="ev-admin-avatar">{formatPrice(tier.price, seller.currency || 'USD')}</span>
                    <div className="ev-info"><strong>{tier.name}</strong><span className="ev-t-sub">Tier price</span></div>
                    <button aria-label={`Remove ${tier.name}`} onClick={() => void removeTier(index, tier)} className="ev-btn ev-btn-ghost ev-btn-pill" style={{ color: 'var(--ev-accent)' }}><Trash2 size={14} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ev-loading"><PiggyBank size={24} /> No custom tiers yet. Each event will use its own price.</div>
            )}
          </section>
        )}

        {section === 'store-settings' && (
          <section>
            <div className="ev-panel-head">
              <div><p className="ev-kicker">YOUR VENUE</p><h2>Store settings</h2><p>These appear across your event site and checkout.</p></div>
            </div>
            <form className="ev-form-editor" onSubmit={async (event) => {
              event.preventDefault();
              if (!seller) return;
              setSaving(true);
              setError('');
              setNotice('');
              try {
                await sellersAPI.updateMe({ storeName: seller.storeName, description: seller.description, logo: seller.logo, subdomain: seller.subdomain, contactInfo: seller.contactInfo });
                setNotice('Store settings saved.');
              } catch {
                setError('These settings could not be saved. Please try again.');
              } finally {
                setSaving(false);
              }
            }}>
              <div className="ev-grid2">
                <label>Store name<input value={seller.storeName || ''} onChange={(e) => setSeller({ ...seller, storeName: e.target.value })} required /></label>
                <label>Subdomain<input value={seller.subdomain || ''} onChange={(e) => setSeller({ ...seller, subdomain: e.target.value })} required /></label>
                <label>Email<input type="email" value={seller.contactInfo?.email || ''} onChange={(e) => setSeller({ ...seller, contactInfo: { ...seller.contactInfo, email: e.target.value } })} /></label>
                <label>Phone<input type="tel" value={seller.contactInfo?.phone || ''} onChange={(e) => setSeller({ ...seller, contactInfo: { ...seller.contactInfo, phone: e.target.value } })} /></label>
                <label className="ev-wide">Address<textarea rows={2} value={seller.contactInfo?.address || ''} onChange={(e) => setSeller({ ...seller, contactInfo: { ...seller.contactInfo, address: e.target.value } })} /></label>
              </div>
              <div className="ev-actions"><button className="ev-btn ev-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save store settings'}</button></div>
            </form>
          </section>
        )}

        {(['billing', 'themes', 'bots', 'pay'] as Section[]).includes(section) && (
          <section>
            <div className="ev-loading"><Ticket size={28} /><h2>{nav.find((item) => item.id === section)?.label || section} lives elsewhere</h2><p>Manage this from the main {seller.storeName} dashboard.</p><button className="ev-btn ev-btn-ghost" onClick={() => window.location.href = `/seller/dashboard?tab=${section === 'billing' ? 'billing' : 'themes'}`}>Open dashboard <ArrowRight size={15} /></button></div>
          </section>
        )}
      </main>
    </div>
  );
};

const BookingRow: React.FC<{ order: Order; settings: EventoSettings; onStatus: (order: Order, status: Order['status']) => void; onAssign: (orderId: string, hostName: string) => void }> = ({ order, settings, onStatus, onAssign }) => {
  const booking = readEventoBooking(order)!;
  const date = new Date(`${booking.eventDate}T12:00:00`);
  const isFuture = booking.eventDate >= new Date().toISOString().slice(0, 10);
  return (
    <div className="ev-agenda-item">
      <div className="ev-agenda-time"><strong>{booking.eventTime}</strong><span className="ev-day">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
      <div className="ev-agenda-client"><strong>{order.customerName}</strong><span className="ev-t-sub">{order.items.map((item) => item.productName).join(', ')} · {booking.attendees} ticket{booking.attendees === 1 ? '' : 's'}</span></div>
      <div className="ev-agenda-service"><strong>{formatPrice(order.total, order.currency || 'USD')}</strong></div>
      <label className="ev-agenda-actions"><span className="ev-t-sub">Host</span><select value={settings.assignments[order.id] || booking.cohostName || ''} onChange={(e) => onAssign(order.id, e.target.value)} aria-label={`Assign host to ${order.customerName}`}>
        <option value="">No host</option>
        {settings.cohosts.map((person) => <option key={person.name} value={person.name}>{person.name}</option>)}
      </select></label>
      <span className={`ev-status status-${order.status}`}>{order.status === 'processing' ? 'Confirmed' : order.status}</span>
      <div className="ev-agenda-actions">
        {order.status === 'pending' && <button aria-label="Confirm ticket" onClick={() => onStatus(order, 'processing')}><Check size={16} /></button>}
        {isFuture && !['cancelled', 'refunded'].includes(order.status) && <button aria-label="Cancel ticket" onClick={() => onStatus(order, 'cancelled')}><X size={16} /></button>}
        {!isFuture && !['cancelled', 'refunded'].includes(order.status) && <button aria-label="Mark complete" onClick={() => onStatus(order, 'delivered')}><Check size={16} /></button>}
      </div>
    </div>
  );
};

export default EventoAdmin;
