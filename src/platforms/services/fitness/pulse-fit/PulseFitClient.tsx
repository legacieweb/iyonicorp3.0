import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Dumbbell, LogOut, MapPin, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { ordersAPI, Order, sellersAPI, Seller } from '../../../../services/api';
import { readPulseFitBooking } from './pulseFitTypes';
import './pulse-fit.css';

const PulseFitClient: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([ordersAPI.getAll(), sellersAPI.getAll()]).then(([allOrders, sellers]) => {
      if (!active) return;
      const fitOrders = allOrders.filter((order) => !!readPulseFitBooking(order));
      const fitSeller = sellers.find((item) => fitOrders.some((order) => order.sellerId === item.id));
      setOrders(fitOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setSeller(fitSeller || null);
    }).catch(() => { if (active) setError('Your sessions could not be loaded. Please refresh and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcoming = orders.filter((order) => {
    const booking = readPulseFitBooking(order);
    return booking && booking.sessionDate >= new Date().toISOString().slice(0, 10) && !['cancelled', 'delivered'].includes(order.status);
  });
  const history = orders.filter((order) => !upcoming.includes(order));
  const contact = seller?.contactInfo?.email || seller?.contactInfo?.phone;

  return <main className="pulse-portal"><header className="portal-header"><Link className="pulse-wordmark" to={seller ? `/shop/${seller.subdomain}` : '/'}><span className="wordmark-mark"><Dumbbell size={18} /></span><span>Pulse <em>Fit</em></span></Link><Link className="portal-back" to={seller ? `/shop/${seller.subdomain}` : '/'}><ArrowLeft size={16} /> Back to the studio</Link><button aria-label="Sign out" className="pulse-logout-button" onClick={logout}><LogOut size={16} /> Sign out</button></header>
    <section className="portal-welcome"><div><p className="pulse-kicker">YOUR PULSE JOURNAL</p><h1>Good to see you,<br /><i>{user?.firstName || user?.name?.split(' ')[0] || 'champ'}.</i></h1><p>Your sessions, all in one place. Need to make a change? Just let us know.</p></div><div className="portal-orbit-readout" aria-hidden="true"><span>TRAINING LOG / ACTIVE</span><strong>SHOW UP.<br />SHAPE WHAT'S NEXT.</strong><span>MEMBER FREQUENCY · 01</span></div></section>
    {loading ? <div className="portal-state" role="status"><span className="button-spinner" /> Loading your sessions…</div> : error ? <div className="portal-state portal-error" role="alert">{error}</div> : <>
      <section className="portal-appointments"><div className="portal-section-title"><div><p className="pulse-kicker">NEXT UP</p><h2>Your next session</h2></div><span>{upcoming.length} upcoming</span></div>
        {upcoming.length ? upcoming.map((order) => { const booking = readPulseFitBooking(order)!; return <article className="portal-appointment" key={order.id}><div className="portal-appointment-date"><span>{new Date(`${booking.sessionDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${booking.sessionDate}T12:00:00`).getDate()}</strong><span>{new Date(`${booking.sessionDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span></div><div className="portal-appointment-info"><span className={`appointment-status status-${order.status}`}>{order.status.replace('_', ' ')}</span><h3>{order.items.map((item) => item.productName).join(', ')}</h3><p><Clock3 size={15} /> {booking.sessionTime} {booking.trainerName && `· ${booking.trainerName}`}</p></div><div className="portal-appointment-note"><User size={18} /><span>{order.status === 'pending' ? 'We will confirm your session soon.' : 'We look forward to seeing you on the floor.'}</span></div></article>; }) : <div className="portal-empty"><CalendarDays /><h3>No upcoming sessions just yet.</h3><p>We will save you a spot whenever you are ready.</p><Link className="pulse-button pulse-button-pine" to={seller ? `/shop/${seller.subdomain}#book` : '/'}>Book a class</Link></div>}
      </section>
      <section className="portal-history"><div className="portal-section-title"><div><p className="pulse-kicker">PAST SESSIONS</p><h2>Your history</h2></div></div>{history.length ? <div className="portal-history-list">{history.map((order) => { const booking = readPulseFitBooking(order)!; return <article key={order.id}><span>{new Date(`${booking.sessionDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><strong>{order.items.map((item) => item.productName).join(', ')}</strong><span className={`appointment-status status-${order.status}`}>{order.status.replace('_', ' ')}</span></article>; })}</div> : <p className="portal-history-empty">Your first session starts with a single click.</p>}</section>
    </>}
    <aside className="portal-help"><MapPin size={18} /><span>Need to reschedule or cancel? We can help.</span>{contact && <a href={seller?.contactInfo?.email ? `mailto:${seller.contactInfo.email}?subject=${encodeURIComponent(`Session help${user?.name ? ` for ${user.name}` : ''}`)}` : `tel:${seller?.contactInfo?.phone}`}><User size={15} /> Contact the studio</a>}</aside>
  </main>;
};

export default PulseFitClient;
