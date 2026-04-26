import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { 
  Store, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Zap, 
  Globe, 
  ArrowRight,
  CheckCircle,
  Menu,
  X,
  Package,
  Layers,
  Sparkles,
  CreditCard,
  Truck,
  BarChart3,
  Palette,
  Code,
  Smartphone,
  Tablet,
  Monitor,
  Rocket,
  Shield,
  Headphones,
  Mail,
  ArrowUpRight,
  Hexagon,
  DollarSign,
  Globe2,
  Package2,
  Users2,
  FileText,
  Settings,
  BarChart,
  Twitter,
  Github,
  Linkedin,
  Youtube
} from 'lucide-react';
import { Button } from '../components/ui';

interface IyonicShopProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
  onSignIn?: () => void;
}

export const IyonicShop: React.FC<IyonicShopProps> = ({ onGetStarted, onSignIn }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'store' | 'sell' | 'manage'>('store');
  const [pricingRole, setPricingRole] = useState<'seller' | 'manager'>('seller');

  const pricing = {
    seller: [
      {
        name: "Starter",
        price: "0",
        desc: "Perfect for new sellers testing the waters.",
        features: ["Up to 10 Premium Products", "Standard Iyonicorp Templates", "Basic AI Analytics", "IyonicPay Integration"],
        buttonText: "Start for Free",
        color: "bg-gray-100 text-gray-900"
      },
      {
        name: "Professional",
        price: "29",
        desc: "Everything you need to grow your business.",
        features: ["Unlimited Products & Services", "Custom Domain (.com/.net)", "Advanced AI SEO Tools", "Zero Transaction Fees", "IyonicBot Assistant (Basic)"],
        buttonText: "Go Pro",
        color: "bg-indigo-600 text-white",
        popular: true
      },
      {
        name: "Enterprise",
        price: "99",
        desc: "Advanced features for high-volume stores.",
        features: ["Full AI Shop Automation", "Priority 24/7 Support", "Custom API Access", "Multi-staff Accounts", "Advanced Fraud Protection", "Dedicated Account Manager"],
        buttonText: "Contact Sales",
        color: "bg-gray-900 text-white"
      }
    ],
    manager: [
      {
        name: "Starter",
        price: "0",
        desc: "Ideal for new individual store managers.",
        features: ["Manage up to 3 sellers", "Standard reporting", "Email support"],
        buttonText: "Start for Free",
        color: "bg-gray-100 text-gray-900"
      },
      {
        name: "Professional",
        price: "49",
        desc: "Everything you need to grow your agency.",
        features: ["Manage up to 20 sellers", "Advanced AI analytics", "Priority support", "Custom AI features"],
        buttonText: "Go Pro",
        color: "bg-indigo-600 text-white",
        popular: true
      },
      {
        name: "Enterprise",
        price: "149",
        desc: "Advanced features for large scale management.",
        features: ["Unlimited sellers", "Dedicated account manager", "White-label options", "Full API Access", "Custom Manager Slug"],
        buttonText: "Contact Sales",
        color: "bg-gray-900 text-white"
      }
    ]
  };

  const categories = [
    { name: "Digital Goods", icon: Zap, desc: "Software, eBooks, Courses" },
    { name: "Physical Products", icon: Package, desc: "Fashion, Tech, Home" },
    { name: "Subscription Services", icon: Layers, desc: "Memberships, SaaS" },
    { name: "On-demand Services", icon: Sparkles, desc: "Consulting, Design" }
  ];

  const features = {
    store: [
      { title: 'Drag & Drop Builder', desc: 'Create stunning stores without code' },
      { title: 'Modern Layouts', desc: 'Beautifully designed templates' },
      { title: 'Mobile-First Design', desc: 'Looks great on every device' },
      { title: 'Custom Domains', desc: 'Your brand, your URL' }
    ],
    sell: [
      { title: 'Global Payments', desc: 'Accept 135+ currencies' },
      { title: 'Multiple Vendors', desc: 'Marketplace capabilities' },
      { title: 'Digital Products', desc: 'Instant delivery' },
      { title: 'Subscriptions', desc: 'Recurring revenue' }
    ],
    manage: [
      { title: 'Analytics Dashboard', desc: 'Real-time insights' },
      { title: 'Inventory Management', desc: 'Track stock levels' },
      { title: 'Order Processing', desc: 'Streamlined workflows' },
      { title: 'Customer CRM', desc: 'Build relationships' }
    ]
  };

  const stats = [
    { value: "10K+", label: "Active Stores", icon: Store },
    { value: "$150M+", label: "Annual Volume", icon: DollarSign },
    { value: "180+", label: "Countries", icon: Globe2 },
    { value: "99.99%", label: "Uptime", icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      <SEO 
        title="IyonicShop - Enterprise-Grade E-commerce Engine" 
        description="Launch your online empire with IyonicShop. High-conversion themes, integrated analytics, and multi-channel fulfillment for physical, digital, and subscription businesses."
        keywords="ecommerce engine, store builder, multi-vendor commerce, digital downloads, subscription management, IyonicShop"
        canonical="https://iyonicorp.com/iyonicshop"
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-xl font-black tracking-tighter text-gray-900">IYONICSHOP</span>
            </div>

            <div className="hidden lg:flex items-center space-x-2">
              {['Features', 'Categories', 'Pricing'].map((item) => (
                <button
                  key={item}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <Button variant="ghost" className="font-bold text-gray-700" onClick={onSignIn}>
                Log In
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-2.5 font-bold"
                onClick={() => onGetStarted?.('seller')}
              >
                Start Selling
              </Button>
            </div>

            <button className="lg:hidden p-2 text-gray-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 bg-indigo-600 rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-xs font-bold tracking-wider text-white uppercase">Version 2.0 Now Live</span>
          </motion.div>

          <h1 className="text-5xl lg:text-8xl font-black tracking-tighter text-gray-900 mb-8">
            Sell <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Anything</span><br />
            <span className="italic font-serif font-light">to Anywhere</span>
          </h1>

          <p className="text-xl lg:text-2xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            The world's most versatile e-commerce engine. Build beautiful stores, 
            manage inventory, and scale globally — all from one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-10 py-6 text-lg font-bold"
              onClick={() => onGetStarted?.('seller')}
            >
              Start Selling
              <Rocket className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="rounded-full px-10 py-6 text-lg font-bold"
              onClick={onSignIn}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
                  <stat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-black text-gray-900">{stat.value}</h3>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Can You Sell */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-4">
              Sell <span className="text-indigo-600">Anything</span>
            </h2>
            <p className="text-xl text-gray-500">
              Physical products, digital goods, services, or subscriptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-gray-50 rounded-3xl group hover:bg-white hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <cat.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{cat.name}</h3>
                <p className="text-gray-500 font-medium">{cat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Tabs */}
      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-500">
              Powerful tools to build, manage, and grow your business.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1.5 bg-white rounded-3xl shadow-lg">
              {[
                { id: 'store', label: 'Build', icon: Palette },
                { id: 'sell', label: 'Sell', icon: ShoppingCart },
                { id: 'manage', label: 'Manage', icon: BarChart }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all flex items-center space-x-2 ${
                    activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features[activeTab].map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-lg">
                <CheckCircle className="w-6 h-6 text-indigo-600 mb-4" />
                <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Device Preview */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6">
                Beautiful on <span className="text-indigo-600">Every Device</span>
              </h2>
              <p className="text-xl text-gray-500 mb-8">
                Your store automatically adapts to look stunning on desktop, tablet, and mobile. No extra work needed.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Monitor, text: 'Desktop optimized' },
                  { icon: Tablet, text: 'Tablet layouts' },
                  { icon: Smartphone, text: 'Mobile-first design' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3 text-lg font-semibold text-gray-700">
                    <item.icon className="w-6 h-6 text-indigo-600" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[48px] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img src="/logo.png" alt="Iyonicorp Logo" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                    <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl mb-4">
                  <div className="h-2 w-1/2 bg-white/30 rounded mb-2"></div>
                  <div className="h-2 w-1/3 bg-white/30 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <div className="h-2 w-16 bg-white/30 rounded mb-2"></div>
                    <div className="h-2 w-12 bg-white/20 rounded"></div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <div className="h-2 w-16 bg-white/30 rounded mb-2"></div>
                    <div className="h-2 w-12 bg-white/20 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-7xl font-black text-gray-900 mb-6 tracking-tighter">
              Ready to <span className="text-indigo-600">Scale?</span>
            </h2>
            
            {/* Role Toggle */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex p-1 bg-white rounded-2xl shadow-xl border border-gray-100">
                <button
                  onClick={() => setPricingRole('seller')}
                  className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                    pricingRole === 'seller' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  For Sellers
                </button>
                <button
                  onClick={() => setPricingRole('manager')}
                  className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                    pricingRole === 'manager' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  For Managers
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-8 max-w-6xl mx-auto md:grid-cols-3">
            {pricing[pricingRole].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-10 rounded-[2.5rem] border ${
                  plan.popular 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xl shadow-indigo-200' 
                  : 'bg-white text-gray-900 border-gray-100'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-indigo-600 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                    Recommended
                  </div>
                )}
                
                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                <p className={`text-sm mb-8 font-medium ${plan.popular ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black">${plan.price}</span>
                  <span className={`text-sm font-bold ml-2 ${plan.popular ? 'text-indigo-200' : 'text-gray-400'}`}>/month</span>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-3">
                      <CheckCircle className={`w-5 h-5 ${plan.popular ? 'text-indigo-300' : 'text-indigo-600'}`} />
                      <span className={`text-sm font-bold ${plan.popular ? 'text-white' : 'text-gray-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full py-6 rounded-2xl font-black text-lg transition-all ${
                    plan.popular 
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50' 
                    : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                  onClick={() => onGetStarted?.(pricingRole === 'seller' ? 'seller' : 'seller_manager')}
                >
                  {plan.buttonText}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-8 mb-16">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Store className="w-7 h-7 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter">IYONICSHOP</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed max-w-sm">
                The world's most versatile e-commerce engine. Build beautiful stores, manage inventory, and scale globally.
              </p>
              <div className="flex items-center space-x-3">
                {[
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Linkedin, href: '#', label: 'LinkedIn' },
                  { icon: Github, href: '#', label: 'GitHub' },
                  { icon: Youtube, href: '#', label: 'YouTube' }
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-indigo-600 hover:text-white transition-all"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-bold mb-6">Platform</h4>
              <ul className="space-y-4">
                {['Features', 'Pricing', 'Apps'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h4 className="font-bold mb-6">Developers</h4>
              <ul className="space-y-4">
                {['API Docs', 'Plugins', 'Integrations', 'Status'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold mb-6">Company</h4>
              <ul className="space-y-4">
                {[
                  { label: 'About', href: '#/about' },
                  { label: 'Careers', href: '#/careers' },
                  { label: 'Blog', href: '#/blog' },
                  { label: 'Press', href: '#/press' }
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-gray-400 hover:text-white transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold mb-6">Support</h4>
              <ul className="space-y-4">
                {[
                  { label: 'Help Center', href: '#/help-center' },
                  { label: 'Contact Us', href: '#/contact' },
                  { label: 'Community', href: '#/community' },
                  { label: 'Partners', href: '#/partners' }
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-gray-400 hover:text-white transition-colors">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="border-t border-white/10 pt-10 pb-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="font-bold text-lg mb-2">Start selling today</h4>
                <p className="text-gray-400">Build your store in minutes.</p>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center bg-white/10 rounded-full px-1 py-1 flex-1 lg:flex-none">
                  <Mail className="w-5 h-5 text-gray-400 ml-4" />
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="bg-transparent border-none outline-none text-white px-4 py-3 w-full lg:w-64 placeholder-gray-400"
                  />
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 py-3 font-bold">
                  Get Started
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col lg:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© 2026 IyonicShop. Powered by Iyonicorp.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IyonicShop;