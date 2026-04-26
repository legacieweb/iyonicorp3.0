import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { Button, Input, Card, Popup, ConfirmPopup, Badge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { authAPI, api, sellersAPI, Seller } from '../services/api';
import { formatPrice } from '../utils/currency';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Plus, 
  Send, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Users,
  Store,
  Search,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  LayoutDashboard,
  Copy,
  ExternalLink,
  Settings,
  Code,
  LogOut,
  ChevronRight,
  Share2,
  Clock,
  AlertCircle,
  Play,
  ArrowLeft,
  Palette,
Menu,
  Activity,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

declare const PaystackPop: any;

declare global {
  interface Window {
    IyonicPay?: {
      init: () => void;
      createCheckoutButton: (button: HTMLElement) => void;
      initializePayment: (apiKey: string, amount: number, currency: string, email: string, metadata?: any) => Promise<any>;
      verifyPayment: (apiKey: string, reference: string) => Promise<any>;
      showModal: (config: any) => Promise<any>;
    };
  }
}

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

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const IyonicPay: React.FC = () => {
  const { user, login, register, setAuthenticatedUser, logout } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);
  
  // Dashboard states
  const initialTab = searchParams.get('tab') as any;
   const validTabs = ['dashboard', 'transactions', 'invoices', 'withdrawals', 'api', 'refunds'];
   const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'invoices' | 'withdrawals' | 'api' | 'refunds'>(
     validTabs.includes(initialTab) ? initialTab : 'dashboard'
   );

  useEffect(() => {
    const tab = searchParams.get('tab');
    const invoiceToken = searchParams.get('invoiceToken');
    
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab as any);
    }

    if (invoiceToken) {
      // Auto-trigger refund request if invoiceToken is present
      api.get(`/iyonicpay/invoices/${invoiceToken}`).then(res => {
        const inv = toCamel(res.data);
        setRefundRequestData({
          token: invoiceToken,
          amount: inv.amount,
          currency: inv.currency,
          reason: '',
          merchant: inv.creatorName || inv.creatorUsername
        });
        setIsRequestRefundModalOpen(true);
      }).catch(err => console.error('Failed to fetch invoice for auto-refund:', err));
    }
  }, [searchParams]);
  const [walletData, setWalletData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cashflow, setCashflow] = useState({ income: 0, expense: 0 });

  // Modals for actions
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [isRequestRefundModalOpen, setIsRequestRefundModalOpen] = useState(false);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [refundRequestData, setRefundRequestData] = useState<any>({ token: '', amount: 0, currency: 'USD', reason: '', merchant: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statementRange, setStatementRange] = useState({ start: '', end: '' });
  const [refundActionData, setRefundActionData] = useState<{ id: string, action: 'approve' | 'reject' } | null>(null);
  
  // Form data
  const [depositAmount, setDepositAmount] = useState('');
  const [sendData, setSendData] = useState({ recipient: '', amount: '', description: '' });
  const [invoiceData, setInvoiceData] = useState({ amount: '', description: '', isReusable: false, usageLimit: '' });
  const [withdrawData, setWithdrawData] = useState({ amount: '', bankName: '', accountNo: '', accountName: '' });
  const [apiKey, setApiKey] = useState('');
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [isOptingIn, setIsOptingIn] = useState(false);

  const [iyonicorpEmail, setIyonicorpEmail] = useState('');
  const [iyonicorpPassword, setIyonicorpPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmStoreName, setConfirmStoreName] = useState(false);
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [globalTheme, setGlobalTheme] = useState<string>('professional');
  const [isCustomizingGlobalTheme, setIsCustomizingGlobalTheme] = useState(false);
  const [sellerCurrency, setSellerCurrency] = useState<string>('USD');
  const [settingsForm, setSettingsForm] = useState({ 
    amount: '', 
    description: '', 
    isReusable: false, 
    usageLimit: '',
    customTitle: '',
    customButtonText: ''
  });

  // Auth forms
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    password: '', 
    phoneNumber: '',
    username: '' 
  });

  const loadCheckoutScript = () => {
    if (document.getElementById('iyonicpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'iyonicpay-checkout-script';
    script.src = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}/checkout.js`;
    script.async = true;
    document.body.appendChild(script);
  };

  useEffect(() => {
    if (user) {
      if (user.iyonicpayOptIn) {
        setView('dashboard');
        fetchWalletData();
        fetchInvoices();
        fetchApiKey();
        fetchGlobalSettings();
      } else {
        setView('landing');
      }
      
      if (user.role === 'seller' && user.sellerId) {
        sellersAPI.getMe().then(seller => {
          const currency = seller.currency || (seller as any).currencyCode || 'USD';
          // Only set if not already set by wallet
          setSellerCurrency(prev => prev === 'USD' ? currency : prev);
        }).catch(() => {
          // Fallback handled by wallet fetch
        });
      }
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'api') {
      loadCheckoutScript();
    }
    
    if (activeTab === 'refunds' || (user?.role === 'seller' && activeTab === 'dashboard')) {
      fetchRefundRequests();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'api' && apiKey) {
      const initTestCheckout = async () => {
        const btn = document.getElementById('test-checkout-btn') as HTMLButtonElement;
        const amountInput = document.getElementById('test-amount') as HTMLInputElement;
        const emailInput = document.getElementById('test-email') as HTMLInputElement;
        
        if (!btn || !window.IyonicPay) return;
        
        btn.dataset.iyonicpayKey = apiKey;
        
        btn.addEventListener('iyonicpay-success', (e: any) => {
          const resultDiv = document.getElementById('test-result');
          const statusEl = document.getElementById('result-status');
          const refEl = document.getElementById('result-ref');
          const amountEl = document.getElementById('result-amount');
          const jsonEl = document.getElementById('result-json');
          
          if (resultDiv && statusEl && refEl && amountEl && jsonEl) {
            resultDiv.classList.remove('hidden');
            statusEl.textContent = '✓ SUCCESS';
            statusEl.className = 'font-bold text-green-400';
            refEl.textContent = e.detail.reference;
            const currencySymbol = sellerCurrency === 'KES' ? 'KSh' : 
                                  sellerCurrency === 'EUR' ? '€' : 
                                  sellerCurrency === 'GBP' ? '£' : 
                                  sellerCurrency === 'NGN' ? '₦' :
                                  sellerCurrency === 'GHS' ? 'GH₵' :
                                  sellerCurrency === 'ZAR' ? 'R' :
                                  sellerCurrency === 'TZS' ? 'TSh' :
                                  sellerCurrency === 'UGX' ? 'USh' :
                                  '$';
            amountEl.textContent = currencySymbol + e.detail.amount;
            jsonEl.textContent = JSON.stringify(e.detail, null, 2);
          }
          
          api.get('/iyonicpay/wallet').then(res => {
            const data = toCamel(res.data);
            setWalletData(data);
            const walletId = data?.id;
            const wCurrency = data?.currency || 'USD';
            api.get('/iyonicpay/transactions/all').then(transRes => {
              const transactionsData = toCamel(transRes.data);
              setTransactions(transactionsData);
               let income = 0;
               let expense = 0;
               
              transactionsData.forEach((t: any) => {
                  const tCurrency = t.currency || (String(t.receiverWalletId) === String(walletId) ? wCurrency : 'USD');
                  const amount = convertAmount(Math.abs(Number(t.amount)), tCurrency, 'USD');
                  const isReceiver = String(t.receiverWalletId) === String(walletId);
                  const isSender = String(t.senderWalletId) === String(walletId);
                  
                  if (isReceiver) {
                    income += amount;
                  } else if (isSender) {
                    expense += amount;
                  }
              });
              setCashflow({ income, expense });
            });
          });
        });
        
        btn.addEventListener('iyonicpay-error', (e: any) => {
          const resultDiv = document.getElementById('test-result');
          const statusEl = document.getElementById('result-status');
          const jsonEl = document.getElementById('result-json');
          
          if (resultDiv && statusEl && jsonEl) {
            resultDiv.classList.remove('hidden');
            statusEl.textContent = '✗ FAILED';
            statusEl.className = 'font-bold text-red-400';
            jsonEl.textContent = e.detail.error;
          }
        });
        
        const updateAmount = () => {
          if (amountInput) {
            btn.dataset.amount = amountInput.value;
          }
        };
        
        if (amountInput) {
          amountInput.addEventListener('input', updateAmount);
        }
      };
      
      setTimeout(initTestCheckout, 100);
    }
  }, [activeTab, apiKey]);

const EXCHANGE_RATES: { [key: string]: number } = {
  'USD': 1,
  'KES': 125,
  'EUR': 0.92,
  'GBP': 0.79,
  'NGN': 1500,
  'GHS': 13,
  'ZAR': 19,
  'TZS': 2500,
  'UGX': 3700
};

const convertAmount = (amount: number, fromCurrency: string, toCurrency: string) => {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  
  if (from === to) return amount;
  
  const fromRate = EXCHANGE_RATES[from] || 1;
  const toRate = EXCHANGE_RATES[to] || 1;
  
  // Convert to USD first, then to target currency
  const inUSD = amount / fromRate;
  return inUSD * toRate;
};

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const walletRes = await api.get('/iyonicpay/wallet');
      const data = toCamel(walletRes.data);
      setWalletData(data);
      
      const currentCurrency = data.currency || 'USD';
      if (data.currency) {
        setSellerCurrency(currentCurrency);
      }
      
      const transRes = await api.get('/iyonicpay/transactions/all');
      const transactionsData = toCamel(transRes.data);
      setTransactions(transactionsData);
      
       const walletId = data.id;
       let income = 0;
       let expense = 0;
       
      transactionsData.forEach((t: any) => {
        const tCurrency = t.currency || (String(t.receiverWalletId) === String(walletId) ? currentCurrency : 'USD');
        const amount = convertAmount(Math.abs(Number(t.amount)), tCurrency, 'USD');
        const isReceiver = String(t.receiverWalletId) === String(walletId);
        const isSender = String(t.senderWalletId) === String(walletId);
        
        if (isReceiver) {
          income += amount;
        } else if (isSender) {
          expense += amount;
        }
      });
      
      setCashflow({ income, expense });
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
      setError('Could not connect to wallet service');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/iyonicpay/invoices');
      setInvoices(toCamel(res.data));
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err);
      if (err.response?.status === 404) {
        console.warn('Invoice endpoint not found. Please ensure the server is restarted with the latest routes.');
      }
    }
  };

  const fetchRefundRequests = async () => {
    setLoadingRefunds(true);
    try {
      const res = await api.get('/iyonicpay/refunds');
      setRefundRequests(toCamel(res.data));
    } catch (err: any) {
      console.error('Failed to fetch refund requests:', err);
    } finally {
      setLoadingRefunds(false);
    }
  };

  const handleRefundAction = async () => {
    if (!refundActionData) return;
    const { id, action } = refundActionData;
    try {
      await api.patch(`/iyonicpay/refunds/${id}`, { action });
      showToast(`Refund request ${action}ed successfully`, 'success');
      fetchRefundRequests();
    } catch (err: any) {
      showToast(err.response?.data?.message || `Failed to ${action} refund`, 'error');
    } finally {
      setRefundActionData(null);
    }
  };

  const fetchApiKey = async () => {
    try {
      const res = await api.get('/iyonicpay/api-key');
      setApiKey(res.data.apiKey);
    } catch (err) {
      console.error('Failed to fetch API key');
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await api.get('/iyonicpay/settings');
      if (res.data && res.data.iyonicpayTheme) {
        setGlobalTheme(res.data.iyonicpayTheme);
      }
    } catch (err) {
      console.error('Failed to fetch global settings');
    }
  };

  const handleUpdateGlobalTheme = async (theme: string) => {
    setLoading(true);
    try {
      await api.patch('/iyonicpay/settings', { theme });
      setGlobalTheme(theme);
      setSuccess('Global theme updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update global theme');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackSuccess = async (response: any) => {
    try {
      setLoading(true);
      const verifyRes = await api.post('/iyonicpay/deposit/verify', { 
        reference: response.reference,
        userId: user?.id 
      });
      if (verifyRes.data.success) {
        setSuccess('Deposit successful!');
        setIsDepositModalOpen(false);
        setDepositAmount('');
        // Add a small delay to ensure DB transaction is fully committed
        setTimeout(() => {
          fetchWalletData();
        }, 1000);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(verifyRes.data.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }
      
      const res = await api.post('/iyonicpay/deposit/initialize', { amount });
      
      if (res.data && res.data.status) {
        const handler = PaystackPop.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email: user?.email,
          amount: Math.round(amount * 100),
          currency: sellerCurrency,
          reference: res.data.data.reference,
          metadata: {
            user_id: user?.id,
            custom_fields: [
              {
                display_name: "User ID",
                variable_name: "user_id",
                value: user?.id
              }
            ]
          },
          onClose: () => {
            setLoading(false);
          },
          callback: (response: any) => {
            handlePaystackSuccess(response).catch((err: any) => {
              console.error('Payment callback error:', err);
              setError(err.response?.data?.message || 'Payment verification failed');
              setLoading(false);
            });
          }
        });
        handler.openIframe();
      } else {
        setError(res.data?.message || 'Failed to initialize Paystack deposit');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Deposit init error:', err.response?.data || err);
      const serverError = err.response?.data?.details || err.response?.data?.message || err.message;
      setError(serverError || 'Failed to initialize Paystack deposit');
      setLoading(false);
    }
  };

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/iyonicpay/send', {
        recipientIdentifier: sendData.recipient,
        amount: parseFloat(sendData.amount),
        description: sendData.description
      });
      setSuccess('Transfer successful!');
      setIsSendModalOpen(false);
      setSendData({ recipient: '', amount: '', description: '' });
      fetchWalletData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/iyonicpay/invoices', {
        amount: parseFloat(invoiceData.amount),
        description: invoiceData.description,
        isReusable: invoiceData.isReusable,
        usageLimit: invoiceData.usageLimit ? parseInt(invoiceData.usageLimit) : null
      });
      setSuccess('Invoice generated!');
      setIsInvoiceModalOpen(false);
      setInvoiceData({ amount: '', description: '', isReusable: false, usageLimit: '' });
      setActiveTab('invoices');
      fetchWalletData();
      fetchInvoices();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundRequestData.reason.trim()) {
      setError('Please provide a reason for the refund');
      return;
    }

    setIsSubmittingRefund(true);
    setError('');
    try {
      await api.post(`/iyonicpay/invoices/${refundRequestData.token}/refund`, { 
        reason: refundRequestData.reason 
      });
      setSuccess('Refund request submitted successfully');
      setIsRequestRefundModalOpen(false);
      fetchRefundRequests();
      setTimeout(() => setSuccess(''), 3000);
      
      // Clean up URL
      searchParams.delete('invoiceToken');
      window.history.replaceState({}, '', window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit refund request');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/iyonicpay/withdrawals', {
        amount: parseFloat(withdrawData.amount),
        bankDetails: {
          bankName: withdrawData.bankName,
          accountNo: withdrawData.accountNo,
          accountName: withdrawData.accountName
        }
      });
      setSuccess('Withdrawal request submitted!');
      setIsWithdrawModalOpen(false);
      setWithdrawData({ amount: '', bankName: '', accountNo: '', accountName: '' });
      fetchWalletData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIyonicorpContinue = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/iyonicpay/continue-with-iyonicorp', { email: iyonicorpEmail });
      const iyonicorpUser = response.data;
      if (iyonicorpUser.storeName) {
        setConfirmStoreName(true);
        setUsername(iyonicorpUser.storeName);
      } else {
        setIsContinueModalOpen(false);
        setIsRegisterModalOpen(true);
        setRegisterForm({
          ...registerForm,
          firstName: iyonicorpUser.firstName || '',
          lastName: iyonicorpUser.lastName || '',
          email: iyonicorpUser.email,
          phoneNumber: iyonicorpUser.phoneNumber || ''
        });
      }
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
         setIsContinueModalOpen(false);
       }
     } catch (err: any) {
       setError(err.response?.data?.message || 'Failed to finalize account');
     } finally {
       setLoading(false);
     }
  };

  const handleOptIn = async () => {
    try {
      setIsOptingIn(true);
      setError('');
      const res = await api.post('/iyonicpay/opt-in');
      if (res.data.success) {
        const token = localStorage.getItem('iyonicorp_token') || '';
        setAuthenticatedUser({ ...user!, iyonicpayOptIn: true }, token);
        setView('dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to opt-in');
    } finally {
      setIsOptingIn(false);
    }
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password);
      setIsLoginModalOpen(false);
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
      setIsRegisterModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const themes = [
    { id: 'professional', name: 'Professional', color: 'bg-indigo-600', preview: 'from-indigo-600 to-indigo-800', description: 'Clean and corporate style' },
    { id: 'terminal', name: 'Deep Night', color: 'bg-gray-900', preview: 'from-gray-800 to-black', description: 'Sophisticated dark mode experience' },
    { id: 'glassmorphism', name: 'Glassmorphism', color: 'bg-white', preview: 'from-blue-400/50 to-purple-400/50 backdrop-blur-md', description: 'Modern translucent frost' },
    { id: 'luxury', name: 'Luxury Gold', color: 'bg-black', preview: 'from-zinc-900 to-black border border-amber-500/20', description: 'Premium elegant branding' },
    { id: 'cyber', name: 'Cyberpunk 2077', color: 'bg-black', preview: 'from-purple-900 to-black border border-cyan-400/50', description: 'Neon future aesthetics' },
    { id: 'neobrutalism', name: 'Neo-Brutalism', color: 'bg-yellow-400', preview: 'from-yellow-400 to-yellow-500 border-4 border-black', description: 'Bold, high-contrast geometry' },
    { id: 'minimal', name: 'Minimalist', color: 'bg-white', preview: 'from-gray-50 to-gray-200', description: 'Pure simplicity and focus' },
    { id: 'sunset', name: 'Sunset Glow', color: 'bg-orange-500', preview: 'from-orange-500 via-pink-500 to-purple-600', description: 'Warm evening gradients' },
    { id: 'ocean', name: 'Deep Ocean', color: 'bg-blue-600', preview: 'from-cyan-500 via-blue-600 to-indigo-900', description: 'Calming marine depths' },
    { id: 'forest', name: 'Emerald Forest', color: 'bg-emerald-600', preview: 'from-emerald-400 via-green-600 to-teal-900', description: 'Organic natural vibes' },
    { id: 'retro', name: 'Retro Arcade', color: 'bg-green-500', preview: 'from-green-900 via-black to-red-900 border-2 border-green-500', description: '8-bit nostalgic gaming vibes' },
    { id: 'galaxy', name: 'Galactic Journey', color: 'bg-purple-900', preview: 'from-indigo-950 via-purple-900 to-black', description: 'Deep space cosmic exploration' },
    { id: 'holographic', name: 'Holographic Prism', color: 'bg-pink-300', preview: 'from-pink-300 via-purple-300 to-cyan-300', description: 'Iridescent glass and light leaks' },
    { id: 'aurora', name: 'Aurora Borealis', color: 'bg-teal-500', preview: 'from-teal-900 via-blue-900 to-purple-900', description: 'Dancing polar atmospheric lights' },
    { id: 'liquid', name: 'Liquid Flow', color: 'bg-orange-400', preview: 'from-orange-400 via-rose-500 to-indigo-600', description: 'Morphing organic shapes and motion' },
    { id: 'vaporwave', name: 'Vaporwave Dream', color: 'bg-pink-400', preview: 'from-pink-400 via-purple-400 to-cyan-400 border-2 border-pink-300', description: 'Retro-future 80s aesthetics' },
    { id: 'matrix', name: 'Digital Rain', color: 'bg-green-600', preview: 'from-black via-green-950 to-black border border-green-500/30', description: 'Cascading terminal code' },
    { id: 'steampunk', name: 'Victorian Gear', color: 'bg-amber-800', preview: 'from-amber-900 via-yellow-900 to-black border-2 border-amber-600/50', description: 'Industrial brass and parchment' },
    { id: 'underwater', name: 'Abyssal Blue', color: 'bg-blue-800', preview: 'from-blue-900 via-cyan-900 to-indigo-950', description: 'Deep sea bubbles and bioluminescence' },
    { id: 'magma', name: 'Volcanic Core', color: 'bg-red-600', preview: 'from-red-950 via-orange-900 to-black border-b-4 border-red-600', description: 'Glowing lava and seismic energy' },
    { id: 'exclusive', name: 'Exclusive Elite', color: 'bg-[#D4AF37]', preview: 'from-black via-[#1a1a1a] to-black border-2 border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.2)]', description: 'Ultra-luxury gold and diamond aesthetics' },
  ];

  const handleUpdateSettings = async () => {
    if (!selectedInvoice) return;
    setLoading(true);
    try {
      const res = await api.patch(`/iyonicpay/invoices/${selectedInvoice.linkToken}/settings`, {
        amount: parseFloat(settingsForm.amount),
        description: settingsForm.description,
        isReusable: settingsForm.isReusable,
        usageLimit: settingsForm.usageLimit ? parseInt(settingsForm.usageLimit) : null,
        customTitle: settingsForm.customTitle,
        customButtonText: settingsForm.customButtonText
      });
      setSuccess('Settings updated successfully!');
      setIsCustomizing(false);
      await fetchInvoices();
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionLabel = (t: any) => {
    const isReceived = t.receiverWalletId === walletData?.id;
    const desc = t.description || '';
    
    // API payments (Embed Checkout) are stored as 'deposit' but should be 'sales'
    if (desc.includes('Embed Checkout Payment')) return 'sales';
    if (t.type === 'deposit') return 'deposites';
    if (t.type === 'invoice_payment') return 'sales';
    if (t.type === 'refund' || desc.toLowerCase().includes('refund')) return 'refund';
    if (t.type === 'receive' || isReceived) return 'received';
    if (t.type === 'request') return 'sales';
    if (t.type === 'withdrawal') return 'withdrawal';
    
    return desc || t.type.charAt(0).toUpperCase() + t.type.slice(1);
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['ID', 'Type', 'Amount', 'Date', 'Status', 'Description'];
    const rows = transactions.map(t => [
      t.id,
      getTransactionLabel(t),
      `${t.receiverWalletId === walletData?.id ? '+' : '-'}${formatPrice(convertAmount(Number(t.amount), t.currency || sellerCurrency, 'USD'), 'USD')}`,
      new Date(t.createdAt).toLocaleString(),
      t.status,
      t.description || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `iyonicpay_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadReceipt = (t: any) => {
    const doc = new jsPDF() as any;
    const label = getTransactionLabel(t);
    const amount = `${t.receiverWalletId === walletData?.id ? '+' : '-'}${formatPrice(convertAmount(Number(t.amount), t.currency || sellerCurrency, 'USD'), 'USD')}`;
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('IyonicPay', 20, 25);
    
    doc.setFontSize(12);
    doc.text('Transaction Receipt', 150, 25);
    
    // Content
    doc.setTextColor(31, 41, 55); // Gray 900
    doc.setFontSize(10);
    doc.text('TRANSACTION ID', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(t.id, 20, 65);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', 120, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(t.createdAt).toLocaleString(), 120, 65);
    
    doc.line(20, 75, 190, 75);
    
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 20, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 20, 95);
    
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT', 120, 90);
    doc.setFontSize(16);
    const isReceiver = t.receiverWalletId === walletData?.id;
    doc.setTextColor(isReceiver ? 16 : 31, isReceiver ? 185 : 41, isReceiver ? 129 : 55);
    doc.text(amount, 120, 97);
    
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(10);
    doc.text('STATUS', 20, 115);
    doc.setTextColor(31, 41, 55);
    doc.text((t.status || 'PENDING').toUpperCase(), 20, 120);
    
    doc.line(20, 135, 190, 135);
    
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text('Thank you for using IyonicPay!', 105, 155, { align: 'center' });
    
    doc.save(`receipt_${t.id.slice(0, 8)}.pdf`);
  };

  const downloadStatement = () => {
    if (!user) return;
    const { start, end } = statementRange;
    let filtered = transactions;
    
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      e.setHours(23, 59, 59);
      filtered = transactions.filter(t => {
        const d = new Date(t.createdAt);
        return d >= s && d <= e;
      });
    }

    const doc = new jsPDF() as any;
    
    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('IyonicPay', 20, 25);
    
    doc.setFontSize(12);
    doc.text('Account Statement', 150, 25);
    
    // User Info
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.text('ACCOUNT HOLDER', 20, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(user.name || user.firstName + ' ' + user.lastName, 20, 65);
    
    doc.setFont('helvetica', 'normal');
    doc.text('PERIOD', 120, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`${start || 'All time'} to ${end || 'Present'}`, 120, 65);
    
    // Summary
    const totalIncome = filtered.reduce((acc, t) => {
      const amtUSD = convertAmount(Number(t.amount), t.currency || sellerCurrency, 'USD');
      return t.receiverWalletId === walletData?.id ? acc + amtUSD : acc;
    }, 0);
    const totalExpense = filtered.reduce((acc, t) => {
      const amtUSD = convertAmount(Number(t.amount), t.currency || sellerCurrency, 'USD');
      return t.receiverWalletId !== walletData?.id ? acc + amtUSD : acc;
    }, 0);
    
    autoTable(doc, {
      startY: 80,
      head: [['Date', 'Transaction', 'Reference', 'Status', 'Amount (USD)']],
      body: filtered.map(t => [
        new Date(t.createdAt).toLocaleDateString(),
        getTransactionLabel(t),
        t.id.slice(0, 8),
        (t.status || 'PENDING').toUpperCase(),
        {
          content: `${t.receiverWalletId === walletData?.id ? '+' : '-'}${formatPrice(convertAmount(Number(t.amount), t.currency || sellerCurrency, 'USD'), 'USD')}`,
          styles: { textColor: t.receiverWalletId === walletData?.id ? [16, 185, 129] : [239, 68, 68] }
        }
      ]),
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 80 },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(`Total Income: ${formatPrice(totalIncome, 'USD')}`, 140, finalY + 20);
    doc.text(`Total Expense: ${formatPrice(totalExpense, 'USD')}`, 140, finalY + 30);
    doc.setFontSize(14);
    doc.text(`Net Balance: ${formatPrice(totalIncome - totalExpense, 'USD')}`, 140, finalY + 45);
    
    doc.save(`iyonicpay_statement_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsStatementModalOpen(false);
  };

  const renderLinkSettings = () => {
    if (!selectedInvoice) return null;

    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-white flex flex-col font-sans"
      >
        <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsCustomizing(false)}
              className="p-3 hover:bg-gray-100 rounded-2xl transition-colors group"
            >
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Link Settings</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{formatPrice(selectedInvoice.amount, sellerCurrency)} - {selectedInvoice.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-2 bg-green-500 text-white text-xs font-black rounded-full flex items-center space-x-2">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <Button 
              onClick={() => {
                handleUpdateSettings();
              }}
              loading={loading}
              className="bg-gray-900 text-white font-black px-8 py-4 rounded-2xl"
            >
              Done
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Controls Sidebar */}
          <div className="w-full lg:w-[450px] h-full bg-gray-50/50 border-r border-gray-100 overflow-y-auto p-10">
            <div className="space-y-12">
              <section className="space-y-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg"><Settings className="w-5 h-5" /></div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Configuration</h3>
                </div>

                <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Amount ({sellerCurrency})</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={settingsForm.amount}
                      onChange={(e) => setSettingsForm({...settingsForm, amount: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Description</label>
                    <input 
                      type="text"
                      value={settingsForm.description}
                      onChange={(e) => setSettingsForm({...settingsForm, description: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                    />
                  </div>

                  <div className="pt-4 space-y-4">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${settingsForm.isReusable ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200' : 'border-gray-300 bg-white group-hover:border-indigo-400'}`}>
                          {settingsForm.isReusable && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Reusable Link</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={settingsForm.isReusable}
                        onChange={(e) => setSettingsForm({...settingsForm, isReusable: e.target.checked})}
                      />
                    </label>

                    <AnimatePresence>
                      {settingsForm.isReusable && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2 pt-2"
                        >
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-2">Usage Limit</label>
                            <span className="text-[8px] font-bold text-gray-400">Empty = Unlimited</span>
                          </div>
                          <input 
                            type="number" 
                            placeholder="Max settlements"
                            value={settingsForm.usageLimit}
                            onChange={(e) => setSettingsForm({...settingsForm, usageLimit: e.target.value})}
                            className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all text-sm"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              <section className="space-y-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Globe className="w-5 h-5" /></div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Custom Texts</h3>
                </div>

                <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Display Title</label>
                    <input 
                      type="text"
                      placeholder="Payment Request"
                      value={settingsForm.customTitle}
                      onChange={(e) => setSettingsForm({...settingsForm, customTitle: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2">Button Text</label>
                    <input 
                      type="text"
                      placeholder="Execute Payment"
                      value={settingsForm.customButtonText}
                      onChange={(e) => setSettingsForm({...settingsForm, customButtonText: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                    />
                  </div>
                </div>
              </section>

              <div className="p-8 bg-indigo-900 rounded-[2.5rem] text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-black text-xl mb-2">Live Preview</h4>
                  <p className="text-indigo-200 text-sm font-medium leading-relaxed opacity-80">This is exactly how your customers will see the payment page.</p>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-gray-200 overflow-auto relative p-8">
            <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-900">
              <iframe 
                src={`${window.location.origin}/#/iyonicpay/invoice/${selectedInvoice.linkToken}?preview=true&theme=${globalTheme}&customTitle=${encodeURIComponent(settingsForm.customTitle)}&customButtonText=${encodeURIComponent(settingsForm.customButtonText)}&amount=${settingsForm.amount}&description=${encodeURIComponent(settingsForm.description)}&currency=${sellerCurrency}`}
                className="w-full h-full border-none"
                title="Theme Preview"
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderGlobalThemeCustomization = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-white flex flex-col font-sans"
    >
      <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setIsCustomizingGlobalTheme(false)}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-colors group"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Global Customization</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Master Brand Identity</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => {
              if (previewTheme) {
                handleUpdateGlobalTheme(previewTheme);
                setIsCustomizingGlobalTheme(false);
              }
            }}
            loading={loading}
            className="bg-gray-900 text-white font-black px-8 py-4 rounded-2xl"
          >
            Apply Theme
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Themes Sidebar */}
        <div className="w-full lg:w-[450px] h-full bg-gray-50/50 border-r border-gray-100 overflow-y-auto p-10">
          <div className="space-y-8">
            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-black text-indigo-900">Brand Vibe</h4>
                <p className="text-xs text-indigo-800/60 font-bold">Applies to all your links.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPreviewTheme(t.id)}
                  className={`relative w-full flex items-center p-6 rounded-[2.5rem] transition-all text-left border-2 ${
                    previewTheme === t.id 
                      ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100/50 scale-[1.02] z-10' 
                      : 'bg-white border-transparent hover:border-gray-100 grayscale-[0.5] opacity-70 hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${t.preview} shadow-lg mr-6 flex-shrink-0 overflow-hidden`}></div>
                  <div className="flex-1">
                    <h4 className={`font-black text-lg ${previewTheme === t.id ? 'text-indigo-600' : 'text-gray-900'}`}>{t.name}</h4>
                    <p className="text-xs text-gray-400 font-bold leading-tight mt-1">{(t as any).description}</p>
                  </div>
                  {previewTheme === t.id && (
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg ml-4">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 bg-gray-200 overflow-auto relative p-8">
          <div className="w-full h-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-gray-900">
            <iframe 
              src={`${window.location.origin}/#/iyonicpay/invoice/preview?preview=true&theme=${previewTheme}&currency=${sellerCurrency}`}
              className="w-full h-full border-none"
              title="Global Theme Preview"
            />
          </div>
          
          <div className="absolute top-12 right-12 hidden xl:block">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-xl max-w-xs">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-sm text-gray-900">Live Preview Mode</span>
              </div>
              <p className="text-xs text-gray-500 font-bold leading-relaxed">This is exactly how your customers will experience your payment links across the web.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (view === 'dashboard' && user && user.iyonicpayOptIn) {
    const pendingRefundsCount = refundRequests.filter(r => r.status === 'pending').length;

    const sidebarItems: SidebarItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'transactions', label: 'Transactions', icon: <History className="w-5 h-5" /> },
       ...(user?.role === 'seller' ? [
         { id: 'invoices', label: 'Payment Links', icon: <CreditCard className="w-5 h-5" /> },
         { 
           id: 'refunds', 
           label: 'Refunds', 
           icon: <RotateCcw className="w-5 h-5" />,
           badge: pendingRefundsCount > 0 ? pendingRefundsCount : undefined
         },
         { id: 'withdrawals', label: 'Withdrawals', icon: <Banknote className="w-5 h-5" /> },
         { id: 'api', label: 'API & Embed', icon: <Code className="w-5 h-5" /> },
       ] : [
         { id: 'withdrawals', label: 'Withdrawals', icon: <Banknote className="w-5 h-5" /> },
       ]),
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex font-sans">

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>
        {/* Sidebar */}
        <aside className={`w-72 bg-white border-r border-gray-200 fixed lg:sticky top-0 h-screen z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-gray-900">IyonicPay</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}>
                  {item.icon}
                </span>
                <span className="font-bold">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-6">
            <div className="bg-gray-900 p-5 rounded-[2rem] text-white relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Your ID</p>
                <p className="text-sm font-bold truncate">@{user.username || user.name.toLowerCase().replace(/\s+/g, '-')}</p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/40 transition-colors"></div>
            </div>
            
            {user.role === 'seller' && (
              <Link
                to="/seller/dashboard"
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-indigo-600 font-bold hover:bg-indigo-50 transition-colors border border-indigo-100 mb-2"
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
        <main className="flex-1 min-h-screen w-full overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isCustomizing && renderLinkSettings()}
            {isCustomizingGlobalTheme && renderGlobalThemeCustomization()}
          </AnimatePresence>
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 px-4 lg:px-8 py-5">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl font-black text-gray-900">
                    {sidebarItems.find(i => i.id === activeTab)?.label}
                  </h1>
                  <p className="text-xs text-gray-500 font-medium hidden sm:block">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-full flex items-center space-x-2 shadow-lg shadow-green-100"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center space-x-3 bg-gray-50 p-1.5 pl-4 rounded-full border border-gray-100">
                  <span className="text-sm font-bold text-gray-700">{user.firstName || user.name.split(' ')[0]}</span>
                  <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md">
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
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Wallet Card */}
                    <div className="lg:col-span-2 bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-indigo-100">
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-12">
                          <div>
                            <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Available Balance</p>
                             <div className="flex items-baseline space-x-4">
                               <h2 className="text-6xl font-black tracking-tighter">{formatPrice(cashflow.income - cashflow.expense, 'USD')}</h2>
                               {sellerCurrency !== 'USD' && (
                                 <span className="text-2xl font-bold text-gray-500 opacity-60">
                                   ≈ {formatPrice((cashflow.income - cashflow.expense) * (EXCHANGE_RATES[sellerCurrency] || 1), sellerCurrency)}
                                 </span>
                               )}
                             </div>
                          </div>
                          <div className="w-16 h-10 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center">
                            <Wallet className="w-6 h-6" />
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 mt-auto">
                          <button 
                            onClick={() => setIsDepositModalOpen(true)}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl flex items-center space-x-3 transition-all transform active:scale-95 shadow-xl shadow-indigo-500/20"
                          >
                            <Plus className="w-5 h-5" />
                            <span>Deposit</span>
                          </button>
                          <button 
                            onClick={() => setIsSendModalOpen(true)}
                            className="px-8 py-4 bg-white hover:bg-gray-100 text-gray-900 font-black rounded-2xl flex items-center space-x-3 transition-all transform active:scale-95"
                          >
                            <Send className="w-5 h-5" />
                            <span>Transfer</span>
                          </button>
                          <button 
                            onClick={() => setIsInvoiceModalOpen(true)}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl flex items-center space-x-3 transition-all transform active:scale-95 backdrop-blur-sm"
                          >
                            <CreditCard className="w-5 h-5" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Decorative Elements */}
                      <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-500/30 transition-colors duration-1000"></div>
                      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-[50px]"></div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col">
                      <h3 className="text-lg font-black text-gray-900 mb-8">Cashflow</h3>
                      <div className="space-y-8 flex-1">
                        <div>
                          <div className="flex justify-between items-end mb-3">
                            <span className="text-gray-500 font-bold text-sm uppercase tracking-wider">Income</span>
                            <div className="text-right">
                              <div className="text-green-600 font-black text-xl">{formatPrice(cashflow.income, 'USD')}</div>
                              {sellerCurrency !== 'USD' && cashflow.income > 0 && (
                                <div className="text-[10px] text-gray-400 font-bold">≈ {formatPrice(cashflow.income * (EXCHANGE_RATES[sellerCurrency] || 1), sellerCurrency)}</div>
                              )}
                            </div>
                          </div>
                          <div className="h-4 bg-gray-50 rounded-full overflow-hidden p-1">
                            <motion.div initial={{ width: 0 }} animate={{ width: cashflow.income > 0 ? '100%' : '0%' }} className="h-full bg-green-500 rounded-full shadow-lg shadow-green-100"></motion.div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-end mb-3">
                            <span className="text-gray-500 font-bold text-sm uppercase tracking-wider">Expense</span>
                            <div className="text-right">
                              <div className="text-red-500 font-black text-xl">{formatPrice(cashflow.expense, 'USD')}</div>
                              {sellerCurrency !== 'USD' && cashflow.expense > 0 && (
                                <div className="text-[10px] text-gray-400 font-bold">≈ {formatPrice(cashflow.expense * (EXCHANGE_RATES[sellerCurrency] || 1), sellerCurrency)}</div>
                              )}
                            </div>
                          </div>
                          <div className="h-4 bg-gray-50 rounded-full overflow-hidden p-1">
                            <motion.div initial={{ width: 0 }} animate={{ width: cashflow.expense > 0 ? '100%' : '0%' }} className="h-full bg-red-500 rounded-full shadow-lg shadow-red-100"></motion.div>
                          </div>
                         </div>
                      </div>
                      <div className="mt-8 pt-8 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">
                          Your account is protected by bank-grade security and end-to-end encryption.
                        </p>
                      </div>
                      </div>
                   </div>

                  {/* Transactions Preview */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-black text-gray-900">Recent Activity</h3>
                      <button 
                        onClick={() => setActiveTab('transactions')}
                        className="text-indigo-600 font-black text-sm hover:underline flex items-center space-x-1"
                      >
                        <span>View Records</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {transactions.length > 0 ? transactions.slice(0, 5).map((t, i) => (
                        <motion.div 
                          key={t.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all hover:border-indigo-100"
                        >
                          <div className="flex items-center space-x-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                              t.receiverWalletId === walletData?.id
                                ? 'bg-green-50 text-green-600 group-hover:bg-green-100' 
                                : 'bg-red-50 text-red-600 group-hover:bg-red-100'
                            }`}>
                              {t.receiverWalletId === walletData?.id
                                ? <ArrowDownLeft className="w-6 h-6" /> 
                                : <ArrowUpRight className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="font-black text-gray-900">
                                {getTransactionLabel(t)}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-400 font-bold mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{t.createdAt ? new Date(t.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                                <span>•</span>
                                <span className="uppercase">{t.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-black ${
                              t.receiverWalletId === walletData?.id
                                ? 'text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {t.receiverWalletId === walletData?.id ? '+' : '-'}{formatPrice(Number(t.amount), t.currency || sellerCurrency)}
                            </p>
                            {(t.currency || sellerCurrency) === 'KES' && (
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                ≈ ${ (Number(t.amount) / 125).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Confirmed</p>
                          </div>
                        </motion.div>
                      )) : (
                        <div className="py-20 bg-white rounded-[3rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <History className="w-8 h-8 text-gray-300" />
                          </div>
                          <p className="text-gray-500 font-bold">No transactions found</p>
                          <p className="text-gray-400 text-sm mt-1">Your payment history will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'transactions' && (
                <motion.div
                  key="transactions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-black text-gray-900">Transaction History</h3>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setIsStatementModalOpen(true)}
                        className="px-5 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-sm hover:bg-indigo-100 transition-colors flex items-center space-x-2"
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Statement</span>
                      </button>
                      <button 
                        onClick={exportToCSV}
                        className="px-5 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-50">
                          <th className="pb-6 pl-4">Transaction</th>
                          <th className="pb-6">Reference</th>
                          <th className="pb-6">Amount</th>
                          <th className="pb-6">Date</th>
                          <th className="pb-6">Status</th>
                          <th className="pb-6 pr-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {transactions.map((t) => (
                          <tr key={t.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-6 pl-4">
                              <div className="flex items-center space-x-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  t.receiverWalletId === walletData?.id
                                    ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  {t.receiverWalletId === walletData?.id
                                    ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <span className="font-bold text-gray-900">
                                  {getTransactionLabel(t)}
                                </span>
                              </div>
                            </td>
                            <td className="py-6 font-mono text-xs text-gray-500 uppercase tracking-tighter">{t.id.slice(0, 8)}...</td>
<td className={`py-6 font-black ${
                                              t.receiverWalletId === walletData?.id
                                                ? 'text-green-600' : 'text-gray-900'
                                            }`}>
                                            {t.receiverWalletId === walletData?.id ? '+' : '-'}{formatPrice(convertAmount(Number(t.amount), t.currency || sellerCurrency, 'USD'), 'USD')}
                                          </td>
                            <td className="py-6 text-sm text-gray-500 font-medium">{t.createdAt ? new Date(t.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                            <td className="py-6">
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                {t.status}
                              </span>
                            </td>
                            <td className="py-6 pr-4 text-right">
                              <div className="flex flex-col items-end space-y-2">
                                <button 
                                  onClick={() => downloadReceipt(t)}
                                  className="text-indigo-600 font-bold text-xs hover:underline flex items-center justify-end space-x-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Receipt</span>
                                </button>
                                
                                {t.type === 'invoice_payment' && t.senderUserId === user?.id && t.invoiceToken && (
                                  <button 
                                    onClick={() => {
                                      setRefundRequestData({
                                        token: t.invoiceToken,
                                        amount: Number(t.amount),
                                        currency: t.currency || sellerCurrency,
                                        reason: '',
                                        merchant: t.receiverUsername || 'Merchant'
                                      });
                                      setIsRequestRefundModalOpen(true);
                                    }}
                                    className="text-orange-600 font-bold text-xs hover:underline flex items-center justify-end space-x-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Refund</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'invoices' && (
                <motion.div
                  key="invoices"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-gray-900">Payment Links</h3>
                    <div className="flex items-center space-x-4">
                      <Button 
                        onClick={() => {
                          setPreviewTheme(globalTheme);
                          setIsCustomizingGlobalTheme(true);
                        }}
                        className="bg-white text-indigo-600 border border-indigo-100 font-black px-8 py-4 rounded-2xl flex items-center space-x-2 hover:bg-indigo-50 transition-colors"
                      >
                        <Palette className="w-5 h-5" />
                        <span>Global Theme</span>
                      </Button>
                      <Button 
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl flex items-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>New Link</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {invoices.length > 0 ? (
                      invoices.map((inv) => (
                        <div key={inv.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full relative overflow-hidden group">
                          <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                              <Share2 className="w-6 h-6" />
                            </div>
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                              inv.status === 'paid' ? 'bg-green-50 text-green-600' : 
                              inv.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {inv.status === 'paid' ? 'Settled' : inv.status}
                            </span>
                          </div>
                          <h4 className="text-2xl font-black text-gray-900 mb-2">{formatPrice(inv.amount, inv.currency || sellerCurrency)}</h4>
                          <p className="text-gray-500 font-medium text-sm mb-8 flex-1">{inv.description || 'No description'}</p>
                          
                          <div className="pt-6 border-t border-gray-50 space-y-4">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => copyToClipboard(`${window.location.origin}/#/iyonicpay/invoice/${inv.linkToken}`)}
                                className="flex-1 flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-indigo-50 rounded-2xl text-gray-600 hover:text-indigo-600 font-bold text-xs transition-all"
                              >
                                <span className="truncate mr-2">Pay Link</span>
                                <Copy className="w-4 h-4 flex-shrink-0" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setSettingsForm({ 
                                    amount: String(inv.amount), 
                                    description: inv.description || '', 
                                    isReusable: inv.isReusable || false, 
                                    usageLimit: inv.usageLimit ? String(inv.usageLimit) : '',
                                    customTitle: inv.customTitle || '',
                                    customButtonText: inv.customButtonText || ''
                                  });
                                  setIsCustomizing(true);
                                }}
                                className="px-4 py-3.5 bg-gray-50 hover:bg-indigo-50 rounded-2xl text-gray-600 hover:text-indigo-600 transition-all"
                                title="Link Settings"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => {
                                  const url = `${window.location.origin}/#/iyonicpay/invoice/${inv.linkToken}`;
                                  if (navigator.share) {
                                    navigator.share({ title: 'IyonicPay Invoice', url });
                                  } else {
                                    copyToClipboard(url);
                                  }
                                }}
                                className="flex-1 py-3 bg-white border border-gray-100 hover:border-indigo-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-all"
                              >
                                <Share2 className="w-4 h-4 mx-auto" />
                              </button>
                              <a 
                                href={`/#/iyonicpay/invoice/${inv.linkToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 bg-white border border-gray-100 hover:border-indigo-100 rounded-xl text-gray-400 hover:text-indigo-600 transition-all flex items-center justify-center"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 mb-4">
                          <History className="w-8 h-8" />
                        </div>
                        <h4 className="text-xl font-black text-gray-900">No Payment Links Yet</h4>
                        <p className="text-gray-500 font-medium mt-2">Create your first link to start accepting payments.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'withdrawals' && (
                <motion.div
                  key="withdrawals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="max-w-3xl"
                >
                  <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-3xl font-black text-gray-900 mb-4">Request Withdrawal</h3>
                      <p className="text-gray-500 font-medium mb-12">Submit your details to withdraw funds to your local bank account.</p>
                      
                      <form onSubmit={handleWithdraw} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Withdrawal Amount ({sellerCurrency})</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              value={withdrawData.amount}
                              onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})}
                              className="w-full bg-gray-50 border-0 rounded-[2rem] px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Bank Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Chase Bank" 
                              value={withdrawData.bankName}
                              onChange={(e) => setWithdrawData({...withdrawData, bankName: e.target.value})}
                              className="w-full bg-gray-50 border-0 rounded-[2rem] px-8 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Account Number</label>
                            <input 
                              type="text" 
                              placeholder="Account No" 
                              value={withdrawData.accountNo}
                              onChange={(e) => setWithdrawData({...withdrawData, accountNo: e.target.value})}
                              className="w-full bg-gray-50 border-0 rounded-[2rem] px-8 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Account Name</label>
                            <input 
                              type="text" 
                              placeholder="Full Name" 
                              value={withdrawData.accountName}
                              onChange={(e) => setWithdrawData({...withdrawData, accountName: e.target.value})}
                              className="w-full bg-gray-50 border-0 rounded-[2rem] px-8 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                              required
                            />
                          </div>
                        </div>

                        <div className="bg-indigo-50 p-6 rounded-[2rem] flex items-start space-x-4 border border-indigo-100/50">
                          <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-indigo-900/70 font-bold leading-relaxed">
                            Withdrawals are processed within 24-48 business hours. Ensure your bank details are accurate to avoid delays.
                          </p>
                        </div>

                        <Button 
                          type="submit" 
                          isLoading={loading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3 transition-all transform active:scale-[0.98]"
                        >
                          <Banknote className="w-6 h-6" />
                          <span className="text-lg">Process Withdrawal</span>
                        </Button>
                      </form>
                    </div>
                    
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -z-10"></div>
                  </div>
                </motion.div>
               )}

              {activeTab === 'api' && (
                <motion.div
                  key="api"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
                    <div className="max-w-2xl">
                      <h3 className="text-3xl font-black text-gray-900 mb-4">Embedded Checkout</h3>
                      <p className="text-gray-500 font-medium mb-12">Accept payments on your website using the IyonicPay Checkout script. Fast, secure, and ready to go.</p>
                      
                      <div className="space-y-10">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Your Secret API Key</label>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-50 px-8 py-5 rounded-[2rem] text-gray-900 font-mono text-sm border border-gray-100">
                              {apiKey || 'ip_sk_••••••••••••••••••••••••'}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(apiKey)}
                              className="w-16 h-16 bg-white border border-gray-100 hover:border-indigo-100 rounded-3xl flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all shadow-sm"
                            >
                              <Copy className="w-6 h-6" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Quick Embed Code</label>
                          <div className="bg-gray-900 rounded-[2rem] p-8 text-indigo-300 font-mono text-xs overflow-hidden relative">
                            <pre className="overflow-x-auto pb-4">
{`<!-- Add this to your website -->
<script src="${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}/checkout.js"></script>

<!-- Payment Button -->
<button 
  data-iyonicpay-key="${apiKey || 'YOUR_API_KEY'}" 
  data-amount="10.00"
  data-currency="${sellerCurrency}"
  data-description="Product Payment"
>Pay Now</button>

<!-- Optional: Email Input -->
<input type="email" data-iyonicpay-email placeholder="your@email.com">`}
                            </pre>
                            <button 
                              onClick={() => copyToClipboard(`<!-- Add this to your website -->
<script src="${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}/checkout.js"></script>

<!-- Payment Button -->
<button 
  data-iyonicpay-key="${apiKey || 'YOUR_API_KEY'}" 
  data-amount="10.00"
  data-currency="${sellerCurrency}"
  data-description="Product Payment"
>Pay Now</button>

<!-- Optional: Email Input -->
<input type="email" data-iyonicpay-email placeholder="your@email.com">`)}
                              className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-indigo-50 rounded-[2rem] p-8 border border-indigo-100">
                          <h4 className="text-lg font-black text-indigo-900 mb-4">How It Works</h4>
                          <ol className="space-y-3 text-indigo-800 font-medium text-sm">
                            <li className="flex items-start space-x-3">
                              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">1</span>
                              <span>Copy your API key above and add it to your website</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">2</span>
                              <span>The checkout.js script automatically creates a styled payment button</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">3</span>
                              <span>When clicked, it opens a secure Paystack payment popup</span>
                            </li>
                            <li className="flex items-start space-x-3">
                              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">4</span>
                              <span>After payment, funds are instantly added to your IyonicPay wallet</span>
                            </li>
                          </ol>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-lg font-black text-gray-900">Button Attributes</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-3 font-black text-gray-400 text-xs uppercase">Attribute</th>
                                  <th className="text-left py-3 font-black text-gray-400 text-xs uppercase">Required</th>
                                  <th className="text-left py-3 font-black text-gray-400 text-xs uppercase">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                <tr>
                                  <td className="py-3 font-mono text-indigo-600">data-iyonicpay-key</td>
                                  <td className="py-3 text-green-600 font-bold">Yes</td>
                                  <td className="py-3 text-gray-600">Your API key (ip_sk_...)</td>
                                </tr>
                                <tr>
                                  <td className="py-3 font-mono text-indigo-600">data-amount</td>
                                  <td className="py-3 text-green-600 font-bold">Yes</td>
                                  <td className="py-3 text-gray-600">Payment amount (e.g., 10.00)</td>
                                </tr>
                                <tr>
                                  <td className="py-3 font-mono text-indigo-600">data-currency</td>
                                  <td className="py-3 text-gray-400 font-bold">No</td>
                                  <td className="py-3 text-gray-600">Currency code (default: USD)</td>
                                </tr>
                                <tr>
                                  <td className="py-3 font-mono text-indigo-600">data-description</td>
                                  <td className="py-3 text-gray-400 font-bold">No</td>
                                  <td className="py-3 text-gray-600">Payment description</td>
                                </tr>
                                <tr>
                                  <td className="py-3 font-mono text-indigo-600">data-email</td>
                                  <td className="py-3 text-gray-400 font-bold">No</td>
                                  <td className="py-3 text-gray-600">Default email or from input</td>
                                </tr>
                                <tr>
                                  <td className="py-3 font-mono text-indigo-600">data-on-success</td>
                                  <td className="py-3 text-gray-400 font-bold">No</td>
                                  <td className="py-3 text-gray-600">JavaScript code to run on success</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-10">
                          <h4 className="text-2xl font-black text-gray-900 mb-4">Test Integration</h4>
                          <p className="text-gray-500 font-medium mb-8">Try the embed checkout right here. This simulates how it works on your website.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Amount ({sellerCurrency})</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                placeholder="10.00" 
                                id="test-amount"
                                defaultValue="10.00"
                                className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Email</label>
                              <input 
                                type="email" 
                                placeholder="test@example.com" 
                                id="test-email"
                                defaultValue={user?.email || 'test@example.com'}
                                className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Currency</label>
                              <select 
                                id="test-currency"
                                defaultValue={sellerCurrency}
                                className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                              >
                                <option value="USD">USD</option>
                                <option value="KES">KES</option>
                              </select>
                            </div>
                          </div>

                          <button 
                            id="test-checkout-btn"
                            data-iyonicpay-key={apiKey || ''}
                            data-amount="10.00"
                            data-currency={sellerCurrency}
                            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl flex items-center justify-center space-x-3 transition-all transform active:scale-[0.98] shadow-xl shadow-indigo-100"
                          >
                            <Play className="w-6 h-6 fill-current" />
                            <span className="text-lg">Test Payment ({formatPrice(10, sellerCurrency)})</span>
                          </button>

                          <div id="test-result" className="mt-6 hidden">
                            <div className="bg-gray-900 rounded-2xl p-6 font-mono text-sm">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">Status:</span>
                                <span id="result-status" className="font-bold"></span>
                              </div>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">Reference:</span>
                                <span id="result-ref" className="text-indigo-400"></span>
                              </div>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">Amount:</span>
                                <span id="result-amount" className="text-green-400"></span>
                              </div>
                              <div className="border-t border-gray-700 pt-4 mt-4">
                                <span className="text-gray-400">Full Response:</span>
                                <pre id="result-json" className="text-xs text-indigo-300 mt-2 overflow-x-auto"></pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Action Modals */}
        
        {/* Deposit Modal */}
        <Popup isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} title="Add Funds">
          <form onSubmit={handleDeposit} className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Deposit Amount ({sellerCurrency})</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                required
              />
            </div>
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>
                <span className="font-bold text-gray-600">Secure Payment via Paystack</span>
              </div>
              <div className="flex -space-x-1">
                {[1,2].map(i => <div key={i} className="w-6 h-4 bg-gray-200 rounded-sm"></div>)}
              </div>
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
            <Button type="submit" isLoading={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-100">
              Continue to Payment
            </Button>
          </form>
        </Popup>

        {/* Send Modal */}
        <Popup isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} title="Send Money">
          <form onSubmit={handleSendMoney} className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Recipient ID or Email</label>
              <input 
                type="text" 
                placeholder="@username or email" 
                value={sendData.recipient}
                onChange={(e) => setSendData({...sendData, recipient: e.target.value})}
                className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Amount ({sellerCurrency})</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={sendData.amount}
                onChange={(e) => setSendData({...sendData, amount: e.target.value})}
                className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Note (Optional)</label>
              <input 
                type="text" 
                placeholder="What's it for?" 
                value={sendData.description}
                onChange={(e) => setSendData({...sendData, description: e.target.value})}
                className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
            <Button type="submit" isLoading={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl">
              Complete Transfer
            </Button>
          </form>
        </Popup>

        {/* Invoice Modal */}
        <Popup isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Generate Link">
          <form onSubmit={handleCreateInvoice} className="space-y-6 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Fixed Amount ({sellerCurrency})</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={invoiceData.amount}
                onChange={(e) => setInvoiceData({...invoiceData, amount: e.target.value})}
                className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Description</label>
              <input 
                type="text" 
                placeholder="Product or Service Name" 
                value={invoiceData.description}
                onChange={(e) => setInvoiceData({...invoiceData, description: e.target.value})}
                className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                required
              />
            </div>
            <div className="space-y-4 px-4 py-2 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${invoiceData.isReusable ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200' : 'border-gray-300 bg-white group-hover:border-indigo-400'}`}>
                    {invoiceData.isReusable && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Make Reusable</span>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={invoiceData.isReusable}
                  onChange={(e) => setInvoiceData({...invoiceData, isReusable: e.target.checked})}
                />
              </label>
              
              <AnimatePresence>
                {invoiceData.isReusable && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3 pt-2 border-t border-indigo-100"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Usage Limit (Optional)</label>
                        <span className="text-[8px] font-bold text-gray-400">Leave empty for unlimited</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="e.g. 10 payments" 
                        value={invoiceData.usageLimit}
                        onChange={(e) => setInvoiceData({...invoiceData, usageLimit: e.target.value})}
                        className="w-full bg-white border-0 rounded-2xl px-6 py-4 text-gray-900 font-black focus:ring-4 ring-indigo-100 transition-all text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button type="submit" isLoading={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl">
              Create Payment Link
            </Button>
          </form>
        </Popup>

        {/* Statement Modal */}
        <Popup isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)} title="Download Statement">
          <div className="space-y-8 py-6">
            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Banknote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-black text-indigo-900">Select Period</h4>
                <p className="text-xs text-indigo-800/60 font-bold">Choose the date range for your statement.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Start Date</label>
                <input 
                  type="date" 
                  value={statementRange.start}
                  onChange={(e) => setStatementRange({...statementRange, start: e.target.value})}
                  className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">End Date</label>
                <input 
                  type="date" 
                  value={statementRange.end}
                  onChange={(e) => setStatementRange({...statementRange, end: e.target.value})}
                  className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-4 ring-indigo-50 transition-all"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Your statement will include all <span className="text-gray-900 font-black">sales</span>, <span className="text-gray-900 font-black">deposites</span>, and <span className="text-gray-900 font-black">received</span> transactions with full branding.
              </p>
            </div>

            <Button 
              onClick={downloadStatement}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3 transition-all transform active:scale-[0.98]"
            >
              <ArrowUpRight className="w-6 h-6 rotate-45" />
              <span className="text-lg">Generate Cool PDF</span>
            </Button>
          </div>
        </Popup>

        {/* Request Refund Modal */}
        <Popup isOpen={isRequestRefundModalOpen} onClose={() => setIsRequestRefundModalOpen(false)} title="Request Refund">
          <form onSubmit={handleRequestRefund} className="space-y-8 py-6">
            <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center space-x-5 mb-8">
                  <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-200 group-hover:scale-110 transition-transform duration-500">
                    <RotateCcw className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-orange-900 text-xl tracking-tight">Refund Application</h4>
                    <p className="text-sm text-orange-800/60 font-bold uppercase tracking-widest mt-1">Paying to @{refundRequestData.merchant}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-8 border-t border-orange-200/50">
                  <span className="text-xs font-black text-orange-800 uppercase tracking-[0.2em]">Total Refund Amount</span>
                  <span className="text-4xl font-black text-orange-900 tracking-tighter">{formatPrice(refundRequestData.amount, refundRequestData.currency)}</span>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-orange-100/50 rounded-full blur-2xl"></div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-6">Why are you requesting this refund?</label>
              <textarea 
                placeholder="Please provide detailed reasons (e.g. Item not as described, service not rendered...)" 
                value={refundRequestData.reason}
                onChange={(e) => setRefundRequestData({...refundRequestData, reason: e.target.value})}
                className="w-full bg-gray-50 border-0 rounded-[2rem] px-8 py-6 text-gray-900 font-bold placeholder:text-gray-300 focus:ring-4 ring-orange-50 transition-all min-h-[160px] resize-none"
                required
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center justify-center space-x-2"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
            
            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRequestRefundModalOpen(false)}
                className="flex-1 py-5 rounded-[2rem] font-black border-2 border-gray-100 hover:bg-gray-50 transition-all"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={isSubmittingRefund} 
                className="flex-[1.5] bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-orange-200 transition-all transform active:scale-95"
              >
                Confirm Submission
              </Button>
            </div>
          </form>
        </Popup>

        <ConfirmPopup
          isOpen={!!refundActionData}
          onClose={() => setRefundActionData(null)}
          onConfirm={handleRefundAction}
          title={`${refundActionData?.action === 'approve' ? 'Approve' : 'Reject'} Refund`}
          message={`Are you sure you want to ${refundActionData?.action} this refund request?`}
          type={refundActionData?.action === 'approve' ? 'info' : 'danger'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans">
      <SEO 
        title="IyonicPay - Borderless Payments & Financial Infrastructure" 
        description="Power your business with IyonicPay. Accept global payments, manage digital wallets, and execute instant payouts. The unified financial layer for the Iyonicorp ecosystem and beyond."
        keywords="global payments, financial infrastructure, digital wallet, merchant services, instant payouts, fintech, IyonicPay"
        canonical="https://iyonicorp.com/iyonicpay"
      />
      {/* Landing UI stays similar but modern */}
      <nav className="flex justify-between items-center px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-gray-900">IyonicPay</span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm font-black uppercase tracking-widest text-gray-400">
          <a href="#" className="hover:text-indigo-600 transition-colors">Individual</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Business</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Developers</a>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsLoginModalOpen(true)} className="px-6 py-3 font-black text-gray-900 hover:text-indigo-600 transition-colors">Log In</button>
          <button onClick={() => setIsRegisterModalOpen(true)} className="px-8 py-3 bg-gray-900 text-white font-black rounded-2xl shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95">Sign Up</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center relative">
        <div className="lg:w-3/5 mb-16 lg:mb-0 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Zap className="w-4 h-4 fill-current" />
            <span>Redefining Digital Payments</span>
          </div>
          <h1 className="text-7xl lg:text-8xl font-black text-gray-900 leading-[1] mb-10 tracking-tighter">
            Money moves <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x">smarter.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-12 max-w-xl leading-relaxed font-medium">
            The modern financial toolkit for Iyonicorp sellers and global explorers. Send, receive, and spend with absolute freedom.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            {user ? (
              !user.iyonicpayOptIn && (
                <button 
                  onClick={handleOptIn} 
                  disabled={isOptingIn}
                  className="px-10 py-5 bg-indigo-600 text-white font-black rounded-[2rem] text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isOptingIn ? 'Opting in...' : 'Opt-in to IyonicPay'}
                </button>
              )
            ) : (
              <>
                <button onClick={() => setIsRegisterModalOpen(true)} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-[2rem] text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">Get Started Now</button>
                <button onClick={() => setIsContinueModalOpen(true)} className="px-10 py-5 bg-white border-2 border-gray-100 text-gray-900 font-black rounded-[2rem] text-lg hover:border-indigo-100 transition-all flex items-center justify-center space-x-4 active:scale-95">
                  <div className="w-8 h-8 bg-indigo-600 p-1.5 rounded-xl">
                    <img src="/shopright-logo.png" alt="" className="w-full h-full object-contain" />
                  </div>
                  <span>Connect store</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lg:w-2/5 relative">
          <motion.div 
            initial={{ rotate: 12, y: 20 }}
            animate={{ rotate: 6, y: 0 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            className="relative z-10 bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] p-12 border border-gray-50 max-w-sm mx-auto"
          >
            <div className="flex justify-between items-center mb-16">
              <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div className="flex space-x-1">
                <div className="w-8 h-8 bg-gray-50 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
              </div>
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Your Balance</p>
            <h3 className="text-5xl font-black text-gray-900 mb-12 tracking-tighter">{formatPrice(24950, sellerCurrency)}</h3>
            <div className="space-y-4">
              <div className="p-5 bg-indigo-50 rounded-[2rem] flex items-center justify-between border border-indigo-100/50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <ArrowUpRight className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-black text-indigo-900">Send</span>
                </div>
                <div className="w-7 h-7 rounded-full border-4 border-indigo-200"></div>
              </div>
            </div>
          </motion.div>
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-indigo-50 rounded-full blur-[120px] -z-10"></div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-8 py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-12">Trusted by global industry leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {['Stripe', 'Paypal', 'Visa', 'Mastercard', 'ApplePay', 'GooglePay'].map((brand) => (
              <span key={brand} className="text-2xl font-black text-gray-900 tracking-tighter">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Features Grid */}
      <section className="px-8 py-32 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">Everything you need to <span className="text-indigo-600">scale</span> globally.</h2>
          <p className="text-xl text-gray-500 font-medium">A complete payment infrastructure designed for the modern internet. Built for speed, security, and global growth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Zap className="w-8 h-8" />, 
              title: 'Instant Settlements', 
              desc: 'Get your funds faster with our instant settlement network. No more waiting days for your money.',
              color: 'bg-amber-50 text-amber-600'
            },
            { 
              icon: <ShieldCheck className="w-8 h-8" />, 
              title: 'Bank-grade Security', 
              desc: 'Advanced fraud protection and end-to-end encryption for every transaction you process.',
              color: 'bg-blue-50 text-blue-600'
            },
            { 
              icon: <Globe className="w-8 h-8" />, 
              title: 'Global Payouts', 
              desc: 'Send money to over 150 countries in local currencies with the best exchange rates in the market.',
              color: 'bg-indigo-50 text-indigo-600'
            },
            { 
              icon: <Smartphone className="w-8 h-8" />, 
              title: 'Mobile First', 
              desc: 'Optimized for mobile commerce with one-tap checkout and seamless app integrations.',
              color: 'bg-purple-50 text-purple-600'
            },
            { 
              icon: <Activity className="w-8 h-8" />, 
              title: 'Real-time Analytics', 
              desc: 'Deep insights into your business performance with real-time tracking and reporting.',
              color: 'bg-green-50 text-green-600'
            },
            { 
              icon: <Code className="w-8 h-8" />, 
              title: 'Developer APIs', 
              desc: 'Robust, well-documented APIs and SDKs to integrate payments into any platform in minutes.',
              color: 'bg-gray-900 text-white'
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-10 bg-white border border-gray-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 group"
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

      {/* Developer Experience Section */}
      <section className="px-8 py-32 bg-gray-900 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-500/10 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Code className="w-4 h-4" />
              <span>Built for developers</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-tight">Powerful APIs for <span className="text-indigo-500">modern</span> builders.</h2>
            <p className="text-xl text-gray-400 font-medium mb-12 leading-relaxed">
              Integrate IyonicPay in minutes with our elegant SDKs. We handle the complexity of global payments so you can focus on building your product.
            </p>
            <div className="space-y-6">
              {[
                'Simple RESTful API with clear documentation',
                'Webhooks for real-time transaction updates',
                'Customizable checkout UI components',
                'Sandbox environment for rigorous testing'
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-gray-300 font-medium">{item}</span>
                </div>
              ))}
            </div>
            <button className="mt-12 px-10 py-5 bg-indigo-600 text-white font-black rounded-[2rem] text-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-2xl shadow-indigo-500/20">
              Read the Docs
            </button>
          </div>

          <div className="lg:w-1/2 relative">
            <div className="bg-[#0f172a] rounded-[2.5rem] p-8 shadow-2xl border border-white/5 relative z-10">
              <div className="flex items-center space-x-2 mb-8 border-b border-white/5 pb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                <span className="ml-4 text-xs font-mono text-gray-500 uppercase tracking-widest">checkout.js</span>
              </div>
              <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                <code className="text-indigo-400">
                  {`IyonicPay.initializePayment({
  apiKey: 'pk_live_...',
  amount: 2500,
  currency: 'USD',
  customer: 'customer@example.com',
  metadata: {
    order_id: '12345'
  }
}).then(result => {
  console.log('Payment success!', result);
});`}
                </code>
              </pre>
            </div>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-600/20 rounded-full blur-[100px] -z-0"></div>
          </div>
        </div>
      </section>

      {/* Global Impact Section */}
      <section className="px-8 py-32 max-w-7xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">Seamlessly <span className="text-purple-600">borderless.</span></h2>
        <p className="text-xl text-gray-500 font-medium max-w-3xl mx-auto mb-20">We're building the financial infrastructure for the world's most ambitious companies. No borders, no limits.</p>
        
        <div className="relative aspect-[21/9] bg-gray-50 rounded-[4rem] overflow-hidden border border-gray-100 group">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
            <Globe className="w-full h-full text-indigo-900 p-24" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-20">
              {[
                { label: 'Countries', value: '150+' },
                { label: 'Currencies', value: '135+' },
                { label: 'Daily Trans.', value: '1.2M+' },
                { label: 'Sellers', value: '10K+' }
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-5xl font-black text-gray-900 mb-2 tracking-tighter">{stat.value}</p>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-8 py-32">
        <div className="max-w-7xl mx-auto bg-indigo-600 rounded-[4rem] p-12 md:p-32 text-center relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-12 tracking-tighter leading-tight">Ready to join the future <br/> of payments?</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button onClick={() => setIsRegisterModalOpen(true)} className="px-12 py-6 bg-white text-indigo-600 font-black rounded-[2rem] text-xl shadow-2xl shadow-black/10 hover:bg-gray-50 transition-all active:scale-95">Create Your Account</button>
              <button onClick={() => setIsLoginModalOpen(true)} className="px-12 py-6 bg-indigo-700 text-white font-black rounded-[2rem] text-xl hover:bg-indigo-800 transition-all active:scale-95">Contact Sales</button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] -ml-48 -mb-48"></div>
        </div>
      </section>

      <footer className="px-8 py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900">IyonicPay</span>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-sm font-black uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Cookies</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
          </div>
          <p className="text-gray-400 text-xs font-bold">© 2026 IyonicPay by Iyonicorp. All rights reserved.</p>
        </div>
      </footer>

      {/* Modals */}
      {/* Full Page Auth Overlays */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row"
          >
            <div className="hidden md:flex md:w-1/2 bg-gray-900 p-12 flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-16">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-white">IyonicPay</span>
                </div>
                <h2 className="text-6xl font-black text-white leading-tight mb-8">
                  Welcome back to the <span className="text-indigo-500">future</span> of finance.
                </h2>
                <p className="text-gray-400 text-xl max-w-md font-medium">
                  Manage your global payments, track every transaction, and grow your business with bank-grade security.
                </p>
              </div>
              <div className="relative z-10 flex items-center space-x-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-500" />
                    </div>
                  ))}
                </div>
                <span className="text-gray-400 text-sm font-bold">Joined by 10,000+ sellers worldwide</span>
              </div>
              
              {/* Decorative Blobs */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
            </div>

            <div className="flex-1 flex flex-col p-8 md:p-24 relative">
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-8 right-8 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
              </button>

              <div className="max-w-md w-full mx-auto my-auto">
                <div className="mb-12">
                  <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Sign In</h3>
                  <p className="text-gray-500 font-medium">Don't have an account? <button onClick={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); }} className="text-indigo-600 font-black hover:underline">Sign up for free</button></p>
                </div>

                <form onSubmit={onLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Email Address</label>
                    <input 
                      type="email" 
                      value={loginForm.email} 
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                      placeholder="name@company.com"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Password</label>
                      <button type="button" onClick={() => { setIsLoginModalOpen(false); setIsContinueModalOpen(true); }} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:underline">Forgot?</button>
                    </div>
                    <input 
                      type="password" 
                      value={loginForm.password} 
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                      placeholder="••••••••"
                      required 
                    />
                  </div>
                  
                  {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-2xl border border-red-100">{error}</p>}

                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-lg">
                    Sign In to IyonicPay
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-gray-400">Or continue with</span></div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => { setIsLoginModalOpen(false); setIsContinueModalOpen(true); }}
                    className="w-full bg-white border-2 border-gray-100 hover:border-indigo-100 text-gray-900 font-black py-5 rounded-3xl transition-all flex items-center justify-center space-x-4 active:scale-95"
                  >
                    <div className="w-6 h-6 bg-indigo-600 p-1 rounded-lg">
                      <img src="/shopright-logo.png" alt="" className="w-full h-full object-contain" />
                    </div>
                    <span>Iyonicorp ID</span>
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {isRegisterModalOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row"
          >
            <div className="hidden md:flex md:w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-16">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-indigo-600" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-white">IyonicPay</span>
                </div>
                <h2 className="text-6xl font-black text-white leading-tight mb-8">
                  Start your global <span className="text-indigo-200">journey</span> today.
                </h2>
                <p className="text-indigo-100 text-xl max-w-md font-medium">
                  Join thousands of merchants who trust IyonicPay to power their payments across the globe.
                </p>
              </div>
              
              <div className="relative z-10 space-y-6">
                {[
                  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Bank-grade Security', desc: 'End-to-end encryption' },
                  { icon: <Globe className="w-5 h-5" />, title: 'Global Reach', desc: '150+ currencies supported' },
                  { icon: <Zap className="w-5 h-5" />, title: 'Instant Settelment', desc: 'Fast and reliable' }
                ].map((feat, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white">
                      {feat.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{feat.title}</h4>
                      <p className="text-indigo-200 text-xs">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-1/2 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48"></div>
            </div>

            <div className="flex-1 flex flex-col p-8 md:p-20 relative overflow-y-auto">
              <button 
                onClick={() => setIsRegisterModalOpen(false)}
                className="absolute top-8 right-8 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95 group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
              </button>

              <div className="max-w-xl w-full mx-auto my-auto py-12">
                <div className="mb-12">
                  <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Create Account</h3>
                  <p className="text-gray-500 font-medium">Already have an account? <button onClick={() => { setIsRegisterModalOpen(false); setIsLoginModalOpen(true); }} className="text-indigo-600 font-black hover:underline">Log in</button></p>
                </div>

                <form onSubmit={onRegister} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">First Name</label>
                      <input 
                        value={registerForm.firstName} 
                        onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                        placeholder="John"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Last Name</label>
                      <input 
                        value={registerForm.lastName} 
                        onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                        placeholder="Doe"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Username</label>
                    <div className="relative">
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 font-black">@</span>
                      <input 
                        value={registerForm.username} 
                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl pl-12 pr-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                        placeholder="username"
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Email Address</label>
                    <input 
                      type="email" 
                      value={registerForm.email} 
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                      placeholder="john@example.com"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Phone Number</label>
                      <input 
                        value={registerForm.phoneNumber} 
                        onChange={(e) => setRegisterForm({...registerForm, phoneNumber: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                        placeholder="+1 234 567 890"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Password</label>
                      <input 
                        type="password" 
                        value={registerForm.password} 
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        className="w-full bg-gray-50 border-0 rounded-3xl px-8 py-5 text-gray-900 font-black focus:ring-4 ring-indigo-50 transition-all placeholder:text-gray-300"
                        placeholder="••••••••"
                        required 
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-2xl border border-red-100">{error}</p>}

                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-200 transition-all active:scale-95 text-lg">
                    Create Free Account
                  </button>

                  <p className="text-[10px] text-gray-400 text-center px-12 leading-relaxed">
                    By clicking "Create Free Account", you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
                  </p>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Popup isOpen={isContinueModalOpen} onClose={() => setIsContinueModalOpen(false)} title="Iyonicorp Connect">
        <div className="space-y-8 py-6 text-center">
          {!confirmStoreName ? (
            <>
              <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] mx-auto flex items-center justify-center relative">
                <img src="/shopright-logo.png" alt="" className="w-14 h-14 bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-gray-900 mb-2">Connect Your Store</h4>
                <p className="text-gray-500 font-medium px-8">Sync your Iyonicorp balance and payments instantly.</p>
              </div>
              <div className="space-y-4">
                <Input 
                  placeholder="Enter Iyonicorp Email" 
                  value={iyonicorpEmail} 
                  onChange={(e) => setIyonicorpEmail(e.target.value)}
                  className="text-center rounded-[2rem] py-5"
                />
                {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                <Button 
                  onClick={handleIyonicorpContinue} 
                  isLoading={loading}
                  className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100"
                >
                  Verify Account
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-green-50 rounded-[2.5rem] mx-auto flex items-center justify-center">
                <Store className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-gray-900 mb-2">Welcome Back!</h4>
                <p className="text-gray-500 font-medium px-8">Confirm password for <span className="text-gray-900 font-black">@{username}</span></p>
              </div>
              <div className="space-y-4">
                <Input 
                  type="password"
                  placeholder="Iyonicorp Password" 
                  value={iyonicorpPassword} 
                  onChange={(e) => setIyonicorpPassword(e.target.value)}
                  className="text-center rounded-[2rem] py-5"
                />
                {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                <Button 
                  onClick={handleFinalizeIyonicorp}
                  isLoading={loading}
                  className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-green-100"
                >
                  Sync & Enter
                </Button>
              </div>
            </>
          )}
        </div>
      </Popup>

    </div>
  );
};

export default IyonicPay;
