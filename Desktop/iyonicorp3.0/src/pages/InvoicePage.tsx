import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { formatPrice } from '../utils/currency';
import { Button, Card, Input, Popup } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { 
  Wallet, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowLeft,
  User,
  Mail,
  CreditCard,
  Building,
  QrCode,
  Copy,
  Cpu,
  Lock,
  Globe,
  Activity,
  Palette,
  X,
  RotateCcw,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

declare const PaystackPop: any;

// Helper to convert DB rows (snake_case) to camelCase
const toCamel = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj; // Skip Date objects
  if (Array.isArray(obj)) return obj.map(v => toCamel(v));
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result: any, key) => {
      // Don't camelCase data keys like 'subscription' if they are already objects with specific structure
      if (key === 'subscription' || key === 'theme' || key === 'stats' || key === 'config' || key === 'custom_media') {
        result[key === 'custom_media' ? 'customMedia' : key] = toCamel(obj[key]);
        return result;
      }
      const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

const InvoicePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rawInvoice, setRawInvoice] = useState<any>(null);

  const previewTheme = searchParams.get('theme');
  const isPreview = token === 'preview' || searchParams.get('preview') === 'true';
  const queryTitle = searchParams.get('customTitle');
  const queryButtonText = searchParams.get('customButtonText');
  const queryAmount = searchParams.get('amount');
  const queryDescription = searchParams.get('description');
  const queryCurrency = searchParams.get('currency');
  const customMediaUrl = searchParams.get('customMediaUrl');
  const customMediaType = searchParams.get('customMediaType') as 'image' | 'video' | null;

  const invoice = isPreview && rawInvoice ? {
    ...rawInvoice,
    customTitle: queryTitle !== null ? queryTitle : rawInvoice.customTitle,
    customButtonText: queryButtonText !== null ? queryButtonText : rawInvoice.customButtonText,
    amount: queryAmount !== null ? parseFloat(queryAmount) : rawInvoice.amount,
    description: queryDescription !== null ? queryDescription : rawInvoice.description,
    currency: queryCurrency !== null ? queryCurrency : rawInvoice.currency,
  } : rawInvoice;

  const activeTheme = previewTheme || invoice?.globalTheme || invoice?.theme || 'professional';
  const activeMedia = invoice?.customMedia;

  const themeStyles: Record<string, any> = {
    professional: {
      id: 'professional',
      bg: 'bg-gradient-to-br from-indigo-50 via-white to-purple-50',
      primary: 'bg-indigo-600',
      text: 'text-indigo-600',
      font: 'font-sans'
    },
    glassmorphism: {
      id: 'glassmorphism',
      bg: 'bg-[url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000")] bg-cover bg-center',
      primary: 'bg-blue-500',
      text: 'text-blue-500',
      font: 'font-sans'
    },
    neobrutalism: {
      id: 'neobrutalism',
      bg: 'bg-[#FFDE00]',
      primary: 'bg-black',
      text: 'text-black',
      font: 'font-mono'
    },
    terminal: {
      id: 'terminal',
      bg: 'bg-[#0D0D0D]',
      primary: 'bg-[#00FF41]',
      text: 'text-[#00FF41]',
      font: 'font-mono'
    },
    minimal: {
      id: 'minimal',
      bg: 'bg-white',
      primary: 'bg-gray-900',
      text: 'text-gray-900',
      font: 'font-serif'
    },
    luxury: {
      id: 'luxury',
      bg: 'bg-[#0F0F0F]',
      primary: 'bg-[#D4AF37]',
      text: 'text-[#D4AF37]',
      font: 'font-serif'
    },
    cyber: {
      id: 'cyber',
      bg: 'bg-[#000000] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black',
      primary: 'bg-cyan-400',
      text: 'text-cyan-400',
      font: 'font-mono'
    },
    sunset: {
      id: 'sunset',
      bg: 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600',
      primary: 'bg-white',
      text: 'text-white',
      font: 'font-sans'
    },
    ocean: {
      id: 'ocean',
      bg: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-900',
      primary: 'bg-cyan-200',
      text: 'text-cyan-200',
      font: 'font-sans'
    },
    forest: {
      id: 'forest',
      bg: 'bg-gradient-to-br from-emerald-400 via-green-600 to-teal-900',
      primary: 'bg-emerald-100',
      text: 'text-emerald-100',
      font: 'font-sans'
    },
    retro: {
      id: 'retro',
      bg: 'bg-[#000] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]',
      primary: 'bg-[#39ff14]',
      text: 'text-[#39ff14]',
      font: 'font-mono'
    },
    galaxy: {
      id: 'galaxy',
      bg: 'bg-[#050505]',
      primary: 'bg-purple-500',
      text: 'text-purple-400',
      font: 'font-sans'
    },
    holographic: {
      id: 'holographic',
      bg: 'bg-white',
      primary: 'bg-pink-400',
      text: 'text-pink-600',
      font: 'font-sans'
    },
    aurora: {
      id: 'aurora',
      bg: 'bg-slate-950',
      primary: 'bg-teal-400',
      text: 'text-teal-400',
      font: 'font-sans'
    },
    liquid: {
      id: 'liquid',
      bg: 'bg-white',
      primary: 'bg-rose-500',
      text: 'text-rose-600',
      font: 'font-sans'
    },
    vaporwave: {
      id: 'vaporwave',
      bg: 'bg-[#ff71ce] bg-[linear-gradient(transparent_0%,rgba(255,113,206,0.3)_50%,transparent_100%),linear-gradient(90deg,transparent_0%,rgba(1,205,254,0.3)_50%,transparent_100%)] bg-[length:20px_20px]',
      primary: 'bg-[#05ffa1]',
      text: 'text-[#05ffa1]',
      font: 'font-sans'
    },
    matrix: {
      id: 'matrix',
      bg: 'bg-black',
      primary: 'bg-[#00FF41]',
      text: 'text-[#00FF41]',
      font: 'font-mono'
    },
    steampunk: {
      id: 'steampunk',
      bg: 'bg-[#2b1b12] bg-[radial-gradient(#4a3728_1px,transparent_1px)] bg-[length:20px_20px]',
      primary: 'bg-[#cd7f32]',
      text: 'text-[#cd7f32]',
      font: 'font-serif'
    },
    underwater: {
      id: 'underwater',
      bg: 'bg-gradient-to-b from-[#004e92] to-[#000428]',
      primary: 'bg-[#00d2ff]',
      text: 'text-[#00d2ff]',
      font: 'font-sans'
    },
    magma: {
      id: 'magma',
      bg: 'bg-[#1a0505]',
      primary: 'bg-[#ff4500]',
      text: 'text-[#ff4500]',
      font: 'font-black'
    },
    exclusive: {
      id: 'exclusive',
      bg: 'bg-[#050505] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#0d0d0d] to-[#000000] border border-[#D4AF37]/30',
      primary: 'bg-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.3)]',
      text: 'text-[#D4AF37]',
      font: 'font-serif'
    }
  };
  const currentTheme = themeStyles[activeTheme] || themeStyles.professional;

  const [loading, setLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloaderStage, setPreloaderStage] = useState<'network' | 'device' | 'none'>('none');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRefundPopup, setShowRefundPopup] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  
  const [payerInfo, setPayerInfo] = useState({ name: '', email: '' });
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>(isAuthenticated ? 'wallet' : 'card');
  const hasAutoPaid = useRef(false);

  useEffect(() => {
    const autoPay = searchParams.get('autoPay') === 'true';
    if (autoPay && !loading && invoice && payerInfo.name && payerInfo.email && !hasAutoPaid.current) {
      // Check if Paystack script is ready
      const checkScript = setInterval(() => {
        if ((window as any).PaystackPop) {
          clearInterval(checkScript);
          hasAutoPaid.current = true;
          // Small delay to ensure any layout is ready
          setTimeout(() => {
            handlePay();
          }, 500);
        }
      }, 100);

      // Timeout after 10 seconds if script fails to load
      setTimeout(() => clearInterval(checkScript), 10000);
      
      return () => clearInterval(checkScript);
    }
  }, [loading, invoice, searchParams, payerInfo]);

  useEffect(() => {
    fetchInvoice();
  }, [token]);

  useEffect(() => {
    if (user && !payerInfo.name && !payerInfo.email) {
      setPayerInfo({ 
        name: user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : ''), 
        email: user.email || '' 
      });
    }
  }, [user]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      if (token === 'preview') {
        const dummyInvoice = {
          id: 'preview-12345',
          amount: 49.99,
          description: 'Premium Coffee Beans (Demo Link)',
          isReusable: true,
          status: 'pending',
          creatorName: 'Avery Johnson',
          creatorUsername: 'avery_demo',
          customTitle: 'Limited Offer',
          customButtonText: 'Order Now',
          globalTheme: previewTheme || 'professional',
          currency: queryCurrency || 'USD'
        };
        setRawInvoice(dummyInvoice);
        setCustomAmount('49.99');
        setLoading(false);
        return;
      }

      const res = await api.get(`/iyonicpay/invoices/${token}`);
      const invoiceData = toCamel(res.data);
      
      // Default to USD if currency is somehow missing
      if (!invoiceData.currency) {
        invoiceData.currency = 'USD';
      }
      
      setRawInvoice(invoiceData);
      setCustomAmount(invoiceData.amount > 0 ? String(invoiceData.amount) : '');
      
      if (invoiceData.customerName && invoiceData.customerEmail) {
        setIsPreloading(true);
        setPreloaderStage('network');
        setPayerInfo({ name: invoiceData.customerName, email: invoiceData.customerEmail });
        setTimeout(() => {
          setPreloaderStage('device');
          setTimeout(() => {
            setPreloaderStage('none');
            setIsPreloading(false);
          }, 2000);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletPay = async () => {
    try {
      setPaying(true);
      setError('');
      if (isPreview) {
        setTimeout(() => {
          setSuccess(true);
          setPaying(false);
        }, 1500);
        return;
      }
      await api.post(`/iyonicpay/invoices/${token}/pay`, { amount: parseFloat(customAmount) });
      setSuccess(true);
      fetchInvoice();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed. Check your balance.');
    } finally {
      if (!isPreview) setPaying(false);
    }
  };

  const handleCardPay = async () => {
    if (!payerInfo.email || !payerInfo.name) {
      setError('Please fill in your name and email');
      return;
    }
    const finalAmount = parseFloat(customAmount);
    if (!finalAmount || finalAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (isPreview) {
      setPaying(true);
      setTimeout(() => {
        setSuccess(true);
        setPaying(false);
      }, 1500);
      return;
    }

    try {
      setPaying(true);
      setError('');
      const res = await api.post(`/iyonicpay/invoices/${token}/initialize-external-payment`, {
        email: payerInfo.email,
        name: payerInfo.name,
        amount: finalAmount
      });
      if (res.data && res.data.status) {
        const handler = PaystackPop.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email: payerInfo.email,
          amount: Math.round(finalAmount * 100),
          currency: invoice?.currency || 'USD',
          reference: res.data.data.reference,
          metadata: {
            invoice_id: invoice.id,
            payer_name: payerInfo.name,
            is_reusable: invoice.isReusable,
            custom_fields: [{ display_name: "Invoice Reference", variable_name: "invoice_token", value: token }]
          },
          onClose: () => setPaying(false),
          callback: (response: any) => {
            api.post(`/iyonicpay/invoices/${token}/verify-external-payment`, { reference: response.reference })
              .then((verifyRes) => {
                if (verifyRes.data.success) {
                  setSuccess(true);
                  fetchInvoice();
                } else {
                  setError('Payment verification failed');
                }
              }).catch(() => setError('Failed to verify payment'))
              .finally(() => setPaying(false));
          }
        });
        handler.openIframe();
      } else {
        setError(res.data?.message || 'Failed to initialize payment');
        setPaying(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize card payment');
      setPaying(false);
    }
  };

  const handlePay = () => {
    if (paymentMethod === 'wallet') handleWalletPay();
    else handleCardPay();
  };

  const PaymentForm = (isGlass = false, isBrutal = false, isTerminal = false, isMinimal = false) => {
    const inputClass = isGlass 
      ? "w-full bg-white/10 border-white/20 rounded-2xl px-14 py-5 text-white font-bold focus:ring-4 ring-white/10 transition-all placeholder:text-white/20"
      : isBrutal
      ? "w-full bg-white border-4 border-black px-14 py-5 text-black font-black focus:bg-[#FFDE00] transition-all placeholder:text-black/30"
      : isTerminal
      ? "w-full bg-black border border-[#00FF41]/30 rounded-lg px-14 py-5 text-[#00FF41] font-mono focus:ring-4 ring-[#00FF41]/10 transition-all placeholder:text-[#00FF41]/20"
      : isMinimal
      ? "w-full bg-transparent border-b-2 border-gray-100 py-6 text-2xl font-black focus:border-gray-900 transition-all placeholder:text-gray-200 outline-none"
      : "w-full bg-gray-50 border-0 rounded-2xl px-14 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300";

    const labelClass = isTerminal ? "text-[#00FF41]/50 text-[10px] font-black uppercase tracking-[0.2em] ml-1" : "text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] ml-1";

    return (
      <div className="space-y-8">
        {isAuthenticated && (
          <div className={`flex ${isGlass ? 'bg-white/5 border-white/10' : isBrutal ? 'bg-black p-1' : isTerminal ? 'bg-[#050505] border-[#00FF41]/20' : 'bg-gray-50 border-gray-100'} p-1.5 rounded-2xl border mb-8`}>
            <button onClick={() => setPaymentMethod('wallet')} className={`flex-1 py-4 rounded-xl text-sm font-black transition-all flex items-center justify-center space-x-2 ${paymentMethod === 'wallet' ? (isGlass ? 'bg-white/20 text-white' : isBrutal ? 'bg-blue-400 text-black border-4 border-black' : isTerminal ? 'bg-[#00FF41]/20 text-[#00FF41]' : 'bg-white text-indigo-600 shadow-sm') : (isGlass ? 'text-white/40 hover:text-white' : isBrutal ? 'text-white' : isTerminal ? 'text-[#00FF41]/30' : 'text-gray-400')}`}>
              <Wallet className="w-5 h-5" />
              <span>Wallet</span>
            </button>
            <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-4 rounded-xl text-sm font-black transition-all flex items-center justify-center space-x-2 ${paymentMethod === 'card' ? (isGlass ? 'bg-white/20 text-white' : isBrutal ? 'bg-blue-400 text-black border-4 border-black' : isTerminal ? 'bg-[#00FF41]/20 text-[#00FF41]' : 'bg-white text-indigo-600 shadow-sm') : (isGlass ? 'text-white/40 hover:text-white' : isBrutal ? 'text-white' : isTerminal ? 'text-[#00FF41]/30' : 'text-gray-400')}`}>
              <CreditCard className="w-5 h-5" />
              <span>Card</span>
            </button>
          </div>
        )}
        <div className="space-y-6">
          {(!invoice?.amount || invoice?.amount <= 0) && (
            <div className="space-y-3">
              <label className={labelClass}>Amount ({invoice?.currency || 'USD'})</label>
              <div className="relative">
                <span className={`absolute ${isMinimal ? 'left-0' : 'left-6'} top-1/2 -translate-y-1/2 w-10 h-10 ${isTerminal ? 'text-[#00FF41]' : isGlass ? 'text-white' : 'text-gray-300'} opacity-30 font-black flex items-center justify-center text-xs`}>
                  {invoice?.currency === 'KES' ? 'KSh' : 
                   invoice?.currency === 'EUR' ? '€' : 
                   invoice?.currency === 'GBP' ? '£' : 
                   invoice?.currency === 'NGN' ? '₦' :
                   invoice?.currency === 'GHS' ? 'GH₵' :
                   invoice?.currency === 'ZAR' ? 'R' :
                   invoice?.currency === 'TZS' ? 'TSh' :
                   invoice?.currency === 'UGX' ? 'USh' :
                   '$'}
                </span>
                <input type="number" step="0.01" placeholder="Enter amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className={inputClass} />
              </div>
            </div>
          )}
          <div className="space-y-3">
            <label className={labelClass}>Name</label>
            <div className="relative">
              <User className={`absolute ${isMinimal ? 'left-0' : 'left-6'} top-1/2 -translate-y-1/2 w-5 h-5 ${isTerminal ? 'text-[#00FF41]' : isGlass ? 'text-white' : 'text-gray-300'} opacity-30`} />
              <input type="text" placeholder="Full name" value={payerInfo.name} onChange={(e) => setPayerInfo({...payerInfo, name: e.target.value})} className={inputClass} />
            </div>
          </div>
          <div className="space-y-3">
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail className={`absolute ${isMinimal ? 'left-0' : 'left-6'} top-1/2 -translate-y-1/2 w-5 h-5 ${isTerminal ? 'text-[#00FF41]' : isGlass ? 'text-white' : 'text-gray-300'} opacity-30`} />
              <input type="email" placeholder="Email address" value={payerInfo.email} onChange={(e) => setPayerInfo({...payerInfo, email: e.target.value})} className={inputClass} />
            </div>
          </div>
        </div>
        <Button onClick={handlePay} isLoading={paying} className={`w-full font-black py-6 rounded-[2rem] shadow-2xl flex items-center justify-center space-x-3 transition-all transform active:scale-[0.98] ${isGlass ? 'bg-white text-black hover:bg-gray-100 shadow-white/10' : isBrutal ? 'bg-[#FFDE00] text-black border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFD700]' : isTerminal ? 'bg-[#00FF41] text-black hover:bg-[#00D437] shadow-[0_0_20px_rgba(0,255,65,0.4)]' : isMinimal ? 'bg-gray-900 text-white hover:bg-black py-8 rounded-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}`}>
          {paymentMethod === 'wallet' ? (
            <>
              <Zap className="w-6 h-6 fill-current" />
              <span className="text-lg uppercase italic tracking-widest">{invoice?.customButtonText || 'Execute Payment'}</span>
            </>
          ) : (
            <>
              <CreditCard className="w-6 h-6" />
              <span className="text-lg uppercase italic tracking-widest">{invoice?.customButtonText || 'Checkout'}</span>
            </>
          )}
        </Button>
      </div>
    );
  };

  const ProfessionalLayout = () => (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-10 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/iyonicpay')}>
                    <div className="w-10 h-10 flex items-center justify-center">
                      <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <span className="text-xl font-black tracking-tight">IyonicPay</span>
                  </div>
                  <div className="px-4 py-2 bg-white/20 rounded-full"><span className="text-xs font-black uppercase tracking-widest">{invoice?.customTitle || 'Invoice'}</span></div>
                </div>
                <div className="flex items-center space-x-5 mb-8">
                  <div className="w-16 h-16 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl border border-white/30">{invoice.creatorName?.[0]}</div>
                  <div>
                    <h2 className="text-2xl font-black leading-none mb-1">{invoice.creatorName}</h2>
                    <p className="text-indigo-200 font-bold text-sm">@{invoice.creatorUsername}</p>
                  </div>
                </div>
                <div className="flex items-baseline space-x-3">
                  <span className="text-6xl font-black text-white tracking-tighter">
                    {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
                  </span>
                  {invoice.amount > 0 && <span className="text-indigo-200 font-bold text-lg">{invoice.currency || 'USD'}</span>}
                </div>
              </div>
            </div>
            <div className="p-10">
              <div className="space-y-8">
                <div>
                  <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-3">Description</label>
                  <p className="text-gray-900 font-bold text-lg">{invoice.description || 'Professional Services'}</p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-3">Invoice ID</label>
                    <p className="text-gray-900 font-mono text-sm">{invoice.id?.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] block mb-3">Status</label>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${invoice.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{invoice.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-10 h-full">
            <h3 className="text-2xl font-black text-gray-900 mb-8">Payment</h3>
            {PaymentForm()}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const GlassmorphismLayout = () => (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-12">
          <div className="flex justify-between items-start mb-16 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30"><Zap className="w-8 h-8" /></div>
              <span className="text-3xl font-black italic tracking-tighter">IyonicPay</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-white/40 uppercase tracking-[0.3em]">SECURE_PORTAL_v2</span>
              <div className="h-1 bg-white/20 mt-2 w-24 ml-auto"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="text-white space-y-12">
              <div><h2 className="text-7xl font-black leading-none mb-4 tracking-tighter italic uppercase">{invoice?.customTitle || 'The Invoice'}</h2><div className="w-20 h-2 bg-white/40 rounded-full"></div></div>
              <div className="space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/10">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white font-black border border-white/20">{invoice.creatorName?.[0]}</div>
                  <div>
                    <p className="text-sm font-black text-white leading-none">{invoice.creatorName}</p>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">@{invoice.creatorUsername}</p>
                  </div>
                </div>
                <div><label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">Service</label><p className="text-2xl font-black italic">{invoice.description || 'Professional Services'}</p></div>
                <div>
                  <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block mb-2">Total Amount</label>
                  <p className="text-5xl font-black italic tracking-tighter">
                    {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6 opacity-40"><Globe className="w-6 h-6" /><Lock className="w-6 h-6" /><Cpu className="w-6 h-6" /><span className="text-xs font-black uppercase tracking-widest">End-to-End Encrypted</span></div>
            </div>
            <div className="bg-white/10 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 p-10 shadow-inner">
              <h3 className="text-xl font-black text-white mb-8 italic uppercase tracking-widest">Complete Transaction</h3>
              {PaymentForm(true)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const NeoBrutalismLayout = () => (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white border-[6px] border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-0 border-b-[6px] border-black bg-white flex flex-col md:flex-row">
          <div className="p-8 border-r-0 md:border-r-[6px] border-black flex-1">
            <div className="flex items-center space-x-4 mb-12">
              <div className="w-12 h-12 bg-indigo-500 border-4 border-black flex items-center justify-center"><Wallet className="w-7 h-7 text-white" /></div>
              <span className="text-3xl font-black uppercase tracking-tighter">IyonicPay</span>
            </div>
            <h2 className="text-8xl font-black leading-none mb-8 uppercase tracking-tighter">{invoice?.customTitle || 'PAY ME.'}</h2>
            <div className="bg-[#FFDE00] border-4 border-black p-6 inline-block mb-12 transform -rotate-2">
              <span className="text-2xl font-black uppercase tracking-tight">
                TOTAL: {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
              </span>
            </div>
          </div>
          <div className="p-8 bg-blue-400 md:w-96 flex flex-col justify-end border-t-[6px] md:border-t-0 border-black">
             <div className="space-y-4">
                <div className="bg-white border-4 border-black p-4">
                  <label className="text-xs font-black uppercase block mb-1">From</label>
                  <p className="font-black text-xl">{invoice.creatorName}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">@{invoice.creatorUsername}</p>
                </div>
                <div className="bg-white border-4 border-black p-4"><label className="text-xs font-black uppercase block mb-1">For</label><p className="font-black text-xl line-clamp-1">{invoice.description || 'Professional Services'}</p></div>
             </div>
          </div>
        </div>
        <div className="p-12 bg-[#FF8C00]">
          <div className="max-w-xl mx-auto bg-white border-8 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-3xl font-black text-black mb-8 uppercase">Execute Payment</h3>
            {PaymentForm(false, true)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const TerminalLayout = () => (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0A0A0A] border-2 border-[#00FF41]/30 rounded-2xl shadow-[0_0_50px_rgba(0,255,65,0.1)] overflow-hidden font-mono">
        <div className="bg-[#1A1A1A] border-b border-[#00FF41]/30 p-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
          </div>
          <span className="text-[10px] text-[#00FF41]/50 uppercase tracking-[0.3em]">iyonic_terminal_v4.2.0</span>
          <Activity className="w-4 h-4 text-[#00FF41] animate-pulse" />
        </div>
        <div className="p-12">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="text-[#00FF41] space-y-12">
              <div className="space-y-4">
                <p className="text-xs opacity-50"># {invoice?.customTitle ? `EXECUTING_${invoice.customTitle.toUpperCase().replace(/\s+/g, '_')}...` : 'EXECUTING_PAYMENT_REQUEST...'}</p>
                <h2 className="text-6xl font-black tracking-tighter uppercase italic">IYONIC <br /> PAY.</h2>
              </div>
              <div className="border-l-2 border-[#00FF41]/30 pl-8 space-y-8">
                <div>
                  <p className="text-[10px] opacity-50 mb-2">// MERCHANT</p>
                  <p className="text-xl uppercase font-black">{invoice.creatorName}</p>
                </div>
                <div><p className="text-[10px] opacity-50 mb-2">// DESCRIPTION</p><p className="text-xl">{invoice.description || 'Professional Services'}</p></div>
                <div>
                  <p className="text-[10px] opacity-50 mb-2">// VALUE</p>
                  <p className="text-5xl font-black">
                    {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW_MODE'}
                  </p>
                </div>
                <div><p className="text-[10px] opacity-50 mb-2">// SOURCE</p><p className="text-sm">CREATOR_ID: @{invoice.creatorUsername}</p></div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="p-3 bg-[#00FF41]/10 rounded-lg border border-[#00FF41]/20"><Cpu className="w-6 h-6" /></div>
                <div className="flex-1 h-[2px] bg-[#00FF41]/10"></div>
              </div>
            </div>
            <div className="bg-[#111] border border-[#00FF41]/30 rounded-2xl p-8 relative group">
              <h3 className="text-sm font-black text-[#00FF41] mb-8 uppercase tracking-widest border-b border-[#00FF41]/30 pb-4">Initialize Protocol</h3>
              {PaymentForm(false, false, true)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const MinimalLayout = () => (
    <div className="max-w-2xl mx-auto py-24 px-6 text-black">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-24">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3 grayscale opacity-80 text-black">
            <Wallet className="w-6 h-6" />
            <span className="text-xl font-black tracking-tighter uppercase">IyonicPay</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Request: {invoice.id?.slice(0, 8)}</span>
        </div>
        <div className="space-y-4">
           <h2 className="text-8xl font-black text-gray-900 leading-none tracking-tighter">
             {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}
           </h2>
           <p className="text-2xl text-gray-400 font-medium italic">{invoice.description || 'Professional Services'}</p>
        </div>
        <div className="pt-24 border-t border-gray-100 text-black">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Merchant</span>
              <p className="text-xl font-black italic">{invoice.creatorName}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">@{invoice.creatorUsername}</p>
            </div>
            <div className="text-right"><span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Status</span><p className="text-xl font-black italic uppercase text-amber-500">{invoice.status}</p></div>
          </div>
          <div className="space-y-12">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-300">Complete Payment</h3>
            {PaymentForm(false, false, false, true)}
          </div>
        </div>
        <footer className="pt-24 opacity-20 text-[10px] font-black uppercase tracking-[0.4em] flex justify-between items-center text-black">
          <span>&copy; {new Date().getFullYear()} IyonicPay</span>
          <ShieldCheck className="w-4 h-4" />
        </footer>
      </motion.div>
    </div>
  );

  const LuxuryLayout = () => (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 bg-[#1A1A1A] rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden border border-[#D4AF37]/20">
        <div className="p-16 border-b lg:border-b-0 lg:border-r border-[#D4AF37]/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-20">
              <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]"><Wallet className="w-6 h-6 text-black" /></div>
              <span className="text-2xl font-serif text-[#D4AF37] tracking-[0.2em] uppercase">IyonicPay</span>
            </div>
            <div className="space-y-8">
              <div className="inline-block px-4 py-1 border border-[#D4AF37]/30 rounded-full text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] mb-4">Official Invoice</div>
              <h2 className="text-7xl font-serif text-white leading-none tracking-tighter">
                {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
              </h2>
              <p className="text-[#D4AF37]/60 text-xl font-serif italic">{invoice.description || 'Professional Services'}</p>
            </div>
          </div>
          <div className="mt-20 pt-12 border-t border-[#D4AF37]/10">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/40 block mb-2">Merchant Partner</span>
                <p className="text-xl font-serif text-white italic">{invoice.creatorName}</p>
                <p className="text-[10px] font-bold text-[#D4AF37]/40 uppercase tracking-widest mt-1">@{invoice.creatorUsername}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/40 block mb-2">Reference</span>
                <p className="text-sm font-mono text-white opacity-60">{invoice.id?.slice(0, 12)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-16 bg-[#111] flex flex-col justify-center">
          <h3 className="text-3xl font-serif text-white mb-12 italic">Secure Settlement</h3>
          <div className="luxury-form">
            {PaymentForm()}
          </div>
          <div className="mt-12 flex items-center space-x-4 opacity-20 grayscale">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Quantum Secured Protocol</span>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const CyberLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl w-full bg-black border-2 border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 p-12 lg:p-20 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px]"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-24">
                <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
                <span className="text-2xl font-black text-white tracking-[0.2em]">IYONIC_PAY v2.0</span>
              </div>
              <div className="space-y-4 mb-24">
                <div className="flex items-center space-x-3"><span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span><span className="text-cyan-400 text-xs font-black uppercase tracking-widest">Incoming Transaction Request</span></div>
                <h2 className="text-8xl font-black text-white tracking-tighter leading-none">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW_MODE'}
                  {invoice.amount > 0 && <span className="text-cyan-400/30 text-4xl ml-4">{invoice.currency || 'USD'}</span>}
                </h2>
                <div className="bg-cyan-400/5 border-l-4 border-cyan-400 p-6 mt-8">
                  <p className="text-cyan-400 font-mono text-lg uppercase tracking-wider">{invoice.description || 'Professional Services'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-12 font-mono">
                <div>
                  <span className="text-white/30 text-[10px] uppercase tracking-[0.2em] block mb-2">Source_Entity</span>
                  <p className="text-cyan-400 font-black uppercase">{invoice.creatorName}</p>
                  <p className="text-[10px] text-white/20 mt-1">@{invoice.creatorUsername}</p>
                </div>
                <div><span className="text-white/30 text-[10px] uppercase tracking-[0.2em] block mb-2">Hash_ID</span><p className="text-white/60 text-xs truncate">{invoice.id}</p></div>
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-xl border-l border-white/10 p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-12"><h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-4">Authorization</h3><div className="h-1 w-12 bg-cyan-400"></div></div>
            {PaymentForm(false, false, true)}
            <div className="mt-12 p-4 bg-black/40 border border-cyan-500/20 rounded font-mono text-[9px] text-cyan-400/50 uppercase tracking-widest">
              [SYSTEM]: QUANTUM_TUNNEL_ESTABLISHED <br/>
              [STATUS]: AWAITING_CLIENT_EXECUTION
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const SunsetLayout = () => (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/20 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/30 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-12 lg:p-20 text-white flex flex-col justify-center">
            <div className="flex items-center space-x-4 mb-16">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/40"><Wallet className="w-7 h-7 text-white" /></div>
              <span className="text-2xl font-black tracking-tighter">IyonicPay</span>
            </div>
            <div className="space-y-8 mb-20">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Amount to Pay</span>
                <h2 className="text-8xl font-black tracking-tighter leading-none">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}
                  {invoice.amount > 0 && <span className="text-2xl ml-4 opacity-40">{invoice.currency || 'USD'}</span>}
                </h2>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <p className="text-xl font-bold italic opacity-90">{invoice.description || 'Professional Services'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 border-t border-white/20 pt-10 opacity-60">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-2">Request From</span>
                <p className="font-bold">{invoice.creatorName}</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">@{invoice.creatorUsername}</p>
              </div>
              <div><span className="text-[10px] font-black uppercase tracking-widest block mb-2">Secure Link</span><p className="font-mono text-xs truncate">{invoice.id}</p></div>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-3xl p-12 lg:p-16 flex flex-col justify-center">
            <h3 className="text-3xl font-black text-gray-900 mb-10 tracking-tight">Complete Payment</h3>
            {PaymentForm(false, true)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const OceanLayout = () => (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/20 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/30 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-12 lg:p-20 text-white flex flex-col justify-center">
            <div className="flex items-center space-x-4 mb-16">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/40"><Zap className="w-7 h-7 text-cyan-300" /></div>
              <span className="text-2xl font-black tracking-tighter italic">OceanPay</span>
            </div>
            <div className="space-y-8 mb-20">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">{invoice?.customTitle || 'Payment Request'}</span>
                <h2 className="text-8xl font-black tracking-tighter leading-none text-white">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
                </h2>
              </div>
              <div className="bg-cyan-900/40 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/20">
                <p className="text-xl font-bold text-cyan-50 italic leading-relaxed">{invoice.description || 'Professional Services'}</p>
              </div>
              <div className="flex items-center space-x-4 pt-4 border-t border-white/10">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white font-black text-xs">{invoice.creatorName?.[0]}</div>
                <div>
                  <p className="text-xs font-black text-white leading-none">{invoice.creatorName}</p>
                  <p className="text-[10px] font-bold text-cyan-300/40 uppercase tracking-widest mt-1">@{invoice.creatorUsername}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-8 opacity-60 text-cyan-100">
              <div className="flex items-center space-x-2"><Globe className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Global Secure</span></div>
              <div className="flex items-center space-x-2"><ShieldCheck className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Verified</span></div>
            </div>
          </div>
          <div className="bg-white p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-12"><h3 className="text-sm font-black text-indigo-900 uppercase tracking-[0.4em] mb-4">Merchant Checkout</h3><div className="h-1 w-12 bg-indigo-600"></div></div>
            {PaymentForm(false, false, false)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const ForestLayout = () => (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-950/40 backdrop-blur-2xl rounded-[4rem] border border-emerald-400/20 shadow-2xl overflow-hidden p-2">
        <div className="bg-white rounded-[3.5rem] overflow-hidden grid grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-2 bg-emerald-900 p-12 text-white flex flex-col">
            <div className="flex-1">
              <div className="w-14 h-14 bg-emerald-400/20 rounded-[1.5rem] flex items-center justify-center mb-12"><Building className="w-8 h-8 text-emerald-400" /></div>
              <p className="text-emerald-400/60 text-xs font-black uppercase tracking-widest mb-4">Total Payable</p>
              <h2 className="text-6xl font-black tracking-tighter mb-8">
                {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm font-bold opacity-80"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><span>Organic Transaction</span></div>
                <div className="flex items-center space-x-3 text-sm font-bold opacity-80"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><span>Fast Settlement</span></div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-emerald-400/20">
              <p className="text-xs opacity-40 mb-2 uppercase font-black tracking-widest">Merchant</p>
              <p className="font-bold text-emerald-50 mb-4">{invoice.creatorName} (@{invoice.creatorUsername})</p>
              <p className="text-xs opacity-40 mb-2 uppercase font-black tracking-widest">Description</p>
              <p className="font-bold text-emerald-50">{invoice.description || 'Professional Services'}</p>
            </div>
          </div>
          <div className="lg:col-span-3 p-12 lg:p-16 bg-white">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-2xl font-black text-emerald-950">Payment Portal</h3>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-black">{invoice.creatorName?.[0]}</div>
            </div>
            {PaymentForm(false, false, false)}
            <p className="mt-12 text-center text-[10px] font-black text-emerald-900/20 uppercase tracking-[0.3em]">Encrypted Forest Protocol v1.2</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const RetroLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center font-mono">
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-[url('https://res.cloudinary.com/dqr69re9p/image/upload/v1625125125/noise_ytvqxs.png')]"></div>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl w-full bg-black border-4 border-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.2)] p-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#39ff14]/20 animate-scanline"></div>
        <div className="border-2 border-[#39ff14]/30 p-8 lg:p-12 relative">
          <div className="flex justify-between items-center mb-16 border-b-2 border-[#39ff14]/20 pb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#39ff14] text-black flex items-center justify-center font-black">IP</div>
              <span className="text-2xl font-black uppercase tracking-tighter animate-pulse">IYONIC_PAY v1.0</span>
            </div>
            <div className="text-[10px] text-right opacity-50">
              [SYSTEM_STATUS]: ONLINE <br />
              [ENCRYPTION]: 8-BIT_SECURE
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div>
                <p className="text-[#39ff14]/60 text-xs mb-4 uppercase">&gt; INCOMING_REQUEST</p>
                <h2 className="text-7xl font-black text-[#39ff14] tracking-tighter leading-none mb-4 glitch-text" data-text={invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}>
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW_MODE'}
                </h2>
                <div className="h-1 w-24 bg-[#39ff14]"></div>
              </div>
              <div className="bg-[#39ff14]/5 p-6 border border-[#39ff14]/20">
                <p className="text-xl text-[#39ff14]">&gt; {invoice.description || 'Professional Services'}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-[10px]">
                <div>
                  <span className="opacity-40 uppercase block mb-1">Source</span>
                  <p className="text-[#39ff14] uppercase">{invoice.creatorName}</p>
                  <p className="text-[#39ff14]/40 mt-1">@{invoice.creatorUsername}</p>
                </div>
                <div><span className="opacity-40 uppercase block mb-1">Ref_ID</span><p className="text-[#39ff14] truncate">{invoice.id}</p></div>
              </div>
            </div>
            <div className="bg-[#39ff14]/10 p-8 border-2 border-[#39ff14]/30">
              <h3 className="text-lg font-black text-[#39ff14] mb-8 uppercase tracking-widest">&gt; INITIALIZE_PAYMENT</h3>
              {PaymentForm(false, false, true)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const GalaxyLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center relative overflow-hidden bg-black">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="stars-container opacity-30"></div>
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-5xl w-full bg-black/40 backdrop-blur-3xl rounded-[4rem] border border-white/10 shadow-[0_0_80px_rgba(139,92,246,0.15)] overflow-hidden relative z-10">
        <div className="grid lg:grid-cols-2">
          <div className="p-12 lg:p-20 text-white flex flex-col justify-center">
            <div className="flex items-center space-x-4 mb-16">
              <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20"><Zap className="w-7 h-7 text-white" /></div>
              <span className="text-2xl font-black tracking-tighter">IyonicPay</span>
            </div>
            <div className="space-y-8 mb-20">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-purple-400">Interstellar Invoice</span>
                <h2 className="text-8xl font-black tracking-tighter leading-none bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
                </h2>
              </div>
              <p className="text-2xl font-medium text-white/80 leading-relaxed italic border-l-4 border-purple-500 pl-8">
                {invoice.description || 'Professional Services'}
              </p>
              <div className="flex items-center space-x-4 pt-4 border-t border-white/10 opacity-80">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 font-black text-xs">{invoice.creatorName?.[0]}</div>
                <div>
                  <p className="text-xs font-black text-white leading-none">{invoice.creatorName}</p>
                  <p className="text-[10px] font-bold text-purple-400/40 uppercase tracking-widest mt-1">@{invoice.creatorUsername}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-12 opacity-40">
              <div className="flex items-center space-x-3"><Globe className="w-5 h-5 text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest">Across Galaxy</span></div>
              <div className="flex items-center space-x-3"><ShieldCheck className="w-5 h-5 text-purple-400" /><span className="text-[10px] font-black uppercase tracking-widest">Hyper-Secure</span></div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-2xl p-12 lg:p-16 border-l border-white/5 flex flex-col justify-center">
            <div className="mb-12">
              <h3 className="text-sm font-black text-purple-400 uppercase tracking-[0.5em] mb-4 text-center">Authorization</h3>
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            </div>
            {PaymentForm(true)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const HolographicLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-[#f0f2f5] overflow-hidden relative">
      {/* Floating light leaks */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute -top-40 -left-40 w-96 h-96 bg-pink-300/20 blur-[100px] rounded-full"></motion.div>
        <motion.div animate={{ x: [0, -80, 0], y: [0, 100, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-300/20 blur-[100px] rounded-full"></motion.div>
      </div>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-6xl w-full bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.05)] overflow-hidden relative z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/5 via-purple-500/5 to-cyan-500/5 pointer-events-none"></div>
        <div className="grid lg:grid-cols-5 gap-0">
          <div className="lg:col-span-3 p-12 lg:p-20 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/40">
            <div className="flex items-center justify-between mb-20">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-white/80"><Palette className="w-8 h-8 text-pink-500" /></div>
                <span className="text-3xl font-black tracking-tighter text-gray-900">IyonicPay</span>
              </div>
              <div className="flex items-center space-x-4 bg-white/60 backdrop-blur-md px-6 py-3 rounded-3xl border border-white/80 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-pink-200">{invoice.creatorName?.[0]}</div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900 leading-none mb-1">{invoice.creatorName}</p>
                  <p className="text-[10px] font-bold text-pink-600 uppercase tracking-widest opacity-60">@{invoice.creatorUsername}</p>
                </div>
              </div>
            </div>
            <div className="space-y-8 mb-20 relative">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/60 rounded-full border border-white/80">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-black uppercase tracking-[0.4em] text-cyan-600">IyonicPay Prism</span>
              </div>
              <h2 className="text-[10rem] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-500 relative">
                {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}
                <span className="absolute -top-8 -right-16 text-2xl text-pink-500 opacity-40 font-black tracking-widest italic animate-pulse">SECURE_AUTH</span>
              </h2>
              <p className="text-3xl font-medium text-gray-600 italic leading-relaxed pt-12 border-t border-gray-100/50">
                {invoice.description || 'Professional Services'}
              </p>
            </div>
            <div className="flex items-center space-x-8 text-gray-400">
              <div className="flex items-center space-x-3"><Activity className="w-5 h-5 text-cyan-500" /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Holographic Flux</span></div>
              <div className="flex items-center space-x-3"><Lock className="w-5 h-5 text-pink-500" /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Prism Shield v2</span></div>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-3xl p-12 lg:p-16 flex flex-col justify-center">
            <h3 className="text-3xl font-black text-gray-900 mb-12 tracking-tight text-center italic">Authorize Protocol</h3>
            {PaymentForm(false, false, false, true)}
            <div className="mt-12 flex justify-center space-x-4 opacity-20">
              <Globe className="w-6 h-6" /><Cpu className="w-6 h-6" /><ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const AuroraLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center relative overflow-hidden bg-[#020617]">
      {/* Aurora waves */}
      <div className="absolute inset-0 z-0">
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3], rotate: [0, 5, 0] }} transition={{ duration: 8, repeat: Infinity }} className="absolute -top-1/2 -left-1/4 w-[150%] h-full bg-gradient-to-b from-teal-500/20 via-blue-500/10 to-transparent blur-[100px] skew-y-12"></motion.div>
        <motion.div animate={{ opacity: [0.2, 0.5, 0.2], rotate: [0, -5, 0] }} transition={{ duration: 10, repeat: Infinity, delay: 1 }} className="absolute -top-1/2 -right-1/4 w-[150%] h-full bg-gradient-to-b from-purple-500/20 via-indigo-500/10 to-transparent blur-[100px] -skew-y-12"></motion.div>
      </div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-5xl w-full bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-teal-500/20 shadow-2xl overflow-hidden relative z-10">
        <div className="p-12 lg:p-20 grid lg:grid-cols-2 gap-20">
          <div className="text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-16">
                <div className="w-12 h-12 bg-teal-500/20 rounded-2xl flex items-center justify-center border border-teal-500/40"><Wallet className="w-7 h-7 text-teal-400" /></div>
                <span className="text-2xl font-black tracking-tighter">IyonicPay</span>
              </div>
              <div className="space-y-6">
                <p className="text-teal-400 text-xs font-black uppercase tracking-[0.5em]">IyonicPay</p>
                <h2 className="text-8xl font-black tracking-tighter leading-none text-white">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'Pay What You Want'}
                </h2>
                <div className="h-1 w-20 bg-gradient-to-r from-teal-500 to-blue-500"></div>
                <p className="text-2xl font-bold text-slate-300 italic">{invoice.description || 'Professional Services'}</p>
              </div>
            </div>
            <div className="mt-20 pt-10 border-t border-slate-800 flex justify-between items-center opacity-60">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Merchant</span>
                <p className="font-bold">{invoice.creatorName}</p>
                <p className="text-[10px] font-bold text-teal-400 opacity-60 uppercase tracking-widest mt-1">@{invoice.creatorUsername}</p>
              </div>
              <div className="text-right"><span className="text-[10px] font-black uppercase tracking-widest block mb-1">Secure Protocol</span><p className="font-mono text-[10px]">AURORA_v2.1</p></div>
            </div>
          </div>
          <div className="bg-slate-950/50 backdrop-blur-md rounded-[2.5rem] p-10 border border-teal-500/10 flex flex-col justify-center">
            <h3 className="text-xl font-black text-teal-400 mb-10 text-center uppercase tracking-[0.3em]">Complete Payment</h3>
            {PaymentForm(true)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const LiquidLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-white overflow-hidden relative">
      {/* Morphing background shapes */}
      <div className="absolute inset-0 z-0">
        <motion.div animate={{ borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 70%", "60% 40% 30% 70% / 50% 60% 70% 40%", "40% 60% 70% 30% / 40% 50% 60% 70%"], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-rose-500/10 blur-[80px]"></motion.div>
        <motion.div animate={{ borderRadius: ["60% 40% 30% 70% / 50% 60% 70% 40%", "40% 60% 70% 30% / 40% 50% 60% 70%", "60% 40% 30% 70% / 50% 60% 70% 40%"], rotate: [0, -90, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-indigo-500/10 blur-[80px]"></motion.div>
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl w-full bg-white/80 backdrop-blur-3xl rounded-[5rem] border border-white shadow-[0_50px_100px_rgba(0,0,0,0.03)] overflow-hidden relative z-10">
        <div className="p-12 lg:p-20">
          <div className="flex justify-between items-center mb-24">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shadow-2xl"><Wallet className="w-8 h-8 text-white" /></div>
              <span className="text-3xl font-black tracking-tighter text-gray-900 italic">IyonicPay</span>
            </div>
            <div className="flex items-center space-x-4 bg-gray-50 px-6 py-3 rounded-full border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-rose-100">{invoice.creatorName?.[0]}</div>
              <div className="text-left">
                <p className="text-sm font-black text-gray-900 leading-none mb-1">{invoice.creatorName}</p>
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest opacity-60">@{invoice.creatorUsername}</p>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-12">
              <div className="space-y-8">
                <div className="inline-flex items-center space-x-3 px-4 py-2 bg-rose-50 text-rose-600 rounded-full">
                  <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-rose-500 rounded-full"></motion.span>
                  <span className="text-xs font-black uppercase tracking-[0.4em]">IyonicPay Fluid</span>
                </div>
                <h2 className="text-9xl font-black text-gray-900 tracking-tighter leading-none">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}
                </h2>
                <p className="text-4xl font-medium text-gray-400 italic leading-tight">
                  {invoice.description || 'Professional Services'}
                </p>
              </div>
              <div className="flex items-center space-x-10 text-gray-200">
                <ShieldCheck className="w-10 h-10" /><ArrowRight className="w-8 h-8" /><CheckCircle2 className="w-10 h-10" />
              </div>
            </div>
            <div className="bg-gray-50/80 backdrop-blur-md rounded-[4rem] p-12 lg:p-16 border border-white shadow-inner">
              <h3 className="text-2xl font-black text-gray-900 mb-12 text-center tracking-tight italic">Liquid Settlement</h3>
              {PaymentForm(false, false, false, true)}
              <p className="mt-12 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">Fluid Protocol v2.1</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const VaporwaveLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-[#2d1b4e] overflow-hidden relative font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-20"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#ff71ce_0%,transparent_50%)] opacity-20 animate-pulse"></div>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-5xl w-full bg-black/40 backdrop-blur-3xl rounded-none border-2 border-[#01cdfe] shadow-[0_0_40px_rgba(1,205,254,0.3)] overflow-hidden relative z-10">
        <div className="p-12 lg:p-20 grid lg:grid-cols-2 gap-20">
          <div className="text-white">
            <div className="flex items-center space-x-4 mb-16">
              <div className="w-12 h-12 bg-[#b967ff] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(185,103,255,0.5)] animate-bounce-slow"><Wallet className="w-7 h-7 text-white" /></div>
              <span className="text-2xl font-black italic tracking-tighter text-[#05ffa1]">VAPOR_PAY_v8.4</span>
            </div>
            <div className="space-y-8">
              <p className="text-[#fffb96] text-xs font-black uppercase tracking-[0.5em] animate-pulse">IyonicPay</p>
              <h2 className="text-8xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#ff71ce] to-[#01cdfe] drop-shadow-[0_5px_15px_rgba(255,113,206,0.5)]">
                {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'VAPOR_PWYW'}
              </h2>
              <div className="h-2 w-32 bg-gradient-to-r from-[#ff71ce] via-[#01cdfe] to-[#05ffa1]"></div>
              <p className="text-2xl font-black text-white italic uppercase skew-x-[-10deg]">{invoice.description || 'Professional Services'}</p>
            </div>
            <div className="mt-20 pt-10 border-t border-white/10 flex justify-between items-center opacity-80">
              <div>
                <span className="text-[10px] text-[#01cdfe] font-black uppercase tracking-widest block mb-1">Producer</span>
                <p className="font-black text-white italic uppercase tracking-tighter leading-none mb-1">{invoice.creatorName}</p>
                <p className="text-[10px] font-bold text-[#b967ff] uppercase tracking-widest">@{invoice.creatorUsername}</p>
              </div>
              <div className="text-right"><span className="text-[10px] text-[#ff71ce] font-black uppercase tracking-widest block mb-1">Status</span><p className="font-black text-white italic">{(invoice.status || 'PENDING').toUpperCase()}</p></div>
            </div>
          </div>
          <div className="bg-[#1a1a2e]/80 p-10 border-2 border-[#b967ff]/30 backdrop-blur-md">
            <h3 className="text-xl font-black text-[#05ffa1] mb-10 text-center uppercase tracking-[0.4em] italic underline decoration-[#ff71ce] decoration-4">Authorize Transfer</h3>
            {PaymentForm(true)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const MatrixLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-black overflow-hidden relative font-mono">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        {/* Animated code columns */}
        {[...Array(20)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ y: -1000 }}
            animate={{ y: 1000 }}
            transition={{ duration: 10 + Math.random() * 20, repeat: Infinity, ease: "linear", delay: Math.random() * -20 }}
            className="absolute text-[#00FF41] text-[10px] whitespace-nowrap writing-mode-vertical-rl"
            style={{ left: `${i * 5}%` }}
          >
            {Array(50).fill(0).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('')}
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl w-full bg-black border-2 border-[#00FF41] shadow-[0_0_30px_rgba(0,255,65,0.2)] p-2 relative z-10">
        <div className="border border-[#00FF41]/30 p-8 lg:p-16">
          <div className="flex justify-between items-center mb-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 border-2 border-[#00FF41] flex items-center justify-center text-[#00FF41] font-black animate-pulse">M</div>
              <span className="text-xl font-black tracking-[0.3em] text-[#00FF41]">MATRIX_LEDGER</span>
            </div>
            <div className="text-[8px] text-[#00FF41]/50 text-right">NODE_ID: {invoice.id?.slice(0, 12)}...<br/>PROTO: IP_SECURE_v4</div>
          </div>
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div>
                <p className="text-[#00FF41]/60 text-xs mb-4 tracking-[0.4em]">&gt; IyonicPay</p>
                <h2 className="text-7xl font-black text-[#00FF41] tracking-tighter leading-none mb-6">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}
                </h2>
                <div className="h-0.5 w-full bg-[#00FF41]/20">
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 4, repeat: Infinity }} className="h-full bg-[#00FF41] shadow-[0_0_10px_#00FF41]"></motion.div>
                </div>
              </div>
              <div className="bg-[#00FF41]/5 p-6 border border-[#00FF41]/10">
                <p className="text-[#00FF41] opacity-90">&gt; DESC: {(invoice.description || 'PROFESSIONAL SERVICES').toUpperCase()}</p>
                <p className="text-[#00FF41] opacity-70 mt-2">&gt; MERCHANT: {(invoice.creatorName || '').toUpperCase()}</p>
                <p className="text-[10px] text-[#00FF41]/40 mt-1">&gt; ENTITY_ID: @{(invoice.creatorUsername || '').toUpperCase()}</p>
              </div>
            </div>
            <div className="bg-black p-8 border border-[#00FF41]/40 shadow-[inset_0_0_20px_rgba(0,255,65,0.1)]">
              <h3 className="text-sm font-black text-[#00FF41] mb-8 text-center uppercase tracking-[0.5em]">&gt; DECRYPT_AND_PAY</h3>
              {PaymentForm(false, false, true)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const SteampunkLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-[#2b1b12] overflow-hidden relative font-serif">
      <div className="absolute inset-0 bg-[radial-gradient(#4a3728_1px,transparent_1px)] bg-[length:25px_25px] opacity-30"></div>
      {/* Gears */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -left-20 w-64 h-64 border-8 border-[#cd7f32]/10 rounded-full flex items-center justify-center"><div className="w-12 h-12 bg-[#cd7f32]/10 rounded-full"></div></motion.div>
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -bottom-20 -right-20 w-80 h-80 border-8 border-[#cd7f32]/10 rounded-full flex items-center justify-center"><div className="w-16 h-16 bg-[#cd7f32]/10 rounded-full"></div></motion.div>
      
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-5xl w-full bg-[#f4e4bc] rounded-none border-8 border-[#4a3728] shadow-[20px_20px_0px_0px_#2b1b12] overflow-hidden relative z-10">
        <div className="border-4 border-[#cd7f32] m-2 p-12 lg:p-20 relative">
          <div className="flex justify-between items-start mb-20 border-b-4 border-[#4a3728] pb-10">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-[#4a3728] rounded-full flex items-center justify-center border-4 border-[#cd7f32]"><Cpu className="w-8 h-8 text-[#cd7f32]" /></div>
              <div>
                <h1 className="text-3xl font-black text-[#2b1b12] uppercase tracking-tighter">Iyonic Ledger</h1>
                <p className="text-[10px] font-black text-[#4a3728] uppercase tracking-[0.4em]">Victorian Digital Standard</p>
              </div>
            </div>
            <div className="text-right font-black text-[#4a3728]">
              <p className="text-sm">ISSUE NO. {invoice.id?.slice(0, 6)}</p>
              <p className="text-[10px]">EST. 1892 / DIGITAL REV. 2024</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-3 space-y-12">
              <div className="bg-[#cd7f32]/10 p-10 border-l-8 border-[#cd7f32]">
                <p className="text-[#4a3728] text-xs font-black uppercase tracking-widest mb-4 italic">IyonicPay</p>
                <h2 className="text-8xl font-black text-[#2b1b12] tracking-tighter leading-none">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW'}
                </h2>
              </div>
              <div className="space-y-6">
                <p className="text-[#4a3728] font-bold text-2xl leading-relaxed first-letter:text-6xl first-letter:font-black first-letter:float-left first-letter:mr-3 first-letter:mt-2">
                  {invoice.description || 'Professional Services'}. This transaction is encrypted using our patented clockwork mechanism, ensuring the highest fidelity of transfer for {invoice.creatorName} (@{invoice.creatorUsername}).
                </p>
              </div>
            </div>
            <div className="lg:col-span-2 bg-[#4a3728] p-10 text-[#f4e4bc] border-4 border-[#cd7f32]">
              <h3 className="text-xl font-black mb-10 text-center uppercase tracking-widest border-b-2 border-[#cd7f32]/30 pb-4">Settle Account</h3>
              {PaymentForm(false, false, false, true)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const UnderwaterLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-gradient-to-b from-[#004e92] to-[#000428] overflow-hidden relative font-sans">
      {/* Animated Bubbles */}
      {[...Array(15)].map((_, i) => (
        <motion.div 
          key={i}
          initial={{ y: 1000, opacity: 0 }}
          animate={{ y: -200, opacity: [0, 0.5, 0] }}
          transition={{ duration: 5 + Math.random() * 10, repeat: Infinity, ease: "linear", delay: Math.random() * 10 }}
          className="absolute bg-white/10 border border-white/20 rounded-full blur-[2px]"
          style={{ width: `${10 + Math.random() * 40}px`, height: `${10 + Math.random() * 40}px`, left: `${Math.random() * 100}%` }}
        />
      ))}
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-5xl w-full bg-blue-900/20 backdrop-blur-2xl rounded-[4rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden relative z-10">
        <div className="grid lg:grid-cols-2">
          <div className="p-12 lg:p-20 text-white flex flex-col justify-center bg-blue-950/40">
            <div className="flex items-center space-x-4 mb-16">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-400/40 animate-pulse"><Globe className="w-7 h-7 text-cyan-400" /></div>
              <span className="text-2xl font-black tracking-tighter text-cyan-400">Abyssal Pay</span>
            </div>
            <div className="space-y-8 mb-20">
              <span className="text-xs font-black uppercase tracking-[0.4em] text-cyan-500/60 block">IyonicPay</span>
              <h2 className="text-8xl font-black tracking-tighter leading-none text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW_MODE'}
              </h2>
              <p className="text-2xl font-medium text-blue-200/80 leading-relaxed italic border-l-4 border-cyan-500 pl-8">
                {invoice.description || 'Professional Services'}
              </p>
            </div>
            <div className="flex items-center justify-between pt-10 border-t border-white/5 opacity-40">
              <div className="text-[10px] font-black uppercase tracking-widest">Bioluminescent Secure</div>
              <div className="text-right">
                <p className="font-black text-xs uppercase tracking-tighter text-cyan-400">{invoice.creatorName}</p>
                <p className="font-bold text-[10px]">@{invoice.creatorUsername}</p>
              </div>
            </div>
          </div>
          <div className="p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-12">
              <h3 className="text-lg font-black text-white text-center uppercase tracking-[0.5em] mb-4">Authorization</h3>
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            </div>
            {PaymentForm(true)}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const MagmaLayout = () => (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-[#1a0505] overflow-hidden relative font-black">
      {/* Volcanic background effects */}
      <div className="absolute inset-0 z-0">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 5, repeat: Infinity }} className="absolute -top-1/4 -right-1/4 w-full h-full bg-red-900/20 blur-[150px] rounded-full"></motion.div>
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 7, repeat: Infinity }} className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-orange-900/20 blur-[150px] rounded-full"></motion.div>
      </div>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-6xl w-full bg-[#0d0202]/80 backdrop-blur-xl border-2 border-red-900/30 rounded-[3rem] shadow-[0_0_80px_rgba(220,38,38,0.15)] overflow-hidden relative z-10">
        <div className="grid lg:grid-cols-5 gap-0">
          <div className="lg:col-span-3 p-12 lg:p-20 border-b lg:border-b-0 lg:border-r border-red-900/20">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-16">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)]"><Zap className="w-8 h-8 text-black fill-current" /></div>
                  <span className="text-3xl font-black tracking-tighter uppercase italic text-white">IyonicPay</span>
                </div>
                <div className="flex items-center space-x-3 bg-red-600/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-red-600/20">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm">{invoice.creatorName?.[0]}</div>
                  <div className="text-left">
                    <p className="text-xs font-black text-white leading-none mb-1">{invoice.creatorName}</p>
                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest opacity-80">@{invoice.creatorUsername}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="inline-flex items-center space-x-3 px-4 py-2 bg-red-600/10 border border-red-600/30 rounded-xl">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em]">Volcanic Core Active</span>
                </div>
                <h2 className="text-9xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500">
                  {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'PWYW_MODE'}
                </h2>
                <p className="text-3xl font-black text-white/90 uppercase tracking-tight italic border-l-4 border-red-600 pl-6 py-2">
                  {invoice.description || 'Professional Services'}
                </p>
              </div>
            </div>
            <div className="mt-20 flex items-center space-x-12 opacity-60">
              <div className="flex items-center space-x-3"><Activity className="w-5 h-5 text-red-500" /><span className="text-[10px] font-black uppercase tracking-widest text-red-500">Seismic Encryption</span></div>
              <div className="flex items-center space-x-3"><ShieldCheck className="w-5 h-5 text-orange-500" /><span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Volcanic Secure</span></div>
            </div>
          </div>
          <div className="lg:col-span-2 bg-[#050101] p-12 lg:p-16 flex flex-col justify-center">
            <div className="mb-12 text-center">
              <h3 className="text-2xl font-black text-red-500 uppercase tracking-[0.4em] mb-4">Execute Settlement</h3>
              <div className="h-1 w-24 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto rounded-full"></div>
            </div>
            {PaymentForm(false, false, false, true)}
            <p className="mt-12 text-center text-[10px] font-black text-red-900 uppercase tracking-[0.5em] italic">Core Transaction Protocol v4.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const ExclusiveLayout = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    return (
      <div 
        className="min-h-screen py-20 px-4 flex items-center justify-center bg-[#050505] overflow-hidden relative font-serif"
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        {/* Dynamic Diamond/Glass Background */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            animate={{ 
              x: mousePos.x / 20, 
              y: mousePos.y / 20,
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#D4AF37]/10 blur-[120px] rounded-full"
          ></motion.div>
          <motion.div 
            animate={{ 
              x: -mousePos.x / 30, 
              y: -mousePos.y / 30,
              opacity: [0.05, 0.15, 0.05]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-white/5 blur-[100px] rounded-full"
          ></motion.div>
          
          {/* Animated Light Beams */}
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,#D4AF37_10deg,transparent_20deg)] blur-3xl"
          />
        </div>

        {/* Animated Particles */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0], 
              scale: [0, 1.5, 0],
              y: [0, -400],
              x: (Math.random() - 0.5) * 200
            }}
            transition={{ 
              duration: 4 + Math.random() * 6, 
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full shadow-[0_0_15px_#D4AF37]"
            style={{ 
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}

        <motion.div 
          initial={{ opacity: 0, y: 100 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl w-full bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl rounded-[4rem] border border-white/20 shadow-[0_50px_150px_rgba(0,0,0,0.9)] overflow-hidden relative z-10"
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_5s_infinite] pointer-events-none"></div>

          <div className="grid lg:grid-cols-2">
            <div className="p-16 lg:p-24 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#D4AF37]/10 blur-3xl pointer-events-none"></div>
              <div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-6 mb-24"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] via-[#F2D184] to-[#AA841D] rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.4)] border border-white/20">
                    <Zap className="w-10 h-10 text-black fill-current" />
                  </div>
                  <div>
                    <span className="text-4xl font-serif text-white tracking-[0.4em] uppercase block leading-none italic">IyonicPay</span>
                    <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.8em] mt-2 block opacity-80">Elite Settlement Protocol</span>
                  </div>
                </motion.div>

                <div className="space-y-16">
                  <motion.div 
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-[1px] w-12 bg-[#D4AF37]"></div>
                      <span className="text-[#D4AF37] text-xs font-black uppercase tracking-[1em] block">Certified Request</span>
                    </div>
                    <h2 className="text-[10rem] font-serif text-white tracking-tighter leading-none italic flex items-start group">
                      {invoice.amount > 0 && <span className="text-5xl mt-8 mr-4 opacity-30 group-hover:opacity-100 transition-opacity duration-500">{invoice.currency === 'KES' ? 'KSh' : invoice.currency === 'EUR' ? '€' : invoice.currency === 'GBP' ? '£' : '$'}</span>}
                      <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20">
                        {invoice.amount > 0 ? formatPrice(invoice.amount, invoice.currency) : 'EXCLUSIVE_PWYW'}
                      </span>
                    </h2>
                  </motion.div>

                  <motion.div 
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="p-10 bg-white/[0.03] border-l-4 border-[#D4AF37] rounded-r-[3rem] backdrop-blur-sm"
                  >
                    <p className="text-3xl text-white/90 font-serif italic leading-relaxed tracking-wide">
                      "{invoice.description || 'Exclusive Professional Services'}"
                    </p>
                  </motion.div>
                </div>
              </div>

              <div className="mt-24 flex items-center justify-between pt-16 border-t border-white/10">
                <motion.div whileHover={{ x: 10 }} className="flex items-center space-x-8">
                  <div className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-[#D4AF37]/30 p-1.5 bg-black/40 shadow-2xl">
                    <div className="w-full h-full bg-gradient-to-br from-[#D4AF37] to-[#AA841D] rounded-2xl flex items-center justify-center text-black font-black text-3xl shadow-inner">
                      {invoice.creatorName?.[0]}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.5em] block mb-2 opacity-60">Master Merchant</span>
                    <p className="text-2xl text-white font-serif italic tracking-tight">{invoice.creatorName}</p>
                    <p className="text-[#D4AF37] text-sm font-serif opacity-40 italic mt-1">@{invoice.creatorUsername}</p>
                  </div>
                </motion.div>
                <div className="text-right">
                  <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.5em] block mb-3">Vault Reference</span>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                    <p className="font-mono text-[10px] text-[#D4AF37] tracking-[0.3em] uppercase">{invoice.id?.slice(0, 16)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-16 lg:p-24 bg-black/60 flex flex-col justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#D4AF37_0%,transparent_100%)] opacity-[0.03] pointer-events-none"></div>
              
              <div className="mb-20 text-center relative">
                <motion.div 
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-sm font-serif text-[#D4AF37] uppercase tracking-[0.8em] mb-6 italic"
                >
                  Secure Settlement Portal
                </motion.div>
                <h3 className="text-4xl font-serif text-white mb-8 italic tracking-widest">Execute Authorization</h3>
                <div className="flex items-center justify-center space-x-6">
                  <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-ping"></div>
                  <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50"></div>
                  <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-ping"></div>
                </div>
              </div>

              <div className="exclusive-payment-form relative z-10">
                {PaymentForm(true)}
              </div>

              <div className="mt-24 flex flex-col items-center space-y-8">
                <div className="flex items-center space-x-12 opacity-30 hover:opacity-100 transition-all duration-700">
                  <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
                  <div className="h-8 w-[1px] bg-white/20"></div>
                  <Lock className="w-8 h-8 text-white" />
                  <div className="h-8 w-[1px] bg-white/20"></div>
                  <Globe className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[1em]">IyonicPay Elite Protocol v1.0</p>
                  <div className="text-[8px] text-[#D4AF37] font-serif italic tracking-widest opacity-20">ESTABLISHED 2026. ALL RIGHTS RESERVED.</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderLayout = () => {
    if (!invoice) return null;
    switch (activeTheme) {
      case 'glassmorphism': return <GlassmorphismLayout />;
      case 'neobrutalism': return <NeoBrutalismLayout />;
      case 'terminal': return <TerminalLayout />;
      case 'minimal': return <MinimalLayout />;
      case 'luxury': return <LuxuryLayout />;
      case 'cyber': return <CyberLayout />;
      case 'sunset': return <SunsetLayout />;
      case 'ocean': return <OceanLayout />;
      case 'forest': return <ForestLayout />;
      case 'retro': return <RetroLayout />;
      case 'galaxy': return <GalaxyLayout />;
      case 'holographic': return <HolographicLayout />;
      case 'aurora': return <AuroraLayout />;
      case 'liquid': return <LiquidLayout />;
      case 'vaporwave': return <VaporwaveLayout />;
      case 'matrix': return <MatrixLayout />;
      case 'steampunk': return <SteampunkLayout />;
      case 'underwater': return <UnderwaterLayout />;
      case 'magma': return <MagmaLayout />;
      case 'exclusive': return <ExclusiveLayout />;
      default: return <ProfessionalLayout />;
    }
  };

  if (loading || isPreloading) {
    const getPreloaderStyle = () => {
      switch (activeTheme) {
        case 'retro': return { bg: 'bg-black', accent: 'bg-[#39ff14]', text: 'text-[#39ff14]', font: 'font-mono' };
        case 'terminal': return { bg: 'bg-[#0D0D0D]', accent: 'bg-[#00FF41]', text: 'text-[#00FF41]', font: 'font-mono' };
        case 'galaxy': return { bg: 'bg-[#050505]', accent: 'bg-purple-600', text: 'text-purple-400', font: 'font-sans' };
        case 'aurora': return { bg: 'bg-slate-950', accent: 'bg-teal-500', text: 'text-teal-400', font: 'font-sans' };
        case 'vaporwave': return { bg: 'bg-[#2d1b4e]', accent: 'bg-[#ff71ce]', text: 'text-[#05ffa1]', font: 'font-sans' };
        case 'matrix': return { bg: 'bg-black', accent: 'bg-[#00FF41]', text: 'text-[#00FF41]', font: 'font-mono' };
        case 'steampunk': return { bg: 'bg-[#2b1b12]', accent: 'bg-[#cd7f32]', text: 'text-[#cd7f32]', font: 'font-serif' };
        case 'underwater': return { bg: 'bg-[#000428]', accent: 'bg-[#00d2ff]', text: 'text-[#00d2ff]', font: 'font-sans' };
        case 'magma': return { bg: 'bg-[#1a0505]', accent: 'bg-red-600', text: 'text-red-500', font: 'font-sans' };
        case 'exclusive': return { bg: 'bg-[#050505]', accent: 'bg-[#D4AF37]', text: 'text-[#D4AF37]', font: 'font-serif' };
        case 'luxury': return { bg: 'bg-[#0F0F0F]', accent: 'bg-[#D4AF37]', text: 'text-[#D4AF37]', font: 'font-serif' };
        case 'cyber': return { bg: 'bg-black', accent: 'bg-cyan-400', text: 'text-cyan-400', font: 'font-mono' };
        default: return { bg: 'bg-gradient-to-br from-indigo-50 via-white to-purple-50', accent: 'bg-indigo-600', text: 'text-indigo-600', font: 'font-sans' };
      }
    };

    const style = getPreloaderStyle();

    return (
      <div className={`min-h-screen flex items-center justify-center ${style.bg} ${style.font} p-6 transition-colors duration-1000`}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex flex-col items-center">
              <div className={`w-20 h-20 border-4 ${activeTheme === 'retro' || activeTheme === 'terminal' || activeTheme === 'cyber' ? 'border-white/10' : 'border-indigo-100'} border-t-current ${style.text} rounded-full animate-spin mb-6`}></div>
              <p className={`${style.text} font-semibold uppercase tracking-widest text-xs`}>Initializing secure session...</p>
            </motion.div>
          ) : (
            <motion.div key="preloader" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center max-w-md w-full text-center">
              <div className="relative mb-12">
                <div className={`absolute inset-0 ${style.accent} rounded-full blur-2xl opacity-10 animate-pulse`}></div>
                <div className={`${activeTheme === 'retro' || activeTheme === 'terminal' || activeTheme === 'cyber' || activeTheme === 'galaxy' || activeTheme === 'aurora' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-50'} w-32 h-32 rounded-[2.5rem] shadow-2xl flex items-center justify-center relative border`}>
                  <AnimatePresence mode="wait">
                    {preloaderStage === 'network' ? (
                      <motion.div key="network" initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 20 }} className={style.text}><Globe className="w-16 h-16" /></motion.div>
                    ) : (
                      <motion.div key="device" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className={style.text}><ShieldCheck className="w-16 h-16" /></motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="h-12">
                <AnimatePresence mode="wait">
                  <motion.p key={preloaderStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`text-2xl font-black ${activeTheme === 'retro' || activeTheme === 'terminal' || activeTheme === 'cyber' || activeTheme === 'galaxy' || activeTheme === 'aurora' ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                    {preloaderStage === 'network' ? 'Securing network...' : 'Securing device...'}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className={`w-64 h-1.5 ${activeTheme === 'retro' || activeTheme === 'terminal' || activeTheme === 'cyber' || activeTheme === 'galaxy' || activeTheme === 'aurora' ? 'bg-white/10' : 'bg-gray-100'} rounded-full mt-8 overflow-hidden`}>
                <motion.div initial={{ width: "0%" }} animate={{ width: preloaderStage === 'network' ? "50%" : "100%" }} transition={{ duration: 2, ease: "easeInOut" }} className={`h-full ${style.accent} rounded-full`} />
              </div>
              <p className="text-gray-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-6">IyonicPay Quantum-Safe Encryption Active</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-[3rem] flex items-center justify-center text-red-600 mb-8 mx-auto"><AlertCircle className="w-12 h-12" /></div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">Invoice Not Found</h1>
          <p className="text-gray-500 font-medium mb-12 max-w-md">{error}</p>
          <Button onClick={() => navigate('/iyonicpay')} className="bg-indigo-600 text-white font-black px-10 py-5 rounded-[2rem] flex items-center space-x-3 mx-auto hover:bg-indigo-700 transition-all"><ArrowLeft className="w-5 h-5" /><span>Back to IyonicPay</span></Button>
        </motion.div>
      </div>
    );
  }

  if (invoice?.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[3rem] shadow-2xl p-16 max-w-xl w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }} className="w-28 h-28 bg-green-50 rounded-[3rem] flex items-center justify-center text-green-600 mb-8 mx-auto"><CheckCircle2 className="w-16 h-16" /></motion.div>
          <h2 className="text-4xl font-black text-gray-900 mb-4">Invoice Settled</h2>
          <p className="text-gray-500 font-medium mb-8 text-lg">
            {invoice.isReusable ? 'This reusable payment link has reached its usage limit.' : 'This invoice has been successfully settled.'}
          </p>
          <div className="bg-gray-50 rounded-[2rem] p-6 mb-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400 font-bold text-sm">Total Collected</span>
              <span className="text-2xl font-black text-gray-900">{formatPrice(invoice.amount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-bold text-sm">Merchant</span>
              <span className="font-bold text-gray-900">@{invoice.creatorUsername}</span>
            </div>
          </div>
          <div className="space-y-4">
            {invoice.status === 'paid' && (
              <Button 
                onClick={() => setShowRefundPopup(true)} 
                className="w-full bg-orange-50 text-orange-600 font-black py-4 rounded-[2rem] border-2 border-orange-100 hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Request Refund
              </Button>
            )}
            <Button onClick={() => navigate('/iyonicpay')} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <Store className="w-5 h-5" />
              Return to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full bg-gray-100 text-gray-700 font-bold py-4 rounded-[2rem] hover:bg-gray-200 transition-all"
            >
              Continue Shopping
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

// Custom inline refund modal to avoid z-index issues
  const RefundPopup = () => (
    <Popup isOpen={showRefundPopup} onClose={() => setShowRefundPopup(false)} title="Request Refund">
      {refundSuccess ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Refund Request Submitted</h3>
          <p className="text-gray-500">Your refund request has been submitted. You will receive an email once it's reviewed.</p>
          <Button 
            onClick={() => { setShowRefundPopup(false); setRefundSuccess(false); }} 
            className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 rounded-xl"
          >
            Close
          </Button>
        </div>
      ) : !isAuthenticated ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
          <p className="text-gray-500 mb-6">You must be logged in to request a refund and verify your ownership of the payment.</p>
          <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.hash.substring(1))}`)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">
            Sign In to Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-gray-600 mb-4">
            You are requesting a refund for <strong>{formatPrice(invoice?.amount, invoice?.currency)}</strong> paid to <strong>@{invoice?.creatorUsername}</strong>.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Refund</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Please describe why you're requesting a refund..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setShowRefundPopup(false)} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!refundReason.trim()) {
                  showToast('Please provide a reason for your refund request', 'error');
                  return;
                }
                setIsRefunding(true);
                try {
                  await api.post(`/iyonicpay/invoices/${token}/refund`, { reason: refundReason });
                  setRefundSuccess(true);
                } catch (err: any) {
                  showToast(err.response?.data?.message || 'Failed to submit refund request', 'error');
                } finally {
                  setIsRefunding(false);
                }
              }} 
              isLoading={isRefunding}
              className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
            >
              Submit Refund Request
            </Button>
          </div>
        </div>
      )}
    </Popup>
  );

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.font} transition-all duration-1000 overflow-x-hidden relative`}>
      <AnimatePresence>
        {success && invoice?.isReusable && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-green-500 text-white p-6 rounded-[2rem] shadow-2xl flex items-center justify-between border-4 border-white">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg leading-tight">Settlement Successful!</h4>
                  <p className="text-white/80 font-bold text-xs">Your payment has been received.</p>
                </div>
              </div>
              <button 
                onClick={() => setSuccess(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-xl flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {renderLayout()}
      <RefundPopup />
    </div>
  );
};

export default InvoicePage;
