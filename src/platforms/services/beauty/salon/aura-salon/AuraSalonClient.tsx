import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, LogOut, Mail, MapPin, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { ordersAPI, Order, sellersAPI, Seller } from '../../../../../services/api';
import { getLocalDateString, getSalonSettings, readSalonBooking } from './salonTypes';
import './aura-salon.css';

const statusLabel = (status: Order['status']) => ({
  pending: 'Pending review',
  processing: 'Confirmed',
  shipped: 'Confirmed',
  delivered: 'Completed',
  cancelled: 'Cancelled',
  refund_requested: 'Refund requested',
  refunded: 'Refunded',
}[status] || status.replace('_', ' '));

const AuraSalonClient: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    ordersAPI.getMine().then(async (allOrders) => {
      if (!active) return;
      const salonOrders = allOrders.filter((order) => !!readSalonBooking(order))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setOrders(salonOrders);

      const sellerIds = Array.from(new Set(salonOrders.map((order) => order.sellerId).filter(Boolean)));
      const sellerResults = await Promise.allSettled(sellerIds.map((id) => sellersAPI.getPublicById(id)));
      if (!active) return;
      const sellerMap: Record<string, Seller> = {};
      sellerResults.forEach((result, index) => {
        if (result.status === 'fulfilled') sellerMap[sellerIds[index]] = result.value;
      });
      setSellers(sellerMap);
    }).catch(() => {
      if (active) setError('Your appointments could not be loaded. Please refresh and try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const upcoming = useMemo(() => orders.filter((order) => {
    const booking = readSalonBooking(order);
    return booking && booking.appointmentDate >= getLocalDateString() &&
      !['cancelled', 'delivered', 'refunded'].includes(order.status);
  }), [orders]);
  const history = useMemo(() => orders.filter((order) => !upcoming.includes(order)), [orders, upcoming]);
  const primaryOrder = upcoming[0] || orders[0];
  const primarySeller = primaryOrder ? sellers[primaryOrder.sellerId] : null;
  const returnPath = primarySeller?.subdomain ? `/shop/${primarySeller.subdomain}` : '/';
  const salonContacts = Array.from(new Set(orders.map((order) => order.sellerId))).map((id) => {
    const seller = sellers[id];
    const contact = seller ? getSalonSettings(seller) : null;
    return {
      id,
      name: seller?.storeName || orders.find((order) => order.sellerId === id)?.sellerStoreName || 'Salon',
      email: contact?.email || seller?.contactInfo?.email,
      phone: contact?.phone || seller?.contactInfo?.phone,
      subdomain: seller?.subdomain,
    };
  }).filter((salon) => salon.email || salon.phone);

  const appointmentDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return <main className="aurelia-portal">
    <header className="portal-header">
      <Link className="aurelia-wordmark" to={returnPath}>
        {primarySeller?.logo ? <img className="salon-logo" src={primarySeller.logo} alt="" /> : <span className="wordmark-mark"><Scissors size={18} /></span>}
        <span>{primarySeller?.storeName || 'Aura Salon'}</span>
      </Link>
      <Link className="portal-back" to={returnPath}><ArrowLeft size={16} /> Back to the salon</Link>
      <button aria-label="Sign out" className="aurelia-logout-button" onClick={logout}><LogOut size={16} /> Sign out</button>
    </header>
    <section className="portal-welcome">
      <p className="aurelia-kicker">YOUR SALON JOURNAL</p>
      <h1>Hello,<br />{user?.firstName || user?.name?.split(' ')[0] || 'there'}.</h1>
      <p>Your salon appointment requests and visits, all in one place.</p>
    </section>
    {loading ? <div className="portal-state" role="status"><span className="button-spinner" /> Loading your appointments…</div> : error ? <div className="portal-state portal-error" role="alert">{error}</div> : (
      <>
        <section className="portal-appointments">
          <div className="portal-section-title">
            <div><p className="aurelia-kicker">NEXT UP</p><h2>Upcoming appointments</h2></div>
            <span>{upcoming.length} upcoming</span>
          </div>
          {upcoming.length ? upcoming.map((order) => {
            const booking = readSalonBooking(order)!;
            const date = new Date(`${booking.appointmentDate}T12:00:00`);
            return <article className="portal-appointment" key={order.id}>
              <div className="portal-appointment-date">
                <span>{date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                <strong>{date.getDate()}</strong>
                <span>{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              </div>
              <div className="portal-appointment-info">
                <span className={`appointment-status status-${order.status}`}>{statusLabel(order.status)}</span>
                <p className="portal-salon-name">{order.sellerStoreName || sellers[order.sellerId]?.storeName || 'Aura Salon'}</p>
                <h3>{order.items.map((item) => item.productName).join(', ')}</h3>
                <p><Clock3 size={15} /> {booking.appointmentTime}{booking.staffName && ` · ${booking.staffName}`}</p>
              </div>
              <div className="portal-appointment-note"><CalendarDays size={18} /><span>{order.status === 'pending' ? 'Your request is waiting for salon approval. This time is not reserved.' : 'Your appointment is confirmed.'}</span></div>
            </article>;
          }) : <div className="portal-empty"><CalendarDays /><h3>No upcoming visits just yet.</h3><p>{primarySeller ? 'Choose a service and send a new appointment request whenever you are ready.' : 'Your salon visits will appear here after you send an appointment request.'}</p>{primarySeller?.subdomain && <Link className="aurelia-button aurelia-button-brass" to={`${returnPath}#booking`}>Request an appointment</Link>}</div>}
        </section>
        <section className="portal-history">
          <div className="portal-section-title">
            <div><p className="aurelia-kicker">YOUR VISITS</p><h2>Past requests</h2></div>
          </div>
          {history.length ? <div className="portal-history-list">{history.map((order) => {
            const booking = readSalonBooking(order)!;
            return <article key={order.id}>
              <span>{appointmentDate(booking.appointmentDate)}</span>
              <strong>{order.sellerStoreName || sellers[order.sellerId]?.storeName || 'Aura Salon'} · {order.items.map((item) => item.productName).join(', ')}</strong>
              <span className={`appointment-status status-${order.status}`}>{statusLabel(order.status)}</span>
            </article>;
          })}</div> : <p className="portal-history-empty">Your salon story starts with your first visit.</p>}
        </section>
      </>
    )}
    {salonContacts.length > 0 && <aside className="portal-help"><MapPin size={18} /><span>Questions about a request? Contact the salon directly.</span><div className="portal-contact-list">{salonContacts.map((salon) => <span key={salon.id}>{salon.name}{salon.email && <a href={`mailto:${salon.email}?subject=${encodeURIComponent('Appointment request')}`}><Mail size={15} /> Email</a>}{salon.phone && <a href={`tel:${salon.phone}`}>{salon.phone}</a>}</span>)}</div></aside>}
  </main>;
};

export default AuraSalonClient;
