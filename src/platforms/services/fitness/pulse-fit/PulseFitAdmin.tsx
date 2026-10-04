import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bot, CalendarDays, Check, ChevronDown, CreditCard, Dumbbell, DollarSign, LayoutDashboard, LogOut,
  ListFilter, Loader2, Plus, Settings, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { defaultPulseFitSettings, getPulseFitSettings, isPulseFit, readPulseFitBooking, PulseFitSettings, savePulseFitSettings } from './pulseFitTypes';
import './pulse-fit.css';

type Section = 'overview' | 'classes' | 'bookings' | 'trainers' | 'settings' | 'store-settings' | 'billing' | 'themes' | 'bots' | 'pay';
const nav: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'bookings', label: 'Bookings', icon: <CalendarDays size={18} /> },
  { id: 'classes', label: 'Classes', icon: <Dumbbell size={18} /> },
  { id: 'trainers', label: 'Trainers', icon: <Users size={18} /> },
  { id: 'settings', label: 'Hours', icon: <Settings size={18} /> },
  { id: 'store-settings', label: 'Store settings', icon: <Settings size={18} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
  { id: 'themes', label: 'Themes', icon: <LayoutDashboard size={18} /> },
  { id: 'bots', label: 'IyonicBots', icon: <Bot size={18} /> },
  { id: 'pay', label: 'IyonicPay', icon: <DollarSign size={18} /> },
];

const PulseFitAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [bookings, setBookings] = useState<Order[]>([]);
  const [classes, setClasses] = useState<Product[]>([]);
  const [section, setSectionState] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [classEditing, setClassEditing] = useState<Product | null>(null);
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', category: '', price: '', duration: '45', description: '', active: true });
  const [classImageFiles, setClassImageFiles] = useState<File[]>([]);
  const [classVideoFile, setClassVideoFile] = useState<File | null>(null);
  const [trainerDraft, setTrainerDraft] = useState({ name: '', specialty: '' });
  const [settings, setSettings] = useState<PulseFitSettings>(defaultPulseFitSettings);

  const setSection = (nextSection: Section) => {
    const destinations: Partial<Record<Section, string>> = {
      themes: '/themes',
      bots: '/iyonicbots',
      pay: '/iyonicpay'
    };
    const destination = destinations[nextSection];
    if (destination) {
      navigate(destination, { state: { from: '/fit/pulse-fit/admin' } });
      return;
    }
    setSectionState(nextSection);
  };

  const load = useCallback(async () => {
    if (!user?.sellerId) { navigate('/seller/dashboard', { replace: true }); return; }
    setLoading(true); setError('');
    try {
      const [owner, orders, products] = await Promise.all([sellersAPI.getMe(), ordersAPI.getBySellerId(user.sellerId), productsAPI.getBySellerId(user.sellerId)]);
      if (!isPulseFit(owner) || owner.id !== user.sellerId) { navigate('/seller/dashboard', { replace: true }); return; }
      setSeller(owner);
      setSettings(getPulseFitSettings(owner));
      setBookings(orders.filter((order) => !!readPulseFitBooking(order)).sort((a, b) => (readPulseFitBooking(a)?.sessionDate || '').localeCompare(readPulseFitBooking(b)?.sessionDate || '')));
      setClasses(products.filter((product) => product.type === 'service'));
    } catch { setError('We could not load the studio workspace. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);
  const filtered = bookings.filter((order) => (!dateFilter || readPulseFitBooking(order)?.sessionDate === dateFilter) && (statusFilter === 'all' || order.status === statusFilter));
  const today = new Date().toISOString().slice(0, 10);
  const todays = bookings.filter((order) => readPulseFitBooking(order)?.sessionDate === today);
  const upcoming = bookings.filter((order) => (readPulseFitBooking(order)?.sessionDate || '') >= today && order.status !== 'cancelled');
  const pending = bookings.filter((order) => order.status === 'pending');
  const revenue = bookings.filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + order.total, 0);

  const saveSettings = async (next: PulseFitSettings) => {
    if (!seller) return;
    setSaving(true); setError(''); setNotice('');
    try { const updated = await sellersAPI.updateMe(savePulseFitSettings(seller, next)); setSeller(updated); setSettings(getPulseFitSettings(updated)); setNotice('Changes saved.'); }
    catch { setError('These changes could not be saved. Please try again.'); }
    finally { setSaving(false); }
  };

  const setStatus = async (order: Order, status: Order['status']) => {
    setError(''); setNotice('');
    try { const updated = await ordersAPI.updateStatus(order.id, status); setBookings((items) => items.map((item) => item.id === order.id ? updated : item)); setNotice('Booking updated.'); }
    catch { setError('The booking status was not changed. Please retry.'); }
  };

  const assignTrainer = async (orderId: string, trainerName: string) => {
    await saveSettings({ ...settings, assignments: { ...settings.assignments, [orderId]: trainerName } });
  };

  const openClass = (cls?: Product) => {
    setClassEditing(cls || null);
    setIsClassFormOpen(true);
    setClassImageFiles([]);
    setClassVideoFile(null);
    const duration = cls?.description.match(/Duration:\s*(\d+)/i)?.[1] || '45';
    setClassForm({ name: cls?.name || '', category: cls?.category || '', price: cls ? String(cls.price) : '', duration, description: cls?.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim() || '', active: cls?.status !== 'draft' && cls?.status !== 'archived' });
  };

  const resetClassForm = () => {
    setClassEditing(null); setIsClassFormOpen(false); setClassImageFiles([]); setClassVideoFile(null);
    setClassForm({ name: '', category: '', price: '', duration: '45', description: '', active: true });
  };

  const saveClass = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!seller) return;
    setSaving(true);
    let imageUrls: string[] = classEditing?.images || [];
    let videoUrls: string[] = classEditing?.videos || [];
    try {
      if (classImageFiles.length > 0 || classVideoFile) {
        const files: File[] = [];
        if (classImageFiles.length > 0) files.push(...classImageFiles);
        if (classVideoFile) files.push(classVideoFile);
        const uploaded = await uploadAPI.upload(files);
        if (classImageFiles.length > 0) imageUrls = [...uploaded.slice(0, classImageFiles.length)];
        if (classVideoFile) videoUrls = [uploaded[uploaded.length - 1]];
      }
      const description = `${classForm.description.trim()}${classForm.description.trim() ? '\n' : ''}Duration: ${classForm.duration} min`;
      const values = { sellerId: seller.id, name: classForm.name.trim(), description, price: Number(classForm.price), category: classForm.category.trim() || 'Class', type: 'service' as const, images: imageUrls, videos: videoUrls, stock: -1, status: classForm.active ? 'active' as const : 'draft' as const };
      let result: Product;
      if (classEditing) { result = await productsAPI.update(classEditing.id, values); setClasses((list) => list.map((item) => item.id === result.id ? result : item)); }
      else { result = await productsAPI.create(values); setClasses((list) => [...list, result]); }
      resetClassForm();
      setNotice('Class saved.');
    } catch { setError('The class was not saved. Check the details and try again.'); }
    finally { setSaving(false); }
  };

  const deleteClass = async (cls: Product) => {
    if (!window.confirm(`Delete ${cls.name}? This cannot be undone.`)) return;
    try { await productsAPI.delete(cls.id); setClasses((list) => list.filter((item) => item.id !== cls.id)); setNotice('Class deleted.'); }
    catch { setError('This class could not be deleted. Please try again.'); }
  };

  const saveTrainer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trainerDraft.name.trim()) return;
    await saveSettings({ ...settings, trainers: [...settings.trainers, { name: trainerDraft.name.trim(), specialty: trainerDraft.specialty.trim() }] });
    setTrainerDraft({ name: '', specialty: '' });
  };

  const updateSettings = (patch: Partial<PulseFitSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const displayedTitle = useMemo(() => nav.find((item) => item.id === section)?.label || 'Overview', [section]);

  if (loading) return <div className="pulse-admin-loading"><Loader2 className="admin-loading-spinner" /> Loading your studio workspace…</div>;
  if (!seller) return <div className="pulse-admin-loading" role="alert">{error || 'This studio workspace is unavailable.'}</div>;

  return (
    <div className="pulse-admin">
      <aside className="admin-sidebar">
        <a href={`/shop/${seller.subdomain}`} className="pulse-wordmark"><span className="wordmark-mark"><Dumbbell size={17} /></span><span>Pulse <em>Fit</em></span></a>
        <p className="admin-sidebar-label">STUDIO DESK</p>
        <nav aria-label="Studio workspace">{nav.map((item) => (
          <button key={item.id} onClick={() => { setSection(item.id); setError(''); setNotice(''); }} className={section === item.id ? 'admin-nav-item active' : 'admin-nav-item'}>
            {item.icon}{item.label}{item.id === 'bookings' && pending.length > 0 && <span className="admin-nav-count">{pending.length}</span>}
          </button>
        ))}</nav>
        <div className="admin-sidebar-bottom"><span className="admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span><div><strong>{seller.storeName}</strong><span>Studio owner</span></div></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="pulse-kicker">PULSE FIT / STUDIO DESK</p><h1>{displayedTitle}</h1></div>
          <div className="admin-top-actions">
            <span className="admin-system-state"><i /> SYSTEM ONLINE</span>
            <a href={`/shop/${seller.subdomain}`} target="_blank" rel="noreferrer">View site <ArrowLeft size={15} /></a>
            <button aria-label="Refresh bookings and classes" onClick={() => void load()}><Loader2 size={17} /> Refresh</button>
            <button aria-label="Sign out" className="pulse-logout-button" onClick={logout}><LogOut size={16} /> Sign out</button>
          </div>
        </header>
        {error && <div className="admin-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        {notice && <div className="admin-notice" role="status"><Check size={15} />{notice}</div>}

        {section === 'overview' && (
          <section className="admin-section">
            <div className="admin-metrics">
              <article><span>Todays sessions</span><strong>{todays.length}</strong><small>{todays.filter((item) => item.status === 'pending').length} awaiting confirmation</small></article>
              <article><span>Pending requests</span><strong>{pending.length}</strong><small>Need a quick look</small></article>
              <article><span>Upcoming sessions</span><strong>{upcoming.length}</strong><small>On your schedule</small></article>
              <article><span>Booked revenue</span><strong>{formatPrice(revenue, seller.currency || 'USD')}</strong><small>Confirmed and completed</small></article>
            </div>
            <div className="admin-overview-grid">
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div><p className="pulse-kicker">YOUR DAY</p><h2>Todays schedule</h2></div>
                  <button onClick={() => setSection('bookings')}>All bookings <ChevronDown size={15} /></button>
                </div>
                {todays.length ? (
                  <div className="admin-agenda">{todays.map((order) => <BookingRow key={order.id} order={order} settings={settings} onStatus={setStatus} onAssign={assignTrainer} />)}</div>
                ) : (
                  <div className="admin-inline-empty"><CalendarDays /><span>A little breathing room. Nothing is booked today.</span></div>
                )}
              </section>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div><p className="pulse-kicker">JUST IN</p><h2>Recent requests</h2></div>
                  <span>{pending.length} pending</span>
                </div>
                {bookings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).length ? (
                  bookings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((order) => (
                    <div className="admin-recent" key={order.id}>
                      <span className="recent-dot" />
                      <div><strong>{order.customerName}</strong><span>{order.items.map((item) => item.productName).join(', ')}</span></div>
                      <span className={`appointment-status status-${order.status}`}>{order.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="admin-inline-empty"><Dumbbell /><span>No new requests yet.</span></div>
                )}
              </section>
            </div>
          </section>
        )}

        {section === 'bookings' && (
          <section className="admin-section">
            <div className="admin-toolbar">
              <p>{filtered.length} booking{filtered.length === 1 ? '' : 's'}</p>
              <div>
                <label><ListFilter size={15} /><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option><option value="pending">Pending</option><option value="processing">Confirmed</option><option value="delivered">Completed</option><option value="cancelled">Cancelled</option>
                </select></label>
                <input aria-label="Filter by date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              </div>
            </div>
            <div className="admin-appointment-list">
              {filtered.length ? filtered.map((order) => <BookingRow key={order.id} order={order} settings={settings} onStatus={setStatus} onAssign={assignTrainer} />) : (
                <div className="admin-empty"><CalendarDays /><h2>No bookings match.</h2><p>Try another date or status, or check back when a new request arrives.</p></div>
              )}
            </div>
          </section>
        )}

        {section === 'classes' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div><p className="pulse-kicker">YOUR SCHEDULE</p><h2>Fitness classes</h2><p>Set clear prices and timing for the work you love teaching.</p></div>
              <button className="admin-primary-button" onClick={() => openClass()}><Plus size={16} /> Add a class</button>
            </div>
            {isClassFormOpen ? (
              <form className="admin-form service-editor" onSubmit={saveClass}>
                <div className="admin-form-heading">
                  <h3>{classEditing ? 'Edit class' : 'New class'}</h3>
                  <button type="button" onClick={resetClassForm} aria-label="Close class editor"><X /></button>
                </div>
                <div className="admin-form-grid">
                  <label>Class name<input required value={classForm.name} onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} /></label>
                  <label>Category<input value={classForm.category} onChange={(event) => setClassForm({ ...classForm, category: event.target.value })} placeholder="Strength, yoga, cardio…" /></label>
                  <label>Price<input type="number" min="0" step="0.01" required value={classForm.price} onChange={(event) => setClassForm({ ...classForm, price: event.target.value })} /></label>
                  <label>Duration (minutes)<input type="number" min="15" step="15" required value={classForm.duration} onChange={(event) => setClassForm({ ...classForm, duration: event.target.value })} /></label>
                  <label className="admin-form-wide">Description<textarea rows={3} value={classForm.description} onChange={(event) => setClassForm({ ...classForm, description: event.target.value })} /></label>
                  <label className="admin-toggle"><input type="checkbox" checked={classForm.active} onChange={(event) => setClassForm({ ...classForm, active: event.target.checked })} /> Available to book</label>
                  <label className="admin-form-wide">Class image<input type="file" accept="image/*" multiple onChange={(event) => setClassImageFiles(Array.from(event.target.files || []))} /></label>
                  {classImageFiles.length > 0 && (
                    <div className="upload-preview-row">{classImageFiles.map((file, index) => <img key={index} src={URL.createObjectURL(file)} alt="preview" className="upload-preview-thumb" />)}</div>
                  )}
                  {classEditing?.images && classEditing.images.length > 0 && (
                    <div className="upload-preview-row">{classEditing.images.map((url, index) => <img key={index} src={url} alt="existing" className="upload-preview-thumb" />)}</div>
                  )}
                  <label className="admin-form-wide">Class video<input type="file" accept="video/*" onChange={(event) => setClassVideoFile(event.target.files?.[0] || null)} /></label>
                </div>
                <div className="admin-form-actions">
                  <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : classEditing ? 'Update class' : 'Create class'}</button>
                  <button type="button" className="admin-form-cancel" onClick={resetClassForm}>Cancel</button>
                </div>
              </form>
            ) : classes.length ? (
              <div className="admin-service-list">
                {classes.map((cls) => (
                  <article key={cls.id}>
                    <div className="admin-service-icon"><Dumbbell size={16} /></div>
                    <div>
                      <h3>{cls.name}</h3>
                      <p className="class-category">{cls.category || 'Class'}</p>
                      <p className="class-description">{cls.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim()}</p>
                      <span className="admin-duration">{cls.description.match(/Duration:\s*(\d+)/i) ? `${cls.description.match(/Duration:\s*(\d+)/i)![1]} min` : ''}</span>
                    </div>
                    <strong>{formatPrice(cls.price, seller.currency || 'USD')}</strong>
                    <span className={`service-availability ${cls.status === 'active' ? 'is-live' : ''}`}>{cls.status === 'active' ? 'Live' : 'Draft'}</span>
                    <button aria-label={`Edit ${cls.name}`} onClick={() => openClass(cls)}><Plus size={14} /></button>
                    <button aria-label={`Delete ${cls.name}`} onClick={() => void deleteClass(cls)} className="admin-service-delete">Delete</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty"><Dumbbell /><h2>No classes yet.</h2><p>Add your first class and start building the schedule members will book.</p></div>
            )}
          </section>
        )}

        {section === 'trainers' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div><p className="pulse-kicker">GOOD PEOPLE, GOOD FORM</p><h2>Your trainers</h2><p>Members can request their favorite coach. Add team members and assign requests from Bookings.</p></div>
            </div>
            <form className="admin-staff-form" onSubmit={saveTrainer}>
              <label>Trainer name<input value={trainerDraft.name} onChange={(event) => setTrainerDraft({ ...trainerDraft, name: event.target.value })} required /></label>
              <label>Specialty<input value={trainerDraft.specialty} onChange={(event) => setTrainerDraft({ ...trainerDraft, specialty: event.target.value })} placeholder="Strength, yoga, nutrition…" /></label>
              <button className="admin-primary-button" type="submit" disabled={saving}><Plus size={16} /> Add to team</button>
            </form>
            {settings.trainers.length ? (
              <div className="admin-team-list">
                {settings.trainers.map((person, index) => (
                  <article key={`${person.name}-${index}`}>
                    <span className="team-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
                    <div><strong>{person.name}</strong><span>{person.specialty || 'Fitness coach'}</span></div>
                    <button aria-label={`Remove ${person.name}`} onClick={() => void saveSettings({ ...settings, trainers: settings.trainers.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={16} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty"><Users /><h2>A strong team makes a strong studio.</h2><p>Add your coaches so you can keep the schedule personal.</p></div>
            )}
          </section>
        )}

        {section === 'settings' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div><p className="pulse-kicker">THE PRACTICAL DETAILS</p><h2>Hours & availability</h2><p>These details appear on the booking site and shape the available time slots.</p></div>
            </div>
            <form className="admin-settings-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(settings); }}>
              <div className="admin-form-grid">
                <label>Opening time<input type="time" value={settings.openingTime} onChange={(event) => updateSettings({ openingTime: event.target.value })} required /></label>
                <label>Closing time<input type="time" value={settings.closingTime} onChange={(event) => updateSettings({ closingTime: event.target.value })} required /></label>
                <label>Slot interval<select value={settings.slotInterval} onChange={(event) => updateSettings({ slotInterval: Number(event.target.value) })}>
                  <option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option>
                </select></label>
                <label>Booking lead time<select value={settings.leadTimeHours} onChange={(event) => updateSettings({ leadTimeHours: Number(event.target.value) })}>
                  <option value={0}>No minimum</option><option value={2}>2 hours</option><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={48}>48 hours</option>
                </select></label>
                <fieldset className="admin-form-wide">
                  <legend>Closed days</legend>
                  <div className="admin-days">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <label key={day}><input type="checkbox" checked={settings.closedDays.includes(index)} onChange={(event) => updateSettings({ closedDays: event.target.checked ? [...settings.closedDays, index] : settings.closedDays.filter((value) => value !== index) })} />{day}</label>
                  ))}</div>
                </fieldset>
                <label className="admin-form-wide">Studio address<input value={settings.location} onChange={(event) => updateSettings({ location: event.target.value })} /></label>
                <label className="admin-form-wide">Phone number<input value={settings.phone} onChange={(event) => updateSettings({ phone: event.target.value })} /></label>
                <label className="admin-form-wide">Email address<input type="email" value={settings.email} onChange={(event) => updateSettings({ email: event.target.value })} /></label>
              </div>
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save hours & availability'}</button>
            </form>
          </section>
        )}

        {section === 'store-settings' && (
          <section className="admin-section">
            <div className="admin-section-toolbar">
              <div><p className="pulse-kicker">YOUR STUDIO</p><h2>Store settings</h2><p>These appear across your booking site and checkout.</p></div>
            </div>
            <form className="admin-form" onSubmit={async (event) => {
              event.preventDefault();
              if (!seller) return;
              setSaving(true); setError(''); setNotice('');
              try {
                await sellersAPI.updateMe({ storeName: seller.storeName, description: seller.description, logo: seller.logo, subdomain: seller.subdomain, contactInfo: seller.contactInfo });
                setNotice('Store settings saved.');
              } catch { setError('These settings could not be saved. Please try again.'); }
              finally { setSaving(false); }
            }}>
              <div className="admin-form-grid">
                <label>Store name<input value={seller.storeName || ''} onChange={(event) => setSeller({ ...seller, storeName: event.target.value })} required /></label>
                <label>Subdomain<input value={seller.subdomain || ''} onChange={(event) => setSeller({ ...seller, subdomain: event.target.value })} required /></label>
                <label>Email<input type="email" value={seller.contactInfo?.email || ''} onChange={(event) => setSeller({ ...seller, contactInfo: { ...seller.contactInfo, email: event.target.value } })} /></label>
                <label>Phone<input type="tel" value={seller.contactInfo?.phone || ''} onChange={(event) => setSeller({ ...seller, contactInfo: { ...seller.contactInfo, phone: event.target.value } })} /></label>
                <label className="admin-form-wide">Address<textarea rows={2} value={seller.contactInfo?.address || ''} onChange={(event) => setSeller({ ...seller, contactInfo: { ...seller.contactInfo, address: event.target.value } })} /></label>
              </div>
              <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save store settings'}</button>
            </form>
          </section>
        )}

        {(section === 'billing' || section === 'themes' || section === 'bots' || section === 'pay') && (
          <section className="admin-section">
            <div className="admin-empty"><Dumbbell /><h2>{nav.find((item) => item.id === section)?.label || section} lives elsewhere</h2><p>Manage this from the main {seller.storeName} dashboard.</p><a className="pulse-text-button" href={`/seller/dashboard?tab=${section === 'billing' ? 'billing' : 'themes'}`}>Open dashboard <ArrowRight size={15} /></a></div>
          </section>
        )}
      </main>
    </div>
  );
};

const BookingRow: React.FC<{ order: Order; settings: PulseFitSettings; onStatus: (order: Order, status: Order['status']) => void; onAssign: (orderId: string, trainerName: string) => void }> = ({ order, settings, onStatus, onAssign }) => {
  const booking = readPulseFitBooking(order)!;
  const date = new Date(`${booking.sessionDate}T12:00:00`);
  const isFuture = booking.sessionDate >= new Date().toISOString().slice(0, 10);
  return (
    <article className="admin-appointment-row">
      <div className="agenda-time"><strong>{booking.sessionTime}</strong><span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
      <div className="agenda-client"><strong>{order.customerName}</strong><span>{order.customerEmail}{order.customerPhone && ` · ${order.customerPhone}`}</span></div>
      <div className="agenda-service"><strong>{order.items.map((item) => item.productName).join(', ')}</strong><span>{formatPrice(order.total, order.currency || 'USD')}</span></div>
      <label className="agenda-staff"><span className="sr-only">Assign trainer</span><select value={settings.assignments[order.id] || booking.trainerName || ''} onChange={(event) => onAssign(order.id, event.target.value)} aria-label={`Assign trainer to ${order.customerName}`}><option value="">No trainer</option>{settings.trainers.map((person) => <option key={person.name} value={person.name}>{person.name}</option>)}</select></label>
      <span className={`appointment-status status-${order.status}`}>{order.status === 'processing' ? 'Confirmed' : order.status}</span>
      <div className="agenda-actions">
        {order.status === 'pending' && <button aria-label="Confirm booking" onClick={() => onStatus(order, 'processing')}><Check size={16} /></button>}
        {isFuture && !['cancelled', 'delivered'].includes(order.status) && <button aria-label="Cancel booking" onClick={() => onStatus(order, 'cancelled')}><X size={16} /></button>}
        {!isFuture && !['cancelled', 'delivered'].includes(order.status) && <button aria-label="Mark session complete" onClick={() => onStatus(order, 'delivered')}><Check size={16} /></button>}
      </div>
    </article>
  );
};

export default PulseFitAdmin;
