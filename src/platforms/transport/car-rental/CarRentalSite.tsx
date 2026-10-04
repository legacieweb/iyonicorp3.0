import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, MapPin, Menu, Send, User, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { CarRentalOrderData, getCarRentalSettings, getVehicleCategoryLabel, getCategoryIcon, getDaysDifference, calculateTotal } from './carRentalTypes';
import './carRental.css';

interface Props { seller: Seller; products: Product[]; demoMode?: boolean }

const CarRentalSite: React.FC<Props> = ({ seller, products, demoMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = getCarRentalSettings(seller);
  const vehicles = products.filter((product) => product.status === 'active' && product.type === 'service');
  const isDemo = demoMode;

  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicles[0]?.id || '');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState(settings.locations[0] || '');
  const [returnLocation, setReturnLocation] = useState('');
  const [driverAge, setDriverAge] = useState('25');
  const [insuranceLevel, setInsuranceLevel] = useState<'basic' | 'premium' | 'full'>('premium');
  const [instructions, setInstructions] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const chosenVehicle = useMemo(() => vehicles.find((v) => v.id === selectedVehicle), [selectedVehicle, vehicles]);
  const days = useMemo(() => getDaysDifference(pickupDate, returnDate), [pickupDate, returnDate]);
  const total = useMemo(() => chosenVehicle ? calculateTotal(chosenVehicle.price, days, { platform: 'car-rental', insuranceLevel, vehicleId: '', pickupDate, returnDate, pickupLocation, returnLocation, driverAge: Number(driverAge) }) : 0, [chosenVehicle, days, insuranceLevel]);
  const deposit = useMemo(() => Math.round(total * (settings.depositPercent / 100)), [total, settings.depositPercent]);
  const remaining = useMemo(() => total - deposit, [total, deposit]);
  const today = new Date().toISOString().slice(0, 10);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {};

  const handleQuickSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setNotice('');
    if (!chosenVehicle || !pickupDate || !returnDate) {
      setError('Choose a vehicle and pickup/return dates.');
      return;
    }
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Please fill in your name, a valid email, and phone number.');
      return;
    }
    if (isDemo) {
      const demoBooking: CarRentalOrderData = {
        platform: 'car-rental',
        vehicleId: chosenVehicle.id,
        pickupDate,
        returnDate,
        pickupLocation,
        returnLocation: returnLocation || pickupLocation,
        driverAge: Number(driverAge),
        insuranceLevel,
        instructions: instructions.trim(),
      };
      setConfirmation({
        id: 'demo',
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name,
        customerEmail: email,
        items: [{ productId: chosenVehicle.id, productName: chosenVehicle.name, quantity: 1, price: total }],
        total,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(demoBooking),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Order);
      return;
    }
    setBusy(true);
    try {
      const booking: CarRentalOrderData = {
        platform: 'car-rental',
        vehicleId: chosenVehicle.id,
        pickupDate,
        returnDate,
        pickupLocation,
        returnLocation: returnLocation || pickupLocation,
        driverAge: Number(driverAge),
        insuranceLevel,
        instructions: instructions.trim(),
      };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosenVehicle.id, productName: chosenVehicle.name, quantity: 1, price: total }],
        total,
        subtotal: total - (insuranceLevel === 'premium' ? total * 0.15 : insuranceLevel === 'full' ? total * 0.3 : 0),
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'deposit',
        amountPaid: deposit,
        remainingBalance: remaining,
      });
      setConfirmation(order);
      setNotice('Your reservation has been submitted! A confirmation will follow shortly.');
    } catch {
      setError('We could not process your reservation. Please try again or call us.');
    } finally {
      setBusy(false);
    }
  };

  const openVehicleDetail = (vehicle: Product) => {
    navigate(`/car-rental/vehicle/${vehicle.id}`, {
      state: { vehicle, seller, from: `/shop/${seller.subdomain}` },
    });
  };

  const handleBack = () => {
    window.location.href = `/shop/${seller.subdomain}`;
  };

  if (confirmation) {
    return (
      <div className="car-rental-site">
        <header className={`cr-header ${headerScrolled ? 'scrolled' : ''}`}>
          <a href="#cr-home" className="cr-logo" aria-label={`${seller.storeName} home`}>
            <span className="cr-logo-icon"><MapPin size={19} /></span>
            <strong>{seller.storeName}</strong>
          </a>
        </header>
        <main className="cr-confirm-page">
          <div className="cr-confirm-card">
            <span className="cr-success-check"><Check size={32} /></span>
            <h2>Reservation <em>Received.</em></h2>
            <p>Your request for {chosenVehicle?.name} has been submitted. A {settings.depositPercent}% deposit is required to secure your booking. Our team will follow up with the next steps.</p>
            <button className="cr-btn cr-btn-primary" onClick={() => window.location.href = `/shop/${seller.subdomain}`}>
              Return to the fleet <ArrowRight size={15} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="car-rental-site">
      <header className={`cr-header ${headerScrolled ? 'scrolled' : ''}`}>
        <a href="#cr-home" className="cr-logo" aria-label={`${seller.storeName} home`}>
          <span className="cr-logo-icon"><MapPin size={19} /></span>
          <strong>{seller.storeName}</strong>
        </a>
        <nav className="cr-nav">
          <div id="cr-mobile-nav" className={`cr-nav-links ${mobileMenuOpen ? 'is-open' : ''}`}>
            <a href="#vehicles" onClick={() => setMobileMenuOpen(false)}>Fleet</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <button className="cr-signin" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
              <User size={15} /> Sign in
            </button>
          </div>
          <button
            className="cr-mobile-menu"
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls="cr-mobile-nav"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <a className="cr-nav-book" href="#booking">Reserve <ArrowRight size={15} /></a>
        </nav>
      </header>

      <main id="cr-home">
        <section className="cr-hero">
          <div className="cr-hero-content">
            <p className="cr-kicker">A BETTER WAY TO GET THERE</p>
            <h1>Take the <i>long way.</i></h1>
            <p className="cr-hero-description">A considered collection of cars, ready when you are. Choose your dates and we’ll take care of the details.</p>
            <form className="cr-quick-search" onSubmit={handleQuickSearch}>
              <div className="cr-quick-search-heading">
                <span>Plan your drive</span>
                <span>01 / 04</span>
              </div>
              <label className="cr-quick-field">
                <span>Vehicle</span>
                <select value={selectedVehicle} onChange={(event) => setSelectedVehicle(event.target.value)} required>
                  {vehicles.length === 0 && <option value="">No vehicles available</option>}
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                  ))}
                </select>
              </label>
              <div className="cr-quick-search-row">
                <label className="cr-quick-field">
                  <span>Pickup location</span>
                  <select value={pickupLocation} onChange={(event) => {
                    setPickupLocation(event.target.value);
                    setReturnLocation('');
                  }} required>
                    {settings.locations.map((location) => <option key={location} value={location}>{location}</option>)}
                  </select>
                </label>
                <label className="cr-quick-field">
                  <span>Pickup date</span>
                  <input type="date" min={today} value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} required />
                </label>
                <label className="cr-quick-field">
                  <span>Return date</span>
                  <input type="date" min={pickupDate || today} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required />
                </label>
              </div>
              <button className="cr-btn cr-btn-primary cr-quick-submit" type="submit" disabled={vehicles.length === 0}>
                Find your car <ArrowRight size={16} />
              </button>
            </form>
          </div>
          <div className="cr-hero-visual" aria-label={chosenVehicle ? `${chosenVehicle.name} rental vehicle` : 'Rental vehicle'}>
            {chosenVehicle?.images?.[0] ? (
              <img src={chosenVehicle.images[0]} alt={chosenVehicle.name} className="cr-hero-image" />
            ) : (
              <div className="cr-hero-placeholder" role="img" aria-label="Vehicle image unavailable">
                <span>{chosenVehicle ? getCategoryIcon(chosenVehicle.category) : '—'}</span>
                <small>{chosenVehicle ? 'Image coming soon' : 'Your next drive starts here'}</small>
              </div>
            )}
            {chosenVehicle && (
              <div className="cr-hero-caption">
                <div>
                  <span>FEATURED VEHICLE</span>
                  <strong>{chosenVehicle.name}</strong>
                </div>
                <p>{formatPrice(chosenVehicle.price, seller.currency || 'USD')} <small>/ day</small></p>
              </div>
            )}
            <span className="cr-hero-index">01 <i>—</i> {String(Math.max(vehicles.length, 1)).padStart(2, '0')}</span>
          </div>
        </section>

        <section className="cr-trust-strip" aria-label="Rental highlights">
          <p><Check size={15} /> {settings.depositPercent}% deposit to reserve</p>
          <p><MapPin size={15} /> {settings.locations.length} convenient pickup locations</p>
          <p><Clock size={15} /> {settings.operatingHours.open}–{settings.operatingHours.close} daily</p>
        </section>

        <section className="cr-vehicles" id="vehicles">
          <div className="cr-section-heading">
            <div>
              <div className="cr-kicker">THE COLLECTION</div>
              <h2>Made for the <i>miles ahead.</i></h2>
            </div>
            <p className="cr-subtitle">Find the right fit for a quick escape or the scenic route home.</p>
          </div>
          {vehicles.length === 0 ? (
            <div className="cr-fleet-empty">
              <h3>The fleet is being prepared.</h3>
              <p>Please check back soon or contact {seller.storeName} for availability.</p>
            </div>
          ) : <div className="cr-vehicle-grid">
            {vehicles.map((vehicle) => (
              <article key={vehicle.id} className="cr-vehicle-card">
                {vehicle.images?.[0] ? (
                  <img src={vehicle.images[0]} alt={vehicle.name} className="cr-vehicle-image" />
                ) : (
                  <div className="cr-vehicle-placeholder" role="img" aria-label={`${vehicle.name} image unavailable`}>
                    <span>{getCategoryIcon(vehicle.category)}</span>
                    <small>Image coming soon</small>
                  </div>
                )}
                <div className="cr-vehicle-body">
                  <div className="cr-vehicle-header">
                    <h3>{vehicle.name}</h3>
                    <span className="cr-vehicle-category">{getVehicleCategoryLabel(vehicle.category)}</span>
                  </div>
                  {vehicle.videos && vehicle.videos.length > 0 && (
                    <div className="cr-vehicle-meta"><span><Clock size={14} /> Video tour</span></div>
                  )}
                  <div className="cr-vehicle-price">
                    {formatPrice(vehicle.price, seller.currency || 'USD')}<small>/ day</small>
                  </div>
                  <div className="cr-vehicle-actions">
                    <button
                      className="cr-btn cr-btn-text cr-btn-sm"
                      onClick={(e) => { e.stopPropagation(); openVehicleDetail(vehicle); }}
                    >
                      Vehicle details <ArrowRight size={14} />
                    </button>
                    <button className="cr-btn cr-btn-outline cr-btn-sm" onClick={() => {
                      setSelectedVehicle(vehicle.id);
                      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                    }}>
                      Reserve
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>}
        </section>

        <section className="cr-how-it-works" id="how-it-works">
          <div className="cr-how-heading">
            <div className="cr-kicker">THE DETAILS, HANDLED</div>
            <h2>From here to <i>there.</i></h2>
          </div>
          <div className="cr-steps">
            <div className="cr-step">
              <span className="cr-step-number">1</span>
              <h3>Choose your car</h3>
              <p>Pick the vehicle that suits the trip, not the other way around.</p>
            </div>
            <div className="cr-step">
              <span className="cr-step-number">2</span>
              <h3>Set your dates</h3>
              <p>Choose a pickup point and reserve with a {settings.depositPercent}% deposit.</p>
            </div>
            <div className="cr-step">
              <span className="cr-step-number">3</span>
              <h3>Enjoy the drive</h3>
              <p>Collect your keys and leave the rest of the day open.</p>
            </div>
          </div>
        </section>

        <section className="cr-booking" id="booking">
          <div className="cr-kicker">RESERVE NOW</div>
          <h2>Your next <i>ride starts here.</i></h2>
          <p className="cr-subtitle">Fill in your details, select a vehicle and dates, and pay the deposit to secure your reservation.</p>
          <div className="cr-booking-panel">
            {error && <div className="cr-form-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
            {notice && <div className="cr-form-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
            <form className="cr-booking-form" onSubmit={handleSubmit}>
              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-vehicle">Vehicle</label>
                  <select id="cr-booking-vehicle" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} className="cr-select" required>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} — {formatPrice(vehicle.price, seller.currency || 'USD')}/day
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-insurance">Insurance</label>
                  <select id="cr-booking-insurance" value={insuranceLevel} onChange={(e) => setInsuranceLevel(e.target.value as 'basic' | 'premium' | 'full')} className="cr-select" required>
                    <option value="basic">Basic liability</option>
                    <option value="premium">Premium protection (recommended)</option>
                    <option value="full">Full coverage</option>
                  </select>
                </div>
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-pickup-date">Pickup date</label>
                  <input id="cr-booking-pickup-date" type="date" min={today} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="cr-input" required />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-return-date">Return date</label>
                  <input id="cr-booking-return-date" type="date" min={pickupDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="cr-input" required />
                </div>
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-pickup-location">Pickup location</label>
                  <select id="cr-booking-pickup-location" value={pickupLocation} onChange={(e) => { setPickupLocation(e.target.value); setReturnLocation(''); }} className="cr-select" required>
                    {settings.locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-return-location">Return location</label>
                  <select id="cr-booking-return-location" value={returnLocation} onChange={(e) => setReturnLocation(e.target.value)} className="cr-select">
                    <option value="">Same as pickup</option>
                    {settings.locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-name">Your name</label>
                  <input id="cr-booking-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="cr-input" placeholder="Full name" autoComplete="name" required />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-phone">Phone number</label>
                  <input id="cr-booking-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="cr-input" placeholder="+1 (555) 000-0000" autoComplete="tel" required />
                </div>
              </div>

              <div className="cr-form-field">
                <label className="cr-form-label" htmlFor="cr-booking-email">Email address</label>
                <input id="cr-booking-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="cr-input" placeholder="you@example.com" autoComplete="email" required />
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-driver-age">Driver age</label>
                  <input id="cr-booking-driver-age" type="number" min={21} max={80} value={driverAge} onChange={(e) => setDriverAge(e.target.value)} className="cr-input" required />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label" htmlFor="cr-booking-instructions">Special instructions</label>
                  <input id="cr-booking-instructions" type="text" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="cr-input" placeholder="Child seat, GPS, etc." />
                </div>
              </div>

              <div className="cr-price-summary">
                <div><span>Days</span><strong>{days || 0} day{days !== 1 ? 's' : ''}</strong></div>
                <div><span>Rate</span><strong>{formatPrice(chosenVehicle?.price || 0, seller.currency || 'USD')}/day</strong></div>
                <div><span>Insurance ({insuranceLevel})</span><strong>{insuranceLevel === 'premium' ? '+15%' : insuranceLevel === 'full' ? '+30%' : 'included'}</strong></div>
                <div><span>Subtotal</span><strong>{formatPrice(total, seller.currency || 'USD')}</strong></div>
                <div><span>Deposit ({settings.depositPercent}%)</span><strong>{formatPrice(deposit, seller.currency || 'USD')}</strong></div>
                <div><span>Balance on pickup</span><strong>{formatPrice(remaining, seller.currency || 'USD')}</strong></div>
              </div>

              <button className="cr-btn cr-btn-primary" type="submit" disabled={busy}>
                {busy ? 'Processing reservation…' : 'Confirm reservation'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
              </button>
              <p className="cr-fineprint">You'll pay the remaining balance at pickup. Cancellation is free up to 24 hours before your reservation.</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="cr-footer">
        <div className="cr-footer-grid">
          <div>
            <div className="cr-logo"><span className="cr-logo-icon"><MapPin size={19} /></span><strong>{seller.storeName}</strong></div>
            <small className="cr-footer-tagline">CAR RENTAL, CONSIDERED.</small>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#booking">Book now</a></li>
              <li><a href="#vehicles">Our fleet</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><a href="#privacy">Privacy policy</a></li>
              <li><a href="#terms">Terms of service</a></li>
              <li><a href="#insurance">Insurance</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>Contact</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {seller.contactInfo?.address || 'Multiple locations'}</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={14} /> Daily 8:00 – 20:00</li>
              {seller.contactInfo?.phone && <li><Send size={14} /> {seller.contactInfo.phone}</li>}
              {seller.contactInfo?.email && <li><Send size={14} /> <a href={`mailto:${seller.contactInfo.email}`}>{seller.contactInfo.email}</a></li>}
            </ul>
          </div>
        </div>
        <div className="cr-footer-bottom">
          <p>© {new Date().getFullYear()} {seller.storeName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default CarRentalSite;
