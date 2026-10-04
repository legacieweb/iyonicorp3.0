import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, LogOut, Mail, MapPin, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { ordersAPI, Order, sellersAPI, Seller } from '../../../../../services/api';
import { readSalonBooking } from './salonTypes';
import './tamira-salon.css';

const TamiraSalonClient: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([ordersAPI.getAll(), sellersAPI.getAll()]).then(([allOrders, sellers]) => {
      if (!active) return;
      const salonOrders = allOrders.filter((order) => !!readSalonBooking(order));
      const salonSeller = sellers.find((item) => salonOrders.some((order) => order.sellerId === item.id));
      setOrders(salonOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setSeller(salonSeller || null);
    }).catch(() => { if (active) setError('Your appointments could not be loaded. Please refresh and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcoming = orders.filter((order) => {
    const booking = readSalonBooking(order);
    return booking && booking.appointmentDate >= new Date().toISOString().slice(0, 10) && !['cancelled', 'delivered'].includes(order.status);
  });
  const history = orders.filter((order) => !upcoming.includes(order));
  const contact = seller?.contactInfo?.email || seller?.contactInfo?.phone;

  return <main className="tamira-portal"><header className="portal-header"><Link className="tamira-wordmark" to={seller ? `/shop/${seller.subdomain}` : '/'}><span className="wordmark-mark"><Scissors size={18} /></span><span>Tamira <em>Salon</em></span></Link><Link className="portal-back" to={seller ? `/shop/${seller.subdomain}` : '/'}><ArrowLeft size={16} /> Back to the salon</Link><button aria-label="Sign out" className="tamira-logout-button" onClick={logout}><LogOut size={16} /> Sign out</button></header>
    <section className="portal-welcome"><p className="tamira-kicker">YOUR SALON JOURNAL</p><h1>Good to see you,<br /><i>{user?.firstName || user?.name?.split(' ')[0] || 'friend'}.</i></h1><p>Your visits, all in one place. Need to make a change? Just let us know.</p></section>
    {loading ? <div className="portal-state" role="status"><span className="button-spinner" /> Loading your appointments…</div> : error ? <div className="portal-state portal-error" role="alert">{error}</div> : <>
      <section className="portal-appointments"><div className="portal-section-title"><div><p className="tamira-kicker">NEXT UP</p><h2>Your next visit</h2></div><span>{upcoming.length} upcoming</span></div>
        {upcoming.length ? upcoming.map((order) => { const booking = readSalonBooking(order)!; return <article className="portal-appointment" key={order.id}><div className="portal-appointment-date"><span>{new Date(`${booking.appointmentDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${booking.appointmentDate}T12:00:00`).getDate()}</strong><span>{new Date(`${booking.appointmentDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span></div><div className="portal-appointment-info"><span className={`appointment-status status-${order.status}`}>{order.status.replace('_', ' ')}</span><h3>{order.items.map((item) => item.productName).join(', ')}</h3><p><Clock3 size={15} /> {booking.appointmentTime} {booking.staffName && `· ${booking.staffName}`}</p></div><div className="portal-appointment-note"><CalendarDays size={18} /><span>{order.status === 'pending' ? 'We’ll confirm your request soon.' : 'We look forward to seeing you.'}</span></div></article>; }) : <div className="portal-empty"><CalendarDays /><h3>No upcoming visits just yet.</h3><p>We’ll save you a spot whenever you’re ready.</p><Link className="tamira-button tamira-button-green" to={seller ? `/shop/${seller.subdomain}#booking` : '/'}>Book an appointment</Link></div>}
      </section>
      <section className="portal-history"><div className="portal-section-title"><div><p className="tamira-kicker">THE LOOKS, THE LAUGHS, THE LOT</p><h2>Past appointments</h2></div></div>{history.length ? <div className="portal-history-list">{history.map((order) => { const booking = readSalonBooking(order)!; return <article key={order.id}><span>{new Date(`${booking.appointmentDate}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><strong>{order.items.map((item) => item.productName).join(', ')}</strong><span className={`appointment-status status-${order.status}`}>{order.status.replace('_', ' ')}</span></article>; })}</div> : <p className="portal-history-empty">Your salon story starts with your first visit.</p>}</section>
    </>}
    <aside className="portal-help"><MapPin size={18} /><span>Need to reschedule or cancel? We can help.</span>{contact && <a href={seller?.contactInfo?.email ? `mailto:${seller.contactInfo.email}?subject=${encodeURIComponent(`Appointment help${user?.name ? ` for ${user.name}` : ''}`)}` : `tel:${seller?.contactInfo?.phone}`}><Mail size={15} /> Contact the salon</a>}</aside>
  </main>;
};

export default TamiraSalonClient;