import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Minus, Plus, Search, ShoppingBag, Sparkles, X, ArrowUpRight, LogIn, LogOut, UserRound } from 'lucide-react';
import { Product, Seller } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { useAuth } from '../../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface ThemeProps {
  seller: Seller;
  products: Product[];
  editMode?: boolean;
  sellerData?: Seller;
  onUpdateData?: (fieldPath: string, value: any) => void;
  onUpdateThemeCustomization?: (section: string, field: string, value: any) => void;
  onUpdateThemeColor?: (type: 'primary' | 'secondary', value: string) => void;
  onSelectSection?: (section: string) => void;
}

type CartItem = { product: Product; quantity: number };

const NeonPulseStore: React.FC<ThemeProps> = ({
  seller: initialSeller,
  products,
  editMode = false,
  sellerData,
  onUpdateData,
  onUpdateThemeCustomization,
  onUpdateThemeColor,
  onSelectSection
}) => {
  const seller = editMode && sellerData ? sellerData : initialSeller;
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const customizations = seller.theme?.customizations || {};
  const primary = seller.theme?.primaryColor || '#3155ff';
  const accent = customizations.accentColor || '#d7ff38';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`wishlist_${seller.id}`) || '[]').map((item: Product | string) => typeof item === 'string' ? item : item.id);
    } catch {
      return [];
    }
  });
  const [cart, setCart] = useState<CartItem[]>([]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(product => product.category).filter(Boolean)))], [products]);
  const filteredProducts = useMemo(() => products.filter(product => {
    const matchesCategory = category === 'All' || product.category === category;
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) || product.category?.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [category, products, query]);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);
  const heroMedia = customizations.heroMediaUrl || customizations.heroImage || products[0]?.images?.[0];
  const isHeroVideo = typeof heroMedia === 'string' && /\.(mp4|webm|mov)(\?.*)?$/i.test(heroMedia);

  useEffect(() => {
    localStorage.setItem(`wishlist_${seller.id}`, JSON.stringify(wishlist));
  }, [seller.id, wishlist]);

  const goToAccount = () => {
    if (!user) {
      const redirect = `${window.location.pathname}${window.location.search}`;
      navigate(`/login?shop=${seller.id}&subdomain=${seller.subdomain}&redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    navigate(user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard');
  };

  const addToCart = (product: Product) => {
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id);
      return existing
        ? current.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart(current => current.flatMap(item => {
      if (item.product.id !== productId) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(current => current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]);
  };

  const beginCheckout = () => {
    if (cart.length === 0) return;
    localStorage.setItem(`cart_${seller.id}`, JSON.stringify(cart));
    if (!user) {
      const redirect = `${location.pathname}?checkout=true`;
      navigate(`/login?shop=${seller.id}&subdomain=${seller.subdomain}&redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    navigate(`${location.pathname}?checkout=true`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f1f2ed] text-[#12131a] selection:bg-[#d7ff38] selection:text-[#12131a]" style={{ '--pulse-primary': primary, '--pulse-accent': accent } as React.CSSProperties}>
      <style>{`
        @keyframes pulse-marquee { to { transform: translateX(-50%); } }
        @keyframes pulse-float { 0%, 100% { transform: translateY(0) rotate(3deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        @keyframes pulse-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .pulse-marquee { animation: pulse-marquee 22s linear infinite; }
        .pulse-float { animation: pulse-float 5s ease-in-out infinite; }
        .pulse-in { animation: pulse-in .7s both; }
        @media (prefers-reduced-motion: reduce) { .pulse-marquee, .pulse-float, .pulse-in { animation: none; } }
      `}</style>

      {!customizations.hideHeader && <header id="header" onClick={() => editMode && onSelectSection?.('header')} className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-6 sm:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label={seller.storeName}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#12131a] text-[#d7ff38] shadow-[4px_4px_0_#d7ff38]"><Sparkles className="h-5 w-5" /></span>
          <span className="text-lg font-black tracking-[-.06em]">{customizations.headerLabel || seller.storeName || 'PULSE / SUPPLY'}</span>
        </a>
        <div className="hidden items-center gap-7 text-sm font-bold md:flex"><a href="#shop">{customizations.headerShopLabel || 'Shop'}</a><a href="#story">{customizations.headerStoryLabel || 'The edit'}</a><a href="#footer">{customizations.headerContactLabel || 'Contact'}</a></div>
        <div className="flex items-center gap-2">
          <button onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })} className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-[#12131a] transition hover:-translate-y-1 hover:bg-[#d7ff38]" aria-label={`Open wishlist, ${wishlist.length} items`}>
            <Heart className={`h-5 w-5 ${wishlist.length > 0 ? 'fill-current' : ''}`} />{wishlist.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#3155ff] px-1 text-[10px] font-black text-white">{wishlist.length}</span>}
          </button>
          <button onClick={goToAccount} className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#12131a] transition hover:-translate-y-1 hover:bg-[#d7ff38]" aria-label={user ? 'Open account dashboard' : 'Log in'}>{user ? <UserRound className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}</button>
          {user && <button onClick={logout} className="hidden h-11 w-11 place-items-center rounded-full border-2 border-[#12131a] transition hover:-translate-y-1 hover:bg-[#d7ff38] sm:grid" aria-label="Log out"><LogOut className="h-5 w-5" /></button>}
          <button onClick={() => setCartOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-[#12131a] transition hover:-translate-y-1 hover:bg-[#d7ff38]" aria-label={`Open cart, ${cartCount} items`}>
            <ShoppingBag className="h-5 w-5" />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#3155ff] px-1 text-[10px] font-black text-white">{cartCount}</span>}
          </button>
        </div>
      </header>}

      <main id="top">
        {!customizations.hideHero && <section id="hero" onClick={() => editMode && onSelectSection?.('hero')} className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 pt-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-20 lg:pt-14">
          <div className="pulse-in max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em]"><span className="h-2 w-2 rounded-full bg-[#3155ff]" /> {customizations.heroEyebrow || 'Fresh drops, zero filler'}</p>
            <h1 onClick={() => editMode && onSelectSection?.('hero')} className="text-[clamp(3.8rem,9vw,8.6rem)] font-black leading-[.82] tracking-[-.09em]">{customizations.heroTitle || 'Good stuff.'}<br /><span className="text-[var(--pulse-primary)]">{customizations.heroAccent || 'Loudly.'}</span></h1>
            <p className="mt-8 max-w-md text-lg leading-8 text-black/60">{customizations.heroDescription || 'A high-energy edit of everyday objects, standout essentials, and pieces with something to say.'}</p>
            <a href="#shop" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#12131a] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:shadow-[5px_5px_0_#d7ff38]">{customizations.heroButtonLabel || 'Explore the drop'} <ArrowUpRight className="h-4 w-4" /></a>
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-[var(--pulse-primary)] p-6 sm:min-h-[500px]">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-[#d7ff38]" />
            <div className="absolute bottom-6 left-6 z-10 max-w-[190px] rounded-2xl bg-[#d7ff38] p-5 text-sm font-black leading-5 shadow-[7px_7px_0_#12131a]">THE OBJECTS OF YOUR NEXT OBSESSION</div>
            {heroMedia ? (isHeroVideo ? <video src={heroMedia} autoPlay muted loop playsInline className="pulse-float absolute inset-10 h-[70%] w-[72%] rounded-[1.5rem] object-cover shadow-2xl sm:inset-16" /> : <img src={heroMedia} alt={products[0]?.name || seller.storeName} className="pulse-float absolute inset-10 h-[70%] w-[72%] rounded-[1.5rem] object-cover shadow-2xl sm:inset-16" />) : <div className="grid h-full place-items-center text-8xl">✦</div>}
          </div>
        </section>}

        {!customizations.hideMarquee && <div id="marquee" onClick={() => editMode && onSelectSection?.('marquee')} className="overflow-hidden border-y-2 border-[#12131a] bg-[#d7ff38] py-3 text-sm font-black uppercase tracking-[.2em]"><div className="pulse-marquee flex w-max"><span className="px-5">{customizations.marqueeText || 'New energy / new essentials / new energy / new essentials / '}</span><span className="px-5">{customizations.marqueeText || 'New energy / new essentials / new energy / new essentials / '}</span></div></div>}

        {!customizations.hideProductGrid && <section id="productGrid" onClick={() => editMode && onSelectSection?.('productGrid')} className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-3 text-xs font-black uppercase tracking-[.25em] text-[var(--pulse-primary)]">{customizations.productGridEyebrow || 'The current edit'}</p><h2 className="text-5xl font-black tracking-[-.08em] sm:text-7xl">{customizations.productGridTitle || 'Pick your pulse.'}</h2></div><div className="relative w-full lg:w-72"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the edit" className="w-full rounded-full border-2 border-black/15 bg-white/60 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#3155ff]" /></div></div>
          <div className="mb-10 flex gap-2 overflow-x-auto pb-2">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full border-2 px-5 py-2 text-xs font-black transition ${category === item ? 'border-[#12131a] bg-[#12131a] text-white' : 'border-black/15 bg-white/60 hover:border-[#3155ff]'}`}>{item}</button>)}</div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{filteredProducts.map((product, index) => <article key={product.id} onClick={() => setSelectedProduct(product)} className="pulse-in group cursor-pointer" style={{ animationDelay: `${index * 80}ms` }}><div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-white"><img src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><button onClick={(event) => { event.stopPropagation(); toggleWishlist(product.id); }} aria-label={`Wishlist ${product.name}`} className={`absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full backdrop-blur-md transition ${wishlist.includes(product.id) ? 'bg-[#d7ff38]' : 'bg-white/80 hover:bg-[#d7ff38]'}`}><Heart className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} /></button><button onClick={(event) => { event.stopPropagation(); addToCart(product); }} className="absolute bottom-4 left-4 right-4 flex translate-y-14 items-center justify-center gap-2 rounded-full bg-[#12131a] py-3 text-xs font-black text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">Add to bag <Plus className="h-4 w-4" /></button></div><p className="mt-4 text-[10px] font-black uppercase tracking-[.2em] text-[var(--pulse-primary)]">{product.category || 'Featured'}</p><div className="mt-1 flex items-start justify-between gap-3"><h3 className="font-black leading-tight">{product.name}</h3><span className="shrink-0 text-sm font-black">{formatPrice(product.price, seller.currency || 'USD')}</span></div></article>)}</div>
          {filteredProducts.length === 0 && <div className="rounded-3xl border-2 border-dashed border-black/20 py-20 text-center text-black/50">No pieces match that search yet.</div>}
        </section>}

        {!customizations.hideStory && <section id="story" onClick={() => editMode && onSelectSection?.('story')} className="mx-auto grid max-w-7xl gap-8 px-5 pb-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div className="relative min-h-[260px] overflow-hidden rounded-[2rem] bg-[#12131a] p-8 text-white sm:p-12">{(customizations.storyImageUrl || customizations.storyImage) && <img src={customizations.storyImageUrl || customizations.storyImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}<div className="relative"><Sparkles className="mb-12 h-8 w-8 text-[#d7ff38]" /><p className="text-3xl font-black leading-tight tracking-[-.05em] sm:text-5xl">{customizations.storyTitle || 'Less scrolling. More feeling.'}</p></div></div><div><p className="max-w-xl text-2xl font-black leading-tight tracking-[-.04em] sm:text-4xl">{customizations.storyLead || 'We find the pieces that make a room, a routine, or a whole mood click into place.'}</p><p className="mt-6 max-w-lg leading-7 text-black/60">{customizations.storyDescription || seller.description || 'Curated goods for curious people. Made to be used, loved, and noticed.'}</p></div></section>}
      </main>

      {!customizations.hideFooter && <footer id="footer" onClick={() => editMode && onSelectSection?.('footer')} className="border-t-2 border-[#12131a] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs font-bold uppercase tracking-[.16em] sm:flex-row sm:items-center sm:justify-between"><span>{customizations.headerLabel || seller.storeName || 'Pulse Supply'}</span><span>{customizations.footerTagline || 'Made for the next thing.'}</span><span className="flex gap-4"><a href={customizations.footerInstagramUrl || seller.socialLinks?.instagram || '#'} target="_blank" rel="noreferrer">Instagram</a><a href={customizations.footerFacebookUrl || seller.socialLinks?.facebook || '#'} target="_blank" rel="noreferrer">Facebook</a><a href={customizations.footerWebsiteUrl || '#'} target="_blank" rel="noreferrer">Website</a></span></div></footer>}

      {selectedProduct && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#12131a]/70 p-5 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}><div className="grid max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-[#f1f2ed] sm:grid-cols-2" onClick={event => event.stopPropagation()}><div className="relative min-h-[320px]"><img src={selectedProduct.images?.[0]} alt={selectedProduct.name} className="h-full w-full object-cover" /><button onClick={() => setSelectedProduct(null)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/85" aria-label="Close product details"><X className="h-5 w-5" /></button></div><div className="flex flex-col justify-center p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-[var(--pulse-primary)]">{selectedProduct.category || 'Featured'}</p><h2 className="mt-3 text-4xl font-black tracking-[-.07em]">{selectedProduct.name}</h2><p className="mt-4 text-2xl font-black">{formatPrice(selectedProduct.price, seller.currency || 'USD')}</p><p className="mt-6 leading-7 text-black/60">{selectedProduct.description || 'A considered piece for your everyday rotation.'}</p><button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="mt-8 rounded-full bg-[#12131a] px-6 py-4 text-sm font-black text-white transition hover:bg-[var(--pulse-primary)]">Add to bag</button></div></div></div>}

      {cartOpen && <div id="cart" className="fixed inset-0 z-[80] bg-black/30" onClick={() => setCartOpen(false)}><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f1f2ed] p-6 shadow-2xl sm:p-8" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between border-b border-black/10 pb-5"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[var(--pulse-primary)]">{customizations.cartTitle || 'Your bag'}</p><h2 className="mt-1 text-3xl font-black tracking-[-.06em]">{customizations.cartHeading || 'Ready to go?'}</h2></div><button onClick={() => setCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-black/15" aria-label="Close cart"><X className="h-5 w-5" /></button></div><div className="flex-1 space-y-4 overflow-y-auto py-6">{cart.length === 0 ? <p className="py-16 text-center text-black/50">{customizations.cartEmptyText || 'Your bag is waiting for a good idea.'}</p> : cart.map(item => <div key={item.product.id} className="flex gap-4 border-b border-black/10 pb-4"><img src={item.product.images?.[0]} alt="" className="h-20 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate font-black">{item.product.name}</p><p className="mt-1 text-sm text-black/60">{formatPrice(item.product.price, seller.currency || 'USD')}</p><div className="mt-3 flex items-center gap-3"><button onClick={() => changeQuantity(item.product.id, -1)} className="grid h-7 w-7 place-items-center rounded-full border border-black/15"><Minus className="h-3 w-3" /></button><span className="text-sm font-black">{item.quantity}</span><button onClick={() => changeQuantity(item.product.id, 1)} className="grid h-7 w-7 place-items-center rounded-full border border-black/15"><Plus className="h-3 w-3" /></button></div></div></div>)}</div><div className="border-t border-black/10 pt-5"><div className="mb-4 flex justify-between font-black"><span>Total</span><span>{formatPrice(cartTotal, seller.currency || 'USD')}</span></div><button onClick={beginCheckout} disabled={cart.length === 0} className="w-full rounded-full bg-[#12131a] py-4 text-sm font-black text-white transition hover:bg-[var(--pulse-primary)] disabled:cursor-not-allowed disabled:opacity-30">{customizations.cartCheckoutLabel || 'Continue to checkout'}</button></div></aside></div>}
    </div>
  );
};

export default NeonPulseStore;