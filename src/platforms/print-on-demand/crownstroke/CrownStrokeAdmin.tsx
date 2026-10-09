import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Bot, Check, ChevronDown, Crown, CreditCard,
  DollarSign, LayoutDashboard, LogOut, Package, Plus, Save, Settings, ShoppingCart,
  Trash2, X, Loader2, Edit, Palette,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  defaultCrownStrokeSettings, getCrownStrokeSettings, isCrownStroke, readCrownStrokeBooking,
  CrownStrokeSettings, saveCrownStrokeSettings, Design,
} from './crownStrokeTypes';
import DesignCanvas from './DesignCanvas';
import type { DesignElement, ExportFormat } from './crownStrokeTypes';
import './crown-stroke.css';

const DESIGN_WIDTH = 1200;
const DESIGN_HEIGHT = 1200;

type Section = 'overview' | 'products' | 'designs' | 'orders' | 'settings' | 'store-settings' | 'billing' | 'themes' | 'bots' | 'pay';

const nav: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'products', label: 'Products', icon: <Package size={18} /> },
  { id: 'designs', label: 'Designs', icon: <Palette size={18} /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
  { id: 'settings', label: 'Studio', icon: <Settings size={18} /> },
  { id: 'store-settings', label: 'Store settings', icon: <Settings size={18} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
  { id: 'themes', label: 'Themes', icon: <LayoutDashboard size={18} /> },
  { id: 'bots', label: 'IyonicBots', icon: <Bot size={18} /> },
  { id: 'pay', label: 'IyonicPay', icon: <DollarSign size={18} /> },
];

const CrownStrokeAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [savedDesigns, setSavedDesigns] = useState<Design[]>([]);
  const [section, setSectionState] = useState<Section>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState<CrownStrokeSettings>(defaultCrownStrokeSettings);
  const [selectedOrderId, setSelectedOrderId] = useState<Order | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [productEditing, setProductEditing] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: '', price: '', description: '', stock: 999 });
  const [productImageFiles, setProductImageFiles] = useState<File[]>([]);

  const [activeDesign, setActiveDesign] = useState<Design | null>(null);
  const [activeElements, setActiveElements] = useState<DesignElement[]>([]);
  const [activeBackground, setActiveBackground] = useState('#ffffff');
  const [designName, setDesignName] = useState('');

  const setSection = (nextSection: Section) => {
    const destinations: Partial<Record<Section, string>> = {
      themes: '/themes',
      bots: '/iyonicbots',
      pay: '/iyonicpay',
    };
    const destination = destinations[nextSection];
    if (destination) {
      navigate(destination, { state: { from: '/pdp/crown-stroke/admin' } });
      return;
    }
    setSectionState(nextSection);
  };

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate('/seller/dashboard', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [owner, allOrders, allProducts] = await Promise.all([
        sellersAPI.getMe(),
        ordersAPI.getBySellerId(user.sellerId),
        productsAPI.getBySellerId(user.sellerId),
      ]);
      if (!isCrownStroke(owner) || owner.id !== user.sellerId) {
        navigate('/seller/dashboard', { replace: true });
        return;
      }
      setSeller(owner);
      setSettings(getCrownStrokeSettings(owner));
      setOrders(allOrders.filter((order) => !!readCrownStrokeBooking(order)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setProducts(allProducts);
      const designBookings = allOrders.filter((order) => {
        const booking = readCrownStrokeBooking(order);
        return booking && booking.designData;
      });
      setSavedDesigns(designBookings.map((order) => {
        const booking = readCrownStrokeBooking(order)!;
        return {
          id: order.id,
          name: `${booking.productName} — ${order.customerName}`,
          sellerId: order.sellerId,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          background: '#ffffff',
          elements: JSON.parse(booking.designData).map((el: any) => ({ ...el, data: el.data })) as DesignElement[],
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        } as Design;
      }));
    } catch {
      setError('We could not load the studio workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async (next: CrownStrokeSettings) => {
    if (!seller) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await sellersAPI.updateMe(saveCrownStrokeSettings(seller, next));
      setSeller(updated);
      setSettings(getCrownStrokeSettings(updated));
      setNotice('Changes saved.');
    } catch {
      setError('These changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (order: Order, status: Order['status']) => {
    setError('');
    setNotice('');
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      setOrders((items) => items.map((item) => (item.id === order.id ? updated : item)));
      setSelectedOrderId((selected) => selected?.id === updated.id ? updated : selected);
      setNotice('Order updated.');
    } catch {
      setError('The order status was not changed. Please retry.');
    }
  };

  const openProduct = (product?: Product) => {
    setProductEditing(product || null);
    setIsProductFormOpen(true);
    setProductImageFiles([]);
    setProductForm({ name: product?.name || '', category: product?.category || '', price: product ? String(product.price) : '', description: product?.description || '', stock: product?.stock ?? 999 });
  };

  const resetProductForm = () => {
    setProductEditing(null);
    setIsProductFormOpen(false);
    setProductImageFiles([]);
    setProductForm({ name: '', category: '', price: '', description: '', stock: 999 });
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!seller) return;
    setSaving(true);
    let imageUrls: string[] = productEditing?.images || [];
    try {
      if (productImageFiles.length > 0) {
        const uploaded = await uploadAPI.upload(productImageFiles);
        imageUrls = uploaded.slice(0, productImageFiles.length);
      }
      const values = {
        sellerId: seller.id,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price),
        category: productForm.category.trim() || 'General',
        type: 'product' as const,
        images: imageUrls,
        stock: Number(productForm.stock),
        status: 'active' as const,
      };
      if (productEditing) {
        const result = await productsAPI.update(productEditing.id, values);
        setProducts((list) => list.map((item) => (item.id === result.id ? result : item)));
      } else {
        const result = await productsAPI.create(values);
        setProducts((list) => [...list, result]);
      }
      resetProductForm();
      setNotice('Product saved.');
    } catch {
      setError('The product was not saved. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await productsAPI.delete(product.id);
      setProducts((list) => list.filter((item) => item.id !== product.id));
      setNotice('Product deleted.');
    } catch {
      setError('This product could not be deleted. Please try again.');
    }
  };

  const createNewDesign = (name?: string) => {
    setDesignName(name || 'Untitled Design');
    setActiveElements([]);
    setActiveBackground('#ffffff');
    setActiveDesign(null);
  };

  const loadExistingDesign = (design: Design) => {
    setDesignName(design.name);
    setActiveElements([...design.elements]);
    setActiveBackground(design.background);
    setActiveDesign(design);
  };

  const saveDesign = async () => {
    if (!seller) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (activeDesign) {
        const booking = readCrownStrokeBooking(activeDesign.id ? orders.find((o) => o.id === activeDesign.id && readCrownStrokeBooking(o))?.deliveryLocation ? orders.find((o) => o.id === activeDesign.id)! : { deliveryLocation: '' } as Order : {} as Order);
        if (booking) {
          booking.designData = JSON.stringify(activeElements);
          await ordersAPI.update(activeDesign.id, { deliveryLocation: JSON.stringify({ ...booking, designData: JSON.stringify(activeElements) }) });
          setNotice('Design updated.');
        }
      } else {
        const newDesign: Design = {
          id: `design_${Math.random().toString(36).slice(2, 9)}`,
          name: designName,
          sellerId: seller.id,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          background: activeBackground,
          elements: activeElements,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSavedDesigns((prev) => [newDesign, ...prev]);
        setNotice('Design saved to local presets.');
      }
    } catch {
      setError('The design could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (dataUrl: string, format: ExportFormat) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `crownstroke-${designName || 'design'}.${format}`;
    link.click();
  };

  const handleAddImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const newElement: DesignElement = {
          id: `el_${Math.random().toString(36).slice(2, 9)}`,
          type: 'image',
          x: DESIGN_WIDTH / 2,
          y: DESIGN_HEIGHT / 2,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          locked: false,
          opacity: 1,
          z: activeElements.length,
          data: { src, width: img.width, height: img.height, naturalWidth: img.width, naturalHeight: img.height },
        };
        setActiveElements((prev) => [...prev, newElement]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const displayedTitle = nav.find((item) => item.id === section)?.label || 'Overview';

  if (loading) return <div className="cs-admin"><div className="pulse-admin-loading"><Loader2 className="admin-loading-spinner" /> Loading your studio workspace…</div></div>;
  if (!seller) return <div className="cs-admin"><div className="pulse-admin-loading" role="alert">{error || 'This studio workspace is unavailable.'}</div></div>;

  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const revenue = orders.filter((order) => ['processing', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + order.total, 0);
  const completedOrders = orders.filter((order) => order.status === 'delivered');

  return (
    <div className="cs-admin">
      {sidebarOpen && <button className="cs-mobile-menu-overlay" aria-label="Close studio navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`cs-admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <a href={`/shop/${seller.subdomain}`} className="cs-wordmark"><Crown size={18} className="crown-mark" />Crown<em>Stroke</em></a>
        <p className="admin-label">STUDIO DESK</p>
        <nav aria-label="Studio workspace">{nav.map((item) => (
          <button
            key={item.id}
            onClick={() => { setSection(item.id); setError(''); setNotice(''); setSidebarOpen(false); }}
            className={`cs-admin-nav-item ${section === item.id ? 'active' : ''}`}
          >
            {item.icon}{item.label}
            {item.id === 'orders' && pendingOrders.length > 0 && <span className="cs-admin-nav-count">{pendingOrders.length}</span>}
          </button>
        ))}</nav>
        <div className="cs-admin-sidebar-bottom">
          <span className="admin-avatar">{seller.storeName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{seller.storeName}</strong>
            <span>Studio owner</span>
          </div>
        </div>
      </aside>

      <main className="cs-admin-main">
        <header className="cs-admin-topbar">
          <button className="cs-admin-menu-toggle" aria-label="Open studio navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><LayoutDashboard size={18} /></button>
          <div><p className="cs-kicker">CROWNSTROKE / STUDIO DESK</p><h1>{displayedTitle}</h1></div>
          <div className="cs-admin-actions">
            <span className="admin-system-state"><i /> STUDIO WORKSPACE</span>
            <a href={`/shop/${seller.subdomain}`} target="_blank" rel="noreferrer" aria-label="View live store"><ArrowLeft size={15} /> View site</a>
            <button aria-label="Refresh" onClick={() => void load()}><Loader2 size={17} /> Refresh</button>
            <button aria-label="Sign out" className="pulse-logout-button" onClick={logout}><LogOut size={16} /> Sign out</button>
          </div>
        </header>

        {error && <div className="cs-admin-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        {notice && <div className="cs-admin-notice" role="status"><Check size={15} />{notice}</div>}

        {section === 'overview' && (
          <section className="cs-admin-section">
            <div className="cs-admin-metrics">
              <article><span>Pending orders</span><strong>{pendingOrders.length}</strong><small>Need your attention</small></article>
              <article><span>Total orders</span><strong>{orders.length}</strong><small>All time</small></article>
              <article><span>Completed</span><strong>{completedOrders.length}</strong><small>Delivered to customers</small></article>
              <article><span>Revenue</span><strong>{formatPrice(revenue, seller.currency || 'USD')}</strong><small>Confirmed & completed</small></article>
            </div>

            <div className="admin-overview-grid" style={{ marginTop: '24px' }}>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div><p className="cs-kicker">YOUR PRODUCTS</p><h2>Print catalog</h2></div>
                  <button onClick={() => setSection('products')} className="pulse-text-button">All products <ChevronDown size={15} /></button>
                </div>
                {products.length ? (
                  <div className="cs-product-list">{products.slice(0, 6).map((product) => (
                    <article key={product.id} className="cs-product-tile">
                      <div className="tile-image">{product.images && product.images[0] && <img src={product.images[0]} alt={product.name} />}</div>
                      <div className="tile-body">
                        <h3>{product.name}</h3>
                        <p>{formatPrice(product.price, seller.currency || 'USD')}</p>
                      </div>
                      <div className="tile-actions">
                        <button aria-label={`Edit ${product.name}`} onClick={() => openProduct(product)}><Edit size={14} /></button>
                        <button aria-label={`Delete ${product.name}`} onClick={() => void deleteProduct(product)} className="admin-service-delete">Delete</button>
                      </div>
                    </article>
                  ))}</div>
                ) : (
                  <div className="admin-inline-empty"><Package /><span>No products yet. Add your first printable product.</span></div>
                )}
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div><p className="cs-kicker">JUST IN</p><h2>Recent orders</h2></div>
                  <span>{pendingOrders.length} pending</span>
                </div>
                {orders.slice(0, 5).length ? (
                  <div className="admin-agenda">{orders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} onView={() => setSelectedOrderId(order)} />)}</div>
                ) : (
                  <div className="admin-inline-empty"><ShoppingCart /><span>No orders have been placed yet.</span></div>
                )}
              </section>
            </div>
          </section>
        )}

        {section === 'products' && (
          <section className="cs-admin-section">
            <div className="admin-section-toolbar">
              <div><p className="cs-kicker">YOUR CATALOG</p><h2>Printable products</h2><p>Products you offer with custom design printing.</p></div>
              <button className="cs-button cs-button-accent" onClick={() => openProduct()}><Plus size={16} /> Add a product</button>
            </div>
            {isProductFormOpen ? (
              <form className="cs-admin-form" onSubmit={saveProduct}>
                <div className="admin-form-heading">
                  <h3>{productEditing ? 'Edit product' : 'New product'}</h3>
                  <button type="button" onClick={resetProductForm} aria-label="Close"><X /></button>
                </div>
                <div className="form-row-2">
                  <div><label>Product name</label><input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></div>
                  <div><label>Category</label><input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} placeholder="Apparel, Drinkware…" /></div>
                </div>
                <div className="form-row-2">
                  <div><label>Price</label><input type="number" min="0" step="0.01" required value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></div>
                  <div><label>Stock</label><input type="number" min="0" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: Number(event.target.value) })} /></div>
                </div>
                <div><label>Description</label><textarea rows={3} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></div>
                <div><label>Product images<input type="file" accept="image/*" multiple onChange={(event) => setProductImageFiles(Array.from(event.target.files || []))} /></label>
                  {productImageFiles.length > 0 && <div className="upload-preview-row">{productImageFiles.map((file, index) => <img key={index} src={URL.createObjectURL(file)} alt="preview" className="upload-preview-thumb" />)}</div>}
                  {productEditing?.images && productEditing.images.length > 0 && <div className="upload-preview-row">{productEditing.images.map((url, index) => <img key={index} src={url} alt="existing" className="upload-preview-thumb" />)}</div>}</div>
                <div className="admin-form-actions"><button className="cs-button" type="submit" disabled={saving}>{saving ? 'Saving…' : (productEditing ? 'Update product' : 'Create product')}</button><button type="button" className="admin-form-cancel" onClick={resetProductForm}>Cancel</button></div>
              </form>
            ) : products.length ? (
              <div className="cs-product-list">{products.map((product) => (
                <article key={product.id} className="cs-product-tile">
                  <div className="tile-image">{product.images && product.images[0] && <img src={product.images[0]} alt={product.name} />}</div>
                  <div className="tile-body"><h3>{product.name}</h3><p>{product.category}</p><span className="tile-price">{formatPrice(product.price, seller.currency || 'USD')}</span></div>
                  <div className="tile-actions">
                    <button aria-label={`Edit ${product.name}`} onClick={() => openProduct(product)}><Plus size={14} /></button>
                    <button aria-label={`Delete ${product.name}`} onClick={() => void deleteProduct(product)} className="admin-service-delete">Delete</button>
                  </div>
                </article>
              ))}</div>
            ) : (
              <div className="admin-empty"><Package /><h2>No products yet.</h2><p>Add your first printable product to start selling custom designs.</p></div>
            )}
          </section>
        )}

        {section === 'designs' && (
          <section className="cs-admin-section">
            <div className="admin-section-toolbar">
              <div><p className="cs-kicker">YOUR WORKSPACE</p><h2>Design studio</h2><p>Create, save, and manage custom print designs.</p></div>
              <button className="cs-button cs-button-accent" onClick={() => createNewDesign('New Design')}>+ New design</button>
            </div>

            {activeElements.length > 0 || activeDesign ? (
              <div style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="text" value={designName} onChange={(event) => setDesignName(event.target.value)} style={{ fontSize: '18px', fontWeight: '700', background: 'transparent', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px 12px', color: 'var(--ink)', width: '240px' }} />
                  <button className="cs-button cs-button-ghost" onClick={() => setActiveElements([])}><Trash2 size={14} /> Clear canvas</button>
                  <button className="cs-button cs-button-ghost" onClick={saveDesign} disabled={saving}>{saving ? 'Saving…' : <><Save size={14} /> Save</>}</button>
                </div>
                <DesignCanvas
                  width={DESIGN_WIDTH}
                  height={DESIGN_HEIGHT}
                  elements={activeElements}
                  background={activeBackground}
                  onChange={setActiveElements}
                  onBackgroundChange={setActiveBackground}
                  onExport={handleExport}
                  onAddImage={handleAddImage}
                />
              </div>
            ) : savedDesigns.length > 0 ? (
              <div className="cs-designs-grid">{savedDesigns.map((design) => (
                <div key={design.id} className="cs-design-card">
                  <div className="design-thumb">{design.elements.length > 0 && <Palette size={24} />}</div>
                  <div className="design-body">
                    <h4>{design.name}</h4>
                    <span>{design.elements.length} elements</span>
                  </div>
                  <div className="tile-actions">
                    <button aria-label={`Edit ${design.name}`} onClick={() => loadExistingDesign(design)}><Edit size={14} /></button>
                  </div>
                </div>
              ))}</div>
            ) : (
              <div className="admin-empty"><Palette /><h2>No designs yet.</h2><p>Create a new design and start printing on your products.</p></div>
            )}
          </section>
        )}

        {section === 'orders' && (
          <section className="cs-admin-section">
            <div className="admin-section-toolbar">
              <div><p className="cs-kicker">YOUR ORDERS</p><h2>Customer orders</h2></div>
            </div>
            {orders.length ? (
              <div className="cs-orders-table">
                <div className="cs-orders-list" aria-label="Customer orders">
                  {orders.map((order) => <OrderRow key={order.id} order={order} onView={() => setSelectedOrderId(order)} />)}
                </div>
              </div>
            ) : (
              <div className="admin-empty"><ShoppingCart /><h2>No orders yet.</h2><p>Customer orders will appear here once placed.</p></div>
            )}
          </section>
        )}

        {section === 'settings' && (
          <section className="cs-admin-section">
            <div className="admin-section-toolbar"><div><p className="cs-kicker">THE PRACTICAL DETAILS</p><h2>Studio settings</h2><p>These appear across your storefront and affect orders.</p></div></div>
            <form className="cs-admin-form cs-settings-grid" onSubmit={(event) => { event.preventDefault(); void saveSettings(settings); }}>
              <div><label>Shop name</label><input value={settings.shopName} onChange={(event) => setSettings({ ...settings, shopName: event.target.value })} required /></div>
              <div><label>Tagline</label><input value={settings.tagline} onChange={(event) => setSettings({ ...settings, tagline: event.target.value })} /></div>
              <div><label>Primary color</label><input type="color" value={settings.primaryColor} onChange={(event) => setSettings({ ...settings, primaryColor: event.target.value })} /></div>
              <div><label>Accent color</label><input type="color" value={settings.accentColor} onChange={(event) => setSettings({ ...settings, accentColor: event.target.value })} /></div>
              <div><label>Location</label><input value={settings.location} onChange={(event) => setSettings({ ...settings, location: event.target.value })} /></div>
              <div><label>Phone number</label><input type="tel" value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></div>
              <div><label>Email address</label><input type="email" value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ flex: 1 }}><label>Show on storefront</label><input type="checkbox" checked readOnly /></div>
                <button className="cs-button cs-button-ghost" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
              </div>
            </form>
          </section>
        )}

        {(section === 'store-settings' || section === 'billing' || section === 'themes' || section === 'bots' || section === 'pay') && (
          <section className="cs-admin-section">
            <div className="admin-empty"><Crown /><h2>{nav.find((item) => item.id === section)?.label || section} lives elsewhere</h2><p>Manage this from the main {seller.storeName} dashboard.</p><a className="pulse-text-button" href={`/seller/dashboard?tab=${section === 'billing' ? 'billing' : 'themes'}`}>Open dashboard <ArrowRight size={15} /></a></div>
          </section>
        )}
      </main>

      {selectedOrderId && (
        <OrderModal order={selectedOrderId} onClose={() => setSelectedOrderId(null)} onStatus={setStatus} />
      )}
    </div>
  );
};

const OrderRow: React.FC<{ order: Order; onView: () => void }> = ({ order, onView }) => {
  const booking = readCrownStrokeBooking(order);
  const hasDesign = Boolean(booking?.designData);
  return (
    <article className="admin-appointment-row">
      <div className="agenda-time"><strong>#{(order.id || '').slice(-6)}</strong><span>{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
      <div className="agenda-client"><strong>{order.customerName}</strong><span>{order.customerEmail}{order.customerPhone && ` · ${order.customerPhone}`}</span></div>
      <div className="agenda-service"><strong>{order.items.map((item) => item.productName).join(', ')}</strong><span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span></div>
      <div className="agenda-service"><strong>{formatPrice(order.total, order.currency || 'USD')}</strong><span>{booking?.productSize} / {booking?.productColor}</span></div>
      <span className={`appointment-status ${hasDesign ? 'status-processing' : 'status-pending'}`}>{hasDesign ? 'Has design' : 'No design'}</span>
      <span className={`appointment-status status-${order.status}`}>{order.status === 'pending' ? 'Pending' : order.status === 'processing' ? 'Processing' : order.status === 'delivered' ? 'Delivered' : order.status}</span>
      <button aria-label={`View order ${order.id.slice(-6)}`} onClick={onView} className="cs-button cs-button-ghost admin-view-order"><Edit size={14} /><span>View</span></button>
    </article>
  );
};

const OrderModal: React.FC<{ order: Order; onClose: () => void; onStatus: (order: Order, status: Order['status']) => void }> = ({ order, onClose, onStatus }) => {
  const booking = readCrownStrokeBooking(order);
  let designElements: DesignElement[] = [];
  try {
    const parsed: unknown = booking?.designData ? JSON.parse(booking.designData) : [];
    if (Array.isArray(parsed)) designElements = parsed as DesignElement[];
  } catch {
    designElements = [];
  }
  const designSize = Math.max(600, ...designElements.map((element) => Math.max(element.x * 2, element.y * 2)));
  return (
    <div className="cs-export-overlay">
      <div className="cs-export-popup" role="dialog" aria-modal="true" aria-labelledby="cs-order-dialog-title" style={{ maxWidth: '540px' }}>
        <h4 id="cs-order-dialog-title">Order #{order.id.slice(-8)}</h4>
        <div style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6' }}>
          <p><strong style={{ color: 'var(--ink)' }}>Customer:</strong> {order.customerName}</p>
          <p><strong style={{ color: 'var(--ink)' }}>Email:</strong> {order.customerEmail}</p>
          <p><strong style={{ color: 'var(--ink)' }}>Phone:</strong> {order.customerPhone || '—'}</p>
          <p><strong style={{ color: 'var(--ink)' }}>Product:</strong> {booking?.productName || order.items.map((item) => item.productName).join(', ')}</p>
          <p><strong style={{ color: 'var(--ink)' }}>Size:</strong> {booking?.productSize || '—'} · <strong style={{ color: 'var(--ink)' }}>Color:</strong> <span style={{ color: booking?.productColor }}>{booking?.productColor || '—'}</span></p>
          <p><strong style={{ color: 'var(--ink)' }}>Quantity:</strong> {order.items[0]?.quantity || 1}</p>
          <p><strong style={{ color: 'var(--ink)' }}>Total:</strong> {formatPrice(order.total, order.currency || 'USD')}</p>
        </div>
        {booking?.designPreview ? <img src={booking.designPreview} alt="Customer design" className="admin-order-design-preview" /> : designElements.length > 0 && (
          <div className="admin-order-design-preview">
            <DesignCanvas width={designSize} height={designSize} elements={designElements} background="#fffefa" onChange={() => {}} onBackgroundChange={() => {}} onExport={() => {}} readOnly />
          </div>
        )}
        <label className="cs-order-status-control">Update status
          <select value={order.status} onChange={(event) => onStatus(order, event.target.value as Order['status'])}>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
          </select>
        </label>
        <div className="cs-export-actions" style={{ marginTop: '20px' }}>
          <button className="cs-button cs-button-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default CrownStrokeAdmin;
