import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card, Badge } from '../components/ui';
import { ordersAPI, Order } from '../services/api';
import { formatPrice } from '../utils/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  ShoppingBag,
  Calendar,
  User,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Refunds: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchId, setSearchId] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const email = searchParams.get('email');
    if (orderId && email) {
      setSearchId(orderId);
      setSearchEmail(email);
      // We can't call handleSearch directly as it expects an event
      performSearch(orderId, email);
    }
  }, [searchParams]);

  const performSearch = async (id: string, email: string) => {
    setLoading(true);
    setError('');
    setOrder(null);
    setSuccess(false);
    
    try {
      const data = await ordersAPI.search(id, email);
      setOrder(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId || !searchEmail) return;
    performSearch(searchId, searchEmail);
  };

  const handleSubmitRefund = async () => {
    if (!order || !refundReason) return;
    
    if (!isAuthenticated) {
      setError('Please login to verify your credentials and submit the refund request.');
      return;
    }

    if (user?.email !== order.customerEmail) {
      setError('You can only request refunds for orders placed with your email address.');
      return;
    }

    if (!user?.iyonicpayOptIn) {
      setError('You must activate IyonicPay before claiming a refund.');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      await ordersAPI.requestRefund(order.id, refundReason);
      setSuccess(true);
      setOrder(null);
      setSearchId('');
      setSearchEmail('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit refund request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateIyonicPay = () => {
    navigate('/iyonicpay');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-100 mb-6">
            <RotateCcw className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Refund Center</h1>
          <p className="text-gray-500 font-medium text-lg max-w-lg mx-auto">
            Easily request a refund for your orders. Secure, fast, and transparent.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!order && !success && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-8 sm:p-12 rounded-[3rem] border-none shadow-2xl shadow-gray-200/50">
                <form onSubmit={handleSearch} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Order ID</label>
                      <Input
                        placeholder="e.g. ord_123..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="h-16 px-8 rounded-2xl bg-gray-50 border-gray-100 focus:ring-indigo-600"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Email Address</label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        className="h-16 px-8 rounded-2xl bg-gray-50 border-gray-100 focus:ring-indigo-600"
                        required
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-gray-100 transition-all active:scale-95"
                  >
                    <Search className="w-6 h-6 mr-2" />
                    Search Order
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {order && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setOrder(null)}
                className="flex items-center text-gray-400 hover:text-indigo-600 font-black text-sm uppercase tracking-widest transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </button>

              <Card className="p-8 rounded-[3rem] border-none shadow-2xl shadow-gray-200/50">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                  <div>
                    <Badge variant="outline" className="mb-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-gray-200 text-gray-400">
                      Order Details
                    </Badge>
                    <h2 className="text-2xl font-black text-gray-900">Order #{order.id.slice(0, 8)}...</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-indigo-600">{formatPrice(order.total, order.currency)}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{order.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Store</p>
                        <p className="font-bold text-gray-900">{order.sellerStoreName || 'Merchant Store'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date</p>
                        <p className="font-bold text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</p>
                        <p className="font-bold text-gray-900">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verification</p>
                        <p className="font-bold text-gray-900">{order.customerEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-4">Refund Request</h3>
                  
                  {!isAuthenticated ? (
                    <div className="bg-indigo-50 rounded-[2rem] p-8 text-center border border-indigo-100">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-sm mx-auto mb-4">
                        <User className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-black text-indigo-900 mb-2">Login Required</h4>
                      <p className="text-indigo-700 font-medium mb-6">You need to sign in to verify your credentials and process the refund.</p>
                      <Button 
                        onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
                      >
                        Sign In Now
                      </Button>
                    </div>
                  ) : !user?.iyonicpayOptIn ? (
                    <div className="bg-orange-50 rounded-[2rem] p-8 text-center border border-orange-100">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-orange-600 shadow-sm mx-auto mb-4">
                        <CreditCard className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-black text-orange-900 mb-2">IyonicPay Activation Required</h4>
                      <p className="text-orange-700 font-medium mb-6">Before claiming a refund, you must activate your IyonicPay wallet to receive funds.</p>
                      <Button 
                        onClick={handleActivateIyonicPay}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95"
                      >
                        Activate IyonicPay
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-4">Reason for Refund</label>
                        <textarea
                          placeholder="Please describe why you are requesting a refund..."
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          className="w-full min-h-[120px] p-6 rounded-[2rem] bg-gray-50 border-gray-100 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all font-medium text-gray-900 placeholder:text-gray-300"
                        />
                      </div>

                      {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          {error}
                        </div>
                      )}

                      <Button
                        onClick={handleSubmitRefund}
                        loading={submitting}
                        disabled={!refundReason}
                        className="w-full h-16 rounded-2xl bg-gray-900 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-gray-100 transition-all active:scale-95"
                      >
                        Submit Refund Request
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {success && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Card className="p-12 rounded-[3rem] border-none shadow-2xl shadow-gray-200/50">
                <div className="w-24 h-24 bg-green-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-green-100 mx-auto mb-8">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Request Submitted!</h2>
                <p className="text-gray-500 font-medium text-lg mb-10 max-w-sm mx-auto">
                  Your refund request has been sent to the seller. You will receive an email confirmation shortly.
                </p>
                <Button
                  onClick={() => setSuccess(false)}
                  variant="outline"
                  className="px-12 h-16 rounded-2xl border-2 border-gray-100 text-gray-900 font-black text-lg hover:bg-gray-50 transition-all"
                >
                  Request Another Refund
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Refunds;
