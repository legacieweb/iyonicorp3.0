import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, Phone, Scissors, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, sellersAPI, productsAPI } from '../../../../../services/api';
import { formatPrice } from '../../../../../utils/currency';
import { getSalonSettings, defaultSalonSettings } from './salonTypes';
import './tamira-salon.css';

interface LocationState { service?: Product; seller?: Seller; from?: string }

const TamiraSalonServicePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const state = (location.state as LocationState) || {};
  const sellerId = searchParams.get('seller') || state?.seller?.id;

  const [service, setService] = useState<Product | null>(state?.service || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const [loading, setLoading] = useState(!service || !seller);
  const [error, setError] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [preferredStylist, setPreferredStylist] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    if (service && seller) {
      setLoading(false);
      return;
    }
    if (!serviceId || !sellerId) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      seller ? Promise.resolve(seller) : sellersAPI.getPublicById(sellerId),
      service ? Promise.resolve(service) : productsAPI.getBySellerId(sellerId),
    ]).then(([resolvedSeller, products]) => {
      if (!active) return;
      setSeller(resolvedSeller);
      if (!service) {
        const found = (products as Product[]).find((p) => p.id === serviceId && p.type === 'service');
        setService(found || null);
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('This service could not be found.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [serviceId, sellerId, service, seller, navigate]);

  const salon = seller ? getSalonSettings(seller) : defaultSalonSettings;
  const today = new Date().toISOString().slice(0, 10);

  const availableTimes = useMemo(() => {
    if (!date || salon.closedDays.includes(new Date(`${date}T12:00:00`).getDay())) return [];
    const [startHour, startMinute] = salon.openingTime.split(':').map(Number);
    const [endHour, endMinute] = salon.closingTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    const earliest = Date.now() + salon.leadTimeHours * 3600000;
    return Array.from({ length: Math.max(0, Math.ceil((end - start) / Math.max(15, salon.slotInterval))) }, (_, index) => {
      const value = start + index * Math.max(15, salon.slotInterval);
      const slotDate = new Date(`${date}T${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}:00`);
      return slotDate.getTime() >= earliest ? `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` : null;
    }).filter((value): value is string => !!value && value < salon.closingTime);
  }, [date, salon.closedDays, salon.closingTime, salon.leadTimeHours, salon.openingTime, salon.slotInterval]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!service || !seller || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a date and time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
       const booking = { platform: 'tamira-salon', appointmentDate: date, appointmentTime: time, staffName: preferredStylist, notes: notes.trim() };
      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: service.id, productName: service.name, quantity: 1, price: service.price }],
        total: service.price,
        subtotal: service.price,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not send your request just now. Please try again or call the salon.');
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (state?.from && state.from.startsWith('/')) {
      navigate(state.from, { replace: true });
    } else {
      window.location.href = `/shop/${seller?.subdomain || ''}`;
    }
  };

  if (loading) {
    return <div className="tamira-site"><div className="tamira-service-page-loading"><div className="loading-spinner" /><p>Loading the service details…</p></div></div>;
  }
  if (!service || !seller) {
    return <div className="tamira-site"><div className="tamira-service-page-loading" role="alert">{error || 'This service could not be found.'}</div></div>;
  }

  const description = (service.description || '').replace(/\n?Duration:\s*\d+\s*min/i, '').trim();
  const durationMatch = service.description?.match(/Duration:\s*(\d+)/i);
  const duration = durationMatch ? `${durationMatch[1]} min` : '';

  return (
    <div className="tamira-site">
      <header className="tamira-header">
        <button className="tamira-wordmark" onClick={handleBack} aria-label="Back to salon">
          <span className="wordmark-mark"><Scissors size={18} /></span>
          <span>Tamira <em>Salon</em></span>
        </button>
      </header>

      <main className="tamira-service-page">
        <div className="service-detail-layout">
          <div className="service-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} className="service-detail-image" />
            ) : (
              <div className="service-detail-placeholder">
                <Scissors size={48} />
              </div>
            )}
            {service.videos && service.videos.length > 0 && (
              <video src={service.videos[0]} controls className="service-detail-video" />
            )}
          </div>

          <div className="service-detail-content">
            <p className="tamira-kicker">{service.category || 'THE TAMIRA EDIT'}</p>
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">{description || 'A thoughtful service, crafted just for you.'}</p>
            {duration && <p className="service-detail-duration"><Clock3 size={15} /> {duration}</p>}
            <p className="service-detail-price">{formatPrice(service.price, seller.currency || 'USD')}</p>
          </div>
        </div>

        <div className="tamira-booking tamira-service-booking">
          <div className="booking-heading">
            <p className="tamira-kicker">BOOK YOUR VISIT</p>
            <h2>Let's find you<br /><i>a good hour.</i></h2>
            <p>Send a request and our team will confirm your visit shortly.</p>
            <div className="booking-details">
              <span><Clock3 size={16} /> {salon.openingTime}–{salon.closingTime}</span>
              <span><MapPin size={16} /> {salon.location || seller?.contactInfo?.address || 'Location details coming soon'}</span>
            </div>
          </div>
          <div className="booking-panel">
            {confirmation ? (
              <div className="booking-success" role="status">
                <span className="success-check"><Check size={20} /></span>
                <p className="tamira-kicker">REQUEST RECEIVED</p>
                <h3>We saved you<br /><i>a spot in mind.</i></h3>
                <p>Your request for {service.name} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {time} is pending confirmation. We'll be in touch soon.</p>
                <button className="tamira-button tamira-button-green" onClick={() => window.location.href = `/shop/${seller.subdomain}`}>
                  View your appointments <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <form className="tamira-booking-form" onSubmit={submitBooking}>
                <label>Date
                  <input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required />
                </label>
                <label>Time
                  <select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required>
                    <option value="">{!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>
                        {new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="booking-field-pair">
                  <label>Your name
                    <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                  </label>
                  <label>Email address
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                  </label>
                </div>
                 <label>Phone number
                   <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
                 </label>
                 {salon.staff.length > 0 && <label>Preferred stylist <span className="optional-label">OPTIONAL</span>
                   <select value={preferredStylist} onChange={(event) => setPreferredStylist(event.target.value)} aria-label="Preferred stylist">
                     <option value="">Any available stylist</option>
                     {salon.staff.map((person) => <option key={person.name} value={person.name}>{person.name} · {person.specialty || 'Stylist'}</option>)}
                   </select>
                 </label>}
                <label>A note for your stylist <span className="optional-label">OPTIONAL</span>
                  <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything you'd like us to know?" />
                </label>
                {error && <p className="tamira-form-error" role="alert">{error}</p>}
                <button className="tamira-button tamira-button-green booking-submit" type="submit" disabled={busy}>
                  {busy ? 'Sending request…' : 'Request this appointment'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
                </button>
                <p className="booking-fineprint">No payment now. Your appointment is confirmed once our team gets in touch.</p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TamiraSalonServicePage;
