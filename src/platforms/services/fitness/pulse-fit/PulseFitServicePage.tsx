import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Dumbbell, MapPin } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, productsAPI, sellersAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { classDuration, defaultPulseFitSettings, getPulseFitSettings, WEEKDAYS } from './pulseFitTypes';
import './pulse-fit.css';

interface LocationState { service?: Product; seller?: Seller; from?: string }

const PulseFitServicePage: React.FC = () => {
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
  const [preferredTrainer, setPreferredTrainer] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
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
    ])
      .then(([resolvedSeller, products]) => {
        if (!active) return;
        setSeller(resolvedSeller);
        if (!service) {
          const found = (products as Product[]).find((p) => p.id === serviceId && p.type === 'service');
          setService(found || null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('This class could not be found.');
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [serviceId, sellerId, service, seller, navigate]);

  const fit = seller ? getPulseFitSettings(seller) : defaultPulseFitSettings;
  const today = new Date().toISOString().slice(0, 10);

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

  const schedule = service ? fit.classSchedules[service.id] : undefined;
  const upcomingSlots = useMemo(() => {
    if (!schedule?.recurring?.length) return [];
    const now = Date.now();
    return schedule.recurring
      .map((slot) => {
        const date = new Date();
        const diff = (slot.day + 7 - date.getDay()) % 7;
        date.setDate(date.getDate() + (diff === 0 ? 7 : diff));
        const [hour, minute] = slot.time.split(':').map(Number);
        date.setHours(hour, minute, 0, 0);
        return { ...slot, next: date.toISOString() };
      })
      .filter((slot) => new Date(slot.next).getTime() >= now)
      .sort((a, b) => new Date(a.next).getTime() - new Date(b.next).getTime());
  }, [schedule]);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!service || !seller || !date || !time || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Choose a date and time, then add your name, a valid email, and phone number.');
      return;
    }
    setBusy(true);
    try {
      const booking = {
        platform: 'pulse-fit',
        sessionDate: date,
        sessionTime: time,
        duration: classDuration(service),
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
      setError('We could not send your request just now. Please try again or call the studio.');
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

  const openPortal = () => navigate(user
    ? '/fit/pulse-fit/client'
    : `/login?shop=${encodeURIComponent(seller?.id || '')}&subdomain=${encodeURIComponent(seller?.subdomain || '')}&redirect=${encodeURIComponent('/fit/pulse-fit/client')}`);

  if (loading) {
    return <div className="pulse-site"><div className="pulse-service-page-loading"><span className="admin-loading-spinner" /><p>Loading the class details…</p></div></div>;
  }
  if (!service || !seller) {
    return <div className="pulse-site"><div className="pulse-service-page-loading" role="alert">{error || 'This class could not be found.'}</div></div>;
  }

  const description = (service.description || '').replace(/\n?Duration:\s*\d+\s*min/i, '').trim() || 'A focused class built for your best work.';
  const duration = classDuration(service);

  return (
    <div className="pulse-site">
      <header className="pulse-header">
        <button className="pulse-wordmark" onClick={handleBack} aria-label="Back to studio">
          <span className="wordmark-mark"><Dumbbell size={18} /></span>
          <span>Pulse <em>Fit</em></span>
        </button>
      </header>

      <main className="pulse-service-page">
        <div className="service-detail-layout">
          <div className="service-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} className="service-detail-image" />
            ) : (
              <div className="service-detail-placeholder"><Dumbbell size={48} /></div>
            )}
            {service.videos && service.videos.length > 0 && <video src={service.videos[0]} controls className="service-detail-video" />}
          </div>

          <div className="service-detail-content">
            <p className="service-coordinate"><span /> SESSION FILE / {service.category || 'STUDIO'}</p>
            <p className="pulse-kicker">{service.category || 'PULSE PRIME'}</p>
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">{description}</p>
            {duration && <p className="service-detail-duration"><Clock3 size={15} /> {duration} min</p>}
            <p className="service-detail-price">{formatPrice(service.price, seller.currency || 'USD')}</p>

            {schedule?.capacity ? <p className="service-detail-meta"><Clock3 size={15} /> Capacity: {schedule.capacity}</p> : null}

            {upcomingSlots.length > 0 && (
              <div className="service-schedule">
                <div className="schedule-head">
                  <span className="schedule-chip">This week</span>
                  <span className="service-schedule-count">{upcomingSlots.length} slot{upcomingSlots.length > 1 ? 's' : ''} available</span>
                </div>
                <ul className="schedule-slot-list">
                  {upcomingSlots.map((slot) => {
                    const next = new Date(slot.next);
                    return (
                      <li key={`${slot.day}-${slot.time}`}>
                        <span>{WEEKDAYS[slot.day].full}, {next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span>{slot.time.replace(/^0/, '')} · {next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="pulse-booking pulse-service-booking">
          <div className="booking-heading">
            <p className="pulse-kicker">BOOK YOUR SESSION</p>
            <h2>Let us save you<br /><i>a spot.</i></h2>
            <p>Send a request and our team will confirm your session shortly.</p>
            <div className="booking-details">
              <span className="booking-detail"><Clock3 size={16} /> {fit.openingTime}–{fit.closingTime}</span>
              <span className="booking-detail"><MapPin size={16} /> {fit.location || seller?.contactInfo?.address || 'Location details coming soon'}</span>
            </div>
          </div>
          <div className="booking-panel">
            {confirmation ? (
              <div className="booking-success" role="status">
                <span className="success-check"><Check size={20} /></span>
                <p className="pulse-kicker">REQUEST RECEIVED</p>
                <h3>You earned a spot<br /><i>in mind.</i></h3>
                <p>Your request for {service.name} on {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {time} is pending confirmation. We will be in touch soon.</p>
                <button className="pulse-button pulse-button-cyan" onClick={openPortal}>
                  My sessions <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <form className="pulse-booking-form" onSubmit={submitBooking}>
                <label>Date
                  <input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} required />
                </label>
                <label>Time
                  <select value={time} onChange={(event) => setTime(event.target.value)} disabled={!date || availableTimes.length === 0} required>
                    <option value="">{!date ? 'Choose date first' : availableTimes.length ? 'Select time' : 'No times available'}</option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>{new Date(`2000-01-01T${slot}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>
                    ))}
                  </select>
                </label>
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
                    {busy ? 'Sending request…' : 'Request this session'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
                  </button>
                </div>
                <p className="booking-fineprint">No payment now. Your session is confirmed once our team gets in touch.</p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PulseFitServicePage;
