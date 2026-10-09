import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, BarChart3, CalendarDays, Check, Clock3, Dumbbell, Instagram, MapPin, Menu, Phone, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { WEEKDAYS, classDuration, getPulseFitSettings, PulseFitSettings, trainerLabel } from './pulseFitTypes';
import './pulse-fit.css';

interface Props { seller: Seller; products: Product[]; demoMode?: boolean }

const nextWeekdays = (count = 7) => {
  const days: { date: string; day: number; label: string }[] = [];
  for (let index = 0; index < count; index++) {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const dateString = date.toISOString().slice(0, 10);
    days.push({ date: dateString, day: date.getDay(), label: WEEKDAYS[date.getDay()].short });
  }
  return days;
};

const PulseFitSite: React.FC<Props> = ({ seller, products }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fit = getPulseFitSettings(seller);
  const classes = products.filter((product) => product.status === 'active' && product.type === 'service');
  const featured = useMemo(() => classes.slice(0, 4), [classes]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [preferredTrainer, setPreferredTrainer] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const chosen = classes.find((cls) => cls.id === selectedClass);

  const week = useMemo(() => nextWeekdays(7), []);
  const scheduleView = useMemo(() => {
    const rows: { date: string; day: number; label: string; items: Product[] }[] = [];
    week.forEach(({ date: dateString, day, label }) => {
      const items = classes.filter((cls) => {
        const schedule = fit.classSchedules[cls.id];
        return schedule?.recurring?.some((slot) => slot.day === day);
      });
      rows.push({ date: dateString, day, label, items });
    });
    return rows;
  }, [week, classes, fit.classSchedules]);

  const availableTimes = useMemo(() => {
    if (!date || fit.closedDays.includes(new Date(`${date}T12:00:00`).getDay())) return [];
    const [startHour, startMinute] = fit.openingTime.split(':').map(Number);
    const [endHour, endMinute] = fit.closingTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const earliest = Date.now() + fit.leadTimeHours * 3600000;
    return Array.from({ length: Math.max(0, Math.ceil((end - start) / Math.max(15, fit.slotInterval))) }, (_, index) => {
      const value = start + index * Math.max(15, fit.slotInterval);
      const slotDate = new Date(`${date}T${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}:00`);
      return slotDate.getTime() >= earliest ? `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` : null;
    }).filter((value): value is string => !!value && value < fit.closingTime);
  }, [date, fit.closedDays, fit.closingTime, fit.leadTimeHours, fit.openingTime, fit.slotInterval]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!chosen || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a class and time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
      const booking = {
        platform: 'pulse-fit',
        sessionDate: date,
        sessionTime: time,
        duration: classDuration(chosen),
        trainerName: preferredTrainer,
        notes: notes.trim(),
        location: fit.location || seller.contactInfo?.address || '',
      };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosen.id, productName: chosen.name, quantity: 1, price: chosen.price }],
        total: chosen.price,
        subtotal: chosen.price,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not send your request just now. Please try again or call the studio.');
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const classCount = seller.stats?.totalProducts || classes.length;
  const memberCount = seller.stats?.totalCustomers || 0;
  const sessionCount = seller.stats?.totalOrders || 0;
  const portalPath = '/fit/pulse-fit/client';
  const openPortal = () => navigate(user ? portalPath : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent(portalPath)}`);

  return (
    <div className="pulse-site">
      <header className="pulse-header">
        <button className="pulse-wordmark" onClick={() => navigate(0)} aria-label="Pulse Fit home">
          <span className="wordmark-mark"><Dumbbell size={18} /></span>
          <span>Pulse <em>Fit</em></span>
        </button>
        <button className="pulse-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={`${menuOpen ? 'pulse-nav is-open' : 'pulse-nav'}`} aria-label="Main navigation">
          <a href="#classes" onClick={() => setMenuOpen(false)}>Classes</a>
          <a href="#schedule" onClick={() => setMenuOpen(false)}>Schedule</a>
          <a href="#trainers" onClick={() => setMenuOpen(false)}>Trainers</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Memberships</a>
          <a href="#book" onClick={() => setMenuOpen(false)}>Book</a>
          <button className="pulse-text-button" onClick={openPortal}>My sessions <ArrowRight size={15} /></button>
        </nav>
      </header>

      <main id="top">
        <section className="pulse-hero">
          <div className="pulse-hero-copy">
            <p className="pulse-kicker"><span /> Your strongest self starts here</p>
            <h1>{fit.brand.heroTitle || 'Stronger every'}<br /><i>{fit.brand.heroAccent || 'day.'}</i></h1>
            <p className="pulse-hero-intro">{fit.brand.heroDescription || 'Drop-in classes, personal training, and membership plans built around your schedule and goals.'}</p>
            <a className="pulse-button pulse-button-amber" href="#book">{fit.brand.heroTitle ? 'Reserve a class' : 'Book a class'} <ArrowDownRight size={17} /></a>
            <div className="pulse-hero-note"><span className="hero-rule" /> {fit.brand.tagline || 'Progress, not perfection.'}</div>
          </div>
          <div className="pulse-hero-image" role="img" aria-label="A cosmic training station beneath a field of stars">
            <span className="hero-orbit" aria-hidden="true" />
            <span className="hero-orbit-core" aria-hidden="true"><Activity size={25} /></span>
            <span className="hero-stamp"><Activity size={16} /> FIND YOUR <br /> PULSE</span>
            <span className="hero-image-caption">Strength · Focus · Flight</span>
          </div>
          <span className="pulse-hero-side">{fit.brand.studioName || seller.storeName || 'Pulse Fit'}</span>
        </section>

        <section className="pulse-stats-strip">
          <div className="pulse-stat"><strong>{sessionCount}+</strong><span>Sessions run</span></div>
          <div className="pulse-stat"><strong>{classCount}</strong><span>Classes</span></div>
          <div className="pulse-stat"><strong>{memberCount}+</strong><span>Members</span></div>
          <div className="pulse-stat"><strong>{fit.trainers.length}</strong><span>Coaches</span></div>
        </section>

        <section className="pulse-section pulse-schedule" id="schedule">
          <div className="pulse-section-heading">
            <div>
              <p className="pulse-kicker">THIS WEEK</p>
              <h2>Your <i>weekly</i> lineup.</h2>
            </div>
          </div>
          <div className="pulse-calendar">
            <div className="pulse-calendar-head">{week.map(({ label }) => <div key={label}>{label}</div>)}</div>
            <div className="pulse-calendar-grid">
              {scheduleView.map(({ date: dateString, label, items }) => {
                const isToday = dateString === today;
                const dateObj = new Date(`${dateString}T12:00:00`);
                return (
                  <div key={dateString} className={`pulse-calendar-cell ${isToday ? 'pulse-cell-today' : ''}`}>
                    <div className="cell-day">{label}</div>
                    <div className="cell-date">{dateObj.getDate()}</div>
                    {items.map((cls) => (
                      <button key={cls.id} className="calendar-event" onClick={() => { setSelectedClass(cls.id); setDate(dateString); document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' }); }}>
                        {cls.name}
                      </button>
                    ))}
                    {!items.length && <span className="calendar-empty">No classes</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pulse-section pulse-services" id="classes">
          <div className="pulse-section-heading">
            <div>
              <p className="pulse-kicker">THE CLASSES</p>
              <h2>Find your<br /><i>favorite workout.</i></h2>
            </div>
            <a href="#book">Book now <ArrowRight size={16} /></a>
          </div>
          {classes.length ? (
            <div className="pulse-class-list">
              {classes.map((cls, index) => (
                <article
                  className="pulse-class-row"
                  key={cls.id}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/fit/pulse-fit/class/${cls.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: cls, seller, from: `/shop/${seller.subdomain}` } });
                    }
                  }}
                  onClick={() => navigate(`/fit/pulse-fit/class/${cls.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: cls, seller, from: `/shop/${seller.subdomain}` } })}
                >
                  <span className="class-number">0{index + 1}</span>
                  <div>
                    {cls.images && cls.images.length > 0 && <img src={cls.images[0]} alt={cls.name} className="class-thumb" />}
                    <p className="class-category">{cls.category || 'PULSE PRIME'}</p>
                    <h3>{cls.name}</h3>
                    <p className="class-description">{cls.description || 'A focused class built for your best work.'}</p>
                    <p className="class-meta">
                      <Clock3 size={14} /> {classDuration(cls)} min
                      {' '}<Clock3 size={14} className="class-meta-icon" /> {formatPrice(cls.price, seller.currency || 'USD')}
                    </p>
                  </div>
                  <span className="class-price">+</span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedClass(cls.id);
                      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    aria-label={`Book ${cls.name}`}
                    className="class-arrow"
                  >
                    <ArrowDownRight />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="pulse-empty-services">
              <Dumbbell />
              <div>
                <h3>The class schedule is loading.</h3>
                <p>We're setting up this week's lineup. Check back soon or drop us a line for a recommendation.</p>
              </div>
              <a href={`mailto:${fit.email || seller.contactInfo?.email || ''}`}>Contact the studio <ArrowRight size={15} /></a>
            </div>
          )}
        </section>

        {fit.trainers.length > 0 && (
          <section className="pulse-section pulse-trainer-spotlight" id="trainers">
            <div className="pulse-section-heading">
              <div>
                <p className="pulse-kicker">THE TEAM</p>
                <h2>Great form,<br />great people.</h2>
              </div>
            </div>
            <p className="pulse-trainer-intro">Every coach brings a different philosophy and a shared commitment: move well, recover often, and keep showing up. Request your favorite trainer when you book.</p>
            <div className="pulse-trainer-list">
              {fit.trainers.map((trainer) => (
                <article className="pulse-trainer-card" key={trainer.id || trainer.name}>
                  {trainer.photo ? <img src={trainer.photo} alt={trainer.name} className="trainer-pic" /> : <div className="trainer-pic-placeholder">{trainer.name.slice(0, 1).toUpperCase()}</div>}
                  <h3 className="trainer-name">{trainer.name}</h3>
                  <p className="trainer-specialty">{trainer.specialty || 'Fitness coach'}</p>
                  {trainer.bio && <p className="trainer-bio">{trainer.bio}</p>}
                  {trainer.specialties && trainer.specialties.length > 0 && (
                    <div className="trainer-specialties">
                      {trainer.specialties.map((specialty) => (
                        <span key={specialty} className="trainer-specialty-chip">{specialty}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {fit.memberships && fit.memberships.length > 0 && (
          <section className="pulse-section pulse-membership" id="pricing">
            <div className="pulse-section-heading">
              <div>
                <p className="pulse-kicker">MEMBERSHIP</p>
                <h2>Pick your<br /><i>plan.</i></h2>
              </div>
            </div>
            <div className="pulse-membership-grid">
              {fit.memberships.map((plan) => (
                <div className="pulse-membership-card" key={plan.id}>
                  <div className="mem-name">{plan.name}</div>
                  <div className="mem-credits">{plan.credits} credits</div>
                  <p className="mem-desc">{plan.description}</p>
                  <div className="mem-meta"><span>{formatPrice(plan.price, plan.currency || seller.currency || 'USD')}</span><span>/{plan.period}</span></div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="pulse-section pulse-booking" id="book">
          <div className="booking-heading">
            <p className="pulse-kicker">BOOK A SESSION</p>
            <h2>Let us save you<br /><i>a spot.</i></h2>
            <p>Send a request and our team will confirm your session shortly.</p>
            <div className="booking-details">
              <span className="booking-detail"><Clock3 size={16} /> {fit.openingTime}–{fit.closingTime}</span>
              <span className="booking-detail"><MapPin size={16} /> {fit.location || seller.contactInfo?.address || 'Location details coming soon'}</span>
            </div>
          </div>
          <div className="booking-panel">
            {confirmation ? (
              <div className="booking-success" role="status">
                <span className="success-check"><Check size={22} /></span>
                <p className="pulse-kicker">REQUEST RECEIVED</p>
                <h3>You earned a spot<br /><i>in mind.</i></h3>
                <p>Your request for {chosen?.name} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {time} is pending confirmation. We'll be in touch soon.</p>
                <button className="pulse-button pulse-button-cyan" onClick={openPortal}>My sessions <ArrowRight size={15} /></button>
              </div>
            ) : classes.length === 0 ? (
              <div className="booking-no-services">
                <Dumbbell />
                <h3>Online booking is almost ready</h3>
                <p>Our schedule is coming together. Contact us and we'll find a time together.</p>
                {fit.phone && <a href={`tel:${fit.phone}`}><Phone size={16} /> {fit.phone}</a>}
              </div>
            ) : (
              <form className="pulse-booking-form" onSubmit={submitBooking}>
                <label>Choose a class
                  <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} required>
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name} · {formatPrice(cls.price, seller.currency || 'USD')}</option>
                    ))}
                  </select>
                </label>
                <div className="booking-field-pair">
                  <label>Date<input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required /></label>
                  <label>Time
                    <select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required>
                      <option value="">{!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>
                      {availableTimes.map((slot) => (
                        <option key={slot} value={slot}>{new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="booking-field-pair">
                  <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>
                  <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
                </div>
                <label>Phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label>
                {fit.trainers.length > 0 && (
                  <label>Preferred trainer <span className="optional-label">OPTIONAL</span>
                    <select value={preferredTrainer} onChange={(event) => setPreferredTrainer(event.target.value)} aria-label="Preferred trainer">
                      <option value="">Any available coach</option>
                      {fit.trainers.map((trainer) => (
                        <option key={trainer.id || trainer.name} value={trainer.name}>{trainer.name} · {trainer.specialty || 'Coach'}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label>A note for your coach <span className="optional-label">OPTIONAL</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Goals, injuries, or anything we should know?" /></label>
                {error && <p className="pulse-form-error" role="alert">{error}</p>}
                <div className="booking-submit-row">
                  <button className="pulse-button pulse-button-cyan booking-submit" type="submit" disabled={busy}>
                    {busy ? 'Sending request…' : 'Request this session'} {busy ? <span className="button-spinner" /> : <ArrowRight size={16} />}
                  </button>
                </div>
                <p className="booking-fineprint">No payment now. Your session is confirmed once our team gets in touch.</p>
              </form>
            )}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="pulse-section pulse-featured">
            <div className="pulse-section-heading">
              <div>
                <p className="pulse-kicker">POPULAR THIS WEEK</p>
                <h2>People are booking<br /><i>these classes.</i></h2>
              </div>
            </div>
            <div className="pulse-class-list">
              {featured.map((cls) => (
                <article
                  className="pulse-class-row featured-item"
                  key={cls.id}
                  onClick={() => navigate(`/fit/pulse-fit/class/${cls.id}?seller=${encodeURIComponent(seller.id)}`, { state: { service: cls, seller, from: `/shop/${seller.subdomain}` } })}
                >
                  <span className="class-number">★</span>
                  <div>
                    {cls.images && cls.images.length > 0 && <img src={cls.images[0]} alt={cls.name} className="class-thumb" />}
                    <p className="class-category">{cls.category || 'PULSE PRIME'}</p>
                    <h3>{cls.name}</h3>
                    <p className="class-description">{cls.description}</p>
                  </div>
                  <button aria-label={`Book ${cls.name}`} className="class-arrow"><ArrowDownRight /></button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="pulse-section pulse-visit" id="visit">
          <div>
            <p className="pulse-kicker">COME ON IN</p>
            <h2>See you <i>soon.</i></h2>
            <p>{seller.contactInfo?.address || fit.location || 'Find us in the heart of the city and meet the team.'}</p>
          </div>
          <div className="visit-links">
            {(fit.phone || seller.contactInfo?.phone) && <a href={`tel:${fit.phone || seller.contactInfo?.phone}`}><Phone size={16} /> {fit.phone || seller.contactInfo?.phone}</a>}
            {(fit.email || seller.contactInfo?.email) && <a href={`mailto:${fit.email || seller.contactInfo?.email}`}><ArrowRight size={16} /> {fit.email || seller.contactInfo?.email}</a>}
            <span><Instagram size={16} /> @pulsefit</span>
          </div>
        </section>
      </main>

      <footer className="pulse-footer">
        <a className="pulse-wordmark" href="#top">
          <span className="wordmark-mark"><Dumbbell size={18} /></span>
          <span>Pulse <em>Fit</em></span>
        </a>
        <span>{fit.brand.studioName || seller.storeName || 'Pulse Fit'} — STRONGER EVERY DAY.</span>
        <div>
          <button onClick={openPortal}>Member sessions</button>
          <a href="/fit/pulse-fit/admin">Studio owner</a>
        </div>
        <small>© {new Date().getFullYear()} {seller.storeName || 'Pulse Fit'}</small>
      </footer>
    </div>
  );
};

export default PulseFitSite;
