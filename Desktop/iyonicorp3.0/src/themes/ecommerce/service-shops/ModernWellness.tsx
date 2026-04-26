import React, { useState } from 'react';
import { Product, Seller } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ArrowRight, Search, Menu, Instagram, Twitter, Facebook,
  X, Plus, Minus, Check, Mail, Phone, MapPin, Sparkles, MessageCircle, 
  Youtube, Linkedin, Globe, Briefcase, BarChart3, Users, Zap, Clock, 
  Calendar, ChevronRight, PenTool, Image, Video, Monitor, Layers, Palette,
  Wind, Heart, ShieldCheck, Sun, Moon, Leaf, Flower,
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
  Leaf,
  Flower,
  Sun,
  Moon,
  Wind,
  Heart,
  Sparkles,
  ShieldCheck,
  Zap,
  Briefcase,
  BarChart3,
  Users,
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
  Linkedin
};

const ServiceCard = ({
  service,
  onBookNow,
  currency = 'USD',
  themePrimary
}: {
  service: Product;
  onBookNow: (s: Product) => void;
  currency?: string;
  themePrimary: string;
}) => {
  return (
    <div className="group bg-white rounded-[2rem] p-10 hover:shadow-2xl hover:shadow-emerald-100 transition-all duration-700 flex flex-col h-full border border-emerald-50">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-10 group-hover:text-white transition-all duration-700"
        style={{ backgroundColor: `${themePrimary}15`, color: themePrimary }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${themePrimary}15`)}
      >
        <Leaf className="w-7 h-7" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block opacity-50" style={{ color: themePrimary }}>{service.category}</span>
      <h4 className="text-3xl font-serif text-emerald-950 mb-6 leading-tight group-hover:text-emerald-700 transition-colors" style={{ '--hover-color': themePrimary } as any}>
        {service.name}
      </h4>
      <p className="text-lg text-emerald-900/60 mb-10 leading-relaxed line-clamp-3 italic">
        {service.description}
      </p>
      <div className="mt-auto pt-10 border-t border-emerald-50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Starting at</span>
          <span className="text-3xl font-serif text-emerald-950">{formatPrice(service.price, currency)}</span>
        </div>
        <button 
          onClick={() => onBookNow(service)}
          className="px-10 py-5 text-white rounded-full font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-200"
          style={{ backgroundColor: themePrimary }}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

const ModernWellness: React.FC<ThemeProps> = ({
  seller: initialSeller,
  products,
  editMode = false,
  sellerData,
  onUpdateData,
  onUpdateThemeCustomization,
  onUpdateThemeColor,
  onImageUpload
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const seller = editMode && sellerData ? sellerData : initialSeller;
  const [view, setView] = useState<'home' | 'services'>('home');

  const themePrimary = seller.theme?.primaryColor || '#059669'; // emerald-600
  const customizations = seller.theme?.customizations || {};
  const mainBgColor = customizations.mainBgColor || '#FBFDFB';

  return (
    <div className="min-h-screen font-sans text-emerald-950 selection:bg-emerald-200 selection:text-emerald-900" style={{ backgroundColor: mainBgColor }}>
      {editMode && (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-emerald-100 space-y-4">
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

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto px-8 h-24 flex justify-between items-center">
          <div className="flex items-center gap-16">
            <div className="flex items-center gap-3 cursor-pointer group relative" onClick={() => setView('home')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:rotate-45 transition-transform duration-700" style={{ backgroundColor: themePrimary }}>
                <Flower className="text-white w-5 h-5" />
              </div>
              <span className="text-2xl font-serif tracking-tight text-emerald-900">{seller.storeName || 'Sereen.'}</span>
              {editMode && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Enter store name:', seller.storeName);
                    if (newName) onUpdateData?.('storeName', newName);
                  }}
                  className="absolute -top-2 -right-2 p-2 bg-white border border-emerald-100 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <nav className="hidden lg:flex items-center gap-10">
              {['About', 'Our Practice', 'Offerings', 'Resources'].map(item => (
                <button key={item} className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40 hover:text-emerald-900 transition-colors" style={{ '--hover-color': themePrimary } as any}>{item}</button>
              ))}
            </nav>
          </div>
          <button 
            onClick={() => navigate(user ? (user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard') : `/login?shop=${seller.id}`)}
            className="px-8 py-3.5 bg-emerald-900/5 text-emerald-900 border border-emerald-900/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
            style={{ '--hover-bg': themePrimary } as any}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(6, 78, 59, 0.05)')}
          >
            {user ? 'Dashboard' : 'Client Login'}
          </button>
        </div>
      </header>

      {view === 'home' && (
        <main>
          {/* Hero */}
          {customizations.hero_show !== false && (
            <section className="relative py-32 lg:py-48 overflow-hidden group/section">
              {editMode && (
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button 
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hero_show', false)}
                    className="p-2 bg-red-500 text-white rounded-full border border-emerald-100 hover:bg-red-600 transition-all shadow-lg"
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
                    className="p-2 bg-blue-500 text-white rounded-full border border-emerald-100 hover:bg-blue-600 transition-all shadow-lg"
                    title="Update Hero Image"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="max-w-7xl mx-auto px-8 relative z-10">
                <div className="grid lg:grid-cols-2 gap-24 items-center">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3 mb-10 relative group/badge">
                      <div className="w-8 h-px bg-emerald-200"></div>
                      <span 
                        className="text-[10px] font-black uppercase tracking-[0.4em]"
                        style={{ color: themePrimary }}
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_badge', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_badge || 'Reimagine Vitality'}
                      </span>
                      {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/badge:opacity-100 transition-all" />}
                    </div>
                    <h1 className="text-7xl lg:text-8xl font-serif text-emerald-950 leading-[0.95] mb-12 relative group/title">
                      <span 
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_1', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_title_1 || 'Finding'}
                      </span>
                      <br/>
                      <span 
                        className="italic"
                        style={{ color: themePrimary }}
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_2', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_title_2 || 'Inner Peace'}
                      </span>
                      <br/>
                      <span 
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_3', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                      >
                        {customizations.hero_title_3 || 'in Modernity.'}
                      </span>
                      {editMode && <Edit3 className="w-6 h-6 absolute -top-4 -right-4 opacity-0 group-hover/title:opacity-100 transition-all" />}
                    </h1>
                    <p 
                      className="text-xl text-emerald-900/60 leading-relaxed mb-16 italic font-medium relative group/desc"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateData?.('description', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {seller.description || "A holisitic sanctuary designed to help you reconnect with your natural rhythm and achieve optimal wellbeing."}
                      {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/desc:opacity-100 transition-all" />}
                    </p>
                    <div className="flex flex-wrap gap-8">
                      <button 
                        onClick={() => setView('services')}
                        className="px-12 py-6 text-white rounded-full font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl shadow-emerald-200"
                        style={{ backgroundColor: themePrimary }}
                      >
                        Begin Your Journey
                      </button>
                      <button className="flex items-center gap-4 group">
                        <div className="w-14 h-14 rounded-full border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-50 transition-all">
                          <Moon className="w-5 h-5 text-emerald-400 group-hover:text-emerald-600" style={{ '--hover-color': themePrimary } as any} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40 group-hover:text-emerald-900 transition-colors">Our Philosophy</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                     <div className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl">
                        <img 
                          src={customizations.heroImage || "https://images.unsplash.com/photo-1545208393-216c7addb00c?q=80&w=1974&auto=format&fit=crop"} 
                          className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-[3s]"
                          alt="Wellness"
                        />
                     </div>
                     <div className="absolute -bottom-12 -right-12 bg-white/80 backdrop-blur-2xl p-12 rounded-[3rem] shadow-2xl border border-emerald-50 hidden md:block">
                        <div className="flex flex-col gap-6">
                           <div className="flex items-center gap-6 relative group/stat1">
                              <Sun className="w-8 h-8 text-emerald-300" style={{ color: `${themePrimary}80` }} />
                              <div>
                                 <p className="text-3xl font-serif text-emerald-950">
                                   <span 
                                      contentEditable={editMode}
                                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_0_val', e.currentTarget.textContent)}
                                      suppressContentEditableWarning
                                   >
                                      {customizations.stat_0_val || 'Daily'}
                                   </span>
                                 </p>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300" style={{ color: `${themePrimary}80` }}>
                                   <span 
                                      contentEditable={editMode}
                                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_0_label', e.currentTarget.textContent)}
                                      suppressContentEditableWarning
                                   >
                                      {customizations.stat_0_label || 'Guided Rituals'}
                                   </span>
                                 </p>
                              </div>
                              {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/stat1:opacity-100 transition-all" />}
                           </div>
                           <div className="flex items-center gap-6 relative group/stat2">
                              <Wind className="w-8 h-8 text-emerald-300" style={{ color: `${themePrimary}80` }} />
                              <div>
                                 <p className="text-3xl font-serif text-emerald-950">
                                   <span 
                                      contentEditable={editMode}
                                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_1_val', e.currentTarget.textContent)}
                                      suppressContentEditableWarning
                                   >
                                      {customizations.stat_1_val || '12k+'}
                                   </span>
                                 </p>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300" style={{ color: `${themePrimary}80` }}>
                                   <span 
                                      contentEditable={editMode}
                                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_1_label', e.currentTarget.textContent)}
                                      suppressContentEditableWarning
                                   >
                                      {customizations.stat_1_label || 'Restored Lives'}
                                   </span>
                                 </p>
                              </div>
                              {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/stat2:opacity-100 transition-all" />}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Offerings */}
          {customizations.featured_show !== false && (
            <section className="py-40 group/featured relative" style={{ backgroundColor: mainBgColor }}>
              {editMode && (
                <button 
                  onClick={() => onUpdateThemeCustomization?.('featured', 'featured_show', false)}
                  className="absolute top-4 right-4 z-20 p-2 bg-red-500 text-white rounded-full border border-emerald-100 hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover/featured:opacity-100"
                  title="Hide Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="max-w-7xl mx-auto px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-32 text-center md:text-left">
                  <div className="max-w-xl">
                    <h2 
                      className="text-5xl font-serif text-emerald-950 mb-8 italic relative group/title"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('featured', 'title', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.featured_title || 'Cultivating Harmony.'}
                      {editMode && <Edit3 className="w-6 h-6 absolute -top-4 -right-4 opacity-0 group-hover/title:opacity-100 transition-all text-emerald-300" />}
                    </h2>
                    <p 
                      className="text-xl text-emerald-900/60 leading-relaxed font-serif italic relative group/subtitle"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('featured', 'subtitle', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.featured_subtitle || 'Discover our curated selection of holistic services designed to restore balance to your body, mind, and spirit.'}
                      {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/subtitle:opacity-100 transition-all text-emerald-300" />}
                    </p>
                  </div>
                  <button onClick={() => setView('services')} className="flex items-center gap-4 group text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900">
                    Explore Offerings
                    <div className="w-12 h-12 rounded-full border border-emerald-900/20 flex items-center justify-center group-hover:bg-emerald-900 group-hover:text-white transition-all" style={{ '--hover-bg': themePrimary } as any}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
                  {products.slice(0, 3).map(service => (
                    <ServiceCard 
                      key={service.id} 
                      service={service} 
                      onBookNow={() => {}}
                      themePrimary={themePrimary}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Testimonial Quote */}
          {customizations.testimonial_show !== false && (
            <section className="py-32 bg-[#FBFDFB] group/testimonial relative">
              {editMode && (
                <button 
                  onClick={() => onUpdateThemeCustomization?.('testimonial', 'testimonial_show', false)}
                  className="absolute top-4 right-4 z-20 p-2 bg-red-500 text-white rounded-full border border-emerald-100 hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover/testimonial:opacity-100"
                  title="Hide Section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
               <div className="max-w-5xl mx-auto px-8 text-center">
                  <Sparkles className="w-10 h-10 text-emerald-200 mx-auto mb-16" style={{ color: `${themePrimary}40` }} />
                  <h3 
                    className="text-4xl lg:text-6xl font-serif italic text-emerald-900/80 leading-snug mb-20 relative group/quote"
                    contentEditable={editMode}
                    onBlur={(e) => onUpdateThemeCustomization?.('testimonial', 'quote', e.currentTarget.textContent)}
                    suppressContentEditableWarning
                  >
                    {customizations.testimonial_quote || '"The most profound shift happened when I stopped trying to control the world and started nurturing my own inner landscape."'}
                    {editMode && <Edit3 className="w-8 h-8 absolute -top-6 -right-6 opacity-0 group-hover/quote:opacity-100 transition-all text-emerald-300" />}
                  </h3>
                  <div className="flex flex-col items-center">
                     <div className="w-20 h-20 rounded-full overflow-hidden mb-6 border-4 border-white shadow-xl relative group/avatar">
                        <img src={customizations.testimonial_avatar || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop"} className="w-full h-full object-cover" />
                        {editMode && (
                          <button 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) onImageUpload?.(file, 'story');
                              };
                              input.click();
                            }}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all"
                          >
                            <Upload className="text-white w-6 h-6" />
                          </button>
                        )}
                     </div>
                     <p 
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-950 relative group/author"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('testimonial', 'author', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                     >
                      {customizations.testimonial_author || 'Elena Rose'}
                      {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/author:opacity-100 transition-all text-emerald-300" />}
                     </p>
                     <p 
                      className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mt-1 relative group/role"
                      style={{ color: `${themePrimary}80` }}
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('testimonial', 'role', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                     >
                      {customizations.testimonial_role || 'Founding Member'}
                      {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/role:opacity-100 transition-all text-emerald-300" />}
                     </p>
                  </div>
               </div>
            </section>
          )}
        </main>
      )}

      {view === 'services' && (
        <main className="py-40 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-3xl mb-32">
               <h1 className="text-7xl lg:text-9xl font-serif text-emerald-950 leading-tight mb-12">Nurture <br/><span className="italic" style={{ color: themePrimary }}>Yourself.</span></h1>
               <p className="text-2xl text-emerald-900/50 italic leading-relaxed">Choose the path that resonates with your current needs.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
              {products.map(service => (
                <ServiceCard 
                  key={service.id} 
                  service={service} 
                  onBookNow={() => {}}
                  themePrimary={themePrimary}
                />
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-50/50 pt-40 pb-20 relative group/footer">
        {editMode && (
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button 
              onClick={() => {
                const newEmail = prompt('Enter contact email:', customizations.footer_email);
                if (newEmail) onUpdateThemeCustomization?.('footer', 'footer_email', newEmail);
              }}
              className="p-2 bg-emerald-800 text-white rounded-full border border-emerald-700 hover:bg-emerald-700 transition-all shadow-lg"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-24 mb-40">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 rounded-full flex items-center justify-center border border-emerald-500/20" style={{ backgroundColor: `${themePrimary}10` }}>
                  <Flower className="text-emerald-300 w-7 h-7" style={{ color: themePrimary }} />
                </div>
                <span className="text-3xl font-serif tracking-tight text-white">{seller.storeName || 'Sereen.'}</span>
              </div>
              <p 
                className="text-xl font-serif italic leading-relaxed max-w-sm mb-16 relative group/footer-desc"
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'description', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_description || 'Dedicated to the art of conscious living and sustainable wellness for the modern soul.'}
                {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 opacity-0 group-hover/footer-desc:opacity-100 transition-all text-emerald-300" />}
              </p>
              <div className="flex gap-10">
                {[Instagram, Twitter, Youtube].map((Icon, i) => (
                  <Icon key={i} className="w-6 h-6 hover:text-emerald-300 transition-all cursor-pointer opacity-40 hover:opacity-100" style={{ '--hover-color': themePrimary } as any} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/40 mb-10">The Studio</h4>
              <ul className="space-y-6 font-bold text-[10px] uppercase tracking-[0.2em]">
                <li><button onClick={() => setView('home')} className="hover:text-emerald-300 transition-colors" style={{ '--hover-color': themePrimary } as any}>Home</button></li>
                <li><button onClick={() => setView('services')} className="hover:text-emerald-300 transition-colors" style={{ '--hover-color': themePrimary } as any}>Practices</button></li>
                <li><button className="hover:text-emerald-300 transition-colors" style={{ '--hover-color': themePrimary } as any}>The Journal</button></li>
                <li><button className="hover:text-emerald-300 transition-colors" style={{ '--hover-color': themePrimary } as any}>Retreats</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/40 mb-10">Contact</h4>
              <p 
                className="text-white text-lg font-serif mb-2 relative group/footer-loc"
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'location_name', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_location_name || 'Ocean Drive Retreat'}
                {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/footer-loc:opacity-100 transition-all text-emerald-300" />}
              </p>
              <p 
                className="text-sm italic leading-relaxed mb-12 opacity-60 relative group/footer-addr"
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'address', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_address || 'Malibu, California 90265'}
                {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 opacity-0 group-hover/footer-addr:opacity-100 transition-all text-emerald-300" />}
              </p>
              <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3 group" style={{ color: themePrimary }}>
                Book a Visit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
          <div className="pt-20 border-t border-emerald-900/50 flex flex-col md:flex-row justify-between items-center gap-10">
             <span className="text-[10px] font-black uppercase tracking-[0.4em]">© 2026 {seller.storeName?.toUpperCase() || 'SEREEN'} WELLNESS GROUP</span>
             <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
               Handcrafted on <span className="text-white px-4 py-2 rounded-full" style={{ backgroundColor: themePrimary }}>Iyonicorp</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernWellness;
