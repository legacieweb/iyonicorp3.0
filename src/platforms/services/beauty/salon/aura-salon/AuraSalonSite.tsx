import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, Bookmark, CalendarDays, Check, Clock3, MapPin, Menu, Phone, Scissors, Search, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../../../services/api';
import { formatPrice } from '../../../../../utils/currency';
import { getFavoriteServiceIds, getLocalDateString, getRequestTimes, getSalonSettings, hasConfiguredSalonHours, saveFavoriteServiceIds } from './salonTypes';
import './aura-salon.css';

interface Props { seller: Seller; products: Product[] }

const AuraSalonSite: React.FC<Props> = ({ seller, products }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const salon = getSalonSettings(seller);
  const hasPublishedHours = hasConfiguredSalonHours(seller);
  const services = products.filter((product) => product.status === 'active' && product.type === 'service');
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [preferredStylist, setPreferredStylist] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteServiceIds(seller.id));
  const chosen = services.find((service) => service.id === selectedService);
  const salonName = seller.storeName || 'Aura Salon';
  const heroImage = services.find((service) => service.images?.[0])?.images?.[0];
  const salonEmail = salon.email || seller.contactInfo?.email;
  const salonPhone = salon.phone || seller.contactInfo?.phone;
  const salonAddress = salon.location || seller.contactInfo?.address;
  const categories = Array.from(new Set(services.map((service) => service.category?.trim()).filter((category): category is string => !!category)));
  const visibleServices = services.filter((service) =>
    (serviceCategory === 'all' || service.category === serviceCategory) &&
    (!favoritesOnly || favorites.includes(service.id)) &&
    `${service.name} ${service.description} ${service.category || ''}`.toLowerCase().includes(serviceSearch.trim().toLowerCase()),
  );
  const chosenDuration = Number(chosen?.description.match(/Duration:\s*(\d+)/i)?.[1] || 0);
  const availableTimes = useMemo(
    () => hasPublishedHours ? getRequestTimes(date, salon, chosenDuration) : [],
    [date, salon, chosenDuration, hasPublishedHours],
  );
  const today = getLocalDateString();

  const toggleFavorite = (serviceId: string) => {
    const next = favorites.includes(serviceId)
      ? favorites.filter((id) => id !== serviceId)
      : [...favorites, serviceId];
    setFavorites(next);
    saveFavoriteServiceIds(seller.id, next);
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  const chooseService = (serviceId: string) => {
    setSelectedService(serviceId);
    setTime('');
    scrollToSection('build-visit');
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!chosen || !date || date < today || !hasPublishedHours || !getRequestTimes(date, salon, chosenDuration).includes(time) || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a published request time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
      const booking = { platform: 'aura-salon' as const, appointmentDate: date, appointmentTime: time, staffName: preferredStylist, notes: notes.trim() };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosen.id, productName: chosen.name, quantity: 1, price: chosen.price }],
        total: chosen.price,
        amountPaid: 0,
        subtotal: chosen.price,
        originalTotal: chosen.price,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not send your request just now. Please try again or contact the salon.');
    } finally {
      setBusy(false);
    }
  };

  const portalPath = '/salon/aura-salon/client';
  const openPortal = () => navigate(user
    ? portalPath
    : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent(portalPath)}`);
  const openService = (service: Product) => navigate(
    `/salon/aura-salon/service/${service.id}?seller=${encodeURIComponent(seller.id)}`,
    { state: { service, seller, from: `/shop/${seller.subdomain}` } },
  );
  const durationFor = (service: Product) => service.description.match(/Duration:\s*(\d+)/i)?.[1];
  const descriptionFor = (service: Product) => service.description.replace(/\n?Duration:\s*\d+\s*min/i, '').trim();
  const formattedDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : 'Choose a preferred date';

  return <div className="aurelia-site aura-editorial">
    <header className="aurelia-header aura-masthead">
      <button className="aurelia-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={`${salonName} home`}>
        {seller.logo ? <img className="salon-logo" src={seller.logo} alt="" /> : <span className="wordmark-mark"><Scissors size={17} /></span>}
        <span>{salonName}</span>
      </button>
      <p className="aura-masthead-note">INDEPENDENT BEAUTY ATELIER <span>·</span> {seller.subdomain}</p>
      <button className="aurelia-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'aurelia-nav is-open' : 'aurelia-nav'} aria-label="Main navigation">
        <button type="button" className="aurelia-scroll-link" onClick={() => scrollToSection('services')}>Treatments</button>
        <button type="button" className="aurelia-scroll-link" onClick={() => scrollToSection('atelier-notes')}>The atelier</button>
        <button type="button" className="aurelia-scroll-link" onClick={() => scrollToSection('visit')}>Find us</button>
        <button className="aurelia-text-button" onClick={() => { setMenuOpen(false); openPortal(); }}>My requests <ArrowRight size={15} /></button>
      </nav>
    </header>

    <main id="top">
      <section className="aura-cover" aria-labelledby="aura-title">
        <div className="aura-cover-index"><span>ATELIER INDEX</span><b>01 — {salonName}</b><b>02 — The treatment menu</b><b>03 — Make your visit</b><span className="aura-index-rule" />        <button type="button" onClick={() => scrollToSection('build-visit')}>OPEN A REQUEST <ArrowDownRight size={13} /></button></div>
        <div className="aura-cover-copy">
          <p className="aurelia-kicker"><span /> BEAUTY, WITH INTENTION</p>
          <h1 id="aura-title">A different<br />kind of <em>glow.</em></h1>
          <p>{seller.description?.trim() || 'A considered menu of salon treatments, shaped around your own routine.'}</p>
          <button type="button" className="aurelia-button aura-primary-button" onClick={() => scrollToSection('services')}>Explore treatments <ArrowDownRight size={17} /></button>
        </div>
        <div className={heroImage ? 'aura-cover-art has-photo' : 'aura-cover-art'} aria-label={heroImage ? `${salonName} treatment photography` : `${salonName} atelier cover`} role="img">
          {heroImage && <img src={heroImage} alt="" />}
          <div className="aura-cover-art-mark"><Sparkles size={25} /><span>FIG. 01</span></div>
          <span className="aura-cover-caption">{services[0]?.name || 'THE ATELIER / SERVICE INDEX'}</span>
        </div>
        <span className="aura-cover-coordinate">AURA / BEAUTY STUDY / SERVICE INDEX</span>
      </section>

      <nav className="aura-quick-rail" aria-label="Atelier quick links">
        <span><b>{String(services.length).padStart(2, '0')}</b> treatments, currently listed</span>
        <button onClick={() => scrollToSection('services')}>Explore the index <ArrowRight size={15} /></button>
        <button onClick={() => scrollToSection('build-visit')}>Build your visit <CalendarDays size={15} /></button>
        {salonPhone && <a href={`tel:${salonPhone}`}><Phone size={15} /> Call the atelier</a>}
      </nav>

      <section className="aura-treatment-index" id="services" tabIndex={-1}>
        <div className="aura-index-heading">
          <div><p className="aurelia-kicker">THE TREATMENT INDEX / 01—{String(services.length).padStart(2, '0')}</p><h2>Good work,<br /><em>well considered.</em></h2></div>
          <p>Explore the services this salon has published. Save a favorite, compare the details, then choose one for your visit request.</p>
        </div>
        {services.length > 0 && <div className="service-filters aura-service-filters">
          <label className="service-search"><Search size={16} /><span className="sr-only">Search services</span><input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Find a treatment" /></label>
          <label className="service-category-filter"><span className="sr-only">Filter services by category</span><select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)}><option value="all">Every category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <button className={favoritesOnly ? 'aura-favorites-filter active' : 'aura-favorites-filter'} aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><Bookmark size={15} fill={favoritesOnly ? 'currentColor' : 'none'} /> Saved <span>{favorites.length}</span></button>
        </div>}
        {services.length ? visibleServices.length ? <div className="aura-treatment-grid">
          {visibleServices.map((service, index) => {
            const duration = durationFor(service);
            const isSaved = favorites.includes(service.id);
            return <article className={`aura-treatment-card aura-treatment-card-${index % 4}`} key={service.id}>
              <button className="aura-treatment-image" onClick={() => openService(service)} aria-label={`View details for ${service.name}`}>
                {service.images?.[0] ? <img src={service.images[0]} alt="" loading="lazy" /> : <span className="aura-image-placeholder"><Scissors size={26} /><small>{service.category || 'ATELIER / TREATMENT'}</small></span>}
                <span className="aura-card-index">TREATMENT / {String(index + 1).padStart(2, '0')}</span>
                <span className="aura-card-open"><ArrowDownRight size={19} /></span>
              </button>
              <div className="aura-treatment-meta"><span>{service.category || 'SALON SERVICE'}</span><span>{duration ? `${duration} MIN` : 'DURATION NOT LISTED'}</span></div>
              <div className="aura-treatment-title"><button onClick={() => openService(service)}><h3>{service.name}</h3></button><button className="aura-save-button" onClick={() => toggleFavorite(service.id)} aria-label={`${isSaved ? 'Remove' : 'Save'} ${service.name} ${isSaved ? 'from' : 'to'} favorites`} aria-pressed={isSaved}><Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
              <p className="aura-treatment-description">{descriptionFor(service) || 'Service details are available from the salon.'}</p>
              <div className="aura-treatment-footer"><strong>{formatPrice(service.price, seller.currency || 'USD')}</strong><button onClick={() => chooseService(service.id)}>Add to visit <ArrowRight size={15} /></button></div>
            </article>;
          })}
        </div> : <div className="aurelia-empty-services"><Scissors /><div><h3>{favoritesOnly && favorites.length === 0 ? 'Your saved list is ready.' : 'No treatments match those filters.'}</h3><p>{favoritesOnly && favorites.length === 0 ? 'Save a treatment with the bookmark control and it will appear here.' : 'Try a different search or category.'}</p></div><button onClick={() => { setServiceSearch(''); setServiceCategory('all'); setFavoritesOnly(false); }}>Reset filters</button></div> : <div className="aurelia-empty-services"><Scissors /><div><h3>No treatments listed yet.</h3><p>This salon has not published services to its menu.</p></div>{salonEmail && <a href={`mailto:${salonEmail}`}>Contact the salon <ArrowRight size={15} /></a>}</div>}
      </section>

      <section className="aura-visit-builder" id="build-visit" tabIndex={-1}>
        <div className="aura-builder-aside"><p className="aurelia-kicker">BUILD YOUR VISIT / 02</p><span className="aura-builder-numeral">02</span><h2>Put a visit<br />in <em>motion.</em></h2><p>Choose a published treatment and your preferred day. This is a request for the salon to review—not a live availability check.</p><div className="aura-builder-step"><span>01</span><div><strong>Choose a treatment</strong><small>Real services, prices &amp; durations</small></div></div><div className="aura-builder-step"><span>02</span><div><strong>Pick a preferred time</strong><small>The salon confirms after review</small></div></div></div>
        <div className="aura-builder-panel">
          {confirmation ? <div className="booking-success" role="status"><span className="success-check"><Check size={20} /></span><p className="aurelia-kicker">REQUEST RECEIVED</p><h3>It's with the salon.<br /><em>Now we wait.</em></h3><p>Your request for {chosen?.name} on {formattedDate} at {time} is pending salon review. This time is not reserved. No payment was collected.</p><button className="aurelia-button aura-primary-button" onClick={openPortal}>View my requests <ArrowRight size={16} /></button></div> : services.length === 0 ? <div className="booking-no-services"><Scissors /><h3>The menu is being prepared.</h3><p>Online requests are not available until services are published.</p>{salonPhone && <a href={`tel:${salonPhone}`}><Phone size={16} /> Contact the salon</a>}</div> : <form className="aurelia-booking-form aura-builder-form" onSubmit={submitBooking}>
            <div className="aura-builder-summary"><span>YOUR VISIT / REQUEST ONLY</span><strong>{chosen?.name || 'Choose a treatment to begin'}</strong><div><span>{chosen ? formatPrice(chosen.price, seller.currency || 'USD') : 'No service selected'}</span><span>{chosenDuration ? `${chosenDuration} min` : 'Duration shown when listed'}</span></div></div>
            <label>Selected treatment<select value={selectedService} onChange={(event) => { setSelectedService(event.target.value); setTime(''); }} required><option value="">Choose a published service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatPrice(service.price, seller.currency || 'USD')}</option>)}</select></label>
            <div className="booking-field-pair"><label>Preferred date<input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required /></label><label>Preferred time<select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || !chosen || availableTimes.length === 0} required><option value="">{!hasPublishedHours ? 'Hours not published' : !chosen ? 'Choose a treatment first' : !date ? 'Choose a date first' : availableTimes.length ? 'Choose a request time' : 'No times to request'}</option>{availableTimes.map((slot) => <option key={slot} value={slot}>{new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>)}</select></label></div>
            <p className="aura-request-disclaimer">{hasPublishedHours ? `Requests are generated from ${salon.openingTime}–${salon.closingTime} and the salon’s opening days.` : 'The salon has not published request hours, so online time requests are not available yet.'} Times are not checked against existing appointments and are not reserved.</p>
            {salon.staff.length > 0 && <label>Preferred stylist <span className="optional-label">OPTIONAL</span><select value={preferredStylist} onChange={(event) => setPreferredStylist(event.target.value)}><option value="">No preference</option>{salon.staff.map((person) => <option key={person.name} value={person.name}>{person.name}{person.specialty ? ` · ${person.specialty}` : ''}</option>)}</select></label>}
            <div className="aura-form-rule" />
            <div className="booking-field-pair"><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label></div>
            <label>Phone number<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label>
            <label>Anything we should know? <span className="optional-label">OPTIONAL</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A note for the salon team" /></label>
            {error && <p className="aurelia-form-error" role="alert">{error}</p>}
            <button className="aurelia-button aura-primary-button booking-submit" type="submit" disabled={busy || !hasPublishedHours}>{busy ? 'Sending request…' : 'Send preferred-time request'} {busy ? <span className="button-spinner" /> : <ArrowRight size={16} />}</button>
            <p className="booking-fineprint">No payment is collected. Your request stays pending until the salon responds. No appointment is confirmed or reserved by this form.</p>
          </form>}
        </div>
      </section>

      <section className="aura-atelier-notes" id="atelier-notes" tabIndex={-1}>
        <header><p className="aurelia-kicker">NOTES FROM THE ATELIER / 03</p><h2>People, practice<br />&amp; <em>place.</em></h2><span>A / S</span></header>
        <div className="aura-note-grid">
          <article className="aura-note-people"><span>01 / PEOPLE</span><div><h3>{salon.staff.length ? 'Meet your makers.' : 'A thoughtful set of hands.'}</h3><p>{salon.staff.length ? salon.staff.map((person) => `${person.name}${person.specialty ? ` — ${person.specialty}` : ''}`).join(' · ') : 'Ask the salon about its team when they respond to your request.'}</p></div>{salon.staff.length > 0 && <ul>{salon.staff.map((person) => <li key={person.name}><span>{person.name}</span><small>{person.specialty || 'Salon team'}</small></li>)}</ul>}</article>
          <article className="aura-note-craft"><span>02 / CRAFT</span><div><h3>Good details.<br />No guesswork.</h3><p>{services.length ? `${services.length} published treatment${services.length === 1 ? '' : 's'} with salon-set pricing${services.some((service) => durationFor(service)) ? ' and listed durations' : ''}.` : 'Treatments and pricing will appear here when the salon publishes its menu.'}</p></div><button onClick={() => scrollToSection('services')}>Return to index <ArrowRight size={15} /></button></article>
          <article className="aura-note-space"><span>03 / SPACE</span>{heroImage && <img src={heroImage} alt="" loading="lazy" />}<div><h3>{salonAddress ? 'Find your way here.' : 'The studio awaits.'}</h3><p>{salonAddress || 'Location details have not been published. Contact the salon for directions.'}</p></div></article>
        </div>
      </section>

      <section className="aura-contact-band" id="visit" tabIndex={-1}>
        <div><p className="aurelia-kicker">04 / VISIT &amp; CONTACT</p><h2>Take it from<br /><em>here.</em></h2></div>
        <div className="aura-contact-details">{salonAddress && <p><MapPin size={17} /> {salonAddress}</p>}{hasPublishedHours && <p><Clock3 size={17} /> {salon.openingTime}–{salon.closingTime} · Closed {salon.closedDays.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ') || 'no set days'}</p>}{salonPhone && <a href={`tel:${salonPhone}`}><Phone size={17} /> {salonPhone}</a>}{salonEmail && <a href={`mailto:${salonEmail}`}><ArrowRight size={17} /> {salonEmail}</a>}{!salonAddress && !hasPublishedHours && !salonPhone && !salonEmail && <p>Contact and visiting details have not been added yet.</p>}</div>
        <button className="aurelia-button aura-primary-button" onClick={() => scrollToSection('build-visit')}>Build a visit <ArrowDownRight size={17} /></button>
      </section>
    </main>

    <footer className="aurelia-footer aura-footer">
      <section className="aura-footer-close" aria-labelledby="aura-footer-heading">
        <div className="aura-footer-message">
          <p className="aurelia-kicker">AURA / UNTIL NEXT TIME</p>
          <h2 id="aura-footer-heading">Make room<br />for <em>yourself.</em></h2>
          <p>A considered treatment, on a day that works for you. Start with the published menu; the atelier will review your request personally.</p>
          <div className="aura-footer-actions">
            <button className="aura-footer-primary" onClick={() => scrollToSection('build-visit')}>Build your visit <ArrowDownRight size={17} /></button>
            <button className="aura-footer-secondary" onClick={() => scrollToSection('services')}>Back to treatments <ArrowRight size={16} /></button>
          </div>
        </div>
        <div className="aura-footer-details">
          <div className="aura-footer-brand">
            {seller.logo ? <img className="salon-logo" src={seller.logo} alt="" /> : <span className="wordmark-mark"><Scissors size={17} /></span>}
            <div><span className="aura-footer-label">THE ATELIER</span><strong>{salonName}</strong></div>
          </div>
          <address>
            {salonAddress && <p><MapPin size={16} /><span>{salonAddress}</span></p>}
            {hasPublishedHours && <p><Clock3 size={16} /><span>{salon.openingTime}–{salon.closingTime}<small>Closed {salon.closedDays.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ') || 'no set days'}</small></span></p>}
            {salonPhone && <a href={`tel:${salonPhone}`}><Phone size={16} /><span>{salonPhone}</span></a>}
            {salonEmail && <a href={`mailto:${salonEmail}`}><ArrowRight size={16} /><span>{salonEmail}</span></a>}
            {!salonAddress && !hasPublishedHours && !salonPhone && !salonEmail && <p className="aura-footer-unpublished">Location, visiting hours and contact details haven’t been published yet.</p>}
          </address>
        </div>
      </section>
      <div className="aura-footer-base">
        <button className="aurelia-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })} aria-label={`${salonName} home`}>{seller.logo ? <img className="salon-logo" src={seller.logo} alt="" /> : <span className="wordmark-mark"><Scissors size={16} /></span>}<span>{salonName}</span></button>
        <span className="aura-footer-coordinate">BEAUTY ATELIER / {seller.subdomain}</span>
        <nav aria-label="Salon accounts"><button onClick={openPortal}>Client appointments <ArrowRight size={14} /></button><button onClick={() => navigate('/salon/aura-salon/admin')}>Salon owner <ArrowRight size={14} /></button></nav>
        <small>© {new Date().getFullYear()} {salonName}</small>
      </div>
    </footer>
  </div>;
};

export default AuraSalonSite;
