import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { Button, Input, Card, Popup, Textarea } from '../components/ui';
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
  X
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const IyonicBots: React.FC = () => {
  const { user, login, register, setAuthenticatedUser, logout } = useAuth();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isRegisterPopupOpen, setIsRegisterPopupOpen] = useState(false);
  const [isContinuePopupOpen, setIsContinuePopupOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-bots' | 'training' | 'api'>('dashboard');
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Bot states
  const [availableBots] = useState([
    { id: 'support-pro', name: 'SupportPro', desc: 'Expert customer service bot trained for e-commerce.', icon: <MessageSquare className="w-6 h-6" />, category: 'Support' },
    { id: 'sales-genie', name: 'SalesGenie', desc: 'Aggressive sales assistant that drives conversions.', icon: <Zap className="w-6 h-6" />, category: 'Sales' },
    { id: 'tech-guru', name: 'TechGuru', desc: 'Technical documentation specialist and debugger.', icon: <Terminal className="w-6 h-6" />, category: 'Technical' },
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

  useEffect(() => {
    if (user) {
      setView('dashboard');
      fetchBots();
    }
  }, [user]);

  const fetchBots = async () => {
    try {
      const response = await api.get('/bots');
      setMyBots(response.data);
      if (response.data.length > 0 && !activeBot) {
        setActiveBot(response.data[0]);
        setTrainingData(response.data[0].trainingData || '');
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    }
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
        role: 'customer'
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
      setSuccess('Bot created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create bot');
    }
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
      setSuccess('Widget configuration saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save widget configuration');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (view === 'dashboard' && user) {
    const sidebarItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'my-bots', label: 'My Bots', icon: <Bot className="w-5 h-5" /> },
      { id: 'training', label: 'AI Training', icon: <Database className="w-5 h-5" /> },
      { id: 'api', label: 'Deploy & API', icon: <Terminal className="w-5 h-5" /> },
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex font-sans">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-gray-200 hidden lg:flex flex-col h-screen sticky top-0">
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
                onClick={() => setActiveTab(item.id as any)}
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
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-8 py-5">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
              <div>
                <h1 className="text-xl font-black text-gray-900 capitalize">
                  {activeTab.replace('-', ' ')}
                </h1>
                <p className="text-xs text-gray-500 font-medium">Iyonic AI Engine v2.0</p>
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
                            <h2 className="text-6xl font-black tracking-tighter">8,420</h2>
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
                        <Card key={bot.id} className="hover:shadow-2xl transition-all cursor-pointer group rounded-[2.5rem] border-none shadow-lg">
                          <div className="p-2">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {bot.icon}
                            </div>
                            <h4 className="text-xl font-black text-gray-900 mb-2">{bot.name}</h4>
                            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">{bot.desc}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{bot.category}</span>
                              <Button size="sm" variant="ghost" className="rounded-full">Select <ChevronRight className="ml-1 w-4 h-4" /></Button>
                            </div>
                          </div>
                        </Card>
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
                                    <span className="text-xs font-bold text-gray-400 capitalize">{bot.botType}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{bot.status}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-8">
                                <div className="text-center">
                                  <p className="text-xl font-black text-gray-900">{bot.deployments}</p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Deployments</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold text-gray-900">{bot.lastTrained && bot.lastTrained !== 'Never' ? new Date(bot.lastTrained).toLocaleDateString() : 'Never'}</p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Last Trained</p>
                                </div>
                                <div className="flex space-x-2">
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

              {activeTab === 'training' && (
                <motion.div
                  key="training"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
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
                        {activeBot && (
                          <Button 
                            variant="outline" 
                            className="rounded-2xl border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={handleAutoTrain}
                            disabled={trainingStatus === 'training'}
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${trainingStatus === 'training' ? 'animate-spin' : ''}`} />
                            Auto-train from Store
                          </Button>
                        )}
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
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 block ml-1">Bot Type</label>
              <div className="grid grid-cols-1 gap-3">
                {availableBots.map(bot => (
                  <button 
                    key={bot.id}
                    onClick={() => setNewBotData({...newBotData, type: bot.id})}
                    className={`p-4 rounded-2xl border-2 text-left flex items-center space-x-4 transition-all ${
                      newBotData.type === bot.id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${newBotData.type === bot.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {bot.icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{bot.name}</p>
                      <p className="text-xs text-gray-500">{bot.desc}</p>
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

      <footer className="px-6 py-20 border-t border-gray-100">
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

// Simple Badge component if not available in ui
const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'info' }> = ({ children, variant = 'info' }) => {
  const styles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700'
  };
  return <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${styles[variant]}`}>{children}</span>;
};
