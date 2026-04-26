import React, { useState, useEffect, useMemo } from 'react';
import { Product, Seller, ordersAPI, reviewsAPI, Review } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ArrowRight, Heart, Search, Menu, Instagram, Twitter, Facebook,
  ShieldCheck, RefreshCw, X, Plus, Minus, Check,
  Mail, Phone, MapPin, Sparkles, MessageCircle, Youtube, Linkedin, Globe,
  Briefcase, BarChart3, Users, Zap, Clock, Calendar, ChevronRight,
  Edit2, LayoutDashboard, Trash2, Edit3, Upload, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ThemeProps {
  seller: Seller;
  products: Product[];
  editMode?: boolean;
  sellerData?: Seller;
  onUpdateData?: (fieldPath: string, value: any) => void;
  onUpdateThemeCustomization?: (section: string, field: string, value: any) => void;
  onUpdateFeatureItem?: (index: number, field: 'title' | 'description', value: string) => void;
  onUpdateThemeColor?: (type: 'primary' | 'secondary', value: string) => void;
  onImageUpload?: (file: File, target: 'logo' | 'hero' | 'story') => void;
}

const ICON_MAP: Record<string, any> = {
  Briefcase,
  BarChart3,
  Users,
  Zap,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Calendar
};

type View = 'home' | 'services' | 'service-detail' | 'contact' | 'booking-success';

const ServiceCard = ({
  service,
  onViewDetail,
  onBookNow,
  currency = 'USD',
  themePrimary
}: {
  service: Product;
  onViewDetail: (s: Product) => void;
  onBookNow: (s: Product) => void;
  currency?: string;
  themePrimary: string;
}) => {
  return (
    <div className="group bg-white p-8 rounded-3xl border border-gray-100 hover:border-blue-500/20 hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:text-white transition-all duration-500"
        style={{ backgroundColor: `${themePrimary}15` }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${themePrimary}15`)}
      >
        <Briefcase className="w-7 h-7" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: themePrimary }}>{service.category}</span>
      <h4 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors" style={{ '--hover-color': themePrimary } as any}>{service.name}</h4>
      <p className="text-gray-500 mb-8 line-clamp-3 leading-relaxed">{service.description}</p>
      <div className="mt-auto pt-8 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Starting from</span>
          <span className="text-2xl font-black text-gray-900">{formatPrice(service.price, currency)}</span>
        </div>
        <button 
          onClick={() => onBookNow(service)}
          className="p-4 text-white rounded-2xl transition-all shadow-lg"
          style={{ backgroundColor: themePrimary }}
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const EliteConsulting: React.FC<ThemeProps> = ({
  seller: initialSeller,
  products,
  editMode = false,
  sellerData,
  onUpdateData,
  onUpdateThemeCustomization,
  onUpdateThemeColor,
  onImageUpload
}) => {
  const seller = editMode && sellerData ? sellerData : initialSeller;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('home');
  const [selectedService, setSelectedService] = useState<Product | null>(null);

  const themePrimary = seller.theme?.primaryColor || '#2563eb';
  const customizations = seller.theme?.customizations || {};
  const mainBgColor = customizations.mainBgColor || '#ffffff';

  const initialStats = [
    { label: customizations.stat_0_label ?? 'Success Rate', value: customizations.stat_0_val ?? '98%' },
    { label: customizations.stat_1_label ?? 'Enterprises', value: customizations.stat_1_val ?? '500+' },
  ];

  return (
    <div className="min-h-screen font-sans text-gray-900 selection:text-white" style={{ backgroundColor: mainBgColor, '--selection-bg': themePrimary } as any}>
      {editMode && (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm font-black uppercase">Theme Color</span>
              <input 
                type="color" 
                value={themePrimary}
                onChange={(e) => onUpdateThemeColor?.('primary', e.target.value)}
                className="w-12 h-12 rounded-xl cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm font-black uppercase">Background</span>
              <input 
                type="color" 
                value={mainBgColor}
                onChange={(e) => onUpdateThemeCustomization?.('global', 'mainBgColor', e.target.value)}
                className="w-12 h-12 rounded-xl cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-24 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3 cursor-pointer group relative" onClick={() => setView('home')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: themePrimary }}>
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase italic">{seller.storeName || 'Elite Strategy'}</span>
              {editMode && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Enter store name:', seller.storeName);
                    if (newName) onUpdateData?.('storeName', newName);
                  }}
                  className="absolute -top-2 -right-2 p-2 bg-white border border-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="hidden lg:flex items-center gap-8">
              {['Expertise', 'Solutions', 'Insights', 'Case Studies'].map(l => (
                <button key={l} className="text-xs font-bold text-gray-500 hover:text-blue-600 uppercase tracking-widest transition-colors" style={{ '--hover-color': themePrimary } as any}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(user ? (user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard') : `/login?shop=${seller.id}`)}
              className="hidden md:block text-xs font-black uppercase tracking-widest text-gray-900 hover:text-blue-600" 
              style={{ '--hover-color': themePrimary } as any}
            >
              {user ? 'Dashboard' : 'Client Portal'}
            </button>
            <button 
              onClick={() => setView('contact')}
              className="px-8 py-3.5 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-100"
              style={{ backgroundColor: themePrimary }}
            >
              Book Consultation
            </button>
          </div>
        </div>
      </nav>

      {view === 'home' && (
        <main>
          {/* Hero Section */}
          {customizations.hero_show !== false && (
            <section className="relative pt-20 pb-32 overflow-hidden bg-gray-50 group/section">
              {editMode && (
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button 
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hero_show', false)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                    title="Hide Section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) onImageUpload?.(file, 'hero');
                      };
                      input.click();
                    }}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all shadow-lg"
                    title="Update Hero Image"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                  <div>
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-10 relative group/badge"
                      style={{ backgroundColor: `${themePrimary}15`, color: themePrimary }}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span 
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_badge', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_badge || 'Global Strategy Partners'}
                      </span>
                      {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/badge:opacity-100 transition-all" />}
                    </div>
                    <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-gray-900 mb-10 uppercase italic relative group/title">
                      <span 
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_1', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_title_1 || 'Precision'}
                      </span>
                      <br/>
                      <span 
                        className="not-italic"
                        style={{ color: themePrimary }}
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_2', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_title_2 || 'Innovation.'}
                      </span>
                      {editMode && <Edit3 className="w-6 h-6 absolute -top-4 -right-4 opacity-0 group-hover/title:opacity-100 transition-all" />}
                    </h1>
                    <p 
                      className="text-xl text-gray-500 mb-12 font-medium leading-relaxed max-w-lg relative group/desc"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateData?.('description', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {seller.description || "We provide data-driven strategic consulting for enterprises looking to navigate the complex digital landscape and scale exponentially."}
                      {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/desc:opacity-100 transition-all" />}
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <button 
                        onClick={() => setView('services')}
                        className="px-10 py-5 bg-gray-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl"
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
                      >
                        Explore Solutions
                      </button>
                      <div className="flex items-center gap-4 group cursor-pointer relative group/stats-link">
                         <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:bg-white transition-all group-hover:border-blue-600" style={{ '--hover-border': themePrimary } as any}>
                            <Clock className="w-5 h-5 text-gray-400 group-hover:text-blue-600" style={{ '--hover-color': themePrimary } as any} />
                         </div>
                         <span className="text-[10px] font-black uppercase tracking-widest">Book 15-min Intro</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative lg:h-[600px]">
                     <img 
                       src={customizations.heroImage || "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2074&auto=format&fit=crop"} 
                       className="w-full h-full object-cover rounded-[3rem] shadow-2xl"
                       alt="Corporate"
                     />
                     <div className="absolute -bottom-10 -left-10 bg-white p-10 rounded-[2.5rem] shadow-2xl hidden xl:block border border-gray-100">
                        <div className="flex items-center gap-6">
                           <div className="relative group/stat1">
                              <p className="text-4xl font-black tracking-tighter" style={{ color: themePrimary }}>
                                <span 
                                  contentEditable={editMode}
                                  onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_0_val', e.currentTarget.textContent)}
                                  suppressContentEditableWarning
                                >
                                  {customizations.stat_0_val || '98%'}
                                </span>
                              </p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span 
                                  contentEditable={editMode}
                                  onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_0_label', e.currentTarget.textContent)}
                                  suppressContentEditableWarning
                                >
                                  {customizations.stat_0_label || 'Success Rate'}
                                </span>
                              </p>
                              {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/stat1:opacity-100 transition-all" />}
                           </div>
                           <div className="w-px h-12 bg-gray-100"></div>
                           <div className="relative group/stat2">
                              <p className="text-4xl font-black text-gray-900 tracking-tighter">
                                <span 
                                  contentEditable={editMode}
                                  onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_1_val', e.currentTarget.textContent)}
                                  suppressContentEditableWarning
                                >
                                  {customizations.stat_1_val || '500+'}
                                </span>
                              </p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <span 
                                  contentEditable={editMode}
                                  onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_1_label', e.currentTarget.textContent)}
                                  suppressContentEditableWarning
                                >
                                  {customizations.stat_1_label || 'Enterprises'}
                                </span>
                              </p>
                              {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/stat2:opacity-100 transition-all" />}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Featured Solutions */}
          {customizations.featured_show !== false && (
            <section className="py-32 group/featured relative" style={{ backgroundColor: mainBgColor }}>
              {editMode && (
                <button 
                  onClick={() => onUpdateThemeCustomization?.('featured', 'featured_show', false)}
                  className="absolute top-4 right-4 z-20 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover/featured:opacity-100"
                  title="Hide Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex justify-between items-end mb-20">
                  <div>
                    <h2 
                      className="text-4xl font-black tracking-tighter uppercase italic mb-4 relative group/title"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('featured', 'title', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.featured_title || 'Core Expertise'}
                      {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/title:opacity-100 transition-all" />}
                    </h2>
                    <p 
                      className="text-gray-500 font-medium relative group/subtitle"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('featured', 'subtitle', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.featured_subtitle || 'Tailored strategies for modern business challenges.'}
                      {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/subtitle:opacity-100 transition-all" />}
                    </p>
                  </div>
                  <button onClick={() => setView('services')} className="hidden md:flex items-center gap-3 px-8 py-4 border-2 border-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all">
                     View All Solutions
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-10">
                  {products.slice(0, 3).map(service => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      onViewDetail={setSelectedService}
                      onBookNow={setSelectedService}
                      themePrimary={themePrimary}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Trust Banner */}
          {customizations.trust_show !== false && (
            <section className="py-24 bg-gray-900 text-white overflow-hidden group/trust relative">
              {editMode && (
                <button 
                  onClick={() => onUpdateThemeCustomization?.('trust', 'trust_show', false)}
                  className="absolute top-4 right-4 z-20 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover/trust:opacity-100"
                  title="Hide Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
               <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
                  <h3 
                    className="text-3xl font-light tracking-widest uppercase italic max-w-lg relative group/trust-title"
                    contentEditable={editMode}
                    onBlur={(e) => onUpdateThemeCustomization?.('trust', 'title', e.currentTarget.textContent)}
                    suppressContentEditableWarning
                  >
                    {customizations.trust_title || "Trusted by the world's most ambitious leaders."}
                    {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/trust-title:opacity-100 transition-all" />}
                  </h3>
                  <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale invert">
                     <span className="text-2xl font-black tracking-tighter uppercase italic">FORTUNE 500</span>
                     <span className="text-2xl font-black tracking-tighter uppercase italic">TECH GIANT</span>
                     <span className="text-2xl font-black tracking-tighter uppercase italic">GLOBAL BANK</span>
                  </div>
               </div>
            </section>
          )}
        </main>
      )}

      {view === 'services' && (
        <main className="py-32 bg-white">
           <div className="max-w-7xl mx-auto px-6">
              <h1 className="text-7xl font-black tracking-tighter uppercase italic mb-20 text-center">Our Solutions.</h1>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                {products.map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onViewDetail={setSelectedService}
                    onBookNow={setSelectedService}
                    themePrimary={themePrimary}
                  />
                ))}
              </div>
           </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-white pt-32 pb-16 border-t border-gray-100 relative group/footer">
        {editMode && (
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button 
              onClick={() => {
                const newEmail = prompt('Enter contact email:', customizations.footer_email);
                if (newEmail) onUpdateThemeCustomization?.('footer', 'footer_email', newEmail);
              }}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all shadow-lg"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: themePrimary }}>
                  <BarChart3 className="text-white w-7 h-7" />
                </div>
                <span className="text-3xl font-black tracking-tighter uppercase italic">{seller.storeName || 'Elite Strategy'}</span>
              </div>
              <p 
                className="text-gray-500 font-medium text-lg leading-relaxed max-w-sm mb-12 relative group/footer-desc"
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'description', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_description || 'Empowering organizations with the clarity and tools needed to achieve sustainable growth in an era of constant change.'}
                {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/footer-desc:opacity-100 transition-all" />}
              </p>
              <div className="flex gap-8">
                {[Linkedin, Twitter, Youtube].map((Icon, i) => (
                  <Icon key={i} className="w-6 h-6 text-gray-300 hover:text-blue-600 transition-all cursor-pointer" style={{ '--hover-color': themePrimary } as any} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-10">Service Hub</h4>
              <ul className="space-y-5 font-black text-xs uppercase tracking-widest">
                <li><button onClick={() => setView('home')} className="hover:text-blue-600 transition-colors" style={{ '--hover-color': themePrimary } as any}>Home</button></li>
                <li><button onClick={() => setView('services')} className="hover:text-blue-600 transition-colors" style={{ '--hover-color': themePrimary } as any}>Expertise</button></li>
                <li><button className="hover:text-blue-600 transition-colors" style={{ '--hover-color': themePrimary } as any}>Client Studies</button></li>
                <li><button className="hover:text-blue-600 transition-colors" style={{ '--hover-color': themePrimary } as any}>Insights</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-10">Headquarters</h4>
              <p 
                className="font-bold text-gray-900 mb-2 relative group/footer-loc"
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'location_name', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_location_name || 'Financial District'}
                {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/footer-loc:opacity-100 transition-all" />}
              </p>
              <p 
                className="text-gray-500 text-sm leading-relaxed mb-8 relative group/footer-addr"
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'address', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_address || 'One World Trade Center, New York, NY 10007'}
                {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/footer-addr:opacity-100 transition-all" />}
              </p>
              <button className="flex items-center gap-2 font-black text-xs uppercase tracking-widest" style={{ color: themePrimary }}>
                Get Directions
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="pt-16 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-10">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">© 2026 {seller.storeName}. All rights reserved.</p>
            <div className="flex items-center gap-3 text-gray-400 font-black text-[10px] uppercase tracking-widest">
              Powered by <span className="text-white bg-blue-600 px-3 py-1 rounded-lg" style={{ backgroundColor: themePrimary }}>Iyonicorp</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EliteConsulting;
