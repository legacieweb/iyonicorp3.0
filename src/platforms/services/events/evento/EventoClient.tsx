import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, LogOut, MapPin, Ticket, TicketCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { ordersAPI, Order, sellersAPI, Seller } from '../../../../services/api';
import { getEventoSettings, readEventoBooking } from './eventoTypes';
import './evento.css';

const EventoClient: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([ordersAPI.getAll(), sellersAPI.getAll()]).then(([allOrders, sellers]) => {
      if (!active) return;
      const eventoOrders = allOrders.filter((order) => !!readEventoBooking(order));
      const owner = sellers.find((item) => eventoOrders.some((order) => order.sellerId === item.id));
      setOrders(eventoOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setSeller(owner || null);
    }).catch(() => {
      if (active) setError('Your tickets could not be loaded. Please refresh and try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const pending = orders.filter((order) => order.status === 'pending');
  const upcoming = orders.filter((order) => {
    const booking = readEventoBooking(order);
    return booking && booking.eventDate >= today && !['pending', 'cancelled', 'refunded'].includes(order.status);
  });
  const history = orders.filter((order) => !pending.includes(order) && !upcoming.includes(order));
  const settings = getEventoSettings(seller);
  const contact = seller?.contactInfo?.email || seller?.contactInfo?.phone;

  return <main className="ev-portal">
    <header className="ev-portal-header">
      <Link className="ev-wordmark" to={seller ? `/shop/${seller.subdomain}` : '/'} aria-label="Evento home">
        <span className="ev-emblem"><Ticket size={18} /></span><span>Evento <em>Live</em></span>
      </Link>
      <Link className="ev-text-btn" to={seller ? `/shop/${seller.subdomain}` : '/'} aria-label="Back to event site"><ArrowLeft size={16} /> Back to the event site</Link>
      <button aria-label="Sign out" className="ev-btn ev-btn-ghost ev-btn-pill" onClick={logout}><LogOut size={16} /> Sign out</button>
    </header>

    <section className="ev-welcome">
      <h1>Good to see you,<br /><em>{user?.firstName || user?.name?.split(' ')[0] || 'friend'}.</em></h1>
      <p>Your event tickets live here. Need to change something? Just drop us a line from your email.</p>
    </section>

    {loading ? <div className="ev-loading" role="status"><span className="ev-spinner" /> Loading your tickets…</div> : error ? <div className="ev-loading" role="alert">{error}</div> : <>
      <section className="ev-portal-section">
        <span className="ev-sub">AWAITING CONFIRMATION</span>
        <h2>Pending requests</h2>
        {pending.length ? pending.map((order) => {
          const booking = readEventoBooking(order)!;
          return <article className="ev-ticket" key={order.id}>
            <div className="ev-t-date"><span className="ev-day">{new Date(`${booking.eventDate}T12:00:00`).getDate()}</span><span className="ev-mo">{new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <div className="ev-t-body">
              <strong>{order.items.map((item) => item.productName).join(', ')}</strong>
              <div className="ev-t-sub"><Clock3 size={12} /> {booking.eventTime} · {booking.attendees} ticket{booking.attendees === 1 ? '' : 's'} · {booking.ticketType || 'Standard'}</div>
              {booking.cohostName && <span className="ev-t-sub">Preferred host: {booking.cohostName}</span>}
              {booking.notes && <span className="ev-t-sub">Note: {booking.notes}</span>}
              <span className="ev-t-sub">{settings.venue || settings.address || 'Venue details will be shared by the organizer.'}</span>
            </div>
            <span className={`ev-status status-${order.status}`}>Pending confirmation</span>
          </article>;
        }) : <p className="ev-mute">No ticket requests are waiting for confirmation.</p>}
      </section>

      <section className="ev-portal-section">
        <span className="ev-sub">UPCOMING EVENTS</span>
        <h2>Your next event</h2>
        {upcoming.length ? upcoming.map((order) => {
          const booking = readEventoBooking(order)!;
          return <article className="ev-ticket" key={order.id}>
            <div className="ev-t-date"><span className="ev-day">{new Date(`${booking.eventDate}T12:00:00`).getDate()}</span><span className="ev-mo">{new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <div className="ev-t-body">
              <strong>{order.items.map((item) => item.productName).join(', ')}</strong>
              <div className="ev-t-sub"><Clock3 size={12} /> {booking.eventTime} · {booking.attendees} ticket{booking.attendees === 1 ? '' : 's'} · {booking.ticketType || 'Standard'}</div>
              <span className="ev-t-sub">{settings.venue || settings.address || 'Venue details will be shared by the organizer.'}</span>
            </div>
            <span className={`ev-status status-${order.status}`}>{order.status === 'pending' ? 'Pending confirmation' : order.status}</span>
          </article>;
        }) : <div className="ev-empty-state"><CalendarDays /><p>No upcoming events on the horizon.</p><Link className="ev-btn ev-btn-ghost" to={seller ? `/shop/${seller.subdomain}` : '/'}>Browse events <TicketCheck size={14} /></Link></div>}
      </section>

      <section className="ev-portal-section">
        <span className="ev-sub">PAST EVENTS</span>
        <h2>Your history</h2>
        {history.length ? history.map((order) => {
          const booking = readEventoBooking(order)!;
          return <article className="ev-ticket" key={order.id}>
            <div className="ev-t-date"><span className="ev-day">{new Date(`${booking.eventDate}T12:00:00`).getDate()}</span><span className="ev-mo">{new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <div className="ev-t-body"><strong>{order.items.map((item) => item.productName).join(', ')}</strong><span className="ev-t-sub">{booking.attendees} ticket{booking.attendees === 1 ? '' : 's'}</span></div>
            <span className={`ev-status status-${order.status}`}>{order.status}</span>
          </article>;
        }) : <p className="ev-mute">Your first event starts with a single request.</p>}
      </section>

      {contact && <aside className="ev-loading" style={{ flexDirection: 'row', gap: '8px' }}><MapPin size={16} /><span>{seller?.contactInfo?.email ? `Email: ${seller.contactInfo.email}` : `Phone: ${seller.contactInfo?.phone}`}</span></aside>}
    </>}
  </main>;
};

export default EventoClient;
