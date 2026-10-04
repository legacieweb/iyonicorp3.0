import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import SEO from '../components/SEO';
import { Button, Input, Card, Popup, Textarea, Select, Badge } from '../components/ui';
import { 
  Bot, 
  Cpu, 
  MessageSquare, 
  Terminal, 
  Zap, 
  Globe, 
  ShieldCheck, 
  Code, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  Copy, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Database,
  Search,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Sparkles,
  RefreshCw,
  X,
  Send,
  MessageCircle,
  Star,
  Package,
  Menu,
  BarChart3
} from 'lucide-react';
import { api, botsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import ProductFooter from '../components/ProductFooter';

const IyonicBots: React.FC = () => {
  const { user, login, register, setAuthenticatedUser, logout } = useAuth();
  const { sellers } = useData();
  const seller = sellers.length > 0 ? sellers[0] : null;
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isRegisterPopupOpen, setIsRegisterPopupOpen] = useState(false);
  const [isContinuePopupOpen, setIsContinuePopupOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-bots' | 'training' | 'api' | 'billing' | 'knowledge' | 'conversations' | 'analytics' | 'settings' | 'test-lab'>('dashboard');
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [errorPlanId, setErrorPlanId] = useState<string | null>(null);

  // Bot states
  const [availableBots] = useState([
    { 
      id: 'support-pro', 
      name: 'SupportPro', 
      desc: 'Expert customer service bot trained for e-commerce. Handles returns, shipping queries, and product FAQs with empathy.', 
      icon: <MessageSquare className="w-8 h-8" />, 
      category: 'Support',
      color: 'bg-blue-50 text-blue-600',
      features: ['24/7 Availability', 'Policy Awareness', 'Sentiment Analysis']
    },
    { 
      id: 'sales-genie', 
      name: 'SalesGenie', 
      desc: 'Aggressive sales assistant that drives conversions. Specialized in upselling, cross-selling, and creating urgency.', 
      icon: <Zap className="w-8 h-8" />, 
      category: 'Sales',
      color: 'bg-amber-50 text-amber-600',
      features: ['Upsell Engine', 'Discount Logic', 'Abandoned Cart Recovery']
    },
    { 
      id: 'tech-guru', 
      name: 'TechGuru', 
      desc: 'Technical documentation specialist and debugger. Perfect for SaaS and tech products needing complex explanations.', 
      icon: <Terminal className="w-8 h-8" />, 
      category: 'Technical',
      color: 'bg-purple-50 text-purple-600',
      features: ['API Docs Support', 'Troubleshooting', 'Version Control Tracking']
    },
  ]);

  const [myBots, setMyBots] = useState<any[]>([]);
  const [activeBot, setActiveBot] = useState<any>(null);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    phoneNumber: '',
    username: '' 
  });
  
  const [iyonicorpEmail, setIyonicorpEmail] = useState('');
  const [iyonicorpPassword, setIyonicorpPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmAccount, setConfirmAccount] = useState(false);

  // Bot Creation & Training
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [isWidgetPopupOpen, setIsWidgetPopupOpen] = useState(false);
  const [newBotData, setNewBotData] = useState({ name: '', type: 'support-pro' });
  const [widgetConfig, setWidgetConfig] = useState({ 
    primaryColor: '#3b82f6', 
    greeting: 'Hello! How can I help you today?',
    bubbleIcon: 'MessageSquare'
  });
  const [trainingData, setTrainingData] = useState('');
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'complete'>('idle');
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({ greeting: '', identity: '', shipping: '', returns: '', payments: '' });
  const [botPersonality, setBotPersonality] = useState<Record<string, string>>({ tone: 'professional', style: 'helpful' });
  const [billing, setBilling] = useState<any>({ plan: { id: 'starter', name: 'Starter', price: 0 }, plans: {}, wallet: { balance: 0, currency: 'USD' } });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [knowledge, setKnowledge] = useState<any>({ documents: [], faqs: [], gaps: [] });
  const [conversations, setConversations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: '', content: '', sourceUrl: '' });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'general' });
  const [botConfiguration, setBotConfiguration] = useState<any>({ responseLength: 'balanced', language: 'English', instructions: '', allowedKnowledge: ['business', 'products', 'policies', 'faqs', 'documents'], permissions: {}, enabledActions: [], escalation: { enabled: true, afterRepeatedFailures: 2 }, welcomeMessage: '', suggestedQuestions: [] });
  const [testMessage, setTestMessage] = useState('What is your return policy?');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'seller') {
      setView('dashboard');
      fetchBots();
      fetchBilling();
      fetchKnowledge();
      fetchConversations();
      fetchAnalytics();
    } else {
      setView('landing');
    }
  }, [user]);

  useEffect(() => {
    const reference = searchParams.get('reference');
    const planId = searchParams.get('plan');
    if (user?.role === 'seller' && reference && planId) {
      botsAPI.verifyPaystack(reference, planId)
        .then(result => { setSuccess(result.message || 'Payment confirmed'); fetchBilling(); setSearchParams({}); })
        .catch(err => setError(err.response?.data?.message || 'Could not verify payment'));
    }
  }, [user, searchParams, setSearchParams]);

  const fetchBots = async () => {
    try {
      const response = await api.get('/bots');
      setMyBots(response.data);
      if (response.data.length > 0 && !activeBot) {
        setActiveBot(response.data[0]);
        setTrainingData(response.data[0].trainingData || '');
        setCustomResponses(response.data[0].customResponses || { greeting: '', identity: '', shipping: '', returns: '', payments: '' });
        setBotPersonality(response.data[0].personality || { tone: 'professional', style: 'helpful' });
        setBotConfiguration(response.data[0].configuration || botConfiguration);
        setWidgetConfig(response.data[0].widgetConfig || { primaryColor: '#3b82f6', greeting: 'Hello! How can I help you today?', bubbleIcon: 'MessageSquare' });
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    }
  };

  const fetchBilling = async () => {
    try {
      setBilling(await botsAPI.getBilling());
    } catch (err) {
      console.error('Failed to fetch bot billing:', err);
    }
  };

  const fetchKnowledge = async () => {
    setKnowledgeLoading(true);
    try {
      setKnowledge(await botsAPI.getKnowledge());
    } catch (err) {
      setError('Unable to load business knowledge');
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const fetchConversations = async () => {
    try { setConversations(await botsAPI.getConversations()); } catch (err) { setError('Unable to load conversations'); }
  };

  const fetchAnalytics = async () => {
    try { setAnalytics(await botsAPI.getAnalytics()); } catch (err) { setError('Unable to load bot analytics'); }
  };

  const handleAddKnowledge = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await botsAPI.addKnowledgeDocument({ ...knowledgeForm, documentType: 'text', source: 'seller' });
      setKnowledgeForm({ title: '', content: '', sourceUrl: '' });
      await fetchKnowledge();
      setSuccess('Business knowledge added');
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to add business knowledge'); }
  };

  const handleAddFaq = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await botsAPI.addFaq(faqForm);
      setFaqForm({ question: '', answer: '', category: 'general' });
      await fetchKnowledge();
      setSuccess('FAQ added');
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to add FAQ'); }
  };

  const handleSaveConfiguration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeBot) return;
    try {
      const saved = await botsAPI.updateConfiguration(activeBot.id, botConfiguration);
      setBotConfiguration(saved);
      notifySuccess('Bot configuration saved');
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to save bot configuration'); }
  };

  const handleRunTest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeBot || !testMessage.trim()) return;
    setTestLoading(true);
    try {
      const result = await botsAPI.chat(activeBot.id, testMessage.trim());
      setTestResult({ ...result, grounded: Boolean(result.sources?.length) });
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to run bot test'); }
    finally { setTestLoading(false); }
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password);
      setIsLoginPopupOpen(false);
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        ...registerForm,
        name: `${registerForm.firstName} ${registerForm.lastName}`,
        role: 'seller',
        storeName: registerForm.username ? `${registerForm.username}'s Store` : undefined,
        shopType: 'product'
      });
      setIsRegisterPopupOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleIyonicorpContinue = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/iyonicpay/continue-with-iyonicorp', { email: iyonicorpEmail });
      const iyonicorpUser = response.data;
      setConfirmAccount(true);
      setUsername(iyonicorpUser.storeName || iyonicorpUser.name.toLowerCase().replace(/\s+/g, '-'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to find Iyonicorp account');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeIyonicorp = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/iyonicpay/finalize-iyonicorp', { 
        email: iyonicorpEmail, 
        username: username,
        password: iyonicorpPassword
      });
      const { user: loggedInUser, token } = response.data;
      if (token && loggedInUser) {
        setAuthenticatedUser(loggedInUser, token);
        setView('dashboard');
        setIsContinuePopupOpen(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to finalize account');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBot = async () => {
    try {
      const response = await api.post('/bots', newBotData);
      const newBot = response.data;
      setMyBots([...myBots, newBot]);
      setActiveBot(newBot);
      setIsCreatePopupOpen(false);
      notifySuccess('Bot created successfully!', 3000);
    } catch (err) {
      setError('Failed to create bot');
    }
  };

  const handleActivateBot = async (bot: any) => {
    try {
      const updated = await botsAPI.activate(bot.id);
      const nextBots = myBots.map(item => item.id === updated.id ? updated : item);
      setMyBots(nextBots);
      setActiveBot(updated);
      notifySuccess(`${updated.name} is now live for ${updated.type}.`, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not activate this bot');
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      const result = await botsAPI.subscribe(planId);
      notifySuccess(result.message || 'Bot plan activated', 3000);
      await fetchBilling();
    } catch (err: any) {
      if (err.response?.status === 402) {
        const msg = err.response?.data?.message || 'Insufficient balance in IyonicPay wallet';
        setError(`Insufficient balance: ${msg}`);
        setErrorPlanId(planId);
      } else {
        setError(err.response?.data?.message || 'Could not activate this plan');
        setErrorPlanId(planId);
      }
    }
  };

  const handleDirectPayment = async (planId: string) => {
    if (!user?.email) return;
    try {
      const payment = await botsAPI.initializePaystack(planId);
      const plan = billing.plans?.[planId];
      const handler = (window as any).PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round((plan?.price || 0) * 100),
        currency: 'USD',
        reference: payment.reference,
        metadata: { type: 'iyonicbots_plan', planId, sellerId: user?.sellerId },
        callback: (response: any) => {
          botsAPI.verifyPaystack(response.reference, planId)
            .then(result => { setSuccess(result.message || 'Payment confirmed'); fetchBilling(); })
            .catch(err => setError(err.response?.data?.message || 'Could not verify payment'));
        },
        onClose: () => {
          setError('');
        }
      });
      handler.openIframe();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start card or mobile payment');
    }
  };

  const handlePricingAction = (planId?: string) => {
    if (user?.role !== 'seller') {
      setIsRegisterPopupOpen(true);
      return;
    }
    setView('dashboard');
    setActiveTab('billing');
  };

  const handleTrainBot = async () => {
    if (!activeBot) return;
    setTrainingStatus('training');
    try {
      const response = await api.post(`/bots/${activeBot.id}/train`, { trainingData });
      setActiveBot(response.data);
      setMyBots(myBots.map(b => b.id === activeBot.id ? response.data : b));
      setTrainingStatus('complete');
      setSuccess('Bot training completed with your business data!');
      setTimeout(() => {
        setSuccess('');
        setTrainingStatus('idle');
      }, 3000);
    } catch (err) {
      setError('Training failed');
      setTrainingStatus('idle');
    }
  };

  const handleAutoTrain = async () => {
    if (!activeBot) return;
    setTrainingStatus('training');
    try {
      const response = await api.post(`/bots/${activeBot.id}/auto-train`);
      setActiveBot(response.data);
      setTrainingData(response.data.trainingData);
      setProductCount(response.data.productCount || 0);
      setMyBots(myBots.map(b => b.id === activeBot.id ? response.data : b));
      setTrainingStatus('complete');
      setSuccess('Bot auto-trained from your store data!');
      setTimeout(() => {
        setSuccess('');
        setTrainingStatus('idle');
      }, 3000);
    } catch (err) {
      setError('Auto-training failed');
      setTrainingStatus('idle');
    }
  };

  const handleSaveWidgetConfig = async () => {
    if (!activeBot) return;
    setLoading(true);
    try {
      const response = await api.patch(`/bots/${activeBot.id}/widget-config`, { widgetConfig });
      setActiveBot(response.data);
      setMyBots(myBots.map(b => b.id === activeBot.id ? response.data : b));
      setIsWidgetPopupOpen(false);
      notifySuccess('Widget configuration saved!', 3000);
    } catch (err) {
      setError('Failed to save widget configuration');
    } finally {
      setLoading(false);
    }
  };

  const refreshBotsAndNotify = async (message: string) => {
    const updated = await botsAPI.getAll();
    setMyBots(updated);
    notifySuccess(message, 2000);
  };

  const notifySuccess = (message: string, duration = 2000) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), duration);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notifySuccess('Copied to clipboard!');
  };

  if (view === 'dashboard' && user) {
    const sidebarItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'my-bots', label: 'My Bots', icon: <Bot className="w-5 h-5" /> },
      { id: 'training', label: 'AI Training', icon: <Database className="w-5 h-5" /> },
      { id: 'api', label: 'Deploy & API', icon: <Terminal className="w-5 h-5" /> },
      { id: 'billing', label: 'Plans & Billing', icon: <Zap className="w-5 h-5" /> },
      { id: 'knowledge', label: 'Knowledge', icon: <Database className="w-5 h-5" /> },
      { id: 'conversations', label: 'Conversations', icon: <MessageCircle className="w-5 h-5" /> },
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
      { id: 'test-lab', label: 'Test Lab', icon: <Search className="w-5 h-5" /> },
      { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex font-sans">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'flex' : 'hidden'} lg:flex fixed lg:sticky inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex-col h-screen`}>
          <div className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-gray-900">IyonicBots</span>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}>
                  {item.icon}
                </span>
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6">
            <div className="bg-gray-900 p-5 rounded-[2rem] text-white relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Bot Engine ID</p>
                <p className="text-sm font-bold truncate">@{user.username || user.name.toLowerCase().replace(/\s+/g, '-')}_ai</p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/40 transition-colors"></div>
            </div>
            
            {user.role === 'seller' && (
              <Link
                to="/seller/dashboard"
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-blue-600 font-bold hover:bg-blue-50 transition-colors border border-blue-100 mb-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Seller Dashboard</span>
              </Link>
            )}
            
            <button 
              onClick={logout}
              className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-red-500 font-bold hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 py-4 sm:px-8 sm:py-5">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
              <div className="flex items-center gap-3">
                <button className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Open dashboard menu">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                <h1 className="text-xl font-black text-gray-900 capitalize">
                  {activeTab.replace('-', ' ')}
                </h1>
                <p className="text-xs text-gray-500 font-medium">Iyonic AI Engine v2.0</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-full flex items-center space-x-2 shadow-lg"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center space-x-3 bg-gray-50 p-1.5 pl-4 rounded-full border border-gray-100">
                  <span className="text-sm font-bold text-gray-700">{user.name.split(' ')[0]}</span>
                  <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xs">
                    {user.name.charAt(0)}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-8 max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Hero Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-12">
                          <div>
                            <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Active Bot Interactions</p>
                            <h2 className="text-6xl font-black tracking-tighter">
                              {myBots.reduce((sum, b) => sum + (b.interactions || 0), 0).toLocaleString()}
                            </h2>
                          </div>
                          <div className="w-16 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center">
                            <Bot className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="flex gap-4 mt-auto">
                          <button 
                            onClick={() => setIsCreatePopupOpen(true)}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center space-x-3 transition-all transform active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                            <span>Deploy New Bot</span>
                          </button>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                    </div>
                    
                    <div className="bg-white rounded-[3rem] p-8 border border-gray-100 flex flex-col justify-between shadow-xl">
                      <div>
                        <div className="flex items-center justify-between mb-8">
                          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                            <Cpu className="w-6 h-6" />
                          </div>
                          <Badge variant="success">AI v2.0</Badge>
                        </div>
                        <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Training Efficiency</p>
                        <h3 className="text-4xl font-black text-gray-900">99.2%</h3>
                      </div>
                      <div className="pt-6 border-t border-gray-50">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                          <span>Model Accuracy</span>
                          <span className="text-blue-600">High</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Available Bots Section */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-black text-gray-900">Available Bot Templates</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {availableBots.map(bot => (
                        (() => {
                          const deployedBot = myBots.find(item => item.type === bot.id && item.status === 'active');
                          return (
                        <Card 
                          key={bot.id} 
                          className="hover:shadow-2xl transition-all cursor-pointer group rounded-[2.5rem] border-none shadow-lg overflow-hidden bg-white"
                          onClick={() => {
                            if (deployedBot) return;
                            setNewBotData({...newBotData, type: bot.id});
                            setIsCreatePopupOpen(true);
                          }}
                        >
                          <div className="p-8">
                            <div className={`w-14 h-14 ${bot.color} rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all`}>
                              {bot.icon}
                            </div>
                            <h4 className="text-xl font-black text-gray-900 mb-2">{bot.name}</h4>
                            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed line-clamp-2">{bot.desc}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-6">
                              {bot.features.slice(0, 2).map((f: string) => (
                                <span key={f} className="text-[9px] font-black uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded-full text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{f}</span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                              <span className="text-xs font-black uppercase tracking-widest text-blue-600">{deployedBot ? 'Active' : bot.category}</span>
                              <Button size="sm" variant="ghost" className="rounded-full font-black text-xs" disabled={Boolean(deployedBot)}>
                                {deployedBot ? 'Live' : 'Deploy'} <ChevronRight className="ml-1 w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                          );
                        })()
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'my-bots' && (
                <motion.div
                  key="my-bots"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-black text-gray-900">Deployed AI Agents</h3>
                    <Button onClick={() => setIsCreatePopupOpen(true)} className="rounded-2xl bg-blue-600">
                      <Plus className="w-4 h-4 mr-2" /> New Bot
                    </Button>
                  </div>
                  {myBots.length === 0 ? (
                    <Card className="p-12 text-center rounded-[3rem] border-dashed border-2 border-gray-200">
                      <Bot className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500 font-bold">You haven't deployed any bots yet.</p>
                      <Button variant="ghost" className="mt-4 text-blue-600" onClick={() => setIsCreatePopupOpen(true)}>Create your first AI agent</Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {myBots.map(bot => (
                        <Card 
                          key={bot.id} 
                          className={`rounded-[2rem] border-none shadow-lg transition-all ${activeBot?.id === bot.id ? 'ring-2 ring-blue-600' : ''}`}
                        >
                          <div className="p-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center space-x-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${activeBot?.id === bot.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                  <Bot className="w-7 h-7" />
                                </div>
                                <div>
                                  <h4 className="text-xl font-black text-gray-900">{bot.name}</h4>
                                  <div className="flex items-center space-x-3 mt-1">
                                    <span className="text-xs font-bold text-gray-400 capitalize">{bot.type || bot.botType}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{bot.status}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-8">
                                <div className="text-center">
                                  <p className="text-xl font-black text-gray-900">{bot.interactions || 0}</p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Interactions</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xl font-black text-gray-900">{bot.deployments}</p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Deployments</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-gray-900">{bot.lastTrained && bot.lastTrained !== 'Never' ? new Date(bot.lastTrained).toLocaleDateString() : 'Never'}</p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Last Trained</p>
                                </div>
                                <div className="flex space-x-2">
                                  {bot.status !== 'active' && (
                                    <Button variant="primary" size="sm" className="rounded-xl" onClick={() => handleActivateBot(bot)}>
                                      Activate
                                    </Button>
                                  )}
                                  <Button 
                                    variant={activeBot?.id === bot.id ? "secondary" : "outline"} 
                                    size="sm" 
                                    className="rounded-xl"
                                    onClick={() => {
                                      setActiveBot(bot);
                                      setTrainingData(bot.trainingData || '');
                                    }}
                                  >
                                    {activeBot?.id === bot.id ? 'Active' : 'Select'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="rounded-xl" 
                                    onClick={() => { 
                                      setActiveBot(bot); 
                                      setWidgetConfig(bot.widgetConfig || { primaryColor: '#3b82f6', greeting: 'Hello! How can I help you today?', bubbleIcon: 'MessageSquare' });
                                      setIsWidgetPopupOpen(true); 
                                    }}
                                  >
                                    Widget
                                  </Button>
                                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setActiveBot(bot); setTrainingData(bot.trainingData || ''); setActiveTab('training'); }}>Train</Button>
                                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setActiveBot(bot); setActiveTab('api'); }}>API</Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'knowledge' && (
                <motion.div key="knowledge" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Business Brain</p>
                    <h2 className="mt-2 text-3xl font-black text-gray-900">Teach your bots what is true</h2>
                    <p className="mt-3 max-w-2xl text-gray-500">Add approved business information here. It stays isolated to your store and is checked before general bot knowledge.</p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="rounded-[2rem] border-none p-7 shadow-xl">
                      <h3 className="text-xl font-black text-gray-900">Add knowledge article</h3>
                      <form onSubmit={handleAddKnowledge} className="mt-5 space-y-4">
                        <input required value={knowledgeForm.title} onChange={event => setKnowledgeForm({ ...knowledgeForm, title: event.target.value })} placeholder="Title, for example: International shipping policy" className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" />
                        <textarea required value={knowledgeForm.content} onChange={event => setKnowledgeForm({ ...knowledgeForm, content: event.target.value })} placeholder="Write the approved information your bot may use..." rows={6} className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" />
                        <input value={knowledgeForm.sourceUrl} onChange={event => setKnowledgeForm({ ...knowledgeForm, sourceUrl: event.target.value })} placeholder="Source URL (optional)" className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" />
                        <Button type="submit" className="rounded-xl bg-gray-900">Save approved knowledge</Button>
                      </form>
                    </Card>
                    <Card className="rounded-[2rem] border-none p-7 shadow-xl">
                      <h3 className="text-xl font-black text-gray-900">Add FAQ</h3>
                      <form onSubmit={handleAddFaq} className="mt-5 space-y-4">
                        <input required value={faqForm.question} onChange={event => setFaqForm({ ...faqForm, question: event.target.value })} placeholder="Customer question" className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" />
                        <textarea required value={faqForm.answer} onChange={event => setFaqForm({ ...faqForm, answer: event.target.value })} placeholder="Approved answer" rows={6} className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" />
                        <input value={faqForm.category} onChange={event => setFaqForm({ ...faqForm, category: event.target.value })} placeholder="Category" className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" />
                        <Button type="submit" className="rounded-xl bg-blue-600">Save FAQ</Button>
                      </form>
                    </Card>
                  </div>
                  {knowledgeLoading ? <Card className="rounded-[2rem] p-8 text-gray-500">Loading your business knowledge...</Card> : (
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card className="rounded-[2rem] border-none p-7 shadow-xl">
                        <div className="flex items-center justify-between"><h3 className="text-xl font-black">Knowledge articles</h3><span className="text-sm font-bold text-gray-400">{knowledge.documents.length}</span></div>
                        <div className="mt-5 space-y-3">{knowledge.documents.length === 0 ? <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Your bot does not have business knowledge yet.</p> : knowledge.documents.map((document: any) => <div key={document.id} className="rounded-xl border border-gray-100 p-4"><p className="font-bold text-gray-900">{document.title}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{document.source} · {document.status}</p></div>)}</div>
                      </Card>
                      <Card className="rounded-[2rem] border-none p-7 shadow-xl">
                        <div className="flex items-center justify-between"><h3 className="text-xl font-black">Knowledge gaps</h3><span className="text-sm font-bold text-gray-400">{knowledge.gaps.length}</span></div>
                        <div className="mt-5 space-y-3">{knowledge.gaps.length === 0 ? <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Unanswered questions will appear here as your bot learns.</p> : knowledge.gaps.map((gap: any) => <div key={gap.id} className="rounded-xl border border-gray-100 p-4"><p className="font-bold text-gray-900">{gap.question}</p><p className="mt-1 text-xs font-semibold text-gray-400">Asked {gap.frequency} times · {gap.status}</p></div>)}</div>
                      </Card>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'conversations' && (
                <motion.div key="conversations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Customer conversations</p><h2 className="mt-2 text-3xl font-black text-gray-900">See what your agents are handling</h2></div>
                  {conversations.length === 0 ? <Card className="rounded-[2rem] p-10 text-center"><MessageCircle className="mx-auto h-12 w-12 text-gray-200" /><p className="mt-4 font-bold text-gray-500">Conversations will appear here when your bot starts interacting with customers.</p></Card> : <div className="space-y-3">{conversations.map(conversation => <Card key={conversation.id} className="rounded-2xl border-none p-5 shadow-lg"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-bold text-gray-900">{conversation.lastMessage || 'Conversation started'}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{conversation.messageCount} messages · {conversation.status}</p></div><span className="text-xs text-gray-400">{new Date(conversation.updatedAt).toLocaleString()}</span></div></Card>)}</div>}
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Agent analytics</p><h2 className="mt-2 text-3xl font-black text-gray-900">Measure useful work, not vanity metrics</h2></div>
                  {!analytics ? <Card className="rounded-[2rem] p-8 text-gray-500">Loading analytics...</Card> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'Total conversations', value: analytics.conversations?.total || 0 }, { label: 'Active', value: analytics.conversations?.active || 0 }, { label: 'Resolved', value: analytics.conversations?.resolved || 0 }, { label: 'Knowledge gaps', value: analytics.knowledgeGaps?.unresolved || 0 }].map(stat => <Card key={stat.label} className="rounded-2xl border-none p-6 shadow-lg"><p className="text-xs font-black uppercase tracking-wider text-gray-400">{stat.label}</p><p className="mt-3 text-4xl font-black text-gray-900">{stat.value}</p></Card>)}</div>}
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Agent configuration</p><h2 className="mt-2 text-3xl font-black text-gray-900">Configure {activeBot?.name || 'your agent'}</h2><p className="mt-3 max-w-2xl text-gray-500">These settings guide the agent. Business data and approved knowledge remain the source of truth.</p></div>
                  {!activeBot ? <Card className="rounded-[2rem] p-8 text-gray-500">Select a bot from My Bots before configuring it.</Card> : <Card className="rounded-[2rem] border-none p-7 shadow-xl"><form onSubmit={handleSaveConfiguration} className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="text-sm font-bold text-gray-700">Response length<select value={botConfiguration.responseLength || 'balanced'} onChange={event => setBotConfiguration({ ...botConfiguration, responseLength: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal"><option value="short">Short</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select></label>
                      <label className="text-sm font-bold text-gray-700">Language<input value={botConfiguration.language || 'English'} onChange={event => setBotConfiguration({ ...botConfiguration, language: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" /></label>
                    </div>
                    <label className="block text-sm font-bold text-gray-700">Agent instructions<textarea value={botConfiguration.instructions || ''} onChange={event => setBotConfiguration({ ...botConfiguration, instructions: event.target.value })} placeholder="Describe how this agent should work for your business..." rows={5} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" /></label>
                    <label className="block text-sm font-bold text-gray-700">Welcome message<textarea value={botConfiguration.welcomeMessage || ''} onChange={event => setBotConfiguration({ ...botConfiguration, welcomeMessage: event.target.value })} placeholder="Optional first message shown to customers" rows={3} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" /></label>
                    <label className="block text-sm font-bold text-gray-700">Suggested questions<input value={(botConfiguration.suggestedQuestions || []).join(', ')} onChange={event => setBotConfiguration({ ...botConfiguration, suggestedQuestions: event.target.value.split(',').map((item: string) => item.trim()).filter(Boolean) })} placeholder="What is your return policy?, Where do you deliver?" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" /></label>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4"><div><p className="font-bold text-gray-900">Human escalation</p><p className="text-sm text-gray-500">Allow the agent to flag uncertain or sensitive conversations.</p></div><input type="checkbox" checked={botConfiguration.escalation?.enabled !== false} onChange={event => setBotConfiguration({ ...botConfiguration, escalation: { ...(botConfiguration.escalation || {}), enabled: event.target.checked } })} className="h-5 w-5 accent-blue-600" /></div>
                    <Button type="submit" className="rounded-xl bg-blue-600">Save agent settings</Button>
                  </form></Card>}
                </motion.div>
              )}

              {activeTab === 'test-lab' && (
                <motion.div key="test-lab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Test Lab</p><h2 className="mt-2 text-3xl font-black text-gray-900">Test what your agent can verify</h2><p className="mt-3 max-w-2xl text-gray-500">Tests use the same tenant-scoped chat path as your storefront widget.</p></div>
                  <Card className="rounded-[2rem] border-none p-7 shadow-xl"><form onSubmit={handleRunTest} className="space-y-4"><label className="block text-sm font-bold text-gray-700">Bot<select value={activeBot?.id || ''} onChange={event => setActiveBot(myBots.find(bot => bot.id === event.target.value) || null)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal">{myBots.map(bot => <option key={bot.id} value={bot.id}>{bot.name} · {bot.type}</option>)}</select></label><label className="block text-sm font-bold text-gray-700">Test message<textarea value={testMessage} onChange={event => setTestMessage(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" /></label><Button type="submit" disabled={!activeBot || testLoading} className="rounded-xl bg-gray-900">{testLoading ? 'Running test...' : 'Run test'}</Button></form></Card>
                  {testResult && <Card className="rounded-[2rem] border-none p-7 shadow-xl"><p className="text-xs font-black uppercase tracking-widest text-blue-600">Response</p><p className="mt-3 whitespace-pre-wrap text-gray-800">{testResult.response}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-gray-400">Grounded</p><p className="mt-1 font-bold text-gray-900">{testResult.grounded ? 'Yes' : 'No verified source found'}</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-gray-400">Sources used</p><p className="mt-1 font-bold text-gray-900">{testResult.sources?.length || 0}</p></div></div>{testResult.sources?.length > 0 && <ul className="mt-4 space-y-2">{testResult.sources.map((source: any, index: number) => <li key={`${source.title}-${index}`} className="rounded-lg border border-gray-100 p-3 text-sm text-gray-600">{source.title} · {source.source}</li>)}</ul>}</Card>}
                </motion.div>
              )}

              {activeTab === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                {error && (
                  <div className={`rounded-2xl p-4 text-center font-bold ${error.includes('Insufficient') || error.includes('402') || error.includes('need') ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-red-50 text-red-600'}`}>
                    {error}
                  </div>
                )}
              <div className="rounded-[2.5rem] bg-gray-900 p-8 text-white shadow-2xl md:p-10">
                     <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Current bot plan</p>
                        <h2 className="mt-3 text-4xl font-black">{billing.plan.name}</h2>
                        <p className="mt-3 max-w-xl text-gray-400">{billing.plan.description || 'Basic role-based bots are free for sellers. Upgrade when you want advanced training, personality controls, and live deployment tools.'}</p>
                      </div>
                     </div>
                   </div>
                   <div className="grid gap-6 md:grid-cols-3">
                     {Object.entries(billing.plans || {}).map(([planId, plan]: [string, any]) => {
                       const isActive = billing.plan.id === planId;
                       const isFree = plan.price === 0;
                       const features = planId === 'starter' ? ['One role-based bot', 'Store-ready defaults'] : planId === 'basic' ? ['SupportPro', 'SalesGenie', 'TechGuru'] : planId === 'pro' ? ['Advanced training', 'Custom personality', 'Live deployment'] : ['Everything in Pro', 'Priority retraining', 'Advanced automation'];
                       const walletBalance = Number(billing.wallet?.balance || 0);
                       const canAffordWallet = !isFree && walletBalance >= plan.price;
                       return (
                       <Card key={planId} className={`rounded-[2rem] border-none p-7 shadow-xl ${isActive ? 'ring-2 ring-blue-600' : ''}`}>
                         <p className="text-xs font-black uppercase tracking-widest text-blue-600">{isActive ? 'Active' : 'Available'}</p>
                         <h3 className="mt-3 text-2xl font-black text-gray-900">{plan.name}</h3>
                         <p className="mt-2 text-3xl font-black text-gray-900">{isFree ? 'Free' : `$${plan.price.toFixed(2)}`}</p>
                         <p className="mt-3 text-sm font-medium text-gray-500">{plan.description}</p>
                         <ul className="mt-6 space-y-3 text-sm font-semibold text-gray-600">
                           {features.map(feature => <li key={feature} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />{feature}</li>)}
                         </ul>
                          {!isActive && (
                            <div className="mt-8 space-y-2">
                              {isFree && (
                                <Button className="w-full rounded-xl bg-blue-600" onClick={() => handleSubscribe(planId)}>
                                  Activate Free Plan
                                </Button>
                              )}
                              {!isFree && canAffordWallet && (
                                <Button className="w-full rounded-xl bg-blue-600" onClick={() => handleSubscribe(planId)}>
                                  Pay ${plan.price.toFixed(2)} with IyonicPay
                                </Button>
                              )}
                              {!isFree && !canAffordWallet && (
                                <Button className="w-full rounded-xl bg-blue-600" onClick={() => handleSubscribe(planId)} variant="outline">
                                  Pay ${plan.price.toFixed(2)} with IyonicPay
                                </Button>
                              )}
                              {!isFree && (
                                <Button className="w-full rounded-xl" variant={canAffordWallet ? 'outline' : 'secondary'} onClick={() => handleDirectPayment(planId)}>
                                  Pay ${plan.price.toFixed(2)} with Card & Mobile Wallet
                                </Button>
                              )}
                              {errorPlanId === planId && error && (
                                <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-100">{error}</p>
                              )}
                            </div>
                          )}
                         {isActive && (
                           <div className="mt-8">
                             <Button variant="outline" className="w-full rounded-xl" onClick={() => fetchBilling()}>
                               Refresh Plan
                             </Button>
                           </div>
                         )}
                       </Card>
                       );
                     })}
                   </div>
                   <p className="text-sm font-medium text-gray-500">Paid plans charge your IyonicPay wallet. Add funds in IyonicPay, or pay directly with Paystack (card or mobile money).</p>
                </motion.div>
              )}

              {activeTab === 'training' && (
                <motion.div
                  key="training"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Auto-Train Bot Section */}
                  {activeBot && (
                    <Card className="border-none shadow-xl shadow-slate-200/50">
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                            <Zap className="w-5 h-5" />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Auto-Train Bot</h3>
                        </div>

                        <p className="text-slate-600 mb-4">Automatically train your bot using your store's data including products, policies, delivery methods, and payment terms.</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Products</p>
                            <p className="text-lg font-black text-slate-900">{productCount || seller?.stats?.totalProducts || 0}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Delivery Methods</p>
                            <p className="text-lg font-black text-slate-900">{seller?.deliveryLocations?.length || 0}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Policies</p>
                            <p className="text-lg font-black text-slate-900">3</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase">Currency</p>
                            <p className="text-lg font-black text-slate-900">{seller?.currency || 'USD'}</p>
                          </div>
                        </div>

                        <Button 
                          variant="primary"
                          leftIcon={<RefreshCw className="w-4 h-4" />}
                          loading={trainingStatus === 'training'}
                          onClick={handleAutoTrain}
                        >
                          {trainingStatus === 'complete' ? 'Trained Successfully!' : 'Auto-Train Bot'}
                        </Button>
                      </div>
                    </Card>
                  )}

                  <Card className="rounded-[3rem] border-none shadow-xl bg-gradient-to-br from-white to-gray-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <Database className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-gray-900">Individual Business Training</h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {activeBot ? `Training for: ${activeBot.name}` : 'Select a bot to begin training'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block pl-1">Knowledge Base Data</label>
                          <Textarea 
                            placeholder="Paste your product descriptions, company policies, FAQs, or any business data here..."
                            className="min-h-[300px] rounded-[2rem] p-8 border-gray-100 focus:border-blue-500 bg-white"
                            value={trainingData}
                            onChange={(e) => setTrainingData(e.target.value)}
                            disabled={!activeBot}
                          />
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                          <div className="flex items-center space-x-4">
                            <Sparkles className="w-6 h-6 text-blue-600" />
                            <p className="text-sm font-bold text-blue-900">This data will be used to train your bots exclusively for your business only.</p>
                          </div>
                          <Button 
                            className="w-full md:w-auto px-12 py-6 rounded-2xl text-lg font-black bg-blue-600"
                            onClick={handleTrainBot}
                            disabled={!activeBot || !trainingData || trainingStatus === 'training'}
                            isLoading={trainingStatus === 'training'}
                          >
                            {trainingStatus === 'training' ? 'Training...' : 'Start AI Training'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Custom Responses Section */}
                  {activeBot && (
                    <Card className="border-none shadow-xl shadow-slate-200/50">
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                            <MessageCircle className="w-5 h-5" />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Custom Responses</h3>
                        </div>

                        <p className="text-slate-600 mb-4">Customize how your bot responds in different scenarios.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Textarea
                            label="Greeting Response"
                            placeholder="Hello! Welcome to our store..."
                            rows={2}
                            value={customResponses?.greeting || ''}
                            onChange={(e) => setCustomResponses({ ...(customResponses || {}), greeting: e.target.value })}
                          />
                          <Textarea
                            label="Identity Response"
                            placeholder="We are a premium electronics store..."
                            rows={2}
                            value={customResponses?.identity || ''}
                            onChange={(e) => setCustomResponses({ ...(customResponses || {}), identity: e.target.value })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <Textarea
                            label="Shipping Response"
                            placeholder="We offer fast shipping with tracking..."
                            rows={2}
                            value={customResponses?.shipping || ''}
                            onChange={(e) => setCustomResponses({ ...(customResponses || {}), shipping: e.target.value })}
                          />
                          <Textarea
                            label="Returns Response"
                            placeholder="Free returns within 30 days..."
                            rows={2}
                            value={customResponses?.returns || ''}
                            onChange={(e) => setCustomResponses({ ...(customResponses || {}), returns: e.target.value })}
                          />
                          <Textarea
                            label="Payments Response"
                            placeholder="We accept all major payment methods..."
                            rows={2}
                            value={customResponses?.payments || ''}
                            onChange={(e) => setCustomResponses({ ...(customResponses || {}), payments: e.target.value })}
                          />
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            variant="primary"
                            onClick={async () => {
                              if (!activeBot?.id) return;
                              try {
                                await botsAPI.updateCustomResponses(activeBot.id, customResponses);
                                await refreshBotsAndNotify('Custom responses saved!');
                              } catch (err) {
                                setError('Failed to save custom responses');
                              }
                            }}
                          >
                            Save Custom Responses
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Bot Personality Section */}
                  {activeBot && (
                    <Card className="border-none shadow-xl shadow-slate-200/50">
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600">
                            <Star className="w-5 h-5" />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Bot Personality</h3>
                        </div>

                        <p className="text-slate-600 mb-4">Define the tone and style of your bot's responses.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Select
                            label="Tone"
                            options={[
                              { value: 'professional', label: 'Professional' },
                              { value: 'friendly', label: 'Friendly' },
                              { value: 'casual', label: 'Casual' },
                              { value: 'formal', label: 'Formal' },
                            ]}
                            value={botPersonality?.tone || 'professional'}
                            onChange={(e) => setBotPersonality({ ...(botPersonality || {}), tone: e.target.value })}
                          />
                          <Select
                            label="Style"
                            options={[
                              { value: 'helpful', label: 'Helpful' },
                              { value: 'assertive', label: 'Assertive' },
                              { value: 'consultative', label: 'Consultative' },
                              { value: 'enthusiastic', label: 'Enthusiastic' },
                            ]}
                            value={botPersonality?.style || 'helpful'}
                            onChange={(e) => setBotPersonality({ ...(botPersonality || {}), style: e.target.value })}
                          />
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            variant="primary"
                            onClick={async () => {
                              if (!activeBot?.id) return;
                              try {
                                await botsAPI.updatePersonality(activeBot.id, botPersonality);
                                await refreshBotsAndNotify('Personality saved!');
                              } catch (err) {
                                setError('Failed to save personality');
                              }
                            }}
                          >
                            Save Personality
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Widget Configuration Section */}
                  {activeBot && (
                    <Card className="border-none shadow-xl shadow-slate-200/50">
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Globe className="w-5 h-5" />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wider text-sm">Widget Configuration</h3>
                        </div>

                        <p className="text-slate-600 mb-4">Customize your bot's appearance on your storefront.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            label="Primary Color"
                            type="color"
                            value={widgetConfig?.primaryColor || '#3b82f6'}
                            onChange={(e) => setWidgetConfig({ ...(widgetConfig || {}), primaryColor: e.target.value })}
                          />
                          <Input
                            label="Greeting Message"
                            value={widgetConfig?.greeting || ''}
                            onChange={(e) => setWidgetConfig({ ...(widgetConfig || {}), greeting: e.target.value })}
                            placeholder="Hello! How can I help you today?"
                          />
                          <Select
                            label="Bubble Icon"
                            options={[
                              { value: 'MessageSquare', label: 'Message' },
                              { value: 'Bot', label: 'Bot' },
                              { value: 'MessageCircle', label: 'Chat' },
                              { value: 'HelpCircle', label: 'Help' },
                            ]}
                            value={widgetConfig?.bubbleIcon || 'MessageSquare'}
                            onChange={(e) => setWidgetConfig({ ...(widgetConfig || {}), bubbleIcon: e.target.value })}
                          />
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button 
                            variant="primary"
                            onClick={handleSaveWidgetConfig}
                            disabled={loading}
                            isLoading={loading}
                          >
                            Save Widget Settings
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {activeTab === 'api' && (
                <motion.div
                  key="api"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <Card className="rounded-[3rem] border-none shadow-xl">
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white">
                          <Code className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900">Deploy to Your Website</h3>
                          <p className="text-sm text-gray-500 font-medium">Embed your bot anywhere with a few lines of code.</p>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div>
                          <div className="flex justify-between items-center mb-3 px-1">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Embedding Code (HTML)</label>
                            <button onClick={() => copyToClipboard(`<script src="${window.location.origin}/bot.js?id=${activeBot?.id || (user.username || 'user') + '_ai'}"></script>`)} className="text-blue-600 font-bold text-xs flex items-center hover:underline">
                              <Copy className="w-3 h-3 mr-1" /> Copy Code
                            </button>
                          </div>
                          <div className="bg-gray-950 p-6 rounded-[2rem] font-mono text-sm text-blue-400 border border-gray-800 shadow-inner">
                            <code>{`<script src="${window.location.origin}/bot.js?id=${activeBot?.id || (user.username || 'user') + '_ai'}"></script>`}</code>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-3 px-1">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Iyonic Bots User API Key</label>
                            <button onClick={() => copyToClipboard(`ib_live_${user.id.substring(0,8)}`)} className="text-blue-600 font-bold text-xs flex items-center hover:underline">
                              <Copy className="w-3 h-3 mr-1" /> Copy Key
                            </button>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 flex items-center justify-between">
                            <p className="font-mono text-gray-900 font-bold">ib_live_{user.id.substring(0, 8)}****************</p>
                            <Button variant="outline" size="sm" className="rounded-xl">Regenerate</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Widget Customization Popup */}
        <Popup
          isOpen={isWidgetPopupOpen}
          onClose={() => setIsWidgetPopupOpen(false)}
          title="Customize AI Widget"
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block pl-1">Primary Color</label>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="color" 
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig({...widgetConfig, primaryColor: e.target.value})}
                      className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                    />
                    <Input 
                      value={widgetConfig.primaryColor}
                      onChange={(e) => setWidgetConfig({...widgetConfig, primaryColor: e.target.value})}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block pl-1">Initial Greeting</label>
                  <Textarea 
                    value={widgetConfig.greeting}
                    onChange={(e) => setWidgetConfig({...widgetConfig, greeting: e.target.value})}
                    placeholder="Hello! How can I help you today?"
                    className="min-h-[100px] rounded-2xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block pl-1">Bubble Icon</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['MessageSquare', 'Bot', 'Zap', 'Terminal'].map(icon => (
                      <button
                        key={icon}
                        onClick={() => setWidgetConfig({...widgetConfig, bubbleIcon: icon})}
                        className={`p-3 rounded-xl border-2 flex items-center justify-center transition-all ${
                          widgetConfig.bubbleIcon === icon ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        {icon === 'MessageSquare' && <MessageSquare className="w-5 h-5" />}
                        {icon === 'Bot' && <Bot className="w-5 h-5" />}
                        {icon === 'Zap' && <Zap className="w-5 h-5" />}
                        {icon === 'Terminal' && <Terminal className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Widget Preview</p>
                <div className="w-full max-w-[240px] shadow-2xl rounded-2xl overflow-hidden bg-white border border-gray-100">
                  <div className="p-3 text-white flex items-center space-x-2" style={{ backgroundColor: widgetConfig.primaryColor }}>
                    <div className="bg-white/20 p-1.5 rounded-lg">
                       {widgetConfig.bubbleIcon === 'MessageSquare' && <MessageSquare className="w-4 h-4" />}
                       {widgetConfig.bubbleIcon === 'Bot' && <Bot className="w-4 h-4" />}
                       {widgetConfig.bubbleIcon === 'Zap' && <Zap className="w-4 h-4" />}
                       {widgetConfig.bubbleIcon === 'Terminal' && <Terminal className="w-4 h-4" />}
                    </div>
                    <span className="text-xs font-bold">{activeBot?.name || 'AI Assistant'}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="bg-gray-100 rounded-xl p-2 rounded-tl-none max-w-[80%]">
                      <p className="text-[10px] text-gray-800">{widgetConfig.greeting}</p>
                    </div>
                  </div>
                  <div className="p-2 border-t border-gray-50 flex space-x-2">
                    <div className="flex-1 h-8 bg-gray-50 rounded-lg"></div>
                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: widgetConfig.primaryColor }}></div>
                  </div>
                </div>
                
                <div 
                  className="mt-6 w-12 h-12 rounded-xl shadow-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: widgetConfig.primaryColor }}
                >
                  {widgetConfig.bubbleIcon === 'MessageSquare' && <MessageSquare className="w-6 h-6" />}
                  {widgetConfig.bubbleIcon === 'Bot' && <Bot className="w-6 h-6" />}
                  {widgetConfig.bubbleIcon === 'Zap' && <Zap className="w-6 h-6" />}
                  {widgetConfig.bubbleIcon === 'Terminal' && <Terminal className="w-6 h-6" />}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <Button variant="outline" className="flex-1 rounded-2xl py-4" onClick={() => setIsWidgetPopupOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-2xl py-4 bg-blue-600 shadow-lg shadow-blue-100" onClick={handleSaveWidgetConfig} isLoading={loading}>Save Changes</Button>
            </div>
          </div>
        </Popup>

        {/* Create Bot Popup */}
        <Popup
          isOpen={isCreatePopupOpen}
          onClose={() => setIsCreatePopupOpen(false)}
          title="Deploy New AI Bot"
          size="lg"
        >
          <div className="space-y-6">
            <Input 
              label="Bot Name" 
              placeholder="e.g. My Shop Support" 
              value={newBotData.name}
              onChange={(e) => setNewBotData({...newBotData, name: e.target.value})}
            />
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 block ml-1">Bot Personality & Template</label>
              <div className="grid grid-cols-1 gap-4">
                {availableBots.map(bot => (
                  <button 
                    key={bot.id}
                    onClick={() => setNewBotData({...newBotData, type: bot.id})}
                    className={`p-6 rounded-[2rem] border-2 text-left flex items-start space-x-6 transition-all duration-300 ${
                      newBotData.type === bot.id 
                        ? 'border-blue-600 bg-blue-50 shadow-xl shadow-blue-100' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-colors ${
                      newBotData.type === bot.id ? 'bg-blue-600 text-white' : bot.color
                    }`}>
                      {bot.icon}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-black text-gray-900 text-lg">{bot.name}</p>
                        {newBotData.type === bot.id && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2 py-1 rounded-md">Selected</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-3">{bot.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {bot.features.slice(0, 2).map((f: string) => (
                          <span key={f} className="text-[9px] font-black uppercase tracking-tighter bg-white/50 border border-gray-100 px-2 py-0.5 rounded-full text-gray-400">{f}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="outline" className="flex-1 rounded-2xl py-4" onClick={() => setIsCreatePopupOpen(false)}>Cancel</Button>
              <Button className="flex-1 rounded-2xl py-4 bg-blue-600" onClick={handleCreateBot} disabled={!newBotData.name}>Create Bot</Button>
            </div>
          </div>
        </Popup>
      </div>
    );
  }

  // Landing Page View
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100">
      <SEO 
        title="IyonicBots - Cognitive AI & Business Automation" 
        description="Transform your business with IyonicBots. Intelligent AI partners trained on your data to handle customer support, sales, and complex workflows 24/7. Part of the Iyonicorp enterprise suite."
        keywords="cognitive AI, business automation, intelligent chatbots, customer experience, AI workforce, IyonicBots"
        canonical="https://iyonicorp.com/iyonicbots"
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900">IyonicBots</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-bold text-gray-500 hover:text-gray-900">Features</a>
            <a href="#templates" className="text-sm font-bold text-gray-500 hover:text-gray-900">Templates</a>
            <a href="#api" className="text-sm font-bold text-gray-500 hover:text-gray-900">API</a>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="font-bold text-gray-600" onClick={() => setIsLoginPopupOpen(true)}>Sign In</Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 px-6 rounded-xl font-bold" onClick={() => setIsRegisterPopupOpen(true)}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100 mb-8"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black tracking-wider text-blue-600 uppercase">AI Bot Engine v2.0 Now Live</span>
          </motion.div>
          <h1 className="text-6xl md:text-[80px] font-black tracking-tighter leading-[0.9] mb-8 text-gray-900">
            Intelligent Bots for <br />
            <span className="text-blue-600 italic font-serif font-light lowercase">your</span> Business.
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-12 font-medium leading-relaxed">
            Train custom AI agents on your business data and deploy them anywhere in seconds. 
            Automate support, drive sales, and scale your operations 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-10 py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xl font-black shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1"
              onClick={() => setIsRegisterPopupOpen(true)}
            >
              Build Your First Bot
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto px-10 py-8 rounded-2xl text-xl font-bold border-2 border-gray-100 hover:bg-gray-50 transition-all"
              onClick={() => setIsContinuePopupOpen(true)}
            >
              Connect store
            </Button>
          </div>
          
          <div className="mt-24 relative max-w-5xl mx-auto">
            <div className="bg-gray-950 rounded-[3rem] p-4 shadow-3xl overflow-hidden border border-gray-800">
              <div className="bg-gray-900 rounded-[2.5rem] p-8 text-left text-blue-400 font-mono text-sm min-h-[400px]">
                <div className="flex space-x-2 mb-8">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <p className="mb-2"># Initialize Iyonic AI Engine...</p>
                <p className="mb-2 text-white">$ iyonic train --source ./business_data.pdf</p>
                <p className="mb-2 text-green-400">✓ Parsing knowledge base...</p>
                <p className="mb-2 text-green-400">✓ Generating neural embeddings...</p>
                <p className="mb-6 text-green-400">✓ AI Bot trained successfully (Accuracy: 99.2%)</p>
                <p className="mb-2 text-white">$ iyonic deploy --platform iyonicorp --target storefront</p>
                <p className="text-blue-500">→ Bot deployed to: shop-assistant-v2.iyonicbots.com</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trust Section */}
      <section className="px-6 py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-12">Powering autonomous agents for</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {['OpenAI', 'Anthropic', 'Meta', 'Google', 'Microsoft', 'NVIDIA'].map((brand) => (
              <span key={brand} className="text-2xl font-black text-gray-900 tracking-tighter">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Features Grid */}
      <section id="features" className="px-6 py-32 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">Built for the <span className="text-blue-600 italic font-serif font-light lowercase">autonomous</span> era.</h2>
          <p className="text-xl text-gray-500 font-medium leading-relaxed">The most advanced AI agent infrastructure. Train, deploy, and manage custom bots that actually understand your business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Database className="w-8 h-8" />, 
              title: 'Vector Knowledge', 
              desc: 'Convert your PDFs, docs, and URLs into a high-performance vector database for instant AI retrieval.',
              color: 'bg-blue-50 text-blue-600'
            },
            { 
              icon: <ShieldCheck className="w-8 h-8" />, 
              title: 'Isolated Context', 
              desc: 'Every bot operates in a strictly isolated environment. Your proprietary data never leaks between agents.',
              color: 'bg-cyan-50 text-cyan-600'
            },
            { 
              icon: <Globe className="w-8 h-8" />, 
              title: 'Multi-Platform', 
              desc: 'One-click deployment to Iyonicorp, WordPress, Shopify, or any custom site with a lightweight JS widget.',
              color: 'bg-indigo-50 text-indigo-600'
            },
            { 
              icon: <Smartphone className="w-8 h-8" />, 
              title: 'Mobile Native', 
              desc: 'Optimized chat interfaces that feel native on every device, with support for voice and media.',
              color: 'bg-blue-900 text-white'
            },
            { 
              icon: <Zap className="w-8 h-8" />, 
              title: 'Real-time Learning', 
              desc: 'Bots update their knowledge base in real-time as you add new information to your dashboard.',
              color: 'bg-amber-50 text-amber-600'
            },
            { 
              icon: <Terminal className="w-8 h-8" />, 
              title: 'Developer SDK', 
              desc: 'Full API access to programmatically manage bots, training data, and chat sessions.',
              color: 'bg-gray-900 text-white'
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-10 bg-white border border-gray-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500 group"
            >
              <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-current/10 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bot Templates Section */}
      <section id="templates" className="px-6 py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-5xl font-black text-gray-900 mb-6 tracking-tighter">Available Bot Templates</h2>
            <p className="text-lg text-gray-500 font-medium">Choose a specialized agent personality for your specific business needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {availableBots.map((bot) => (
              <motion.div 
                key={bot.id}
                whileHover={{ y: -10 }}
                className="bg-white rounded-[3.5rem] p-10 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col"
              >
                <div className={`w-20 h-20 ${bot.color} rounded-3xl flex items-center justify-center mb-10 shadow-lg`}>
                  {bot.icon}
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">{bot.name}</h3>
                <p className="text-gray-500 font-medium mb-8 flex-1 leading-relaxed">{bot.desc}</p>
                
                <div className="space-y-3 mb-10">
                  {bot.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-3 text-sm font-bold text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => setIsRegisterPopupOpen(true)}
                  className="w-full py-6 rounded-[2rem] bg-gray-900 hover:bg-black text-white font-black"
                >
                  Deploy {bot.name}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API / Code Section */}
      <section id="api" className="px-6 py-32 bg-gray-950 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/10 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Code className="w-4 h-4" />
              <span>Full API Access</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-tight">Embed <span className="text-blue-500">intelligence</span> into your app.</h2>
            <p className="text-xl text-gray-400 font-medium mb-12 leading-relaxed">
              Integrate custom AI agents into your existing workflows with our powerful REST API and client-side SDKs.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Latency', value: '<200ms' },
                { label: 'Availability', value: '99.99%' },
                { label: 'Accuracy', value: '99.2%' },
                { label: 'Security', value: 'AES-256' }
              ].map((stat, i) => (
                <div key={stat.label} className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-3xl font-black text-white mb-1 tracking-tighter">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 relative">
            <div className="bg-[#0f172a] rounded-[2.5rem] p-8 shadow-2xl border border-white/5 relative z-10">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">iyonic-sdk.js</span>
              </div>
              <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                <code className="text-blue-400">
                  {`import { IyonicBot } from '@iyonic/sdk';

const agent = new IyonicBot('bot_id_...');

// Connect to neural core
await agent.connect();

// Stream completion
agent.chat('How do I process a refund?', (chunk) => {
  render(chunk);
});`}
                </code>
              </pre>
            </div>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/20 rounded-full blur-[100px] -z-0"></div>
          </div>
        </div>
      </section>

      {/* Global Impact Section */}
      <section className="px-6 py-32 max-w-7xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">Scale <span className="text-cyan-500">beyond</span> human limits.</h2>
        <p className="text-xl text-gray-500 font-medium max-w-3xl mx-auto mb-20 leading-relaxed">We handle millions of interactions daily, allowing businesses to provide expert-level support at any time, in any language.</p>
        
        <div className="relative aspect-[21/9] bg-gray-50 rounded-[4rem] overflow-hidden border border-gray-100 group">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
            <Database className="w-full h-full text-blue-900 p-24" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-20">
              {[
                { label: 'AI Interactions', value: '15M+' },
                { label: 'Data Points', value: '2.4B+' },
                { label: 'Cost Savings', value: '85%' },
                { label: 'Live Bots', value: '12K+' }
              ].map((stat, i) => (
                <div key={stat.label}>
                  <p className="text-5xl font-black text-gray-900 mb-2 tracking-tighter">{stat.value}</p>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-32">
        <div className="max-w-7xl mx-auto bg-blue-600 rounded-[4rem] p-12 md:p-32 text-center relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-12 tracking-tighter leading-tight">Deploy your AI <br/> workforce today.</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button onClick={() => setIsRegisterPopupOpen(true)} className="px-12 py-6 bg-white text-blue-600 font-black rounded-[2rem] text-xl shadow-2xl shadow-black/10 hover:bg-gray-50 transition-all active:scale-95">Get Started Free</button>
              <button onClick={() => setIsLoginPopupOpen(true)} className="px-12 py-6 bg-blue-700 text-white font-black rounded-[2rem] text-xl hover:bg-blue-800 transition-all active:scale-95">Book a Demo</button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-[100px] -ml-48 -mb-48"></div>
        </div>
      </section>

      <AnimatePresence>
        {isLoginPopupOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row"
          >
            <div className="hidden md:flex md:w-1/2 bg-gray-950 p-12 flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-16">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-white uppercase">IyonicBots</span>
                </div>
                <h2 className="text-6xl font-black text-white leading-[1.1] mb-8">
                  The <span className="text-blue-500 italic font-serif font-light">next</span> generation of AI agents.
                </h2>
                <p className="text-gray-400 text-xl max-w-md font-medium leading-relaxed">
                  Train intelligent bots on your own data and deploy them anywhere in seconds. Your 24/7 AI workforce starts here.
                </p>
              </div>

              <div className="relative z-10 space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-950 bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" className="w-full h-full object-cover opacity-80" />
                      </div>
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm font-bold">Trusted by 5,000+ businesses</span>
                </div>

                <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem]">
                   <div className="flex items-center space-x-2 text-blue-500 mb-2">
                     <Sparkles className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">New Engine v2.0</span>
                   </div>
                   <p className="text-white font-bold">99.2% accuracy in technical documentation parsing.</p>
                </div>
              </div>
              
              {/* Decorative Blobs */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
            </div>

            <div className="flex-1 flex flex-col p-8 md:p-24 relative">
              <button 
                onClick={() => setIsLoginPopupOpen(false)}
                className="absolute top-8 right-8 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
              </button>

              <div className="max-w-md w-full mx-auto my-auto">
                <div className="mb-12">
                  <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Welcome Back</h3>
                  <p className="text-gray-500 font-medium">New to IyonicBots? <button onClick={() => { setIsLoginPopupOpen(false); setIsRegisterPopupOpen(true); }} className="text-blue-600 font-black hover:underline transition-colors">Create account</button></p>
                </div>

                <form onSubmit={onLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Account Email</label>
                    <input 
                      type="email" 
                      value={loginForm.email} 
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                      placeholder="name@company.com"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Security Key</label>
                      <button type="button" onClick={() => { setIsLoginPopupOpen(false); setIsContinuePopupOpen(true); }} className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:underline">Forgot?</button>
                    </div>
                    <input 
                      type="password" 
                      value={loginForm.password} 
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                      placeholder="••••••••"
                      required 
                    />
                  </div>
                  
                  {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-2xl border border-red-100">{error}</p>}

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-200 transition-all active:scale-95 text-lg">
                    Sign In to Console
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-gray-400">Or enter using</span></div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => { setIsLoginPopupOpen(false); setIsContinuePopupOpen(true); }}
                    className="w-full bg-white border-2 border-gray-100 hover:border-blue-100 text-gray-900 font-black py-5 rounded-3xl transition-all flex items-center justify-center space-x-4 active:scale-95"
                  >
                    <div className="w-6 h-6 bg-blue-600 p-1 rounded-lg shadow-lg shadow-blue-200">
                      <img src="/shopright-logo.png" alt="" className="w-full h-full object-contain" />
                    </div>
                    <span>Iyonicorp ID</span>
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {isRegisterPopupOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row"
          >
            <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-16">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-white uppercase">IyonicBots</span>
                </div>
                <h2 className="text-6xl font-black text-white leading-[1.1] mb-8">
                  Build <span className="text-blue-200 italic font-serif font-light">better</span> together.
                </h2>
                <p className="text-blue-100 text-xl max-w-md font-medium">
                  Create your free account today and start training your first custom AI agent in less than 5 minutes.
                </p>
              </div>
              
              <div className="relative z-10 space-y-6">
                {[
                  { icon: <Cpu className="w-5 h-5" />, title: 'Neural Core', desc: 'Advanced LLM processing' },
                  { icon: <Database className="w-5 h-5" />, title: 'Knowledge Base', desc: 'Secure data ingestion' },
                  { icon: <Terminal className="w-5 h-5" />, title: 'Low-Code Deployment', desc: 'Simple embed scripts' }
                ].map((feat, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-lg">
                      {feat.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{feat.title}</h4>
                      <p className="text-blue-200 text-xs">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-1/2 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48"></div>
            </div>

            <div className="flex-1 flex flex-col p-8 md:p-20 relative overflow-y-auto">
              <button 
                onClick={() => setIsRegisterPopupOpen(false)}
                className="absolute top-8 right-8 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
              </button>

              <div className="max-w-xl w-full mx-auto my-auto py-12">
                <div className="mb-12">
                  <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Engine Registration</h3>
                  <p className="text-gray-500 font-medium">Already part of the fleet? <button onClick={() => { setIsRegisterPopupOpen(false); setIsLoginPopupOpen(true); }} className="text-blue-600 font-black hover:underline transition-colors">Sign in</button></p>
                </div>

                <form onSubmit={onRegister} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Legal First Name</label>
                      <input 
                        value={registerForm.firstName} 
                        onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                        placeholder="John"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Legal Last Name</label>
                      <input 
                        value={registerForm.lastName} 
                        onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                        placeholder="Doe"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">AI Engine ID (Username)</label>
                    <div className="relative">
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 font-black">@</span>
                      <input 
                        value={registerForm.username} 
                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl pl-12 pr-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                        placeholder="username"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Official Email</label>
                    <input 
                      type="email" 
                      value={registerForm.email} 
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                      placeholder="john@example.com"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Phone Contact</label>
                      <input 
                        value={registerForm.phoneNumber} 
                        onChange={(e) => setRegisterForm({...registerForm, phoneNumber: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                        placeholder="+1 234 567 890"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Security Key</label>
                      <input 
                        type="password" 
                        value={registerForm.password} 
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-blue-50 transition-all placeholder:text-gray-300"
                        placeholder="••••••••"
                        required 
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-2xl border border-red-100">{error}</p>}

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-200 transition-all active:scale-95 text-lg">
                    Initialize Engine
                  </button>

                  <p className="text-[10px] text-gray-400 text-center px-12 leading-relaxed">
                    By initializing your engine, you agree to the <a href="#" className="underline text-gray-500">Autonomous Agent Protocols</a> and <a href="#" className="underline text-gray-500">Data Privacy Standards</a>.
                  </p>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Popup isOpen={isContinuePopupOpen} onClose={() => setIsContinuePopupOpen(false)} title="Integrate Iyonicorp Account" size="md">
        {!confirmAccount ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 font-medium">Use your existing Iyonicorp credentials to quickly set up your IyonicBots engine.</p>
            <Input label="Iyonicorp Email" type="email" value={iyonicorpEmail} onChange={(e) => setIyonicorpEmail(e.target.value)} placeholder="email@example.com" />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <Button className="w-full bg-gray-900 py-4 rounded-xl font-bold" onClick={handleIyonicorpContinue} isLoading={loading}>Continue</Button>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="p-4 bg-gray-50 rounded-2xl flex items-center space-x-3 border border-gray-100">
               <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">{username.charAt(0).toUpperCase()}</div>
               <div>
                 <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Account Found</p>
                 <p className="font-bold text-gray-900">@{username}</p>
               </div>
             </div>
             <Input label="Engine ID (Username)" value={username} onChange={(e) => setUsername(e.target.value)} />
             <Input label="Iyonicorp Password" type="password" value={iyonicorpPassword} onChange={(e) => setIyonicorpPassword(e.target.value)} placeholder="••••••••" />
             {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
             <Button className="w-full bg-blue-600 py-4 rounded-xl font-bold" onClick={handleFinalizeIyonicorp} isLoading={loading}>Finalize Integration</Button>
          </div>
        )}
      </Popup>

      <section id="pricing" className="bg-gray-50 px-6 py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Bot plans</p>
            <h2 className="mt-4 text-5xl font-black tracking-tight text-gray-900">Start free. Advance when ready.</h2>
            <p className="mt-6 text-lg leading-8 text-gray-500">Start with a free bot, add the everyday Basic toolkit for $2, then unlock deeper training and deployment controls.</p>
          </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              { id: 'starter', name: 'Starter', price: 0, displayPrice: 'Free', text: 'A focused role-based bot to get your store moving.', cta: 'Start free' },
              { id: 'basic', name: 'Basic', price: 2, displayPrice: '$2/mo', text: 'Three role-based bots for everyday store support.', cta: 'Get Basic' },
              { id: 'pro', name: 'Pro', price: 9.99, displayPrice: '$9.99/mo', text: 'Advanced training and deployment with IyonicShop Professional.', cta: 'Get Pro' },
              { id: 'promax', name: 'Pro Max', price: 29.99, displayPrice: '$29.99/mo', text: 'Priority automation and the complete agent toolkit with Enterprise.', cta: 'Get Pro Max' }
            ].map((plan, index) => {
              const isSeller = user?.role === 'seller';
              const isCurrent = isSeller && billing.plan.id === plan.id;
              return (
              <div key={plan.name} className={`rounded-[2rem] p-8 ${
                index === 1 ? 'bg-blue-600 text-white shadow-2xl shadow-blue-200' : 'bg-white text-gray-900 shadow-xl'
              } ${isCurrent ? 'ring-2 ring-indigo-600' : ''}`}>
                <p className={`text-xs font-black uppercase tracking-[0.2em] ${index === 1 ? 'text-blue-100' : 'text-blue-600'}`}>{plan.name}</p>
                <p className="mt-5 text-4xl font-black">{plan.displayPrice}</p>
                {plan.price > 0 && (
                  <p className={`mt-2 text-xs ${index === 1 ? 'text-blue-200' : 'text-gray-400'}`}>per bot per month</p>
                )}
                <p className={`mt-4 min-h-14 leading-7 ${index === 1 ? 'text-blue-100' : 'text-gray-500'}`}>{plan.text}</p>
                <button
                  onClick={() => isSeller ? handlePricingAction() : setIsRegisterPopupOpen(true)}
                  className={`mt-8 w-full rounded-xl px-5 py-3 font-black transition ${index === 1 ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-gray-900 text-white hover:bg-black'}`}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : (isSeller ? plan.cta : 'Start with this tier')}
                </button>
              </div>
            );
            })}
        </div>
          </div>
      </section>

      <ProductFooter product="IyonicBots" accentClass="text-blue-400" description="Train practical AI agents on your business knowledge and give your team more time for work that matters." />
      <footer className="hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase">IyonicBots</span>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-sm font-black uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Safety</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Status</a>
          </div>
          <p className="text-gray-400 text-xs font-bold">© 2026 Iyonic AI Engine by Iyonicorp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default IyonicBots;
