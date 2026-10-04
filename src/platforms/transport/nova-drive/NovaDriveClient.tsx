import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, LogOut, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ordersAPI, Order, sellersAPI, Seller } from '../../../services/api';
import { readNovaBooking } from './novaDriveTypes';
import './nova-drive.css';

const NovaDriveClient: React.FC = () => {
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
        const rentalOrders = allOrders.filter((order) => readNovaBooking(order));
        const rentalSeller = allSellers.find((item) =>
          rentalOrders.some((order) => order.sellerId === item.id)
        );
        setOrders(
          rentalOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
        setSeller(rentalSeller || null);
      })
      .catch(() => {
        if (active) {
          setError('Your bookings could not be loaded. Please refresh and try again.');
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
    const booking = readNovaBooking(order);
    return (
      booking &&
      booking.pickupDate >= new Date().toISOString().slice(0, 10) &&
      !['cancelled', 'delivered'].includes(order.status)
    );
  });
  const history = orders.filter((order) => !upcoming.includes(order));

  const contactEmail = seller?.contactInfo?.email;
  const contactPhone = seller?.contactInfo?.phone;

  return (
    <main className="nova-portal">
      <header className="portal-header">
        <Link className="nova-wordmark" to={seller ? `/shop/${seller.subdomain}` : '/'}>
          <span className="wordmark-mark"><CalendarDays size={18} /></span>
          <span>Nova <em>Drive</em></span>
        </Link>
        <Link className="portal-back" to={seller ? `/shop/${seller.subdomain}` : '/'}>
          <ArrowLeft size={16} /> Back to the studio
        </Link>
        <button aria-label="Sign out" className="flow-button_outline" onClick={logout}>
          <LogOut size={16} />
        </button>
      </header>

      <section className="portal-welcome">
        <p className="nova-kicker">YOUR BOOKINGS</p>
        <h1>
          Hello,<br />
          {user?.firstName || user?.name?.split(' ')[0] || 'friend'}.
        </h1>
        <p>Your upcoming reservations, all in one place.</p>
      </section>

      {loading ? (
        <div className="portal-state" role="status">
          <span className="button-spinner" /> Loading your bookings…
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
                <p className="nova-kicker">UPCOMING</p>
                <h2>Your upcoming rentals</h2>
              </div>
              <span>{upcoming.length} upcoming</span>
            </div>

            {upcoming.length ? (
              upcoming.map((order) => {
                const booking = readNovaBooking(order)!;
                return (
                  <article className="portal-event" key={order.id}>
                    <div className="portal-event-date">
                      <span>
                        {new Date(`${booking.pickupDate}T12:00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                        }).toUpperCase()}
                      </span>
                      <strong>{new Date(`${booking.pickupDate}T12:00:00`).getDate()}</strong>
                      <span>
                        {new Date(`${booking.pickupDate}T12:00:00`).toLocaleDateString(undefined, {
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
                        <Clock size={15} /> {booking.pickupTime || '10:00 AM'} · {booking.totalDays} {booking.totalDays === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <div className="portal-event-note">
                      <CalendarDays size={18} />
                      <span>
                        {order.status === 'pending'
                          ? 'Your request is being reviewed. We will contact you within 24 hours.'
                          : 'Your reservation is confirmed. Pick up your keys at the terminal.'}
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="portal-empty">
                <CalendarDays size={48} style={{ color: 'var(--nova-blue)' }} />
                <h3>No upcoming rentals.</h3>
                <p>Reserve your next vehicle whenever you're ready.</p>
                <Link className="nova-btn nova-btn-primary" to={seller ? `/shop/${seller.subdomain}#booking` : '/'}>
                  Book a rental
                </Link>
              </div>
            )}
          </section>

          <section className="portal-history">
            <div className="portal-section-title">
              <div>
                <p className="nova-kicker">TRIP HISTORY</p>
                <h2>Past rentals</h2>
              </div>
            </div>
            {history.length ? (
              <div className="portal-history-list">
                {history.map((order) => {
                  const booking = readNovaBooking(order)!;
                  return (
                    <article
                      key={order.id}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid var(--nova-gray)',
                      }}
                    >
                      <span>
                        {new Date(`${booking.pickupDate}T12:00:00`).toLocaleDateString(undefined, {
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
              <p className="portal-history-empty">Your rental history starts with your first booking.</p>
            )}
          </section>
        </>
      )}

      <aside className="portal-help">
        <MapPin size={18} />
        <span>Need to adjust dates or request a different vehicle? We can help.</span>
        {contactEmail && (
          <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Rental help${user?.name ? ` for ${user.name}` : ''}`)}`}>
            <Mail size={15} /> Contact the fleet desk
          </a>
        )}
      </aside>
    </main>
  );
};

export default NovaDriveClient;
