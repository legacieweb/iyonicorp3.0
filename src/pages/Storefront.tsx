import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import axios from 'axios';
import BotWidget from '../components/BotWidget';
import { uploadAPI, productsAPI, botsAPI } from '../services/api';
import { normalizeThemeId } from '../utils/themeDashboard';
import EventoSite from '../platforms/services/events/evento/EventoSite';
import { 
  Edit3, 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon
} from 'lucide-react';

// Lazy load themes - Product Shop Themes
const ModernEcommerce = lazy(() => import('../themes/ecommerce/product-shops/ModernEcommerce'));
const LuxuryBoutique = lazy(() => import('../themes/ecommerce/product-shops/LuxuryBoutique'));
const BeautyStore = lazy(() => import('../themes/ecommerce/product-shops/BeautyStore'));
const ShoeStore = lazy(() => import('../themes/ecommerce/product-shops/ShoeStore'));
const JewelryStore = lazy(() => import('../themes/ecommerce/product-shops/JewelryStore'));
const BakeryStore = lazy(() => import('../themes/ecommerce/product-shops/BakeryStore'));
const CoutureStore = lazy(() => import('../themes/ecommerce/product-shops/CoutureStore'));
const NeonPulseStore = lazy(() => import('../themes/ecommerce/product-shops/NeonPulseStore'));

// Lazy load themes - Service Shop Themes
const EliteConsulting = lazy(() => import('../themes/ecommerce/service-shops/EliteConsulting'));
const CreativeStudio = lazy(() => import('../themes/ecommerce/service-shops/CreativeStudio'));
const ModernWellness = lazy(() => import('../themes/ecommerce/service-shops/ModernWellness'));
const TamiraSalonSite = lazy(() => import('../platforms/services/beauty/salon/tamira-salon/TamiraSalonSite'));
const AuraSalonSite = lazy(() => import('../platforms/services/beauty/salon/aura-salon/AuraSalonSite'));
const CraftCollectiveSite = lazy(() => import('../platforms/marketplace/craft-collective/CraftCollectiveSite'));
const EventPlannerSite = lazy(() => import('../platforms/services/events/event-planner/EventPlannerSite'));
const PulseFitSite = lazy(() => import('../platforms/services/fitness/pulse-fit/PulseFitSite'));
const StillwaterSpa = lazy(() => import('../platforms/services/beauty/spa/StillwaterSpa'));
const HomeworkerSite = lazy(() => import('../platforms/services/education/homeworker/HomeworkerSite'));
const CarRentalSite = lazy(() => import('../platforms/transport/car-rental/CarRentalSite'));
const RestaurantSite = lazy(() => import('../platforms/services/restaurant/RestorantSite'));
const PosSite = lazy(() => import('../platforms/services/pos/point-of-sale/PosSite'));
const ApexPosSite = lazy(() => import('../platforms/services/pos/apex-pos/ApexPosSite'));
const InstagramVipRestaurant = lazy(() => import('../themes/instagram-vip/InstagramVipRestaurant'));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2823/api';

const EDITABLE_SECTIONS = [
  { id: 'header', label: 'Header', hideKey: 'hideHeader', fields: [{ key: 'headerLabel', label: 'Brand label' }, { key: 'headerShopLabel', label: 'Shop link' }, { key: 'headerStoryLabel', label: 'Story link' }, { key: 'headerContactLabel', label: 'Contact link' }, { key: 'headerWishlistLabel', label: 'Wishlist label' }, { key: 'headerAccountLabel', label: 'Account label' }, { key: 'headerCartLabel', label: 'Cart label' }] },
  { id: 'hero', label: 'Hero', hideKey: 'hideHero', fields: [{ key: 'heroEyebrow', label: 'Eyebrow' }, { key: 'heroTitle', label: 'Title' }, { key: 'heroAccent', label: 'Accent title' }, { key: 'heroDescription', label: 'Description' }, { key: 'heroButtonLabel', label: 'Hero button' }] },
  { id: 'marquee', label: 'Marquee', hideKey: 'hideMarquee', fields: [{ key: 'marqueeText', label: 'Scrolling text' }] },
  { id: 'productGrid', label: 'Product grid', hideKey: 'hideProductGrid', fields: [{ key: 'productGridEyebrow', label: 'Eyebrow' }, { key: 'productGridTitle', label: 'Title' }] },
  { id: 'story', label: 'Story', hideKey: 'hideStory', fields: [{ key: 'storyTitle', label: 'Title' }, { key: 'storyLead', label: 'Lead' }, { key: 'storyDescription', label: 'Description' }] },
  { id: 'newsletter', label: 'Newsletter', hideKey: 'hideNewsletter', fields: [{ key: 'newsletterTitle', label: 'Title' }, { key: 'newsletterSubtitle', label: 'Subtitle' }, { key: 'newsletterButtonLabel', label: 'Button label' }] },
  { id: 'footer', label: 'Footer', hideKey: 'hideFooter', fields: [{ key: 'footerTagline', label: 'Tagline' }, { key: 'footerInstagramUrl', label: 'Instagram URL' }, { key: 'footerFacebookUrl', label: 'Facebook URL' }, { key: 'footerWebsiteUrl', label: 'Website URL' }] },
  { id: 'cart', label: 'Cart', fields: [{ key: 'cartTitle', label: 'Cart title' }, { key: 'cartEmptyText', label: 'Empty cart message' }, { key: 'cartCheckoutLabel', label: 'Checkout button' }] },
  { id: 'checkout', label: 'Checkout', fields: [{ key: 'checkoutTitle', label: 'Checkout title' }, { key: 'checkoutSubtitle', label: 'Checkout subtitle' }, { key: 'checkoutSubmitLabel', label: 'Place order button' }] },
  { id: 'confirmation', label: 'Confirmation', fields: [{ key: 'confirmationTitle', label: 'Confirmation title' }, { key: 'confirmationMessage', label: 'Confirmation message' }, { key: 'confirmationHomeLabel', label: 'Home button' }, { key: 'confirmationTrackLabel', label: 'Track button' }] }
];

const EDITOR_DEFAULTS: Record<string, string> = {
  headerLabel: 'Your store name',
  headerShopLabel: 'Shop',
  headerStoryLabel: 'The edit',
  headerContactLabel: 'Contact',
  headerWishlistLabel: 'Wishlist',
  headerAccountLabel: 'Account',
  headerCartLabel: 'Cart',
  heroEyebrow: 'Fresh drops, zero filler',
  heroTitle: 'Good stuff.',
  heroAccent: 'Loudly.',
  heroDescription: 'A high-energy edit of everyday objects, standout essentials, and pieces with something to say.',
  heroButtonLabel: 'Explore the drop',
  marqueeText: 'New energy / new essentials / new energy / new essentials / ',
  productGridEyebrow: 'The current edit',
  productGridTitle: 'Pick your pulse.',
  storyTitle: 'Less scrolling. More feeling.',
  storyLead: 'We find the pieces that make a room, a routine, or a whole mood click into place.',
  storyDescription: 'Curated goods for curious people. Made to be used, loved, and noticed.',
  newsletterTitle: 'Join the Inner Circle.',
  newsletterSubtitle: 'Subscribe for exclusive early access to drops and modern lifestyle insights.',
  newsletterButtonLabel: 'Join Now',
  footerTagline: 'Made for the next thing.',
  cartTitle: 'Your bag',
  cartEmptyText: 'Your bag is waiting for a good idea.',
  cartCheckoutLabel: 'Continue to checkout',
  checkoutTitle: 'Secure Checkout.',
  checkoutSubtitle: 'Finalize your order and choose your preferences',
  checkoutSubmitLabel: 'Confirm & Place Order',
  confirmationTitle: 'Order Confirmed.',
  confirmationMessage: 'Thank you for choosing us. Your order has been successfully placed and a confirmation email is on its way.',
  confirmationHomeLabel: 'Back to Home',
  confirmationTrackLabel: 'Track Order'
};

const SECTION_ORDER = ['header', 'hero', 'features', 'productGrid', 'story', 'newsletter', 'consult', 'footer', 'cart', 'checkout', 'confirmation', 'code', 'global'];
const SECTION_LABELS: Record<string, string> = {
  header: 'Header', hero: 'Hero', features: 'Features', productGrid: 'Product grid', story: 'Story',
  newsletter: 'Newsletter', consult: 'Consultation', footer: 'Footer', cart: 'Cart', checkout: 'Checkout', confirmation: 'Confirmation', code: 'CSS & embeds', global: 'Global'
};
const SECTION_HIDE_KEYS: Record<string, string> = {
  header: 'hideHeader', hero: 'hideHero', features: 'hideFeatures', productGrid: 'hideProductGrid', story: 'hideStory', newsletter: 'hideNewsletter', consult: 'hideConsult', footer: 'hideFooter'
};

const sanitizeThemeCss = (value: string) => value
  .replace(/<[^>]*>/g, '')
  .replace(/@import/gi, '')
  .replace(/url\s*\(/gi, 'blocked(')
  .replace(/expression\s*\(/gi, 'blocked(')
  .replace(/behavior\s*:/gi, 'blocked:')
  .replace(/javascript\s*:/gi, 'blocked:')
  .replace(/-moz-binding\s*:/gi, 'blocked:');

const SecureEmbed: React.FC<{ code?: string }> = ({ code }) => {
  const match = code?.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (!match) return null;
  try {
    const url = new URL(match[1], window.location.origin);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
    return <div className="mx-auto my-8 w-full max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-white"><iframe src={url.toString()} title="Embedded store content" loading="lazy" referrerPolicy="no-referrer" className="h-96 w-full border-0" sandbox="allow-scripts allow-same-origin" /></div>;
  } catch {
    return null;
  }
};

const scanThemeSections = (themeId: string, customizations: Record<string, any>) => {
  const sections = new Map<string, { id: string; label: string; hideKey?: string; fields: { key: string; label: string }[] }>();
  SECTION_ORDER.forEach(id => sections.set(id, { id, label: SECTION_LABELS[id], hideKey: SECTION_HIDE_KEYS[id], fields: [] }));
  sections.get('code')?.fields.push({ key: 'customCss', label: 'Global CSS' }, { key: 'embedCode', label: 'Safe iframe embed' });

  Object.keys(customizations).forEach(key => {
    const normalizedKey = key.toLowerCase();
    const matchedPrefix = ['header', 'hero', 'story', 'newsletter', 'footer', 'cart', 'checkout', 'confirmation', 'productgrid', 'consult'].find(prefix => normalizedKey.startsWith(prefix));
    const sectionId = key.startsWith('feature_') || key.startsWith('stat_')
      ? 'features'
      : matchedPrefix === 'productgrid' ? 'productGrid' : matchedPrefix || key.split('_')[0];
    const section = sections.get(sectionId) || sections.get('global');
    if (!section || section.fields.some(field => field.key === key) || key.startsWith('hide')) return;
    section.fields.push({ key, label: key.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()) });
  });

  const baseFields = themeId === 'neon-pulse'
    ? EDITABLE_SECTIONS.flatMap(section => section.fields.map(field => ({ section: section.id, ...field })))
    : [];
  baseFields.forEach(field => {
    const section = sections.get(field.section);
    if (section && !section.fields.some(existing => existing.key === field.key)) section.fields.push({ key: field.key, label: field.label });
  });

  return SECTION_ORDER.map(id => sections.get(id)!).filter(section => section.fields.length > 0 || Boolean(section.hideKey));
};

const demoEventDate = (daysFromNow: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

const MOCK_PRODUCTS: Record<string, any[]> = {
  evento: [
    { id: 'demo-event-1', name: 'A Table Among the Trees', price: 48, description: `An open-air supper club with a seasonal menu and live acoustic set.\nDate: ${demoEventDate(22)}\nTime: 18:30\nDuration: 180 min\nCapacity: 80`, category: 'SUPPER CLUB', type: 'service', status: 'active' },
    { id: 'demo-event-2', name: 'The City in Motion', price: 22, description: `A guided photo walk through the old quarter, ending at the riverfront.\nDate: ${demoEventDate(36)}\nTime: 10:00\nDuration: 150 min\nCapacity: 24`, category: 'CITY WALK', type: 'service', status: 'active' },
    { id: 'demo-event-3', name: 'Sunday Sound Sessions', price: 35, description: `An intimate afternoon of emerging artists, shared plates, and good conversation.\nDate: ${demoEventDate(48)}\nTime: 15:00\nDuration: 210 min\nCapacity: 60`, category: 'LIVE MUSIC', type: 'service', status: 'active' },
  ],
  'neon-pulse': [
    { id: 'np1', name: 'Orbit Desk Lamp', price: 89, description: 'A sculptural lamp with a soft ambient glow.', images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800'], category: 'Home' },
    { id: 'np2', name: 'Studio Headphones', price: 149, description: 'Clear sound for deep work and late nights.', images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'], category: 'Tech' },
    { id: 'np3', name: 'Utility Tote', price: 64, description: 'A durable everyday carry with room to spare.', images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800'], category: 'Carry' },
    { id: 'np4', name: 'Form Bottle', price: 32, description: 'A clean-lined bottle built for daily motion.', images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800'], category: 'Everyday' },
  ],
  'modern-ecommerce': [
    { id: 'm1', name: 'Minimalist Watch', price: 120, description: 'A sleek minimalist watch for everyday wear.', images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400'], category: 'Accessories' },
    { id: 'm2', name: 'Leather Bag', price: 250, description: 'Premium leather bag with spacious compartments.', images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400'], category: 'Fashion' },
    { id: 'm3', name: 'Canvas Sneakers', price: 85, description: 'Comfortable canvas sneakers for casual outings.', images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400'], category: 'Footwear' },
    { id: 'm4', name: 'Cotton T-Shirt', price: 35, description: '100% organic cotton t-shirt in various colors.', images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400'], category: 'Fashion' },
  ],
  'luxury-boutique': [
    { id: 'l1', name: 'Diamond Necklace', price: 4500, description: 'Exquisite diamond necklace set in 18k gold.', images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=400'], category: 'Jewelry' },
    { id: 'l2', name: 'Silk Evening Gown', price: 1200, description: 'Elegant silk gown for special occasions.', images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=400'], category: 'Apparel' },
    { id: 'l3', name: 'Gold Chronograph', price: 8500, description: 'Luxury gold watch with intricate mechanical movement.', images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=400'], category: 'Watches' },
    { id: 'l4', name: 'Designer Heels', price: 950, description: 'Sophisticated designer heels with premium finish.', images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=400'], category: 'Footwear' },
  ],
  'beauty-store': [
    { id: 'b1', name: 'Hydrating Serum', price: 45, description: 'Deeply hydrating serum with hyaluronic acid.', images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400'], category: 'Skincare' },
    { id: 'b2', name: 'Matte Lipstick', price: 28, description: 'Long-lasting matte lipstick in various shades.', images: ['https://images.unsplash.com/photo-1586776977607-310e9c725c37?auto=format&fit=crop&q=80&w=400'], category: 'Makeup' },
    { id: 'b3', name: 'Organic Face Oil', price: 55, description: 'Pure organic face oil for a radiant glow.', images: ['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=400'], category: 'Skincare' },
    { id: 'b4', name: 'Vitamin C Cream', price: 42, description: 'Brightening vitamin C cream for all skin types.', images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=400'], category: 'Skincare' },
  ],
  'shoe-store': [
    { id: 's1', name: 'Air Max Genesis', price: 180, description: 'Revolutionary cushioning for maximum comfort.', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400'], category: 'Performance' },
    { id: 's2', name: 'Urban Glide', price: 120, description: 'Sleek design for city life.', images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=400'], category: 'Lifestyle' },
    { id: 's3', name: 'Trail Blazer', price: 150, description: 'Durable grip for any terrain.', images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=400'], category: 'Outdoor' },
    { id: 's4', name: 'Retro High', price: 210, description: 'Classic silhouette with a modern twist.', images: ['https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&q=80&w=400'], category: 'Exclusive' },
  ],
  'jewelry-store': [
    { id: 'j1', name: 'Infinity Diamond Ring', price: 3200, description: 'Stunning infinity design with brilliant cut diamonds.', images: ['https://images.unsplash.com/photo-1605100804763-247f67b35534?auto=format&fit=crop&q=80&w=400'], category: 'Rings' },
    { id: 'j2', name: 'Sapphire Drop Earrings', price: 1850, description: 'Deep blue sapphires set in 18k white gold.', images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=400'], category: 'Earrings' },
    { id: 'j3', name: 'Gold Link Bracelet', price: 950, description: 'Hand-polished 24k gold links with secure clasp.', images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400'], category: 'Bracelets' },
    { id: 'j4', name: 'Emerald Pendant', price: 2400, description: 'Bespoke emerald pendant with gold surround.', images: ['https://images.unsplash.com/photo-1599643478518-a174fc92a5ce?auto=format&fit=crop&q=80&w=400'], category: 'Necklaces' },
  ],
  'bakery-store': [
    { id: 'ba1', name: 'Butter Croissant', price: 4.5, description: 'Flaky, buttery, and golden brown.', images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400'], category: 'Pastries' },
    { id: 'ba2', name: 'Sourdough Loaf', price: 8.0, description: 'Naturally leavened with a crisp crust.', images: ['https://images.unsplash.com/photo-1585478259715-876a6a81fc08?auto=format&fit=crop&q=80&w=400'], category: 'Bread' },
    { id: 'ba3', name: 'Macaron Box', price: 24.0, description: 'Assorted flavors of French macarons.', images: ['https://images.unsplash.com/photo-1570784332176-fdd73da66f03?auto=format&fit=crop&q=80&w=400'], category: 'Sweets' },
    { id: 'ba4', name: 'Artisan Baguette', price: 5.5, description: 'Traditional French baguette.', images: ['https://images.unsplash.com/photo-1597079910443-60c43fc4f729?auto=format&fit=crop&q=80&w=400'], category: 'Bread' },
  ],
  'couture-store': [
    { id: 'c1', name: 'Silk Evening Gown', price: 2400, description: 'Hand-sewn silk gown in obsidian black.', images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=400'], category: 'Gowns' },
    { id: 'c2', name: 'Tailored Blazer', price: 1200, description: 'Structured wool blazer with sharp lapels.', images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=400'], category: 'Outerwear' },
    { id: 'c3', name: 'Velvet Trousers', price: 850, description: 'High-waisted wide-leg velvet pants.', images: ['https://images.unsplash.com/photo-1594633312681-425c7b97cd31?auto=format&fit=crop&q=80&w=400'], category: 'Trousers' },
    { id: 'c4', name: 'Sheer Mesh Top', price: 450, description: 'Avant-garde mesh top with delicate embroidery.', images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400'], category: 'Tops' },
  ],
  'elite-consulting': [
    { id: 'e1', name: 'Strategic Market Entry', price: 5000, description: 'Comprehensive analysis and roadmap for entering new global markets.', category: 'Strategy' },
    { id: 'e2', name: 'Digital Transformation', price: 8500, description: 'End-to-end modernization of your business operations and tech stack.', category: 'Innovation' },
    { id: 'e3', name: 'Executive Leadership Coaching', price: 2500, description: '1-on-1 performance optimization for C-suite executives.', category: 'Consulting' },
    { id: 'e4', name: 'M&A Due Diligence', price: 12000, description: 'Rigorous financial and operational vetting for mergers and acquisitions.', category: 'Finance' },
  ],
  'creative-studio': [
    { id: 'cs1', name: 'Full Brand Identity', price: 3500, description: 'Logo, typography, color palette, and brand voice guidelines.', category: 'Branding' },
    { id: 'cs2', name: 'Custom Web Experience', price: 6000, description: 'High-performance, immersive digital experience built from scratch.', category: 'Development' },
    { id: 'cs3', name: 'Social Impact Campaign', price: 2800, description: 'Viral-ready content strategy and asset creation.', category: 'Marketing' },
    { id: 'cs4', name: 'UI/UX Audit', price: 1500, description: 'Deep dive into your product usability with actionable improvements.', category: 'Design' },
  ],
  'modern-wellness': [
    { id: 'mw1', name: 'Mindfulness Retreat', price: 1200, description: '3-day immersive experience in a serene natural setting.', category: 'Experience' },
    { id: 'mw2', name: 'Holistic Health Coaching', price: 450, description: 'Personalized nutrition and lifestyle optimization plan.', category: 'Consulting' },
    { id: 'mw3', name: 'Guided Meditation Series', price: 85, description: 'Lifetime access to our premium audio mindfulness library.', category: 'Digital' },
    { id: 'mw4', name: 'Aromatherapy Session', price: 150, description: 'In-person sensory healing experience using organic oils.', category: 'Healing' },
  ],
   'spa-retreat': [
    { id: 'spa1', name: 'Stillwater Signature Massage', price: 110, description: 'A slow, grounding full-body massage tailored to what you need today.', category: 'BODY RITUAL', type: 'service', status: 'active' },
    { id: 'spa2', name: 'Restorative Facial', price: 85, description: 'A gentle cleanse, botanical mask, and deeply hydrating facial massage.', category: 'SKIN RITUAL', type: 'service', status: 'active' },
    { id: 'spa3', name: 'Aromatic Stone Therapy', price: 135, description: 'Warm basalt stones and essential oils invite the whole body to soften.', category: 'BODY RITUAL', type: 'service', status: 'active' },
    { id: 'spa4', name: 'Quiet Hour Ritual', price: 175, description: 'A considered combination of massage and facial care, with time to linger.', category: 'SIGNATURE RITUAL', type: 'service', status: 'active' },
  ],
  'pulse-fit': [
    { id: 'pf1', name: 'Morning MetCon', price: 24, description: 'High-energy circuit training built for morning momentum and a sweat-drenched start. Duration: 45 min', category: 'CARDIO', type: 'service', status: 'active' },
    { id: 'pf2', name: 'Strength & Sculpt', price: 32, description: 'Full-body resistance work and targeted sculpting using dumbbells and bands. Duration: 55 min', category: 'STRENGTH', type: 'service', status: 'active' },
    { id: 'pf3', name: 'Mindful Flow', price: 28, description: 'Vinyasa yoga linked with breathwork for mobility and mental clarity. Duration: 60 min', category: 'YOGA', type: 'service', status: 'active' },
    { id: 'pf4', name: 'Box & Burn', price: 36, description: 'Boxing intervals and core finishers for conditioning and stress relief. Duration: 45 min', category: 'HIIT', type: 'service', status: 'active' },
  ],
  'event-planner': [
    { id: 'ev1', name: 'Full-Service Wedding', price: 3500, description: 'Complete wedding planning from concept to execution. Duration: 60 min', category: 'WEDDINGS', type: 'service', status: 'active', images: ['https://images.unsplash.com/photo-1519241026294-6ab6492a7c7c?auto=format&fit=crop&q=80&w=400'] },
    { id: 'ev2', name: 'Corporate Summit', price: 8500, description: 'End-to-end corporate event management for conferences and summits. Duration: 60 min', category: 'CORPORATE', type: 'service', status: 'active', images: ['https://images.unsplash.com/photo-1511571228318-85f1447d99b3?auto=format&fit=crop&q=80&w=400'] },
    { id: 'ev3', name: 'Birthday Celebration', price: 1200, description: 'Planning and styling for milestone birthday parties. Duration: 60 min', category: 'CELEBRATIONS', type: 'service', status: 'active', images: ['https://images.unsplash.com/photo-1532634862675-3f7e2a4d5bdc?auto=format&fit=crop&q=80&w=400'] },
    { id: 'ev4', name: 'Social Gala', price: 4800, description: 'Black-tie event planning with design, catering, and entertainment coordination. Duration: 60 min', category: 'GALAS', type: 'service', status: 'active', images: ['https://images.unsplash.com/photo-1511767117316-2e9e9ab9f6e1?auto=format&fit=crop&q=80&w=400'] },
  ],
};

export const Storefront: React.FC = () => {
  const { subdomain } = useParams<{ subdomain: string }>();
  const location = useLocation();
  const { tenant, isLoading: contextLoading, refreshTenant } = useTenant();
  const { sellers, products, updateSeller } = useData();
  const [editMode, setEditMode] = useState(false);
  const [sellerData, setSellerData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localTenant, setLocalTenant] = useState<any>(null);
  const [tenantProducts, setTenantProducts] = useState<any[]>([]);
  const [tenantProductsLoading, setTenantProductsLoading] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [activeEditorSection, setActiveEditorSection] = useState<string | null>(null);
  const editorThemeId = (localTenant?.themeId || localTenant?.theme?.selectedTheme || tenant?.themeId || tenant?.theme?.selectedTheme || 'modern-ecommerce').toString().toLowerCase();
  const editorSections = scanThemeSections(editorThemeId, sellerData?.theme?.customizations || {});

  const getEditorValue = (field: string) => {
    const customizations = sellerData?.theme?.customizations || {};
    if (customizations[field] !== undefined && customizations[field] !== '') return customizations[field];
    if (field === 'headerLabel') return sellerData?.storeName || EDITOR_DEFAULTS[field];
    if (field === 'footerInstagramUrl') return sellerData?.socialLinks?.instagram || '';
    if (field === 'footerFacebookUrl') return sellerData?.socialLinks?.facebook || '';
    return EDITOR_DEFAULTS[field] || '';
  };
  const { user } = useAuth();

  const isSellerOfThisStore = Boolean(user && user.role === 'seller' && tenant && user.id === tenant.userId);

  useEffect(() => {
    setTenantProducts([]);
    setBots([]);

    if (tenant) {
      setLocalTenant(tenant);
      // Load seller data for editing
      const seller = sellers.find(s => s.id === tenant.id);
      if (seller) {
        setSellerData(seller);
      } else if (tenant.id === 'demo-seller') {
        setSellerData(tenant);
      }

      // Fetch tenant products if not demo
      if (tenant.id !== 'demo-seller') {
        setTenantProductsLoading(true);
        productsAPI.getBySellerId(tenant.id)
          .then(setTenantProducts)
          .catch(err => {
            console.error('Error fetching tenant products:', err);
            setTenantProducts([]);
          })
          .finally(() => setTenantProductsLoading(false));
        // Fetch bots for this seller using subdomain
        if (tenant.subdomain && tenant.subdomain !== 'demo') {
          botsAPI.getBySubdomain(tenant.subdomain)
            .then(setBots)
            .catch(err => {
              console.error('Error fetching bots:', err);
              setBots([]);
            });
        }
      }
    } else {
      setTenantProductsLoading(false);
    }
  }, [tenant, sellers]);

  // Handler for updating seller data
  const handleUpdateData = (fieldPath: string, value: any) => {
    if (!sellerData) return;
    
    const fields = fieldPath.split('.');
    if (fields.length === 1) {
      setSellerData({ ...sellerData, [fieldPath]: value });
    } else {
      const nested = fields.slice(0, -1).reduce((obj, key) => obj[key], sellerData);
      if (nested) {
        setSellerData({
          ...sellerData,
          [fields[0]]: {
            ...nested,
            [fields[1]]: value
          }
        });
      }
    }
  };

  // Handler for updating nested theme customizations
  const updateThemeCustomization = (section: string, field: string, value: any) => {
    setSellerData((currentSellerData: any) => {
      if (!currentSellerData) return currentSellerData;
      const currentTheme = currentSellerData.theme || {};
      const currentCustomizations = currentTheme.customizations || {};
      const socialFieldMap: Record<string, string> = {
        footerInstagramUrl: 'instagram',
        footerFacebookUrl: 'facebook'
      };
      const socialField = socialFieldMap[field];
      return {
        ...currentSellerData,
        socialLinks: socialField ? { ...(currentSellerData.socialLinks || {}), [socialField]: value } : currentSellerData.socialLinks,
        theme: {
          ...currentTheme,
          customizations: {
            ...currentCustomizations,
            [field]: value
          }
        }
      };
    });
  };

  // Handler for updating features items
  const updateFeatureItem = (index: number, field: 'title' | 'description', value: string) => {
    if (!sellerData?.theme?.customizations?.features?.items) return;
    
    const items = [...sellerData.theme.customizations.features.items];
    items[index] = { ...items[index], [field]: value };
    
    setSellerData({
      ...sellerData,
      theme: {
        ...sellerData.theme,
        customizations: {
          ...sellerData.theme.customizations,
          features: {
            ...sellerData.theme.customizations.features,
            items
          }
        }
      }
    });
  };

  // Handler for theme colors
  const handleUpdateThemeColor = (type: 'primary' | 'secondary', value: string) => {
    if (!sellerData) return;
    const currentTheme = sellerData.theme || {};
    setSellerData({
      ...sellerData,
      theme: {
        ...currentTheme,
        [type === 'primary' ? 'primaryColor' : 'secondaryColor']: value
      }
    });
  };

  // Image upload handler
  const handleImageUpload = async (file: File, target: 'logo' | 'hero' | 'story') => {
    try {
      const urls = await uploadAPI.upload([file]);
      if (urls && urls.length > 0) {
        const imageUrl = urls[0];
        if (target === 'logo') {
          handleUpdateData('logo', imageUrl);
        } else if (target === 'hero') {
          updateThemeCustomization('hero', 'heroImage', imageUrl);
          updateThemeCustomization('hero', 'heroMediaUrl', '');
        } else if (target === 'story') {
          updateThemeCustomization('story', 'storyImage', imageUrl);
          updateThemeCustomization('story', 'storyImageUrl', '');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

   // Save handler
   const handleSaveCustomization = async () => {
     if (!sellerData || !tenant) return;
     
     setIsSaving(true);
     try {
       await updateSeller(tenant.id, {
         storeName: sellerData.storeName,
         description: sellerData.description,
         logo: sellerData.logo,
         subdomain: sellerData.subdomain,
         shippingPolicy: sellerData.shippingPolicy,
         returnPolicy: sellerData.returnPolicy,
         privacyPolicy: sellerData.privacyPolicy,
         termsOfService: sellerData.termsOfService,
         additionalPages: sellerData.additionalPages || [],
        socialLinks: sellerData.socialLinks || {},
        contactInfo: sellerData.contactInfo || {},
         theme: sellerData.theme || {}
       });
       
       // Update local tenant to reflect changes immediately
       setLocalTenant((prev: any) => ({ 
         ...prev, 
         ...sellerData 
       }));
       
       await refreshTenant();
       
       alert('Customizations saved successfully!');
       setEditMode(false);
     } catch (error) {
       console.error('Error saving customizations:', error);
       alert('Failed to save customizations. Please try again.');
     } finally {
       setIsSaving(false);
     }
   };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (editMode) {
      // Cancel editing - reload seller data
      const seller = sellers.find(s => s.id === tenant?.id);
      if (seller) {
        setSellerData(seller);
      }
    }
    setEditMode(!editMode);
  };

  const showLoading = contextLoading || (Boolean(tenant && tenant.id !== 'demo-seller') && tenantProductsLoading);
  if (showLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        {tenant?.logo ? (
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-75"></div>
            <img 
              src={tenant.logo} 
              alt={tenant.name} 
              className="relative w-24 h-24 object-contain rounded-2xl shadow-xl"
            />
          </div>
        ) : (
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
        )}
        <h2 className="text-2xl font-black text-gray-900 animate-pulse tracking-tight">
          {tenant?.name || 'Loading Store...'}
        </h2>
      </div>
    );
  }

  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  const renderTheme = () => {
    if (!tenant) {
      // Fallback: use default demo with theme from URL
      console.log('No tenant in Storefront, using fallback');
      let themeParam = new URLSearchParams(window.location.search).get('theme');
      
      // Check hash for hash routing
      if (!themeParam && window.location.hash.includes('?')) {
        const hashParts = window.location.hash.split('?');
        if (hashParts.length > 1) {
          themeParam = new URLSearchParams(hashParts[1]).get('theme');
        }
      }
      
      themeParam = themeParam || 'modern-ecommerce';
      console.log('Using theme from URL:', themeParam);
      const isAuraSalonPreview = normalizeThemeId(themeParam) === 'aura-salon';
      const fallbackTenant = {
        id: 'demo-seller',
        name: isAuraSalonPreview ? 'Aura Salon theme preview' : 'Demo Store',
        subdomain: 'demo',
        shopType: isAuraSalonPreview ? 'service' : 'product',
        description: isAuraSalonPreview
          ? 'Theme preview only. Salon details and appointment requests appear when configured on a live store.'
          : 'Welcome to our demo store. This is a preview of our theme.',
        themeId: themeParam,
        logo: '',
        theme: { selectedTheme: themeParam },
        deliveryLocations: [
          { id: 'dl1', name: 'Nairobi CBD', fee: 200, enabled: true },
          { id: 'dl2', name: 'Westlands', fee: 300, enabled: true },
          { id: 'dl3', name: 'Mombasa Road', fee: 400, enabled: true }
        ],
        currency: 'KES'
      };
      return renderWithTenant(fallbackTenant);
    }

    return renderWithTenant(tenant);
  };

  const renderWithTenant = (t: any) => {
    // Use themeId directly from tenant (which now includes URL param for demo mode)
    const rawThemeId = t.themeId || t.theme?.selectedTheme || 'modern-ecommerce';
    const activeThemeId = normalizeThemeId(rawThemeId);
    console.log('Rendering theme:', activeThemeId, 'tenant:', t, 'raw:', rawThemeId, 'products:', products.length);
    
    // Get products: prefer actual seller products for live stores or preview of real stores
    const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
    let themeProducts;
    if (t.id !== 'demo-seller' && t.subdomain !== 'demo') {
      // Live stores must use products fetched for this tenant; never substitute demo products.
      themeProducts = tenantProducts;
    } else {
      // Use mock products only for the generic "demo" store
      themeProducts = activeThemeId === 'aura-salon'
        ? []
        : MOCK_PRODUCTS[activeThemeId] || MOCK_PRODUCTS['modern-ecommerce'] || [];
    }

    // Base props that all themes accept
    const baseProps = {
      seller: {
        ...t,
        id: t.id,
        userId: t.userId || '',
        storeName: t.name,
        subdomain: t.subdomain,
        shopType: t.shopType as 'product' | 'service',
        description: t.description,
        theme: t.theme,
        shippingPolicy: t.shippingPolicy,
        returnPolicy: t.returnPolicy,
        privacyPolicy: t.privacyPolicy,
        termsOfService: t.termsOfService,
        additionalPages: t.additionalPages,
        socialLinks: t.socialLinks,
        contactInfo: t.contactInfo,
        logo: t.logo,
        deliveryLocations: t.deliveryLocations,
        paymentTerms: t.paymentTerms,
        subscription: t.subscription || { plan: 'starter', status: 'active', startDate: null, endDate: null },
        pricingConfig: t.pricingConfig,
        currency: t.currency || 'USD',
        stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
        isLive: !isPreview,
        createdAt: '',
        paymentGateways: t.paymentGateways
      } as any,
      products: themeProducts
    };

    // Edit mode props for inline customization (only passed to themes that support it)
    const editProps = editMode ? {
      editMode,
      sellerData,
      onUpdateData: handleUpdateData,
      onUpdateThemeCustomization: updateThemeCustomization,
      onUpdateFeatureItem: updateFeatureItem,
      onUpdateThemeColor: handleUpdateThemeColor,
      onImageUpload: handleImageUpload,
      onSelectSection: (section: string) => {
        setActiveEditorSection(section);
        document.getElementById(section === 'productGrid' ? 'shop' : section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      hideInlineEditor: true
    } : {};

    const checkoutRequested = new URLSearchParams(window.location.search).get('checkout') === 'true'
      || window.location.hash.includes('?checkout=true');
    if (checkoutRequested && activeThemeId !== 'modern-ecommerce') {
      return <ModernEcommerce {...baseProps} {...editProps} />;
    }

    console.log('Active theme:', activeThemeId, 'tenant.subdomain:', t.subdomain, 'products:', themeProducts.length);
    
    switch (activeThemeId) {
      case 'evento':
        return <EventoSite seller={baseProps.seller} products={themeProducts} demoMode={t.id === 'demo-seller' || t.subdomain === 'demo'} />;
      case 'neon-pulse':
        console.log('Rendering NeonPulseStore');
        return <NeonPulseStore {...baseProps} {...editProps} />;
      case 'modern-wellness':
        console.log('Rendering ModernWellness');
        return <ModernWellness {...baseProps} {...editProps} />;
      case 'tamira-salon':
        return <TamiraSalonSite seller={baseProps.seller} products={themeProducts} />;
      case 'aura-salon':
        return <AuraSalonSite seller={baseProps.seller} products={themeProducts} />;
      case 'craft-collective':
        return <CraftCollectiveSite seller={baseProps.seller} products={themeProducts} />;
      case 'point-of-sale':
        return <PosSite seller={baseProps.seller} products={themeProducts} />;
      case 'apex-pos':
        return <ApexPosSite seller={baseProps.seller} products={themeProducts} />;
      case 'event-planner':
      case 'carnovga':
        return <EventPlannerSite seller={baseProps.seller} products={themeProducts} />;
      case 'pulse-fit':
        return <PulseFitSite seller={baseProps.seller} products={themeProducts} demoMode={t.id === 'demo-seller' || t.subdomain === 'demo'} />;
      case 'spa-retreat':
        return <StillwaterSpa seller={baseProps.seller} products={themeProducts} />;
      case 'homeworker':
        return <HomeworkerSite seller={baseProps.seller} products={themeProducts} demoMode={t.id === 'demo-seller' || t.subdomain === 'demo'} />;
      case 'car-rental':
          return <CarRentalSite seller={baseProps.seller} products={themeProducts} demoMode={t.id === 'demo-seller' || t.subdomain === 'demo'} />;
        case 'restaurant':
          return <RestaurantSite seller={baseProps.seller} products={themeProducts} demoMode={t.id === 'demo-seller' || t.subdomain === 'demo'} />;
        case 'instagram-vip':
          return <InstagramVipRestaurant {...baseProps} {...editProps} />;
        case 'creative-studio':
        console.log('Rendering CreativeStudio');
        return <CreativeStudio {...baseProps} {...editProps} />;
      case 'elite-consulting':
        console.log('Rendering EliteConsulting');
        return <EliteConsulting {...baseProps} {...editProps} />;
      case 'couture-store':
        console.log('Rendering CoutureStore');
        return <CoutureStore {...baseProps} {...editProps} />;
      case 'bakery-store':
        console.log('Rendering BakeryStore');
        return <BakeryStore {...baseProps} {...editProps} />;
      case 'jewelry-store':
        console.log('Rendering JewelryStore');
        return <JewelryStore {...baseProps} {...editProps} />;
      case 'shoe-store':
        console.log('Rendering ShoeStore');
        return <ShoeStore {...baseProps} {...editProps} />;
      case 'beauty-store':
        console.log('Rendering BeautyStore');
        return <BeautyStore {...baseProps} {...editProps} />;
      case 'luxury-boutique':
        console.log('Rendering LuxuryBoutique');
        return <LuxuryBoutique {...baseProps} {...editProps} />;
      case 'modern-ecommerce':
      default:
        console.log('Rendering ModernEcommerce');
        return <ModernEcommerce {...baseProps} {...editProps} />;
    }
  };

  const liveCustomizations = sellerData?.theme?.customizations || tenant?.theme?.customizations || {};
  const liveCustomCss = Object.entries(liveCustomizations)
    .filter(([key]) => key === 'customCss' || key.startsWith('sectionCss_'))
    .map(([, value]) => typeof value === 'string' ? value : '')
    .join('\n');

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <style dangerouslySetInnerHTML={{ __html: sanitizeThemeCss(liveCustomCss) }} />
      {renderTheme()}
      <SecureEmbed code={liveCustomizations.embedCode} />
      {bots && bots.length > 0 && <BotWidget bot={bots[0]} />}
      
      {/* Seller-only theme controls live in a right rail so the storefront stays unobstructed. */}
      {isSellerOfThisStore && !editMode && sellerData && (
        <button
          onClick={() => setEditMode(true)}
          className="fixed right-5 top-1/2 z-[60] flex -translate-y-1/2 items-center gap-2 rounded-l-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-2xl transition-all hover:bg-blue-700"
        >
          <Edit3 className="w-6 h-6" />
          <span>Edit theme</span>
        </button>
      )}
      
      {/* Save actions stay together with the theme controls. */}
      {editMode && isSellerOfThisStore && (
        <aside className="fixed right-0 top-0 z-[60] flex h-full w-[min(24rem,92vw)] flex-col overflow-hidden border-l border-gray-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Seller workspace</p>
              <h2 className="mt-2 text-xl font-black text-gray-900">Theme controls</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">Adjust your storefront while keeping the live preview in view.</p>
            </div>
            <button onClick={toggleEditMode} aria-label="Close theme controls" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Editable sections</p>
              <div className="grid grid-cols-2 gap-2">
                {editorSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => {
                      const nextSection = activeEditorSection === section.id ? null : section.id;
                      setActiveEditorSection(nextSection);
                      if (nextSection) document.getElementById(nextSection === 'productGrid' ? 'shop' : nextSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`rounded-xl border px-3 py-3 text-left text-xs font-black transition ${section.hideKey && sellerData?.theme?.customizations?.[section.hideKey] ? 'border-dashed border-gray-300 text-gray-400 line-through' : activeEditorSection === section.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
            {activeEditorSection && (
              <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Edit {editorSections.find(section => section.id === activeEditorSection)?.label}</p>
                {editorSections.find(section => section.id === activeEditorSection)?.fields.map(field => (
                  <label key={field.key} className="block text-xs font-bold text-gray-600">
                    {field.label}
                    <textarea
                      value={getEditorValue(field.key)}
                      onChange={(event) => updateThemeCustomization(activeEditorSection, field.key, event.target.value)}
                      placeholder="Leave blank to use the default"
                      rows={field.key.toLowerCase().includes('description') || field.key === 'storyLead' ? 3 : 2}
                      className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-blue-500"
                    />
                  </label>
                ))}
                {activeEditorSection === 'hero' && (
                  <div className="space-y-3 border-t border-blue-100 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Hero media</p>
                    {sellerData?.theme?.customizations?.heroMediaUrl || sellerData?.theme?.customizations?.heroImage ? (
                      <div className="overflow-hidden rounded-xl bg-gray-900">
                        {/\.(mp4|webm|mov)(\?.*)?$/i.test(sellerData.theme.customizations.heroMediaUrl || sellerData.theme.customizations.heroImage) ? (
                          <video src={sellerData.theme.customizations.heroMediaUrl || sellerData.theme.customizations.heroImage} muted controls className="h-28 w-full object-cover" />
                        ) : (
                          <img src={sellerData.theme.customizations.heroMediaUrl || sellerData.theme.customizations.heroImage} alt="Hero preview" className="h-28 w-full object-cover" />
                        )}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-white p-3 text-xs leading-5 text-gray-500">Using the first product image until you add hero media.</p>
                    )}
                    <label className="block cursor-pointer rounded-xl bg-blue-600 px-3 py-3 text-center text-xs font-black text-white transition hover:bg-blue-700">
                      Upload hero image
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0], 'hero')} />
                    </label>
                    <label className="block cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-xs font-black text-gray-700 transition hover:border-blue-400">
                      Upload hero video
                      <input type="file" accept="video/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0], 'hero')} />
                    </label>
                    <input
                      type="url"
                      value={sellerData?.theme?.customizations?.heroMediaUrl || ''}
                      onChange={(event) => updateThemeCustomization('hero', 'heroMediaUrl', event.target.value)}
                      placeholder="Paste an image or video URL"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                )}
                {activeEditorSection === 'story' && (
                  <div className="space-y-3 border-t border-blue-100 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Story media</p>
                    {sellerData?.theme?.customizations?.storyImage && <img src={sellerData.theme.customizations.storyImage} alt="Story preview" className="h-28 w-full rounded-xl object-cover" />}
                    <label className="block cursor-pointer rounded-xl bg-blue-600 px-3 py-3 text-center text-xs font-black text-white transition hover:bg-blue-700">
                      Upload story image
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0], 'story')} />
                    </label>
                    <input type="url" value={sellerData?.theme?.customizations?.storyImageUrl || ''} onChange={(event) => updateThemeCustomization('story', 'storyImageUrl', event.target.value)} placeholder="Paste a story image URL" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500" />
                  </div>
                )}
                {activeEditorSection && (
                  <div className="space-y-3 border-t border-blue-100 pt-4">
                    <label className="block text-xs font-bold text-gray-600">
                      Section CSS only
                      <textarea
                        value={getEditorValue(`sectionCss_${activeEditorSection}`)}
                        onChange={(event) => updateThemeCustomization(activeEditorSection, `sectionCss_${activeEditorSection}`, event.target.value)}
                        placeholder=".your-section { border-radius: 24px; }"
                        rows={activeEditorSection === 'code' ? 10 : 5}
                        spellCheck={false}
                        className="mt-1 w-full resize-y rounded-xl border border-gray-200 bg-gray-950 px-3 py-3 font-mono text-xs text-green-300 outline-none focus:border-blue-500"
                      />
                    </label>
                    <p className="text-[10px] leading-4 text-gray-500">CSS and layout styling only. Scripts, imports, URLs, and behavior rules are blocked.</p>
                  </div>
                )}
                {activeEditorSection === 'code' && (
                  <div className="space-y-3 border-t border-blue-100 pt-4">
                    <label className="block text-xs font-bold text-gray-600">Safe iframe embed code<textarea value={getEditorValue('embedCode')} onChange={(event) => updateThemeCustomization('global', 'embedCode', event.target.value)} placeholder={'<iframe src="https://example.com/embed"></iframe>'} rows={6} spellCheck={false} className="mt-1 w-full resize-y rounded-xl border border-gray-200 bg-gray-950 px-3 py-3 font-mono text-xs text-blue-200 outline-none focus:border-blue-500" /></label>
                    <p className="text-[10px] leading-4 text-gray-500">Only HTTPS iframe sources are rendered. Scripts, forms, event handlers, and arbitrary HTML are ignored.</p>
                  </div>
                )}
                {activeEditorSection === 'newsletter' && <p className="text-xs leading-5 text-gray-500">Newsletter is rendered by themes that include a signup section. Hide or restore it from the section control below.</p>}
                {activeEditorSection === 'footer' && <p className="text-xs leading-5 text-gray-500">Footer content follows your store name and contact settings.</p>}
              </div>
            )}
            {activeEditorSection && editorSections.find(section => section.id === activeEditorSection)?.hideKey && (
              <button
                onClick={() => {
                  const section = editorSections.find(item => item.id === activeEditorSection);
                  if (section?.hideKey) updateThemeCustomization(activeEditorSection, section.hideKey, !sellerData?.theme?.customizations?.[section.hideKey]);
                }}
                className="w-full rounded-xl border border-red-200 px-3 py-3 text-xs font-black text-red-600 transition hover:bg-red-50"
              >
                {sellerData?.theme?.customizations?.[editorSections.find(section => section.id === activeEditorSection)?.hideKey || ''] ? 'Restore section' : 'Delete section'}
              </button>
            )}
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Applied theme</p>
              <p className="mt-2 font-black text-gray-900">{sellerData?.theme?.selectedTheme || tenant?.themeId || 'Storefront theme'}</p>
            </div>
            <label className="flex items-center justify-between gap-4 text-sm font-bold text-gray-700">
              Primary color
              <input
                type="color"
                value={sellerData?.theme?.primaryColor || '#3b82f6'}
                onChange={(event) => handleUpdateThemeColor('primary', event.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm font-bold text-gray-700">
              Accent color
              <input
                type="color"
                value={sellerData?.theme?.customizations?.accentColor || sellerData?.theme?.secondaryColor || '#d7ff38'}
                onChange={(event) => updateThemeCustomization('theme', 'accentColor', event.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
              />
            </label>
          </div>
          <div className="mt-auto space-y-3">
            <button
              onClick={toggleEditMode}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <button
              onClick={handleSaveCustomization}
              disabled={isSaving || !sellerData}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </aside>
      )}
    </Suspense>
  );
};

export default Storefront;