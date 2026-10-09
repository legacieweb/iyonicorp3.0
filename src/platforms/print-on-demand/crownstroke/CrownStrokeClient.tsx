import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Package, ShoppingCart, Calendar, ExternalLink, Download, Loader2, Palette, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  readCrownStrokeBooking,
} from './crownStrokeTypes';
import DesignCanvas from './DesignCanvas';
import type { DesignElement } from './crownStrokeTypes';
import './crown-stroke.css';

type ViewState = 'portal' | 'order';

const CrownStrokeClient: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<ViewState>('portal');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const myOrders = await ordersAPI.getMine();
        const csOrders = myOrders.filter((order) => readCrownStrokeBooking(order));
        setOrders(csOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch {
        setError('We could not load your orders.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, reloadKey]);

  if (loading) return <div className="cs-client"><div className="cs-client-loading"><Loader2 className="pulse-loading" /> Loading your CrownStroke portfolio…</div></div>;
  if (!user) return (
    <div className="cs-client">
      <div className="cs-client-empty">
        <Crown size={28} />
        <h2>Your print portfolio</h2>
        <p>Sign in to view order updates and the custom designs attached to your purchases.</p>
        <button className="cs-button" onClick={() => navigate('/login?redirect=%2Fpdp%2Fcrown-stroke%2Fclient')}>Sign in</button>
      </div>
    </div>
  );

  const completedOrders = orders.filter((order) => order.status === 'delivered');
  const activeOrders = orders.filter((order) => order.status !== 'delivered');

  return (
    <div className="cs-client">
      <header className="cs-client-header">
        <button className="cs-wordmark" onClick={() => navigate('/shop')} aria-label="CrownStroke home"><Crown size={18} className="crown-mark" />Crown<em>Stroke</em></button>
        <div className="cs-client-header-meta"><span className="cs-kicker">YOUR PRINT PORTFOLIO</span><span className="client-greeting">Hello, {user.name}</span></div>
      </header>

      <main className="cs-client-main">
        {error && <div className="cs-client-alert" role="alert"><span>{error}</span><button className="cs-text-button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1); }}><RotateCcw size={14} /> Try again</button></div>}

        {view === 'portal' && (
          <>
            {orders.length === 0 ? (
              <div className="cs-client-empty">
                {error ? <Package size={42} /> : <ShoppingCart size={48} />}
                <h2>{error ? 'Orders are unavailable.' : 'No orders yet.'}</h2>
                <p>{error ? 'Try loading your portfolio again using the button above.' : 'Once you place a custom print order, it will appear here with your saved design.'}</p>
                {!error && <button className="cs-button" onClick={() => navigate('/shop')}>Explore the collection</button>}
              </div>
            ) : (
              <div className="cs-client-content">
                <section className="cs-client-summary">
                  <h2>{completedOrders.length} Completed prints</h2>
                  <p>{activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''} in progress</p>
                </section>

                <div className="cs-client-order-list">
                  {orders.map((order) => {
                    const booking = readCrownStrokeBooking(order);
                    return (
                      <article key={order.id} className="cs-client-order-card" role="button" tabIndex={0} onClick={() => { setSelectedOrder(order); setView('order'); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedOrder(order); setView('order'); } }}>
                        <div className="order-thumb">{booking?.productName && <Package size={20} />}</div>
                        <div className="order-info">
                          <h3>{booking?.productName || 'Custom print'}</h3>
                          <p className="order-details">{booking?.productSize} · {booking?.productColor}</p>
                          <p className="order-date"><Calendar size={14} />{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div className="order-total">
                          <span className={`status-badge status-${order.status}`}>{order.status.replace('_', ' ')}</span>
                          <strong>{formatPrice(order.total, order.currency || 'USD')}</strong>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'order' && selectedOrder && (
          <div className="cs-client-order-view">
            <button className="cs-client-back" onClick={() => setView('portal')}><ExternalLink size={16} /> Back to portfolio</button>
            <OrderViewer order={selectedOrder} />
          </div>
        )}
      </main>
    </div>
  );
};

const OrderViewer: React.FC<{ order: Order }> = ({ order }) => {
  const booking = readCrownStrokeBooking(order);
  let designData: DesignElement[] = [];
  try {
    const parsed: unknown = booking?.designData ? JSON.parse(booking.designData) : [];
    if (Array.isArray(parsed)) designData = parsed as DesignElement[];
  } catch {
    designData = [];
  }
  const designSize = Math.max(600, ...designData.map((element) => Math.max(element.x * 2, element.y * 2)));

  return (
    <section className="cs-client-viewer">
      <div className="viewer-header">
        <h2>{booking?.productName || 'Custom Print Order'}</h2>
        <span className={`status-badge status-${order.status}`}>{order.status.replace('_', ' ')}</span>
      </div>

      <div className="viewer-grid">
        <div className="viewer-design">
          <p className="cs-kicker">YOUR DESIGN</p>
          {booking?.designPreview ? (
            <img src={booking.designPreview} alt="Your saved design" className="design-preview" />
          ) : designData.length ? (
            <div className="client-design-canvas">
              <DesignCanvas width={designSize} height={designSize} elements={designData} background="#fffefa" onChange={() => {}} onBackgroundChange={() => {}} onExport={() => {}} readOnly />
            </div>
          ) : (
            <div className="design-empty"><Palette size={32} /><span>No design data recorded.</span></div>
          )}
          <div className="design-meta">
            <p>{designData.length} element{designData.length !== 1 ? 's' : ''} in this design.</p>
            {booking?.designPreview ? <a className="cs-button cs-button-ghost" href={booking.designPreview} download={`crownstroke-order-${order.id}.png`}><Download size={14} /> Download design</a> : <button className="cs-button cs-button-ghost" disabled><Download size={14} /> Design preview unavailable</button>}
          </div>
        </div>

        <div className="viewer-details">
          <p className="cs-kicker">ORDER DETAILS</p>
          <dl>
            <div><dt>Customer</dt><dd>{order.customerName}</dd></div>
            <div><dt>Email</dt><dd>{order.customerEmail}</dd></div>
            <div><dt>Phone</dt><dd>{order.customerPhone || '—'}</dd></div>
            <div><dt>Product</dt><dd>{booking?.productName || order.items.map((item) => item.productName).join(', ')}</dd></div>
            <div><dt>Size</dt><dd>{booking?.productSize || '—'}</dd></div>
            <div><dt>Color</dt><dd><span style={{ color: booking?.productColor, fontWeight: 600 }}>{booking?.productColor || '—'}</span></dd></div>
            <div><dt>Quantity</dt><dd>{order.items[0]?.quantity || 1}</dd></div>
            <div><dt>Total</dt><dd>{formatPrice(order.total, order.currency || 'USD')}</dd></div>
            <div><dt>Ordered</dt><dd>{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
};

export default CrownStrokeClient;
