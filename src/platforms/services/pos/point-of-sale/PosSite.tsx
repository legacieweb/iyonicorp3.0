import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Search, List, Plus, Minus, Trash2, Table, Receipt, Send } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI } from '../../../../services/api';
import {
  calculateTax,
  calculateTotalWithTax,
  createDemoPosMenu,
  createDemoPosSeller,
  formatCurrency,
  getCategoryName,
  getPosSettings,
  isPointOfSale,
  PosOrderData,
  PosSettings,
} from './posTypes';
import './pos.css';

type PosVariant = 'pos' | 'kds' | 'customer';

interface CartItem extends Product {
  quantity: number;
  notes?: string;
}

interface PosSiteProps {
  seller?: Seller;
  products?: Product[];
}

const PosSite: React.FC<PosSiteProps> = ({ seller: sellerProp, products: productsProp }) => {
  const { user } = useAuth();
  const [activeSeller, setActiveSeller] = useState<Seller | null>(sellerProp || null);
  const [settings, setSettings] = useState<PosSettings>(getPosSettings(sellerProp));
  const [menuItems, setMenuItems] = useState<Product[]>(
    productsProp?.length
      ? productsProp
      : sellerProp
        ? createDemoPosMenu(sellerProp.id || 'demo')
        : []
  );
  const [contextLoading, setContextLoading] = useState(!sellerProp);
  const [contextError, setContextError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [variant, setVariant] = useState<PosVariant>('pos');
  const [tableNumber, setTableNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<Order | null>(null);

  useEffect(() => {
    let current = true;

    if (sellerProp) {
      setActiveSeller(sellerProp);
      setSettings(getPosSettings(sellerProp));
      setMenuItems(
        productsProp?.length
          ? productsProp
          : createDemoPosMenu(sellerProp.id || 'demo')
      );
      setContextError('');
      setContextLoading(false);
      return () => {
        current = false;
      };
    }

    if (!user?.sellerId) {
      setActiveSeller(null);
      setContextLoading(false);
      return () => {
        current = false;
      };
    }

    setContextLoading(true);
    setContextError('');
    void Promise.all([
      sellersAPI.getMe(),
      productsAPI.getBySellerId(user.sellerId),
    ])
      .then(([owner, products]) => {
        if (!current) return;
        if (owner.id !== user.sellerId || !isPointOfSale(owner)) {
          setActiveSeller(null);
          setContextError('This account is not connected to a point-of-sale store.');
          return;
        }
        setActiveSeller(owner);
        setSettings(getPosSettings(owner));
        setMenuItems(products.length ? products : createDemoPosMenu(owner.id));
      })
      .catch(() => {
        if (current) {
          setActiveSeller(null);
          setContextError('The POS terminal could not load. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (current) setContextLoading(false);
      });

    return () => {
      current = false;
    };
  }, [productsProp, sellerProp, user?.sellerId]);

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((item) => item.category));
    return ['all', ...Array.from(cats)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (activeCategory === 'all') return true;
      return item.category === activeCategory;
    });
  }, [menuItems, activeCategory]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = calculateTax(subtotal, settings.taxRate);
  const serviceFee = settings.serviceCharge > 0 ? subtotal * (settings.serviceCharge / 100) : 0;
  const total = calculateTotalWithTax(subtotal, settings.taxRate, settings.serviceCharge, settings.rounding);

  const addToCart = (item: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (item: CartItem) => {
    setCart((prev) => prev.filter((i) => i.id !== item.id));
  };

  const updateQuantity = (item: CartItem, delta: number) => {
    if (delta < 0 && item.quantity === 1) {
      removeFromCart(item);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + delta } : i))
    );
  };

  const clearCart = () => setCart([]);

  const placeOrder = async () => {
    if (!user?.sellerId || cart.length === 0) return;
    setOrderSubmitting(true);
    const orderData: PosOrderData = {
      platform: 'point-of-sale',
      terminalId: user.sellerId,
      tableNumber: tableNumber || undefined,
      notes: customerInfo.name ? `Table: ${tableNumber || 'N/A'}, Customer: ${customerInfo.name}` : undefined,
    };
    try {
      const newOrder = await ordersAPI.create({
        sellerId: user.sellerId,
        customerId: user.id,
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: total,
        customerName: customerInfo.name || '',
        customerEmail: customerInfo.email || '',
        customerPhone: customerInfo.phone || '',
        status: 'pending',
        shippingAddress: {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: '',
        },
        deliveryLocation: JSON.stringify(orderData),
        currency: settings.currency,
      });
      setOrderPlaced(newOrder);
      setTimeout(() => setOrderPlaced(null), 3000);
      setCart([]);
      setTableNumber('');
      setCustomerInfo({ name: '', phone: '', email: '' });
    } catch {
      // error
    } finally {
      setOrderSubmitting(false);
    }
  };

  const resetDemo = () => {
    const demoSeller = createDemoPosSeller();
    window.location.href = `/shop/${demoSeller.subdomain}?theme=point-of-sale`;
  };

  if (contextLoading) {
    return (
      <div className="pos-terminal pos-terminal--message" role="status">
        <div className="pos-terminal__message-card">
          <span className="pos-terminal__message-mark"><ShoppingCart size={21} /></span>
          <p className="pos-eyebrow">Point of sale</p>
          <h1>Preparing your terminal</h1>
          <p>Connecting to your store and loading the menu.</p>
          <div className="pos-loading-bar" />
        </div>
      </div>
    );
  }

  const seller = activeSeller;
  if (!seller) {
    return (
      <div className="pos-terminal pos-terminal--message">
        <div className="pos-terminal__message-card" role="alert">
          <span className="pos-terminal__message-mark"><ShoppingCart size={21} /></span>
          <p className="pos-eyebrow">Point of sale</p>
          <h1>Terminal unavailable</h1>
          <p>{contextError || 'Open a POS storefront to start a new order.'}</p>
          {!user?.sellerId && (
            <button type="button" className="pos-btn pos-btn--primary" onClick={resetDemo}>
              Open demo storefront <Send size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'kds') {
    return (
      <div className="pos-terminal" style={{ '--pos-primary': seller.theme?.primaryColor || '#bb4e31' } as React.CSSProperties}>
        <header className="pos-terminal__topbar">
          <div className="pos-terminal__topbar-left">
            <Table size={18} />
            <span>Kitchen Display System</span>
          </div>
          <div className="pos-terminal__status">
            <span className="pos-terminal__status-dot" />
            <span>Live</span>
          </div>
        </header>
        <div className="pos-terminal__body">
          <main className="pos-kds__orders">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.id} className="pos-kds__order-card">
                  <div className="pos-kds__order-header">
                    <span className="pos-kds__order-id">#{Date.now().toString().slice(-6)}</span>
                    <span className="pos-kds__order-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="pos-kds__order-items">
                    {cart.map((ci) => (
                      <div key={ci.id} className="pos-kds__order-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{ci.name} x {ci.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pos-kds__order-footer">
                    <span className="pos-kds__order-id">Total: {formatCurrency(total, settings.currency)}</span>
                    <button className="pos-btn pos-btn--primary" onClick={() => removeFromCart(item)}>
                      Mark Done
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="pos-empty-state">
                <List size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No active orders in the kitchen.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  if (variant === 'customer') {
    return (
      <div className="pos-terminal" style={{ '--pos-primary': seller.theme?.primaryColor || '#bb4e31' } as React.CSSProperties}>
        <header className="pos-terminal__topbar">
          <div className="pos-terminal__topbar-left">
            <Receipt size={18} />
            <span>Order #{orderPlaced?.id?.slice(0, 8) || '---'}</span>
          </div>
        </header>
        <div className="pos-terminal__body">
          <main style={{ padding: '32px', textAlign: 'center', flex: 1 }}>
            {orderPlaced ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  <Send size={32} style={{ color: '#22c55e' }} />
                </div>
                <h2>Order placed!</h2>
                <p style={{ fontSize: '16px' }}>Order #{orderPlaced.id?.slice(0, 8)}</p>
                <p>Total: {formatCurrency(orderPlaced.total, orderPlaced.currency || settings.currency)}</p>
              </>
            ) : (
              <>
                <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>No active order to display.</p>
              </>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-terminal" style={{ '--pos-primary': seller.theme?.primaryColor || '#bb4e31' } as React.CSSProperties}>
      <header className="pos-terminal__topbar">
        <div className="pos-terminal__topbar-left">
          <span className="pos-terminal__brand-mark"><ShoppingCart size={18} /></span>
          <div className="pos-terminal__brand-copy">
            <span className="pos-terminal__brand-name">{seller.storeName}</span>
            <span className="pos-terminal__brand-subtitle">SERVICE COUNTER · REGISTER 01</span>
          </div>
        </div>
        <div className="pos-terminal__status">
          <span className="pos-terminal__live"><span className="pos-terminal__status-dot" />Online</span>
          <button type="button" className="pos-terminal__utility" onClick={() => setVariant('kds')}>
            <Table size={15} /> Kitchen view
          </button>
        </div>
      </header>

      <div className="pos-terminal__body">
        <aside className="pos-terminal__menu">
          <div className="pos-menu__intro">
            <div>
              <p className="pos-eyebrow">Counter service</p>
              <h1>Build an order</h1>
            </div>
            <span className="pos-menu__count">{filteredItems.length} items</span>
          </div>
          <div className="pos-menu__categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pos-menu__category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={{
                  '--pos-primary': seller.theme?.primaryColor || '#7c3609',
                } as React.CSSProperties}
              >
                {cat === 'all' ? 'ALL' : getCategoryName(cat)}
              </button>
            ))}
          </div>
          <div className="pos-menu__items">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  className="pos-menu__item"
                  onClick={() => addToCart(item)}
                  type="button"
                  aria-label={`Add ${item.name}, ${formatCurrency(item.price, settings.currency)}`}
                >
                  {settings.showImages && item.images?.[0] ? (
                    <img className="pos-menu__item-image" src={item.images[0]} alt="" loading="lazy" />
                  ) : (
                    <span className="pos-menu__item-monogram" aria-hidden="true">{item.name.slice(0, 1)}</span>
                  )}
                  <span className="pos-menu__item-copy">
                    <span className="pos-menu__item-name">{item.name}</span>
                    {item.description && (
                      <span className="pos-menu__item-desc">{item.description}</span>
                    )}
                    <span className="pos-menu__item-price">{formatCurrency(item.price, settings.currency)}</span>
                  </span>
                  <span className="pos-menu__item-add" aria-hidden="true"><Plus size={17} /></span>
                </button>
              ))
            ) : (
              <div className="pos-empty-state">
                <Search size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No items in this category.</p>
              </div>
            )}
          </div>
        </aside>

        <aside className="pos-terminal__order">
          <div className="pos-order__header">
            <h2>New Order</h2>
            {tableNumber && (
              <span className="pos-order__table">Table: {tableNumber}</span>
            )}
          </div>
          <div className="pos-order__items">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.id} className="pos-order__item">
                  <div className="pos-order__item-copy">
                    <div className="pos-order__item-name">{item.name}</div>
                    <div className="pos-order__item-qty">
                      <button
                        onClick={() => updateQuantity(item, -1)}
                        className="pos-btn pos-btn--secondary"
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus size={12} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="pos-btn pos-btn--secondary"
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pos-order__item-price">
                      {formatCurrency(item.price * item.quantity, settings.currency)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item)}
                      className="pos-order__remove-btn"
                      aria-label={`Remove ${item.name}`}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="pos-empty-state">
                <ShoppingCart size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No items added yet.</p>
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <>
              {tableNumber && (
                <div style={{ padding: '0 16px', fontSize: '12px', color: '#6b7280' }}>
                  Table: {tableNumber}
                </div>
              )}
              <div className="pos-order__footer">
                <div className="pos-order__totals">
                  <div className="pos-order__total-row subtotal">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal, settings.currency)}</span>
                  </div>
                  {settings.taxRate > 0 && (
                    <div className="pos-order__total-row">
                      <span>Tax ({settings.taxRate}%)</span>
                      <span>{formatCurrency(tax, settings.currency)}</span>
                    </div>
                  )}
                  {settings.serviceCharge > 0 && (
                    <div className="pos-order__total-row">
                      <span>Service Charge ({settings.serviceCharge}%)</span>
                      <span>{formatCurrency(serviceFee, settings.currency)}</span>
                    </div>
                  )}
                  <div className="pos-order__total-row total">
                    <span>Total</span>
                    <span>{formatCurrency(total, settings.currency)}</span>
                  </div>
                </div>
                <div className="pos-order__actions">
                  <button className="pos-btn pos-btn--danger" onClick={clearCart} type="button" aria-label="Clear order">
                    <Trash2 size={16} />
                  </button>
                  <button
                    className="pos-btn pos-btn--primary"
                    onClick={placeOrder}
                    disabled={orderSubmitting || cart.length === 0}
                    type="button"
                  >
                    {orderSubmitting ? 'Placing...' : 'Place Order'}
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {orderPlaced && (
        <div className="pos-notice" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
          <Send size={15} /> Order #{orderPlaced.id?.slice(0, 8)} placed successfully!
        </div>
      )}
    </div>
  );
};

export default PosSite;
