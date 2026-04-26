import React, { useState } from 'react';
import { Product, Seller } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import {
  ArrowRight, Search, Menu, Instagram, Twitter, Facebook,
  X, Plus, Minus, Check, Mail, Phone, MapPin, Sparkles, MessageCircle, 
  Youtube, Linkedin, Globe, Briefcase, BarChart3, Users, Zap, Clock, 
  Calendar, ChevronRight, PenTool, Image, Video, Monitor, Layers, Palette,
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
  Zap,
  Sparkles,
  Layers,
  Palette,
  PenTool,
  Image,
  Video,
  Monitor,
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
  themePrimary,
}: {
  service: Product;
  onBookNow: (s: Product) => void;
  currency?: string;
  themePrimary?: string;
}) => {
  return (
    <div className="group relative bg-white border-[3px] border-black p-10 hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 flex flex-col h-full">
      <div className="absolute top-4 right-4 text-xs font-black uppercase tracking-widest bg-yellow-400 px-3 py-1 border-2 border-black">
        {service.category}
      </div>
      <div 
        className="w-16 h-16 border-4 border-black flex items-center justify-center text-white mb-10 group-hover:bg-cyan-400 transition-colors duration-300"
        style={{ backgroundColor: themePrimary || '#ec4899' }}
      >
        <Zap className="w-8 h-8 fill-current" />
      </div>
      <h4 className="text-3xl font-black text-black mb-6 uppercase tracking-tight leading-none group-hover:text-pink-600 transition-colors">
        {service.name}
      </h4>
      <p className="text-lg font-bold text-gray-700 mb-10 leading-snug line-clamp-3">
        {service.description}
      </p>
      <div className="mt-auto pt-8 border-t-4 border-black flex items-center justify-between">
        <span className="text-3xl font-black text-black">{formatPrice(service.price, currency)}</span>
        <button 
          onClick={() => onBookNow(service)}
          className="px-8 py-4 bg-black text-white font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all border-2 border-black"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

const CreativeStudio: React.FC<ThemeProps> = ({
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
  const themePrimary = seller.theme?.primaryColor || '#ec4899'; // Pink-500
  const customizations = seller.theme?.customizations || {};
  const mainBgColor = customizations.mainBgColor || '#fefce8'; // yellow-50

  const initialFeatures = [
    { 
      icon: customizations.feature_0_icon ?? 'Layers', 
      title: customizations.feature_0_title ?? 'Design', 
      description: customizations.feature_0_desc ?? 'Radical visual systems' 
    },
    { 
      icon: customizations.feature_1_icon ?? 'Monitor', 
      title: customizations.feature_1_title ?? 'Code', 
      description: customizations.feature_1_desc ?? 'Cutting-edge technology' 
    },
    { 
      icon: customizations.feature_2_icon ?? 'Zap', 
      title: customizations.feature_2_title ?? 'Impact', 
      description: customizations.feature_2_desc ?? 'Bold brand results' 
    }
  ];

  const initialStats = [
    { label: customizations.stat_0_label ?? 'Happy Clients', value: customizations.stat_0_val ?? '500+' },
  ];

  return (
    <div className="min-h-screen font-mono selection:bg-pink-500 selection:text-white" style={{ backgroundColor: mainBgColor }}>
      {editMode && (
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-black space-y-4">
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm font-black uppercase">Theme Color</span>
              <input 
                type="color" 
                value={themePrimary}
                onChange={(e) => onUpdateThemeColor?.('primary', e.target.value)}
                className="w-12 h-12 rounded-xl border-4 border-black cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-sm font-black uppercase">Background</span>
              <input 
                type="color" 
                value={mainBgColor}
                onChange={(e) => onUpdateThemeCustomization?.('global', 'mainBgColor', e.target.value)}
                className="w-12 h-12 rounded-xl border-4 border-black cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-8 h-24 flex justify-between items-center">
          <div className="flex items-center gap-10">
            <div className="cursor-pointer relative group" onClick={() => setView('home')}>
              <span className="text-4xl font-black uppercase tracking-tighter bg-black text-white px-6 py-2 border-4 border-black hover:bg-white hover:text-black transition-all">
                {seller.storeName || 'Crtv.Std'}
              </span>
              {editMode && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Enter store name:', seller.storeName);
                    if (newName) onUpdateData?.('storeName', newName);
                  }}
                  className="absolute -top-2 -right-2 p-2 bg-yellow-400 border-2 border-black rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <nav className="hidden xl:flex items-center gap-8">
              {['About', 'Services', 'Portfolio', 'Contact'].map(item => (
                <button key={item} className="text-sm font-black uppercase hover:underline decoration-4 underline-offset-4">{item}</button>
              ))}
              <button 
                onClick={() => navigate(user ? (user.role === 'customer' ? '/customer/dashboard' : '/seller/dashboard') : `/login?shop=${seller.id}`)}
                className="text-sm font-black uppercase hover:underline decoration-4 underline-offset-4"
              >
                {user ? 'Dashboard' : 'Login'}
              </button>
            </nav>
          </div>
          <button 
            onClick={() => setView('services')}
            className="px-8 py-4 text-white border-4 border-black font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            style={{ backgroundColor: themePrimary }}
          >
            Start Project
          </button>
        </div>
      </header>

      {view === 'home' && (
        <main>
          {/* Hero */}
          {customizations.hero_show !== false && (
            <section className="relative py-20 lg:py-40 bg-white border-b-4 border-black overflow-hidden group/section">
              {editMode && (
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button 
                    onClick={() => onUpdateThemeCustomization?.('hero', 'hero_show', false)}
                    className="p-2 bg-red-500 text-white rounded-full border-2 border-black hover:bg-red-600 transition-all"
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
                    className="p-2 bg-blue-500 text-white rounded-full border-2 border-black hover:bg-blue-600 transition-all"
                    title="Update Hero Image"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="max-w-[1440px] mx-auto px-8 relative z-10">
                <div className="max-w-4xl">
                  <div className="inline-block px-4 py-2 bg-cyan-400 border-4 border-black font-black uppercase tracking-widest text-sm mb-12 transform -rotate-2 relative group/badge">
                    <span 
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_badge', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.hero_badge || 'Award Winning Creative Agency'}
                    </span>
                    {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 text-black opacity-0 group-hover/badge:opacity-100 transition-all" />}
                  </div>
                  <h1 className="text-[10vw] lg:text-[8vw] font-black uppercase leading-[0.8] tracking-tighter text-black mb-16 italic relative group/title">
                    <span 
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_1', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.hero_title_1 || 'WE BUILD'}
                    </span>
                    <br/>
                    <span 
                      className="not-italic"
                      style={{ color: themePrimary }}
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_2', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.hero_title_2 || 'BOLD'}
                    </span>
                    {' '}
                    <span 
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('hero', 'hero_title_3', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.hero_title_3 || 'BRANDS.'}
                    </span>
                    {editMode && <Edit3 className="w-6 h-6 absolute -top-4 -right-4 text-black opacity-0 group-hover/title:opacity-100 transition-all" />}
                  </h1>
                  <p 
                    className="text-2xl lg:text-3xl font-bold text-gray-800 leading-tight mb-16 max-w-2xl relative group/desc"
                    contentEditable={editMode}
                    onBlur={(e) => onUpdateData?.('description', e.currentTarget.textContent)}
                    suppressContentEditableWarning
                  >
                    {seller.description || "We combine radical design with cutting-edge technology to help brands stand out in a noisy digital world."}
                    {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 text-black opacity-0 group-hover/desc:opacity-100 transition-all" />}
                  </p>
                  <div className="flex flex-wrap gap-8">
                    <button 
                      onClick={() => setView('services')}
                      className="px-12 py-6 bg-black text-white border-4 border-black font-black uppercase tracking-[0.2em] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all text-xl"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themePrimary)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#000')}
                    >
                      View Our Services
                    </button>
                    <div className="flex items-center gap-4 bg-white border-4 border-black p-4 transform rotate-1 relative group/stats">
                       <div className="flex -space-x-4">
                          {[1,2,3].map(i => (
                            <div key={i} className="w-12 h-12 rounded-full border-4 border-black bg-yellow-400" />
                          ))}
                       </div>
                       <span 
                        className="text-sm font-black uppercase"
                        contentEditable={editMode}
                        onBlur={(e) => onUpdateThemeCustomization?.('hero', 'stat_0_val', e.currentTarget.textContent)}
                        suppressContentEditableWarning
                       >
                        {customizations.stat_0_val || '500+'} Happy Clients
                       </span>
                       {editMode && <Edit3 className="w-3 h-3 absolute -top-1 -right-1 text-black opacity-0 group-hover/stats:opacity-100 transition-all" />}
                    </div>
                  </div>
                </div>
              </div>
              {/* Background elements */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
                <Layers className="w-[600px] h-[600px] text-black animate-pulse" />
              </div>
            </section>
          )}

          {/* Marquee */}
          {customizations.marquee_show !== false && (
            <div className="bg-black py-6 border-b-4 border-black overflow-hidden whitespace-nowrap group/marquee relative">
              {editMode && (
                <button 
                  onClick={() => onUpdateThemeCustomization?.('marquee', 'marquee_show', false)}
                  className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-full border-2 border-black opacity-0 group-hover/marquee:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
               <div className="inline-block animate-marquee-slower">
                  {[...Array(10)].map((_, i) => (
                    <span key={i} className="text-white text-4xl font-black uppercase tracking-widest mx-10 italic">
                      {customizations.marquee_text || 'Design • Code • Strategy • Brand • Social •'}
                    </span>
                  ))}
               </div>
            </div>
          )}

          {/* Featured Services */}
          {customizations.featured_show !== false && (
            <section className="py-32 group/featured relative" style={{ backgroundColor: mainBgColor }}>
              {editMode && (
                <button 
                  onClick={() => onUpdateThemeCustomization?.('featured', 'featured_show', false)}
                  className="absolute top-4 right-4 z-20 p-2 bg-red-500 text-white rounded-full border-2 border-black opacity-0 group-hover/featured:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="max-w-[1440px] mx-auto px-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-24">
                  <div>
                    <h2 
                      className="text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-none mb-6 relative group/title"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('featured', 'title', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.featured_title || 'Expertise.'}
                      {editMode && <Edit3 className="w-6 h-6 absolute -top-4 -right-4 text-black opacity-0 group-hover/title:opacity-100 transition-all" />}
                    </h2>
                    <p 
                      className="text-xl font-bold text-gray-600 max-w-lg relative group/subtitle"
                      contentEditable={editMode}
                      onBlur={(e) => onUpdateThemeCustomization?.('featured', 'subtitle', e.currentTarget.textContent)}
                      suppressContentEditableWarning
                    >
                      {customizations.featured_subtitle || "We don't do average. We do impact. Here's how we help you win."}
                      {editMode && <Edit3 className="w-4 h-4 absolute -top-2 -right-2 text-black opacity-0 group-hover/subtitle:opacity-100 transition-all" />}
                    </p>
                  </div>
                  <button onClick={() => setView('services')} className="px-10 py-5 bg-white border-4 border-black font-black uppercase hover:bg-cyan-400 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                    Full Service List
                  </button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
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
        </main>
      )}

      {view === 'services' && (
        <main className="py-32 bg-white">
          <div className="max-w-[1440px] mx-auto px-8">
            <h1 className="text-8xl lg:text-9xl font-black uppercase tracking-tighter text-center mb-32 italic underline decoration-[10px] underline-offset-[20px]" style={{ textDecorationColor: themePrimary }}>
              Services.
            </h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
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
      <footer className="bg-black text-white pt-40 pb-20 border-t-4 border-black relative group/footer">
        {editMode && (
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button 
              onClick={() => {
                const newEmail = prompt('Enter contact email:', customizations.footer_email);
                if (newEmail) onUpdateThemeCustomization?.('footer', 'footer_email', newEmail);
              }}
              className="p-2 bg-blue-500 text-white rounded-full border-2 border-black hover:bg-blue-600 transition-all"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 mb-40">
            <div>
              <h3 
                className="text-[15vw] lg:text-[10vw] font-black uppercase leading-[0.7] tracking-tighter italic mb-20 relative group/hello"
                style={{ color: customizations.footer_hello_color || '#facc15' }}
                contentEditable={editMode}
                onBlur={(e) => onUpdateThemeCustomization?.('footer', 'footer_hello_text', e.currentTarget.textContent)}
                suppressContentEditableWarning
              >
                {customizations.footer_hello_text || 'SAY HELLO.'}
                {editMode && <Edit3 className="w-10 h-10 absolute -top-8 -right-8 text-white opacity-0 group-hover/hello:opacity-100 transition-all" />}
              </h3>
              <div className="space-y-6">
                <p className="text-3xl font-black uppercase hover:text-pink-500 cursor-pointer transition-colors" style={{ '--hover-color': themePrimary } as any}>
                  {customizations.footer_email || 'hello@creative.std'}
                </p>
                <p className="text-3xl font-black uppercase hover:text-cyan-400 cursor-pointer transition-colors">
                  {customizations.footer_phone || '+1 555 123 4567'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-20">
              <div>
                <h4 className="text-sm font-black uppercase text-gray-500 mb-10 tracking-widest">Connect</h4>
                <ul className="space-y-6 text-2xl font-black uppercase">
                   {['Instagram', 'Dribbble', 'LinkedIn', 'Twitter'].map(s => (
                     <li key={s} className="hover:text-pink-500 cursor-pointer transition-colors" style={{ '--hover-color': themePrimary } as any}>{s}</li>
                   ))}
                </ul>
              </div>
              <div>
                 <h4 className="text-sm font-black uppercase text-gray-500 mb-10 tracking-widest">Studio</h4>
                 <p className="text-xl font-bold leading-relaxed mb-10">
                    {customizations.footer_address || 'Arts District, 742 Creative Ave, Los Angeles, CA 90013'}
                 </p>
                 <div className="w-16 h-16 bg-white border-4 border-black flex items-center justify-center text-black hover:bg-yellow-400 transition-colors" style={{ '--hover-bg': themePrimary } as any}>
                    <ArrowRight className="w-10 h-10" />
                 </div>
              </div>
            </div>
          </div>
          <div className="pt-20 border-t-4 border-white/20 flex flex-col md:flex-row justify-between items-center gap-10">
             <span className="text-lg font-black uppercase">© 2026 {seller.storeName?.toUpperCase() || 'CRTV.STD'} STUDIOS</span>
             <span className="px-6 py-2 bg-white text-black font-black uppercase">Built by Iyonicorp</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CreativeStudio;
