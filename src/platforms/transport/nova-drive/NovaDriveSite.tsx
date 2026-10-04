import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, CreditCard, Gift, Mail, MapPin, Menu, Phone, Send, Shield, Smartphone, X, Zap } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { defaultNovaSettings, getNovaSettings } from './novaDriveTypes';
import './nova-drive.css';

interface Props { seller: Seller; products: Product[]; demoMode?: boolean }

const HERO_FEATURES = [
  { icon: <Shield size={18} />, label: 'Fully insured' },
  { icon: <Smartphone size={18} />, label: '24/7 support' },
  { icon: <Zap size={18} />, label: 'Keyless entry' },
  { icon: <Gift size={18} />, label: 'Flexible cancellation' },
];

const PROCESS_STEPS = [
  { number: 1, title: 'Choose your ride', description: 'Browse our fleet and pick the perfect vehicle for your journey.' },
  { number: 2, title: 'Book instantly', description: 'Select your dates, add extras, and confirm your reservation online.' },
  { number: 3, title: 'Pick up & go', description: 'Collect your keys at the terminal and hit the road with confidence.' },
];

const NovaDriveSite: React.FC<Props> = ({ seller, products, demoMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = getNovaSettings(seller);
  const vehicles = (products || []).filter(
    (product) => product.type === 'service' && product.status === 'active' && product.category.includes('vehicle')
  );
  const featuredVehicles = vehicles.length > 0 ? vehicles.slice(0, 6) : [];

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Product | null>(vehicles[0] || null);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState(settings.locations[0] || '');
  const [returnLocation, setReturnLocation] = useState('');
  const [driverAge, setDriverAge] = useState('25');
  const [insuranceLevel, setInsuranceLevel] = useState<'basic' | 'premium' | 'full'>('premium');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const rentalDays = pickupDate && returnDate
    ? Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 3600 * 24)))
    : 0;

  const selectedAddOnDetails = settings.addOnOptions.filter((addon) => selectedAddOns.includes(addon.id));
  const addOnTotal = selectedAddOnDetails.reduce((sum, addon) => sum + addon.price, 0);
  const baseTotal = selectedVehicle ? selectedVehicle.price * rentalDays : 0;
  const insuranceMultiplier = insuranceLevel === 'premium' ? 1.18 : insuranceLevel === 'full' ? 1.35 : 1;
  const estimatedTotal = Math.round((baseTotal * insuranceMultiplier + addOnTotal) * 100) / 100;

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!selectedVehicle || !pickupDate || !returnDate || !pickupLocation || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Select a vehicle, pickup and return dates, and fill in your contact details.');
      return;
    }

    if (new Date(returnDate) <= new Date(pickupDate)) {
      setError('The return date must be after the pickup date.');
      return;
    }

    setBusy(true);
    try {
      const booking = {
        platform: 'nova-drive',
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        pickupDate,
        returnDate,
        pickupLocation,
        returnLocation: returnLocation || pickupLocation,
        driverAge: Number(driverAge),
        insuranceLevel,
        addOns: selectedAddOnDetails.map((a) => a.name),
        specialInstructions: instructions.trim(),
        totalDays: rentalDays,
      };

      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: selectedVehicle.id, productName: selectedVehicle.name, quantity: 1, price: selectedVehicle.price }],
        total: estimatedTotal,
        subtotal: baseTotal,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not process your request. Please try again or call us.');
    } finally {
      setBusy(false);
    }
  };

  const openPortal = () =>
    navigate(
      user
        ? '/transport/nova-drive/client'
        : `/login?shop=${encodeURIComponent(seller.id)}&subdomain=${encodeURIComponent(seller.subdomain)}&redirect=${encodeURIComponent('/transport/nova-drive/client')}`
    );

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="nova-site">
      <header className="nova-site-header">
        <nav className="nova-nav">
          <a href="#top" className="nova-wordmark">
            <span className="wordmark-mark"><CalendarDays size={18} /></span>
            <span>Nova <em>Drive</em></span>
          </a>
          <div className="nav-links">
            <a href="#fleet" onClick={() => scrollTo('fleet')}>Fleet</a>
            <a href="#process" onClick={() => scrollTo('process')}>How it works</a>
            <a href="#booking" onClick={() => scrollTo('booking')}>Book now</a>
            <a href="#contact" onClick={() => scrollTo('contact')}>Contact</a>
            <button className="nova-btn nova-btn-outline nova-btn-sm" onClick={() => scrollTo('booking')}>
              <Send size={14} /> Book now
            </button>
          </div>
        </nav>
        <div className="mobile-menu">
          {menuOpen && (
            <div className="mobile-nav">
              {['Fleet', 'How it works', 'Book now', 'Contact'].map((link) => (
                <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`} onClick={() => scrollTo(link.toLowerCase().replace(/ /g, '-'))}>
                  {link}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="nova-hero">
        <div className="hero-container">
          <div className="hero-content">
            <p className="nova-kicker">CAR RENTAL, REDEFINED</p>
            <h1>Rides <span className="hero-accent">reimagined</span> for modern travel.</h1>
            <p>Experience premium vehicles with transparent pricing and seamless digital booking — from economy cars to luxury EV fleets.</p>

            <div className="hero-actions">
              <button className="nova-btn nova-btn-primary" onClick={() => scrollTo('booking')}>
                Get a quote <ArrowRight size={16} />
              </button>
              <div className="hero-features">
                {HERO_FEATURES.map((feature) => (
                  <div key={feature.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', opacity: '0.8' }}>
                    {feature.icon} {feature.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hero-image">
            {selectedVehicle?.images && selectedVehicle.images.length > 0 ? (
              <img src={selectedVehicle.images[0]} alt={selectedVehicle.name} />
            ) : (
              <div className="hero-placeholder">
                <CalendarDays size={80} />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="nova-vehicles" id="fleet">
        <div className="section-header">
          <p className="nova-kicker">OUR FLEET</p>
          <h2>Luxury and performance, all in one place.</h2>
        </div>

        <div className="vehicles-grid">
          {featuredVehicles.length ? featuredVehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="vehicle-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedVehicle(vehicle)}
            >
              {vehicle.images && vehicle.images.length > 0 ? (
                <img src={vehicle.images[0]} alt={vehicle.name} className="vehicle-image" />
              ) : (
                <div className="vehicle-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nova-blue)' }}>
                  <CalendarDays size={40} />
                </div>
              )}
              <div className="vehicle-content">
                <h3>{vehicle.name}</h3>
                <div className="vehicle-meta">
                  <span>{vehicle.category}</span>
                  <span><CreditCard size={14} /> {formatPrice(vehicle.price, seller.currency || 'USD')}/day</span>
                </div>
                <p style={{ color: 'var(--nova-silver-dark)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {vehicle.description || 'A premium vehicle for your journey.'}
                </p>
                <button className="nova-btn nova-btn-outline nova-btn-sm">
                  Select
                </button>
              </div>
            </article>
          )) : (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <CalendarDays size={48} style={{ color: 'var(--nova-blue)' }} />
              <p>Vehicles coming soon.</p>
            </div>
          )}
        </div>
      </section>

      <section className="nova-process" id="process">
        <div className="section-header">
          <p className="nova-kicker">HOW IT WORKS</p>
          <h2>Three simple steps to your next ride.</h2>
        </div>
        <div className="steps-grid">
          {PROCESS_STEPS.map((step) => (
            <div key={step.number} className="step-card">
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="nova-vehicles" id="booking">
        <div className="section-header">
          <p className="nova-kicker">QUICK BOOKING</p>
          <h2>Reserve your vehicle in seconds.</h2>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {confirmation ? (
            <div className="booking-success" role="status">
              <span className="success-check">
                <Check size={24} />
              </span>
              <p className="nova-kicker">CONFIRMATION RECEIVED</p>
              <h3>Your booking request is on its way.</h3>
              <p style={{ margin: '16px 0 24px', opacity: '0.85' }}>
                We received your request for {selectedVehicle?.name} from {pickupDate} to {returnDate}.
                Our team will confirm details and reach out within 24 hours with your rental agreement.
              </p>
              <button className="nova-btn nova-btn-primary" onClick={openPortal}>
                Go to my portal <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <form className="flow-form" onSubmit={submitBooking}>
              <div className="admin-form-grid">
                <label>
                  Vehicle
                  <select
                    value={selectedVehicle?.id || ''}
                    onChange={(event) => setSelectedVehicle(vehicles.find((v) => v.id === event.target.value) || null)}
                    required
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} — {formatPrice(vehicle.price, seller.currency || 'USD')}/day
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ flex: 1 }}>
                    Pick-up date
                    <input
                      type="date"
                      min={today}
                      value={pickupDate}
                      onChange={(event) => {
                        setPickupDate(event.target.value);
                        setReturnDate('');
                      }}
                      required
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    Return date
                    <input
                      type="date"
                      min={pickupDate || today}
                      value={returnDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                      disabled={!pickupDate}
                      required
                    />
                  </label>
                </div>

                <label>
                  Pick-up location
                  <select
                    value={pickupLocation}
                    onChange={(event) => setPickupLocation(event.target.value)}
                    required
                  >
                    {settings.locations.map((location) => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Return location
                  <input
                    value={returnLocation}
                    onChange={(event) => setReturnLocation(event.target.value)}
                    placeholder="Same as pick-up (optional)"
                  />
                </label>

                <label>
                  Driver age
                  <select value={driverAge} onChange={(event) => setDriverAge(event.target.value)}>
                    <option value="25">25+</option>
                    <option value="23">23-24</option>
                    <option value="21">21-22</option>
                  </select>
                </label>

                <label>
                  Insurance
                  <select
                    value={insuranceLevel}
                    onChange={(event) => setInsuranceLevel(event.target.value as 'basic' | 'premium' | 'full')}
                  >
                    <option value="basic">Basic Coverage</option>
                    <option value="premium">Premium Protection (+18%)</option>
                    <option value="full">Full Coverage (+35%)</option>
                  </select>
                </label>

                {selectedVehicle && rentalDays > 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '16px', background: 'var(--nova-gray)', borderRadius: 'var(--nova-radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Daily rate:</span>
                      <span>{formatPrice(selectedVehicle.price, seller.currency || 'USD')} × {rentalDays} {rentalDays === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Insurance ({insuranceLevel}):</span>
                      <span>{formatPrice(baseTotal * (insuranceMultiplier - 1), seller.currency || 'USD')}</span>
                    </div>
                    {addOnTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Add-ons:</span>
                        <span>{formatPrice(addOnTotal, seller.currency || 'USD')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--nova-silver)', marginTop: '8px', paddingTop: '8px', fontWeight: '700' }}>
                      <span>Estimated total:</span>
                      <span style={{ color: 'var(--nova-blue)' }}>{formatPrice(estimatedTotal, seller.currency || 'USD')}</span>
                    </div>
                  </div>
                )}

                {settings.addOnOptions.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>Extras</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {settings.addOnOptions.map((addon) => (
                        <label
                          key={addon.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--nova-gray)', borderRadius: 'var(--nova-radius-sm)', cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAddOns.includes(addon.id)}
                            onChange={() => toggleAddOn(addon.id)}
                          />
                          <span><strong>{addon.name}</strong></span>
                          <span style={{ color: 'var(--nova-blue)' }}>+{formatPrice(addon.price, seller.currency || 'USD')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <label style={{ gridColumn: '1 / -1' }}>
                  Special instructions
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Any special requests, preferred vehicle color, or instructions for pick-up?"
                  />
                </label>
              </div>

              {error && <p className="nova-alert" role="alert" style={{ color: '#fca5a1' }}>{error}</p>}

              <button className="nova-btn nova-btn-primary" style={{ width: '100%', marginTop: '16px' }} type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Request booking'}
                {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
              </button>
              <p className="booking-fineprint">No payment now. Your reservation is confirmed once our team responds.</p>
            </form>
          )}
        </div>
      </section>

      <section className="nova-services" id="contact">
        <div className="section-header">
          <p className="nova-kicker">CONTACT</p>
          <h2>Get in touch with our fleet team.</h2>
        </div>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {seller.contactInfo?.email && (
              <a href={`mailto:${seller.contactInfo.email}?subject=${encodeURIComponent('Car rental inquiry')}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--nova-carbon)', textDecoration: 'none' }}>
                <Mail size={20} color="var(--nova-blue)" /> {seller.contactInfo.email}
              </a>
            )}
            {seller.contactInfo?.phone && (
              <a href={`tel:${seller.contactInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--nova-carbon)', textDecoration: 'none' }}>
                <Phone size={20} color="var(--nova-blue)" /> {seller.contactInfo.phone}
              </a>
            )}
            {seller.contactInfo?.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--nova-silver-dark)' }}>
                <MapPin size={20} color="var(--nova-blue)" /> {seller.contactInfo.address}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="nova-footer">
        <div className="footer-grid">
          <div>
            <a href="#top" className="nova-wordmark">
              <span className="wordmark-mark"><CalendarDays size={18} /></span>
              <span>Nova <em>Drive</em></span>
            </a>
            <p style={{ marginTop: '12px', opacity: '0.6' }}>Modern car rental, redefined.</p>
            <div className="social-links">
              {seller.socialLinks?.instagram && (
                <a href={seller.socialLinks.instagram} aria-label="Instagram"><CalendarDays size={16} /></a>
              )}
              {seller.socialLinks?.facebook && (
                <a href={seller.socialLinks.facebook} aria-label="Facebook"><CalendarDays size={16} /></a>
              )}
            </div>
          </div>
          <div>
            <h4>Quick links</h4>
            <div className="footer-links">
              <a href="#fleet">Fleet</a>
              <a href="#process">How it works</a>
              <a href="#booking">Book now</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
          <div>
            <h4>Legal</h4>
            <div className="footer-links">
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#insurance">Insurance</a>
            </div>
          </div>
        </div>
        <div className="copyright">
          <p>© {new Date().getFullYear()} {seller.storeName || 'Nova Drive'}
        </p>
        </div>
      </footer>
    </div>
  );
};

const today = new Date().toISOString().slice(0, 10);

export default NovaDriveSite;
