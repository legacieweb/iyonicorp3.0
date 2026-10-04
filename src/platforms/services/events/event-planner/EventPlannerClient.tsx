import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, LogOut, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { ordersAPI, Order, sellersAPI, Seller } from '../../../../services/api';
import { readEventBooking } from './eventPlannerTypes';
import './event-planner.css';

const EventPlannerClient: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      ordersAPI.getAll(),
      sellersAPI.getAll(),
    ])
      .then(([allOrders, allSellers]) => {
        if (!active) return;
        const eventOrders = allOrders.filter((order) => readEventBooking(order));
        const eventSeller = allSellers.find((item) =>
          eventOrders.some((order) => order.sellerId === item.id)
        );
        setOrders(
          eventOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
        setSeller(eventSeller || null);
      })
      .catch(() => {
        if (active) {
          setError('Your events could not be loaded. Please refresh and try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const upcoming = orders.filter((order) => {
    const booking = readEventBooking(order);
    return (
      booking &&
      booking.eventDate >= new Date().toISOString().slice(0, 10) &&
      !['cancelled', 'delivered'].includes(order.status)
    );
  });
  const history = orders.filter((order) => !upcoming.includes(order));

  const contactEmail = seller?.contactInfo?.email;
  const contactPhone = seller?.contactInfo?.phone;

  return (
    <main className="flow-portal">
      <header className="portal-header">
        <Link className="flow-wordmark" to={seller ? `/shop/${seller.subdomain}` : '/'}>
          <span className="wordmark-mark"><CalendarDays size={18} /></span>
          <span>Carnovga</span>
        </Link>
        <Link className="portal-back" to={seller ? `/shop/${seller.subdomain}` : '/'}>
          <ArrowLeft size={16} /> Back to the studio
        </Link>
        <button aria-label="Sign out" className="flow-button_outline" onClick={logout}>
          <LogOut size={16} />
        </button>
      </header>

      <section className="portal-welcome">
        <p className="flow-kicker">YOUR EVENT JOURNAL</p>
        <h1>
          Hello,<br />
          {user?.firstName || user?.name?.split(' ')[0] || 'friend'}.
        </h1>
        <p>Your events, all in one place. Making changes? Just send us a note.</p>
      </section>

      {loading ? (
        <div className="portal-state" role="status">
          <span className="button-spinner" /> Loading your events…
        </div>
      ) : error ? (
        <div className="portal-state portal-error" role="alert">
          {error}
        </div>
      ) : (
        <>
          <section className="portal-events">
            <div className="portal-section-title">
              <div>
                <p className="flow-kicker">UPCOMING</p>
                <h2>Your upcoming events</h2>
              </div>
              <span>{upcoming.length} upcoming</span>
            </div>

            {upcoming.length ? (
              upcoming.map((order) => {
                const booking = readEventBooking(order)!;
                return (
                  <article className="portal-event" key={order.id}>
                    <div className="portal-event-date">
                      <span>
                        {new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                        }).toUpperCase()}
                      </span>
                      <strong>{new Date(`${booking.eventDate}T12:00:00`).getDate()}</strong>
                      <span>
                        {new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString(undefined, {
                          weekday: 'short',
                        })}
                      </span>
                    </div>
                    <div className="portal-event-info">
                      <span className={`event-status status-${order.status}`}>
                        {order.status === 'pending' ? 'Being reviewed' : 'Confirmed'}
                      </span>
                      <h3>{order.items.map((item) => item.productName).join(', ')}</h3>
                      <p>
                        <Clock3 size={15} /> {booking.eventTime} · {booking.guestCount} guests
                        {booking.plannerName && ` · ${booking.plannerName}`}
                      </p>
                    </div>
                    <div className="portal-event-note">
                      <CalendarDays size={18} />
                      <span>
                        {order.status === 'pending'
                          ? 'Your request is being reviewed by our team.'
                          : 'We look forward to making your event memorable.'}
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="portal-empty">
                <CalendarDays size={48} style={{ color: 'var(--flow-gold)' }} />
                <h3>No upcoming events.</h3>
                <p>We'll save you a spot whenever you're ready.</p>
                <Link className="flow-button flow-button-gold" to={seller ? `/shop/${seller.subdomain}#booking` : '/'}>
                  Book an event
                </Link>
              </div>
            )}
          </section>

          <section className="portal-history">
            <div className="portal-section-title">
              <div>
                <p className="flow-kicker">PAST EVENTS</p>
                <h2>Event history</h2>
              </div>
            </div>
            {history.length ? (
              <div className="portal-history-list">
                {history.map((order) => {
                  const booking = readEventBooking(order)!;
                  return (
                    <article key={order.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--flow-gray)' }}>
                      <span>
                        {new Date(`${booking.eventDate}T12:00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <strong style={{ flex: 1 }}>{order.items.map((item) => item.productName).join(', ')}</strong>
                      <span className={`event-status status-${order.status}`}>
                        {order.status}
                      </span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="portal-history-empty">Your event history starts with your first booking.</p>
            )}
          </section>
        </>
      )}

      <aside className="portal-help">
        <MapPin size={18} />
        <span>Need to adjust dates or add details? We can help.</span>
        {contactEmail && (
          <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Event help${user?.name ? ` for ${user.name}` : ''}`)}`}>
            <Mail size={15} /> Contact the studio
          </a>
        )}
      </aside>
    </main>
  );
};

export default EventPlannerClient;
