import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, MapPin, Scissors, Send, Shield, Sparkles, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { CarRentalOrderData, getCarRentalSettings, getVehicleCategoryLabel, getDaysDifference, calculateTotal } from './carRentalTypes';
import { sellersAPI, productsAPI } from '../../../services/api';
import './carRental.css';

interface LocationState { vehicle?: Product; seller?: Seller; from?: string }

const CarRentalServicePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { vehicleId } = useParams<{ vehicleId?: string }>();
  const state = (location.state as LocationState) || {};
  const sellerId = searchParams.get('seller') || state?.seller?.id;

  const [vehicle, setVehicle] = useState<Product | null>(state?.vehicle || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const [loading, setLoading] = useState(!vehicle || !seller);
  const [error, setError] = useState('');

  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [driverAge, setDriverAge] = useState('25');
  const [insuranceLevel, setInsuranceLevel] = useState<'basic' | 'premium' | 'full'>('premium');
  const [instructions, setInstructions] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  const settings = seller ? getCarRentalSettings(seller) : getCarRentalSettings(null);

  useEffect(() => {
    let active = true;
    if (vehicle && seller) {
      setLoading(false);
      return;
    }
    if (!vehicleId || !sellerId) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      seller ? Promise.resolve(seller) : sellersAPI.getPublicById(sellerId),
      vehicle ? Promise.resolve(vehicle) : productsAPI.getBySellerId(sellerId),
    ]).then(([resolvedSeller, products]) => {
      if (!active) return;
      setSeller(resolvedSeller);
      if (!vehicle) {
        const found = (products as Product[]).find((p) => p.id === vehicleId && p.type === 'service');
        setVehicle(found || null);
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('This vehicle could not be found.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [vehicleId, sellerId, vehicle, seller, navigate]);

  useEffect(() => {
    if (settings.locations.length > 0) {
      setPickupLocation(settings.locations[0]);
    }
  }, [settings.locations]);

  const days = useMemo(() => getDaysDifference(pickupDate, returnDate), [pickupDate, returnDate]);
  const total = useMemo(() => vehicle ? calculateTotal(vehicle.price, days, { platform: 'car-rental', insuranceLevel, vehicleId: vehicle.id, pickupDate, returnDate, pickupLocation, returnLocation, driverAge: Number(driverAge) }) : 0, [vehicle, days, insuranceLevel]);
  const deposit = useMemo(() => Math.round(total * (settings.depositPercent / 100)), [total, settings.depositPercent]);
  const remaining = useMemo(() => total - deposit, [total, deposit]);
  const today = new Date().toISOString().slice(0, 10);

  const handleBack = () => {
    if (state?.from && state.from.startsWith('/')) {
      navigate(state.from, { replace: true });
    } else {
      window.location.href = `/shop/${seller?.subdomain || ''}`;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!vehicle || !seller || !pickupDate || !returnDate) {
      setError('Choose dates and a location.');
      return;
    }
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Please fill in your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
      const booking: CarRentalOrderData = {
        platform: 'car-rental',
        vehicleId: vehicle.id,
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
        items: [{ productId: vehicle.id, productName: vehicle.name, quantity: 1, price: total }],
        total,
        subtotal: total,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'deposit',
        amountPaid: deposit,
        remainingBalance: remaining,
      });
      setConfirmation(order);
    } catch {
      setError('We could not process your reservation. Please try again or call us.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="car-rental-site"><div className="cr-service-page-loading"><div className="loading-spinner" /><p>Finding your vehicle…</p></div></div>;
  }
  if (!vehicle || !seller) {
    return <div className="car-rental-site"><div className="cr-service-page-loading" role="alert">{error || 'This vehicle could not be found.'}</div></div>;
  }

  return (
    <div className="car-rental-site cr-font-sans">
      <header className="cr-header">
        <button className="cr-logo" onClick={handleBack} aria-label="Back to Apex Drive">
          <span className="cr-logo-icon"><Scissors size={20} /></span>
          <strong>Apex <em>Drive</em></strong>
        </button>
      </header>

      <main className="cr-service-page">
        <div className="cr-service-layout">
          <div className="cr-service-media">
            {vehicle.images?.[0] ? (
              <img src={vehicle.images[0]} alt={vehicle.name} className="cr-service-image" />
            ) : (
              <div className="cr-service-placeholder">🚗</div>
            )}
          </div>
          <div className="cr-service-content">
            <p className="cr-kicker">{vehicle.category || 'PREMIUM FLEET'}</p>
            <h1 className="cr-service-title">{vehicle.name}</h1>
            <span className="cr-service-category">{getVehicleCategoryLabel(vehicle.category)}</span>
            <p className="cr-service-description">{vehicle.description || 'A premium vehicle, ready for your journey.'}</p>
            <p className="cr-service-price">
              {formatPrice(vehicle.price, seller.currency || 'USD')}<small>/ day</small>
            </p>

            <div className="cr-service-specs">
              {vehicle.videos && vehicle.videos.length > 0 && (
                <div className="cr-spec-item">
                  <span className="cr-spec-label">360° view</span>
                  <span className="cr-spec-value">Available</span>
                </div>
              )}
              <div className="cr-spec-item">
                <span className="cr-spec-label">Category</span>
                <span className="cr-spec-value">{getVehicleCategoryLabel(vehicle.category)}</span>
              </div>
              <div className="cr-spec-item">
                <span className="cr-spec-label">Transmission</span>
                <span className="cr-spec-value">Automatic</span>
              </div>
              <div className="cr-spec-item">
                <span className="cr-spec-label">Fuel</span>
                <span className="cr-spec-value">Gasoline</span>
              </div>
              <div className="cr-spec-item">
                <span className="cr-spec-label">Seating</span>
                <span className="cr-spec-value">5 passengers</span>
              </div>
              <div className="cr-spec-item">
                <span className="cr-spec-label">Insurance included</span>
                <span className="cr-spec-value">{insuranceLevel === 'full' ? 'Full coverage' : insuranceLevel === 'premium' ? 'Premium' : 'Basic'}</span>
              </div>
            </div>

            {error && <div className="cr-form-error" role="alert">{error}</div>}

            <form className="cr-booking-form" onSubmit={handleSubmit}>
              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label">Pickup date</label>
                  <input type="date" min={today} value={pickupDate} onChange={(e) => { setPickupDate(e.target.value); setReturnDate(''); }} className="cr-input" required />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label">Return date</label>
                  <input type="date" min={pickupDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="cr-input" required />
                </div>
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label">Pickup location</label>
                  <select value={pickupLocation} onChange={(e) => { setPickupLocation(e.target.value); setReturnLocation(''); }} className="cr-select" required>
                    {settings.locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label">Return location</label>
                  <select value={returnLocation} onChange={(e) => setReturnLocation(e.target.value)} className="cr-select">
                    <option value="">Same as pickup</option>
                    {settings.locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label">Driver age</label>
                  <input type="number" min={21} max={80} value={driverAge} onChange={(e) => setDriverAge(e.target.value)} className="cr-input" required />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label">Insurance level</label>
                  <select value={insuranceLevel} onChange={(e) => setInsuranceLevel(e.target.value as 'basic' | 'premium' | 'full')} className="cr-select" required>
                    <option value="basic">Basic liability</option>
                    <option value="premium">Premium protection</option>
                    <option value="full">Full coverage</option>
                  </select>
                </div>
              </div>

              <div className="cr-form-field">
                <label className="cr-form-label">Special instructions</label>
                <input type="text" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="cr-input" placeholder="Child seat, GPS, additional driver…" />
              </div>

              <div className="cr-form-row">
                <div className="cr-form-field">
                  <label className="cr-form-label">Your name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="cr-input" autoComplete="name" required />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="cr-input" autoComplete="email" required />
                </div>
              </div>

              <div className="cr-form-field">
                <label className="cr-form-label">Phone number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="cr-input" autoComplete="tel" required />
              </div>

              <div className="cr-price-summary">
                <div><span>Rental period</span><strong>{days || 0} day{days !== 1 ? 's' : ''}</strong></div>
                <div><span>Daily rate</span><strong>{formatPrice(vehicle.price, seller.currency || 'USD')}</strong></div>
                <div><span>Insurance ({insuranceLevel})</span><strong>{insuranceLevel === 'premium' ? '+15%' : insuranceLevel === 'full' ? '+30%' : 'included'}</strong></div>
                <div><span>Subtotal</span><strong>{formatPrice(total, seller.currency || 'USD')}</strong></div>
                <div><span>Deposit ({settings.depositPercent}%)</span><strong>{formatPrice(deposit, seller.currency || 'USD')}</strong></div>
                <div><span>Balance on pickup</span><strong>{formatPrice(remaining, seller.currency || 'USD')}</strong></div>
              </div>

              <button className="cr-btn cr-btn-primary" type="submit" disabled={busy}>
                {busy ? 'Processing…' : 'Confirm reservation'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
              </button>
              <p className="cr-fineprint">You'll pay the remaining balance at pickup. Cancellation is free up to 24 hours before your reservation.</p>
            </form>

            {confirmation && (
              <div className="cr-form-notice" role="status">
                Reservation confirmed! A confirmation has been sent to {email}.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CarRentalServicePage;
