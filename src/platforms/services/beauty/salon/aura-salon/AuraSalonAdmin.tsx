import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, CalendarDays, Check, ChevronDown, Clock3, CreditCard, DollarSign, LayoutDashboard, LogOut, ListFilter, Loader2, MapPin, Music2, Plus, Printer, Scissors, Search, Settings, Sparkles, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../../../services/api';
import { formatPrice } from '../../../../../utils/currency';
import { defaultSalonSettings, getLocalDateString, getSalonSettings, isAuraSalon, readSalonBooking, SalonSettings, saveSalonSettings } from './salonTypes';
import './aura-salon.css';

type Section = 'overview' | 'appointments' | 'services' | 'team' | 'settings' | 'store-settings' | 'billing' | 'themes' | 'bots' | 'pay';
const nav: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'appointments', label: 'Appointments', icon: <CalendarDays size={18} /> },
  { id: 'services', label: 'Services', icon: <Scissors size={18} /> },
  { id: 'team', label: 'Team', icon: <Users size={18} /> },
  { id: 'settings', label: 'Availability', icon: <Settings size={18} /> },
  { id: 'store-settings', label: 'Store settings', icon: <Settings size={18} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
  { id: 'themes', label: 'Themes', icon: <LayoutDashboard size={18} /> },
  { id: 'bots', label: 'IyonicBots', icon: <Bot size={18} /> },
  { id: 'pay', label: 'IyonicPay', icon: <DollarSign size={18} /> },
];

const AuraSalonAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [appointments, setAppointments] = useState<Order[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [section, setSectionState] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [serviceEditing, setServiceEditing] = useState<Product | null>(null);
  const [isServiceFormOpen, setServiceFormOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', category: '', price: '', duration: '45', description: '', active: true });
  const [serviceImageFiles, setServiceImageFiles] = useState<File[]>([]);
  const [serviceVideoFile, setServiceVideoFile] = useState<File | null>(null);
  const [staffDraft, setStaffDraft] = useState({ name: '', specialty: '' });
  const [settings, setSettings] = useState<SalonSettings>(defaultSalonSettings);
  const [storeDraft, setStoreDraft] = useState({ storeName: '', email: '', phone: '' });

  const setSection = (nextSection: Section) => {
    const destinations: Partial<Record<Section, string>> = {
      billing: '/seller/dashboard?tab=billing',
      themes: '/themes',
      bots: '/iyonicbots',
      pay: '/iyonicpay'
    };
    const destination = destinations[nextSection];
    if (destination) {
      navigate(destination, { state: { from: '/salon/aura-salon/admin' } });
      return;
    }
    setSectionState(nextSection);
  };

  const load = useCallback(async () => {
    if (!user?.sellerId) { navigate('/seller/dashboard', { replace: true }); return; }
    setLoading(true); setError('');
    try {
      const [owner, orders, products] = await Promise.all([sellersAPI.getMe(), ordersAPI.getBySellerId(user.sellerId), productsAPI.getBySellerId(user.sellerId)]);
      if (!isAuraSalon(owner) || owner.id !== user.sellerId) { navigate('/seller/dashboard', { replace: true }); return; }
      setSeller(owner);
      setSettings(getSalonSettings(owner));
      setStoreDraft({
        storeName: owner.storeName || '',
        email: owner.contactInfo?.email || '',
        phone: owner.contactInfo?.phone || '',
      });
      setAppointments(orders.filter((order) => !!readSalonBooking(order)).sort((a, b) => {
        const bookingA = readSalonBooking(a);
        const bookingB = readSalonBooking(b);
        return `${bookingA?.appointmentDate || ''}T${bookingA?.appointmentTime || ''}`.localeCompare(`${bookingB?.appointmentDate || ''}T${bookingB?.appointmentTime || ''}`);
      }));
      setServices(products.filter((product) => product.type === 'service'));
    } catch { setError('We could not load the salon workspace. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);
  const filtered = appointments.filter((order) => {
    const query = appointmentSearch.trim().toLowerCase();
    const searchable = `${order.customerName} ${order.customerEmail} ${order.customerPhone || ''} ${order.items.map((item) => item.productName).join(' ')}`.toLowerCase();
    return (!dateFilter || readSalonBooking(order)?.appointmentDate === dateFilter) &&
      (statusFilter === 'all' || order.status === statusFilter) &&
      (!query || searchable.includes(query));
  });
  const today = getLocalDateString();
  const todays = appointments.filter((order) => readSalonBooking(order)?.appointmentDate === today);
  const upcoming = appointments.filter((order) => (readSalonBooking(order)?.appointmentDate || '') >= today && order.status !== 'cancelled');
  const pending = appointments.filter((order) => order.status === 'pending');
  const revenue = appointments.filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + order.total, 0);

  const saveSettings = async (next: SalonSettings): Promise<boolean> => {
    if (!seller) return false;
    if (!/^\d{2}:\d{2}$/.test(next.openingTime) || !/^\d{2}:\d{2}$/.test(next.closingTime) || next.closingTime <= next.openingTime) {
      setError('Closing time must be later than opening time.');
      return false;
    }
    setSaving(true); setError(''); setNotice('');
    try { const updated = await sellersAPI.updateMe(saveSalonSettings(seller, next)); setSeller(updated); setSettings(getSalonSettings(updated)); setNotice('Availability saved.'); return true; }
    catch { setError('These changes could not be saved. Please try again.'); return false; }
    finally { setSaving(false); }
  };

  const saveStoreDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seller) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const updated = await sellersAPI.updateMe({
        storeName: storeDraft.storeName.trim(),
        contactInfo: {
          ...seller.contactInfo,
          email: storeDraft.email.trim(),
          phone: storeDraft.phone.trim(),
        },
      });
      setSeller(updated);
      setStoreDraft({
        storeName: updated.storeName || '',
        email: updated.contactInfo?.email || '',
        phone: updated.contactInfo?.phone || '',
      });
      setNotice('Salon details saved.');
    } catch {
      setError('Salon details could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (order: Order, status: Order['status']) => {
    setError(''); setNotice('');
    try { const updated = await ordersAPI.updateStatus(order.id, status); setAppointments((items) => items.map((item) => item.id === order.id ? updated : item)); setNotice('Appointment updated.'); }
    catch { setError('The appointment status was not changed. Please retry.'); }
  };

  const assignStaff = async (orderId: string, staffName: string) => {
    const next = { ...settings, assignments: { ...settings.assignments, [orderId]: staffName } };
    await saveSettings(next);
  };

  const printDailyAgenda = () => {
    setDateFilter(today);
    setStatusFilter('all');
    setAppointmentSearch('');
    window.setTimeout(() => window.print(), 60);
  };

  const openService = (service?: Product) => {
    setServiceEditing(service || null);
    setServiceFormOpen(true);
    setServiceImageFiles([]);
    setServiceVideoFile(null);
    const duration = service?.description.match(/Duration:\s*(\d+)/i)?.[1] || '45';
    setServiceForm({ name: service?.name || '', category: service?.category || '', price: service ? String(service.price) : '', duration, description: service?.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim() || '', active: service?.status !== 'draft' && service?.status !== 'archived' });
  };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!seller) return;
    setSaving(true);
    let imageUrls: string[] = serviceEditing?.images || [];
    let videoUrls: string[] = serviceEditing?.videos || [];
    try {
      if (serviceImageFiles.length > 0 || serviceVideoFile) {
        const files: File[] = [];
        if (serviceImageFiles.length > 0) files.push(...serviceImageFiles);
        if (serviceVideoFile) files.push(serviceVideoFile);
        const uploaded = await uploadAPI.upload(files);
        if (serviceImageFiles.length > 0) imageUrls = [...uploaded.slice(0, serviceImageFiles.length)];
        if (serviceVideoFile) videoUrls = [uploaded[uploaded.length - 1]];
      }
      const description = `${serviceForm.description.trim()}${serviceForm.description.trim() ? '\n' : ''}Duration: ${serviceForm.duration} min`;
      const values = { sellerId: seller.id, name: serviceForm.name.trim(), description, price: Number(serviceForm.price), category: serviceForm.category.trim() || 'Hair', type: 'service' as const, images: imageUrls, videos: videoUrls, stock: -1, status: serviceForm.active ? 'active' as const : 'draft' as const };
      let result: Product;
      if (serviceEditing) { result = await productsAPI.update(serviceEditing.id, values); setServices((list) => list.map((item) => item.id === result.id ? result : item)); }
      else { result = await productsAPI.create(values); setServices((list) => [...list, result]); }
      setServiceEditing(null); setServiceFormOpen(false); setServiceImageFiles([]); setServiceVideoFile(null); setServiceForm({ name: '', category: '', price: '', duration: '45', description: '', active: true }); setNotice('Service saved.');
    } catch { setError('The service was not saved. Check the details and try again.'); }
    finally { setSaving(false); }
  };

  const deleteService = async (service: Product) => {
    if (!window.confirm(`Delete ${service.name}? This cannot be undone.`)) return;
    try { await productsAPI.delete(service.id); setServices((list) => list.filter((item) => item.id !== service.id)); setNotice('Service deleted.'); }
    catch { setError('This service could not be deleted. Please try again.'); }
  };

  const saveStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffDraft.name.trim()) return;
    updateSettings({ staff: [...settings.staff, { name: staffDraft.name.trim(), specialty: staffDraft.specialty.trim() }] });
    setStaffDraft({ name: '', specialty: '' });
  };

  const updateSettings = (patch: Partial<SalonSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const saveTeam = async () => {
    if (!seller) return;
    const saved = await saveSettings(settings);
    if (saved) setNotice('Team changes saved.');
  };
  const discardSettings = () => setSettings(getSalonSettings(seller));
  const displayedTitle = useMemo(() => nav.find((item) => item.id === section)?.label || 'Overview', [section]);
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(getSalonSettings(seller));

  if (loading) return <div className="aurelia-admin-loading"><Loader2 className="loading-spinner" /> Loading your salon workspace…</div>;
  if (!seller) return <div className="aurelia-admin-loading" role="alert">{error || 'This salon workspace is unavailable.'}</div>;

  return <div className="aurelia-admin"><aside className="admin-sidebar"><Link to={`/shop/${seller.subdomain}`} className="aurelia-wordmark"><span className="wordmark-mark"><Scissors size={17} /></span><span>Aura <em>Salon</em></span></Link><p className="admin-sidebar-label">STUDIO DESK</p><nav aria-label="Salon workspace">{nav.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={section === item.id ? 'admin-nav-item active' : 'admin-nav-item'}>{item.icon}{item.label}{item.id === 'appointments' && pending.length > 0 && <span className="admin-nav-count">{pending.length}</span>}</button>)}</nav><div className="admin-sidebar-bottom"><span className="admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span><div><strong>{seller.storeName}</strong><span>Salon owner</span></div></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><p className="aurelia-kicker">AURA SALON / STUDIO DESK</p><h1>{displayedTitle}</h1></div><div className="admin-top-actions"><Link to={`/shop/${seller.subdomain}`} target="_blank" rel="noreferrer">View site <ArrowLeft size={15} /></Link><button aria-label="Refresh appointments and services" onClick={() => void load()}><Loader2 size={17} /> Refresh</button><button aria-label="Sign out" className="aurelia-logout-button" onClick={logout}><LogOut size={16} /> Sign out</button></div></header>
      {error && <div className="admin-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}{notice && <div className="admin-notice" role="status"><Check size={15} />{notice}</div>}
      {section === 'overview' && <section className="admin-section"><div className="admin-metrics"><article><span>Today's appointments</span><strong>{todays.length}</strong><small>{todays.filter((item) => item.status === 'pending').length} awaiting confirmation</small></article><article><span>Pending requests</span><strong>{pending.length}</strong><small>Need a quick look</small></article><article><span>Upcoming visits</span><strong>{upcoming.length}</strong><small>On your calendar</small></article><article><span>Booked revenue</span><strong>{formatPrice(revenue, seller.currency || 'USD')}</strong><small>Confirmed and completed</small></article></div><div className="admin-overview-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="aurelia-kicker">YOUR DAY</p><h2>Today's schedule</h2></div><button onClick={() => setSection('appointments')}>All appointments <ChevronDown size={15} /></button></div>{todays.length ? <div className="admin-agenda">{todays.map((order) => <AppointmentRow key={order.id} order={order} settings={settings} onStatus={setStatus} onAssign={assignStaff} />)}</div> : <div className="admin-inline-empty"><CalendarDays /><span>A little breathing room. Nothing is booked today.</span></div>}</section><section className="admin-panel"><div className="admin-panel-heading"><div><p className="aurelia-kicker">JUST IN</p><h2>Recent requests</h2></div><span>{pending.length} pending</span></div>{appointments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).length ? appointments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((order) => <div className="admin-recent" key={order.id}><span className="recent-dot" /><div><strong>{order.customerName}</strong><span>{order.items.map((item) => item.productName).join(', ')}</span></div><span className={`appointment-status status-${order.status}`}>{order.status}</span></div>) : <div className="admin-inline-empty"><Scissors /><span>No new requests yet.</span></div>}</section></div></section>}

      {section === 'appointments' && <section className="admin-section admin-print-scope"><div className="admin-toolbar"><p>{filtered.length} appointment{filtered.length === 1 ? '' : 's'}</p><div className="admin-appointment-filters"><label className="admin-search-field"><Search size={15} /><span className="sr-only">Search customer, service, email, or phone</span><input aria-label="Search customer, service, email, or phone" placeholder="Search name, service, email, phone" value={appointmentSearch} onChange={(event) => setAppointmentSearch(event.target.value)} /></label><label><ListFilter size={15} /><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending review</option><option value="processing">Confirmed</option><option value="shipped">Confirmed (shipped)</option><option value="delivered">Completed</option><option value="cancelled">Cancelled</option><option value="refund_requested">Refund requested</option><option value="refunded">Refunded</option></select></label><input aria-label="Filter by date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /><button className="admin-print-button" onClick={printDailyAgenda}><Printer size={15} /> Print today</button></div></div><div className="admin-appointment-list">{filtered.length ? filtered.map((order) => <AppointmentRow key={order.id} order={order} settings={settings} onStatus={setStatus} onAssign={assignStaff} />) : <div className="admin-empty"><CalendarDays /><h2>No appointments match.</h2><p>Try another name, service, date, or status, or check back when a new request arrives.</p></div>}</div></section>}

      {section === 'services' && <section className="admin-section"><div className="admin-section-toolbar"><div><p className="aurelia-kicker">YOUR MENU</p><h2>Salon services</h2><p>Set clear prices and timing for the work you love doing.</p></div><button className="admin-primary-button" onClick={() => openService()}><Plus size={16} /> Add a service</button></div>{isServiceFormOpen ? <form className="admin-form service-editor" onSubmit={saveService}><div className="admin-form-heading"><h3>{serviceEditing ? 'Edit service' : 'New service'}</h3><button type="button" onClick={() => { setServiceEditing(null); setServiceFormOpen(false); setServiceImageFiles([]); setServiceVideoFile(null); setServiceForm({ name: '', category: '', price: '', duration: '45', description: '', active: true }); }} aria-label="Close service editor"><X /></button></div><div className="admin-form-grid"><label>Service name<input required value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} /></label><label>Category<input value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} placeholder="Cut, color, care…" /></label><label>Price<input type="number" min="0" step="0.01" required value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} /></label><label>Duration (minutes)<input type="number" min="15" step="15" required value={serviceForm.duration} onChange={(event) => setServiceForm({ ...serviceForm, duration: event.target.value })} /></label><label className="admin-form-wide">Description<textarea rows={3} value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></label><label className="admin-toggle"><input type="checkbox" checked={serviceForm.active} onChange={(event) => setServiceForm({ ...serviceForm, active: event.target.checked })} /> Available to book</label>{serviceImageFiles.length > 0 && <div className="upload-preview-row">{serviceImageFiles.map((file, index) => <img key={index} src={URL.createObjectURL(file)} alt="Preview" className="upload-preview-thumb" />)}</div>}{serviceVideoFile && <div className="upload-preview-row"><video src={URL.createObjectURL(serviceVideoFile)} controls><source src={URL.createObjectURL(serviceVideoFile)} /></video></div>}<label className="admin-form-wide">Gallery photos<input type="file" accept="image/*" multiple onChange={(event) => setServiceImageFiles([...(event.target.files || [])])} /></label><label className="admin-form-wide">Gallery video<input type="file" accept="video/*" onChange={(event) => setServiceVideoFile(event.target.files?.[0] || null)} /></label></div><div className="admin-form-actions"><button className="admin-secondary-button" type="button" onClick={() => { setServiceEditing(null); setServiceFormOpen(false); setServiceImageFiles([]); setServiceVideoFile(null); setServiceForm({ name: '', category: '', price: '', duration: '45', description: '', active: true }); }}>Cancel</button><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : serviceEditing ? 'Update service' : 'Create service'} {saving ? <span className="button-spinner" /> : <Plus size={16} />}</button></div></form> : <div className="admin-service-list">{services.length ? services.map((service) => <article key={service.id}><div className="admin-service-icon">{service.images && service.images.length > 0 ? <img src={service.images[0]} alt={service.name} className="admin-service-thumb" /> : <Scissors size={20} />}</div><div><h3>{service.name}</h3><p className="service-category">{service.category || 'Uncategorized'}</p><p className="service-description">{service.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim()}</p></div><strong className="service-detail-price">{formatPrice(service.price, seller.currency || 'USD')}</strong><span className={`service-availability ${service.status === 'active' ? 'is-live' : ''}`}>{service.status === 'active' ? 'Live' : 'Draft'}</span><button aria-label={`Edit ${service.name}`} onClick={() => openService(service)}><DollarSign size={16} /></button><button aria-label={`Delete ${service.name}`} onClick={() => deleteService(service)}><Trash2 size={16} /></button></article>) : <div className="admin-inline-empty"><Scissors /><span>Your service menu is empty.</span></div>}</div>}</section>}

      {section === 'team' && <section className="admin-section"><div className="admin-section-toolbar"><div><p className="aurelia-kicker">GOOD PEOPLE, GOOD HANDS</p><h2>Your team</h2><p>Guest stylist preferences use this list. Save your team changes when they are ready.</p></div></div><form className="admin-staff-form" onSubmit={saveStaff}><label>Stylist name<input value={staffDraft.name} onChange={(event) => setStaffDraft({ ...staffDraft, name: event.target.value })} required /></label><label>Specialty<input value={staffDraft.specialty} onChange={(event) => setStaffDraft({ ...staffDraft, specialty: event.target.value })} placeholder="Cuts, color, texture…" /></label><button className="admin-primary-button" type="submit"><Plus size={16} /> Add to team</button></form>{settings.staff.length ? <div className="admin-team-list">{settings.staff.map((person, index) => <article key={`${person.name}-${index}`}><span className="team-avatar">{person.name.slice(0, 1).toUpperCase()}</span><div><strong>{person.name}</strong><span>{person.specialty || 'Salon stylist'}</span></div><button aria-label={`Remove ${person.name}`} onClick={() => updateSettings({ staff: settings.staff.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={16} /></button></article>)}</div> : <div className="admin-empty"><Users /><h2>A good team makes a good day.</h2><p>Add your stylists so you can keep your appointment book personal.</p></div>}<div className="admin-form-actions"><span className="admin-save-state" role="status">{settingsDirty ? 'Unsaved team changes' : 'Team saved'}</span><button className="admin-secondary-button" type="button" onClick={discardSettings} disabled={saving || !settingsDirty}>Discard</button><button className="admin-primary-button" type="button" onClick={() => void saveTeam()} disabled={saving || !settingsDirty}>{saving ? 'Saving…' : 'Save team'} <Check size={16} /></button></div></section>}

      {section === 'settings' && <section className="admin-section"><div className="admin-section-toolbar"><div><p className="aurelia-kicker">THE PRACTICAL DETAILS</p><h2>Hours &amp; availability</h2><p>Hours guide the preferred request times shown on the site. They do not reserve a slot.</p></div></div><form className="admin-settings-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(settings); }}><div className="admin-form-grid"><label>Opening time<input type="time" value={settings.openingTime} onChange={(event) => updateSettings({ openingTime: event.target.value })} required /></label><label>Closing time<input type="time" value={settings.closingTime} onChange={(event) => updateSettings({ closingTime: event.target.value })} required /></label><label>Request interval<select value={settings.slotInterval} onChange={(event) => updateSettings({ slotInterval: Number(event.target.value) })}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label><label>Minimum lead time<select value={settings.leadTimeHours} onChange={(event) => updateSettings({ leadTimeHours: Number(event.target.value) })}><option value={0}>No minimum</option><option value={2}>2 hours</option><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option></select></label><fieldset className="admin-form-wide"><legend>Closed days</legend><div className="admin-days">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <label key={day}><input type="checkbox" checked={settings.closedDays.includes(index)} onChange={(event) => updateSettings({ closedDays: event.target.checked ? [...settings.closedDays, index] : settings.closedDays.filter((value) => value !== index) })} />{day}</label>)}</div></fieldset><label className="admin-form-wide">Studio address<input value={settings.location} onChange={(event) => updateSettings({ location: event.target.value })} placeholder="Street, neighborhood, city" /></label><label>Contact phone<input type="tel" value={settings.phone} onChange={(event) => updateSettings({ phone: event.target.value })} /></label><label>Contact email<input type="email" value={settings.email} onChange={(event) => updateSettings({ email: event.target.value })} /></label></div><div className="admin-form-actions"><span className="admin-save-state" role="status">{settingsDirty ? 'Unsaved changes' : 'Availability saved'}</span><button className="admin-secondary-button" type="button" onClick={discardSettings} disabled={saving || !settingsDirty}>Discard</button><button className="admin-primary-button" type="submit" disabled={saving || !settingsDirty}>{saving ? 'Saving…' : 'Save availability'} <Check size={16} /></button></div></form></section>}

      {section === 'store-settings' && <section className="admin-section"><div className="admin-section-toolbar"><div><p className="aurelia-kicker">STORE SETTINGS</p><h2>Salon details</h2><p>These details appear on the public salon page. Save when you are ready to publish them.</p></div></div><form className="admin-form" onSubmit={saveStoreDetails} onReset={() => setStoreDraft({ storeName: seller.storeName || '', email: seller.contactInfo?.email || '', phone: seller.contactInfo?.phone || '' })}><div className="admin-form-grid"><label>Salon name<input required value={storeDraft.storeName} onChange={(event) => setStoreDraft({ ...storeDraft, storeName: event.target.value })} /></label><label>Salon email<input type="email" value={storeDraft.email} onChange={(event) => setStoreDraft({ ...storeDraft, email: event.target.value })} /></label><label>Salon phone<input type="tel" value={storeDraft.phone} onChange={(event) => setStoreDraft({ ...storeDraft, phone: event.target.value })} /></label></div><div className="admin-form-actions"><button className="admin-secondary-button" type="reset" disabled={saving}>Discard changes</button><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save salon details'} <Check size={16} /></button></div></form></section>}
    </main></div>;
};

const AppointmentRow: React.FC<{ order: Order; settings: SalonSettings; onStatus: (order: Order, status: Order['status']) => void; onAssign: (orderId: string, staffName: string) => void }> = ({ order, settings, onStatus, onAssign }) => {
  const booking = readSalonBooking(order)!;
  const date = new Date(`${booking.appointmentDate}T12:00:00`);
  const isFuture = booking.appointmentDate >= getLocalDateString();
  return <article className="admin-appointment-row"><div className="agenda-time"><strong>{booking.appointmentTime}</strong><span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div><div className="agenda-client"><strong>{order.customerName}</strong><span>{order.customerEmail}{order.customerPhone && ` · ${order.customerPhone}`}</span></div><div className="agenda-service"><strong>{order.items.map((item) => item.productName).join(', ')}</strong><span>{formatPrice(order.total, order.currency || 'USD')}</span></div><label className="agenda-staff"><span className="sr-only">Assign stylist</span><select value={settings.assignments[order.id] || booking.staffName || ''} onChange={(event) => onAssign(order.id, event.target.value)} aria-label={`Assign stylist to ${order.customerName}`}><option value="">No stylist</option>{settings.staff.map((person) => <option key={person.name} value={person.name}>{person.name}</option>)}</select></label><span className={`appointment-status status-${order.status}`}>{['processing', 'shipped'].includes(order.status) ? 'Confirmed' : order.status.replace('_', ' ')}</span><div className="agenda-actions">{order.status === 'pending' && <button aria-label="Confirm appointment" onClick={() => onStatus(order, 'processing')}><Check size={16} /></button>}{isFuture && !['cancelled', 'delivered'].includes(order.status) && <button aria-label="Cancel appointment" onClick={() => onStatus(order, 'cancelled')}><X size={16} /></button>}{!isFuture && !['cancelled', 'delivered'].includes(order.status) && <button aria-label="Mark appointment complete" onClick={() => onStatus(order, 'delivered')}><Check size={16} /></button>}</div></article>;
};

export default AuraSalonAdmin;
