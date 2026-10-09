import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Crown, Sparkles, Palette, Grid3x3, Users, Award, ArrowUpRight, PackageCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Product, Seller } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { CROWN_STROKE_DEMO_PRODUCTS, getCrownStrokeSettings } from './crownStrokeTypes';
import './crown-stroke.css';

interface Props { seller?: Seller; products?: Product[]; demoMode?: boolean }

const CrownStrokeSite: React.FC<Props> = ({ seller, products, demoMode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveSeller = seller || { id: 'demo-seller', storeName: 'CrownStroke', subdomain: 'demo', shopType: 'product' as const, currency: 'USD', theme: {} } as Seller;
  const fit = getCrownStrokeSettings(effectiveSeller);
  const productList = useMemo(() => demoMode || !products ? CROWN_STROKE_DEMO_PRODUCTS : products.filter((p) => p.type === 'product' && p.status === 'active'), [demoMode, products]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(productList[0] || null);
  const [activeCategory, setActiveCategory] = useState('All objects');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (productList.length > 0 && !productList.find((p) => p.id === selectedProduct?.id)) {
      setSelectedProduct(productList[0]);
    }
  }, [productList, selectedProduct?.id]);

  useEffect(() => {
    const draft = location.state?.crownStrokeStudioDraft;
    if (!draft) return;
    if (draft.product?.id) {
      const matchingProduct = productList.find((product) => product.id === draft.product.id);
      if (matchingProduct) setSelectedProduct(matchingProduct);
    }
  }, [location.state, productList]);

  const categories = ['All objects', ...Array.from(new Set(productList.map((product) => product.category || 'Other')))];
  const visibleProducts = activeCategory === 'All objects' ? productList : productList.filter((product) => (product.category || 'Other') === activeCategory);
  const selectCategory = (category: string) => setActiveCategory(category);
  const openDesign = (product = selectedProduct) => {
    if (!product) return;
    const previous = location.state?.crownStrokeStudioDraft;
    const draft = previous?.product?.id === product.id ? previous : {};
    navigate(`/pdp/crown-stroke/studio/${encodeURIComponent(product.id)}`, {
      state: {
        product,
        seller: effectiveSeller,
        design: {
          elements: draft.elements || [],
          background: draft.background || '#fffefa',
          size: draft.size || 'M',
          color: draft.color || '#1c2b25',
          quantity: draft.quantity || 1,
        },
      },
    });
  };

    const openClient = () => navigate(user ? '/pdp/crown-stroke/client' : `/login?shop=${encodeURIComponent(effectiveSeller.id)}&subdomain=${encodeURIComponent(effectiveSeller.subdomain)}&redirect=%2Fpdp%2Fcrown-stroke%2Fclient`);
  const openAdmin = () => navigate('/pdp/crown-stroke/admin');

  return (
    <div className="cs-site">
      <header className="cs-header">
        <div className="cs-wordmark"><Crown size={22} className="crown-mark" />Greate<em>Themes</em></div>
        <div className={menuOpen ? 'cs-nav is-open' : 'cs-nav'}>
          <a href="#products" onClick={() => setMenuOpen(false)}>Products</a>
          <button className="cs-text-button" onClick={() => { openDesign(); setMenuOpen(false); }} disabled={!selectedProduct}><Palette size={15} /> Design Studio</button>
          <a href="#story" onClick={() => setMenuOpen(false)}>Our Story</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <button className="cs-text-button" onClick={() => { openClient(); setMenuOpen(false); }}><Users size={15} /> My Orders</button>
          {user?.sellerId && <button className="cs-text-button" onClick={() => { openAdmin(); setMenuOpen(false); }}><Crown size={15} /> Studio desk</button>}
        </div>
        <button className="cs-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <section className="cs-hero">
        <div className="cs-hero-inner">
          <div className="cs-hero-text">
            <p className="cs-kicker"><span /> Greate Themes print studio</p>
            <h1>Design premium drops your audience will keep.</h1>
            <p className="cs-hero-lede">A considered collection of apparel, gifts, and everyday goods—ready for your artwork, your colors, and your point of view.</p>
            <div className="cs-hero-actions">
              <button className="cs-button" onClick={() => openDesign()} disabled={!selectedProduct}><Palette size={17} /> Start Designing</button>
              <a className="cs-button cs-button-ghost" href="#products"><Grid3x3 size={17} /> Browse Products</a>
            </div>
            <div className="cs-hero-badges">
              <span>Made for your idea</span>
              <span>Pick your blank</span>
              <span>Designed by you</span>
            </div>
            <div className="cs-hero-stats">
              <span className="cs-hero-stat"><strong>01</strong><span>Choose a product</span></span>
              <span className="cs-hero-stat"><strong>02</strong><span>Make it yours</span></span>
            </div>
          </div>
          <div className="cs-hero-image-wrap">
            <div className="cs-hero-mockup">
                <div className="mockup-tee">
                  {productList[0]?.images?.[0] ? <img src={productList[0].images[0]} alt={productList[0].name} /> : <span className="cs-hero-mark">C<span>•</span>S</span>}
                </div>
                <div className="cs-hero-caption"><span>MADE TO BE KEPT</span><strong>{productList[0]?.name || 'A small run, all yours'}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cs-feature-strip" aria-label="Advantages">
        <article className="cs-feature-card">
          <div className="cs-feature-icon"><Palette size={18} /></div>
          <h3>Brand-led design</h3>
          <p>Build custom drops with premium finishes, rich color stories, and polished mockups.</p>
        </article>
        <article className="cs-feature-card">
          <div className="cs-feature-icon"><Sparkles size={18} /></div>
          <h3>Premium print quality</h3>
          <p>Bring your artwork to the products you reach for, give, and keep.</p>
        </article>
        <article className="cs-feature-card">
          <div className="cs-feature-icon"><Crown size={18} /></div>
          <h3>Luxury presentation</h3>
          <p>Thoughtful presentation keeps the focus on your design and the object it belongs on.</p>
        </article>
        <article className="cs-feature-card">
          <div className="cs-feature-icon"><Grid3x3 size={18} /></div>
          <h3>One-click ordering</h3>
          <p>Choose a product, adjust the details, and make a piece that feels personal.</p>
        </article>
      </section>

      <div className="cs-shop-heading" id="products">
        <div><p className="cs-kicker">THE CROWNstroke EDIT</p><h2>Good things, made yours.</h2><p>Small-run essentials, ready for a personal touch.</p></div>
        <div className="cs-category-filter" aria-label="Filter products by category">
          {categories.map((category) => <button key={category} type="button" className={activeCategory === category ? 'active' : ''} aria-pressed={activeCategory === category} onClick={() => selectCategory(category)}>{category}</button>)}
        </div>
      </div>
      <section className="cs-product-grid">
        {visibleProducts.length ? visibleProducts.map((product) => (
          <article
            key={product.id}
            className="cs-product-card"
          >
            <div className="cs-product-image">
              {product.images && product.images[0] ? <img src={product.images[0]} alt={product.name} /> : <div className="cs-product-placeholder"><Crown size={32} /></div>}
              <span className="cs-product-badge custom">Custom</span>
            </div>
            <div className="cs-product-body">
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <p className="cs-product-price">{formatPrice(product.price, effectiveSeller.currency || 'USD')}</p>
              <button type="button" className="cs-button cs-button-ghost" onClick={() => openDesign(product)}>
                <Palette size={15} /> Customize in studio
              </button>
            </div>
          </article>
        )) : (
          <div className="cs-portal-empty" style={{ gridColumn: '1 / -1' }}>
            <Grid3x3 size={32} />
            <h3>No products yet</h3>
            <p>This store is setting up its print-on-demand catalog. Check back soon!</p>
          </div>
        )}
      </section>

      <section className="cs-story-panel" id="story" aria-labelledby="cs-process-title">
        <div className="cs-process-intro">
          <p className="cs-kicker"><span /> MADE PERSONAL, IN THREE STEPS</p>
          <h2 id="cs-process-title">From first sketch<br />to favorite thing.</h2>
          <p>Thoughtful details make a good idea something you’ll want to keep. Here’s how it comes together.</p>
          <a className="cs-process-link" href="#products">Explore the collection <ArrowUpRight size={16} /></a>
        </div>
        <ol className="cs-story-grid">
          <li className="cs-story-step">
            <span className="cs-step-index">01 <span>CHOOSE</span></span>
            <div>
              <h3>Find your blank</h3>
              <p>Start with an everyday favorite—from soft cotton to a keepsake for your space.</p>
            </div>
          </li>
          <li className="cs-story-step">
            <span className="cs-step-index">02 <span>MAKE IT YOURS</span></span>
            <div>
              <h3>Build your design</h3>
              <p>Bring your own artwork or make something new, then preview the placement in studio.</p>
            </div>
          </li>
          <li className="cs-story-step">
            <span className="cs-step-index">03 <span>WE MAKE IT</span></span>
            <div>
              <h3>Made for your order</h3>
              <p>Your finished design is sent to the studio, with order details ready to follow in your portfolio.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="cs-brand-strip" aria-label="The CrownStroke difference">
        <div className="cs-trust-heading">
          <p className="cs-kicker">GOOD TO KNOW</p>
          <h2>Made with intention.<br />Made for you.</h2>
        </div>
        <ul className="cs-trust-list">
          <li><span className="cs-trust-icon"><Award size={18} /></span><span><strong>Made to order</strong><small>Each piece is made for your design.</small></span></li>
          <li><span className="cs-trust-icon"><Sparkles size={18} /></span><span><strong>Your artwork, your way</strong><small>Make it yours in the design studio.</small></span></li>
          <li><span className="cs-trust-icon"><PackageCheck size={18} /></span><span><strong>Follow orders in your portfolio</strong><small>Keep up with your order after checkout.</small></span></li>
        </ul>
      </section>

      <footer className="cs-site-footer" id="contact">
        <div className="cs-footer-main">
          <div className="cs-footer-brand">
            <div className="cs-wordmark"><Crown size={18} className="crown-mark" />Greate<em>Themes</em></div>
            <p>Considered goods, made personal. Make room for the things that feel like you.</p>
          </div>
          <nav className="cs-footer-nav" aria-label="Store links">
            <div>
              <h2>Explore</h2>
              <a href="#products">The collection <ArrowUpRight size={14} /></a>
              <a href="#story">How it’s made <ArrowUpRight size={14} /></a>
            </div>
            <div>
              <h2>Your CrownStroke</h2>
              <button type="button" onClick={() => openDesign()} disabled={!selectedProduct}>Design something <ArrowUpRight size={14} /></button>
              <button type="button" onClick={openClient}>Track an order <ArrowUpRight size={14} /></button>
              {user?.sellerId && <button type="button" onClick={openAdmin}>Studio desk <ArrowUpRight size={14} /></button>}
            </div>
          </nav>
          <div className="cs-footer-signoff">
            <span>AN IDEA, MADE YOURS.</span>
            <a href="#products" aria-label="Back to the collection">Back to the collection <ArrowUpRight size={15} /></a>
          </div>
        </div>
        <div className="cs-footer-bottom">
          <span>© {new Date().getFullYear()} CrownStroke</span>
          <span>{fit.shopName || 'A Greate Themes print studio'}</span>
        </div>
      </footer>
    </div>
  );
};

export default CrownStrokeSite;
