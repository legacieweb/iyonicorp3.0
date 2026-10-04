import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
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
  CreditCard,
  Bot,
  Sparkles,
  Layers,
  Code,
  Wallet,
  BarChart3,
  Shield,
  Headphones,
  Smartphone,
  Mail,
  ArrowUpRight,
  Hexagon,
  Send,
  Zap as ZapIcon,
  MessageSquare,
  Package
} from 'lucide-react';
import { Button } from '../components/ui';
import { HomepageFooter } from '../components/HomepageFooter';

interface HomepageProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
  onSignIn?: () => void;
  onOpenIyonicPay?: () => void;
  onOpenIyonicBots?: () => void;
}

const AnimatedCounter = ({ value, suffix = '' }: { value: string, suffix?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState(0);
  
  const numericValue = parseInt(value.replace(/\D/g, ''));
  
  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000;
      const increment = numericValue / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= numericValue) {
          setDisplayValue(numericValue);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [isInView, numericValue]);
  
  return <div ref={ref}>{displayValue.toLocaleString()}{suffix}</div>;
};

export const Homepage: React.FC<HomepageProps> = ({ onGetStarted, onSignIn, onOpenIyonicPay, onOpenIyonicBots }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  

  const products = [
    {
      id: 'iyonicshop',
      name: 'IyonicShop',
      tagline: 'Commerce Engine',
      description: 'Launch a polished storefront from a flexible theme system, then make it unmistakably yours.',
      icon: Store,
      color: 'from-blue-500 to-indigo-600',
      features: ['Theme-led storefront design', 'Code from scratch with APIs', 'Global shipping', 'Multi-currency'],
      cta: 'Continue',
      onClick: () => navigate('/iyonicshop')
    },
    {
      id: 'iyonicpay',
      name: 'IyonicPay',
      tagline: 'Payments & Wallet',
      description: 'Accept payments globally. Send, receive, and manage funds instantly.',
      icon: CreditCard,
      color: 'from-indigo-500 to-purple-600',
      features: ['Instant Transfers', 'Multi-currency', 'Virtual Cards', 'Bank-grade Security'],
      cta: 'Continue',
      onClick: () => onOpenIyonicPay ? onOpenIyonicPay() : navigate('/iyonicpay')
    },
    {
      id: 'iyonicbots',
      name: 'IyonicBots',
      tagline: 'AI Business Partners',
      description: 'AI-powered agents that sell, support, and engage customers 24/7.',
      icon: Bot,
      color: 'from-emerald-500 to-teal-600',
      features: ['Custom Training', 'Easy Deployment', '24/7 Support', 'Sales Automation'],
      cta: 'Continue',
      onClick: () => onOpenIyonicBots ? onOpenIyonicBots() : navigate('/iyonicbots')
    }
  ];

  const scrollToSection = (id: string) => {
    if (id === 'iyonicpay' && onOpenIyonicPay) {
      onOpenIyonicPay();
      return;
    }
    if (id === 'iyonicbots' && onOpenIyonicBots) {
      onOpenIyonicBots();
      return;
    }
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-gray-900 selection:text-white">
      <SEO 
        title="Home" 
        description="iyonicweb: The complete ecosystem for modern business. Scale with IyonicShop's high-performance e-commerce, power global transactions with IyonicPay, and drive 24/7 engagement with IyonicBots AI. From enterprise infrastructure to marketing automation, we provide everything you need to grow."
        keywords="ecommerce platform, digital payments, AI chatbots, enterprise commerce, marketing automation, iyonicweb, IyonicShop, IyonicPay, IyonicBots, business scaling"
        canonical="https://web.iyonicorp.com/"
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="iyonicweb Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-xl font-black tracking-tighter text-gray-900">iyonicweb</span>
            </div>

            <div className="hidden lg:flex items-center space-x-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => product.onClick ? product.onClick() : scrollToSection(product.id)}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                >
                  {product.name}
                </button>
              ))}
              <button
                onClick={() => navigate('/themes')}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                Themes
              </button>
              <button
                onClick={onSignIn}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                Pricing
              </button>
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <Button variant="ghost" className="font-bold text-gray-700" onClick={onSignIn}>
                Log In
              </Button>
              <Button 
                className="bg-gray-900 text-white hover:bg-black rounded-full px-6 py-2.5 font-bold"
                onClick={() => scrollToSection('products')}
              >
                Get Started
              </Button>
            </div>

            <button className="lg:hidden p-2 text-gray-900" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-100"
            >
              <div className="px-6 py-4 space-y-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => product.onClick ? product.onClick() : scrollToSection(product.id)}
                    className="block w-full text-left px-4 py-3 rounded-xl text-lg font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {product.name}
                  </button>
                ))}
                <button
                  onClick={() => { navigate('/themes'); setIsMenuOpen(false); }}
                  className="block w-full text-left px-4 py-3 rounded-xl text-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Themes
                </button>
                <button
                  onClick={onSignIn}
                  className="block w-full text-left px-4 py-3 rounded-xl text-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Pricing
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
</nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* Radial Mesh Gradients */}
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-gradient-to-br from-blue-500/20 via-indigo-400/10 to-transparent rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-purple-500/15 via-rose-400/5 to-transparent rounded-full blur-[100px]" />
          
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-900/5 backdrop-blur-md border border-gray-900/10 rounded-full mb-8">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-bold tracking-tight text-gray-900">Revolutionizing Digital Commerce</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[7rem] font-black tracking-tight text-gray-900 mb-8 leading-[0.9] text-balance">
              The Next Gen of<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 inline-block">
                Commerce.
              </span>
            </h1>

            <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
              A modular platform engineered for growth. IyonicShop for stores, IyonicPay for payments, and IyonicBots for intelligence. All in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-gray-900 text-white hover:bg-black rounded-2xl px-10 py-8 text-lg font-bold shadow-2xl shadow-gray-900/20 hover:scale-[1.02] transition-all group"
                onClick={() => scrollToSection('products')}
              >
                Start Building Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="ghost" 
                className="rounded-2xl px-10 py-8 text-lg font-bold border-2 border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all"
                onClick={onSignIn}
              >
                Watch Demo
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 lg:py-40 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-4">Our Products</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">Everything you need to build, sell, and scale your business.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <motion.div
                id={product.id}
                key={product.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                className="relative bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/30 group cursor-pointer overflow-hidden hover:shadow-3xl transition-shadow duration-300"
                onClick={() => product.onClick ? product.onClick() : scrollToSection(product.id)}
              >
                {/* Gradient Overlay on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.03]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${product.color} rounded-full scale-[2] translate-x-1/2 -translate-y-1/2`} />
                </div>

                <div className={`w-20 h-20 bg-gradient-to-br ${product.color} rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl`}>
                  <product.icon className="w-10 h-10 text-white" />
                </div>
                
                <div className="mb-3">
                  <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">{product.tagline}</span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-black text-gray-900 mb-5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-700 transition-all">{product.name}</h3>
                <p className="text-gray-500 font-medium mb-8 text-lg leading-relaxed">{product.description}</p>
                
                <ul className="space-y-4 mb-10">
                  {product.features.map((feature, i) => (
                    <motion.li 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 + i * 0.05 }}
                      className="flex items-center space-x-3 text-sm font-semibold text-gray-600"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      </div>
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <Button 
                  variant="primary"
                  size="lg"
                  className="w-full rounded-full font-bold py-5 text-lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  onClick={() => product.onClick ? product.onClick() : scrollToSection(product.id)}
                >
                  {product.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-20 lg:py-40 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6">
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">iyonicweb</span>?
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              The complete toolkit for modern commerce. Built by sellers, for sellers. We provide a comprehensive ecosystem for digital growth.
            </p>
          </motion.div>

          {/* Platform Overview - Talk about Everything Section */}
          <div className="mb-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Store className="w-8 h-8 text-blue-600" />
                Modern E-commerce
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Build high-converting online stores with <strong>IyonicShop</strong>. Our platform supports dropshipping, physical products, digital downloads, and subscriptions. With integrated inventory management and multi-channel selling, you can manage everything from one dashboard.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 font-medium">
                <li>• Real-time Inventory Syncing</li>
                <li>• SEO Optimized Product Pages</li>
                <li>• Abandoned Cart Recovery</li>
                <li>• Customizable Checkout Flow</li>
              </ul>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-indigo-600" />
                Global Payments
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Accept payments from anywhere in the world with <strong>IyonicPay</strong>. From credit cards to local payment methods and cryptocurrencies, we provide a seamless checkout experience. Our split-payment and automated payout features are perfect for marketplaces.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 font-medium">
                <li>• Multi-currency Settlement</li>
                <li>• Fraud Protection AI</li>
                <li>• Instant Bank Transfers</li>
                <li>• Virtual Business Cards</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Bot className="w-8 h-8 text-emerald-600" />
                Artificial Intelligence
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Automate your business operations with <strong>IyonicBots</strong>. Our AI agents handle customer support, sales inquiries, and complex workflows 24/7. Trained on your business data, they provide accurate, human-like responses that drive conversions.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 font-medium">
                <li>• NLP-based Customer Support</li>
                <li>• AI Sales Assistants</li>
                <li>• Automated Data Analysis</li>
                <li>• Predictive Inventory Forecasting</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Zap className="w-8 h-8 text-amber-600" />
                Marketing & Growth
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Scale your reach with integrated marketing tools. From email automation to social media integrations and influencer management, we give you the tools to find and retain customers. Our advanced analytics help you make data-driven decisions.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 font-medium">
                <li>• Built-in Email Marketing</li>
                <li>• Social Commerce Integration</li>
                <li>• Affiliate Management System</li>
                <li>• Advanced Customer Insights</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-rose-600" />
                Enterprise Infrastructure
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Rely on our robust, secure, and scalable cloud infrastructure. Whether you're a small boutique or a global enterprise, our platform grows with you. We handle the technical complexity so you can focus on your brand.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 font-medium">
                <li>• 99.99% Uptime SLA</li>
                <li>• GDPR & PCI Compliance</li>
                <li>• Global CDN Acceleration</li>
                <li>• Dedicated Developer API</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-teal-600" />
                Community & Education
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Join a thriving ecosystem of entrepreneurs and developers. Access our help center, documentation, and business academies to learn how to master digital commerce. We're more than just a platform; we're your growth partner.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 font-medium">
                <li>• Business Masterclasses</li>
                <li>• Expert Community Forum</li>
                <li>• Detailed Documentation</li>
                <li>• 24/7 Priority Support</li>
              </ul>
            </div>
          </div>

          {/* Animated Stats with Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {[
              { value: '10000', suffix: '+', label: 'Active Stores', icon: Store, color: 'text-blue-600' },
              { value: '150', suffix: 'M+', label: 'Processed', icon: Wallet, color: 'text-purple-600' },
              { value: '180', suffix: '+', label: 'Countries', icon: Globe, color: 'text-emerald-600' },
              { value: '99.99', suffix: '%', label: 'Uptime', icon: Shield, color: 'text-amber-600' }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -8, scale: 1.05 }}
                className="text-center bg-white rounded-3xl p-8 shadow-xl shadow-gray-100/50 transition-all"
              >
                <div className={`w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <h3 className={`text-4xl lg:text-5xl font-black text-gray-900 mb-2 ${stat.color}`}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </h3>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Interactive Features Tabs */}
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-100/50">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {[
                  { title: "Lightning Fast", icon: Zap, description: "Blazing fast performance with global CDN" },
                  { title: "AI Powered", icon: Bot, description: "Smart automation that learns and grows" },
                  { title: "Secure by Design", icon: Shield, description: "Enterprise-grade security for your business" },
                  { title: "Global Reach", icon: Globe, description: "Sell anywhere with multi-currency support" },
                  { title: "24/7 Support", icon: Headphones, description: "Always here when you need help" }
                ].map((feature, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    whileHover={{ x: 8 }}
                    className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${activeFeature === index ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-xl' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-4">
                      <feature.icon className={`w-6 h-6 ${activeFeature === index ? 'text-white' : 'text-gray-500'}`} />
                      <div>
                        <h4 className="font-bold text-lg">{feature.title}</h4>
                        <p className={`text-sm ${activeFeature === index ? 'text-gray-300' : 'text-gray-500'}`}>{feature.description}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="lg:col-span-3 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="h-full min-h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl overflow-hidden"
                  >
                    {/* Feature Preview Visual */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5" />
                    <div className="relative z-10 p-10 flex flex-col justify-center h-full">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="w-24 h-24 bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl flex items-center justify-center mb-8 shadow-2xl"
                      >
                        {[Zap, Bot, Shield, Globe, Headphones][activeFeature] && 
                          React.createElement([Zap, Bot, Shield, Globe, Headphones][activeFeature], { className: "w-12 h-12 text-white" })
                        }
                      </motion.div>
                      
                      <motion.h3 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-3xl lg:text-4xl font-black text-gray-900 mb-4"
                      >
                        {["Lightning Fast Performance", "AI Powered Automation", "Enterprise Security", "Global Commerce", "Always Available Support"][activeFeature]}
                      </motion.h3>
                      
                      <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-lg text-gray-600 leading-relaxed max-w-md"
                      >
                        {[
                          "Your store loads in milliseconds, not seconds. We optimize every aspect of performance so your customers never wait.",
                          "Our AI learns from your data to automate pricing, customer support, inventory management, and sales outreach.",
                          "Bank-level encryption, PCI DSS compliance, and regular security audits keep your business and customers safe.",
                          "Accept payments in 130+ currencies, ship worldwide, and translate your store into 50+ languages automatically.",
                          "Our expert support team is available 24/7 via chat, phone, and email. Average response time under 2 minutes."
                        ][activeFeature]}
                      </motion.p>

                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex items-center gap-4 mt-8"
                      >
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((x) => (
                            <div key={x} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white" />
                          ))}
                        </div>
                        <p className="text-sm font-semibold text-gray-500">Trusted by 10,000+ businesses</p>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomepageFooter />
    </div>
  );
};