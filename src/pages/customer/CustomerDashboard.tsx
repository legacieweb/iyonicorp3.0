import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Popup, ConfirmPopup } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { 
  ShoppingBag, 
  User, 
  Wallet, 
  LogOut, 
  Store, 
  ChevronRight, 
  Package, 
  Clock, 
  CheckCircle,
  Search,
  Settings,
  CreditCard,
  MessageSquare,
  Menu,
  X,
  MapPin,
  Upload,
  Camera,
  Plus,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { ordersAPI, api, userAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/currency';

const CustomerDashboard: React.FC = () => {
  const { user, selectStore, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile' | 'wallet'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const navigate = useNavigate();

  // Profile and Address states
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    avatar: user?.avatar || ''
  });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddressPopupOpen, setIsAddressPopupOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        avatar: user.avatar || ''
      });
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const data = await userAPI.getAddresses();
      setAddresses(data);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await userAPI.updateProfile({
        ...profileData,
        name: `${profileData.firstName} ${profileData.lastName}`.trim()
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      recipientName: formData.get('recipientName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      streetAddress: formData.get('streetAddress') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      postalCode: formData.get('postalCode') as string,
      country: formData.get('country') as string,
      isDefault: formData.get('isDefault') === 'on'
    };

    try {
      if (editingAddress) {
        await userAPI.updateAddress(editingAddress.id, data);
      } else {
        await userAPI.addAddress(data);
      }
      setIsAddressPopupOpen(false);
      setEditingAddress(null);
      fetchAddresses();
    } catch (err) {
      console.error('Failed to save address:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    try {
      await userAPI.deleteAddress(addressToDelete);
      showToast('Address deleted successfully', 'success');
      fetchAddresses();
    } catch (err) {
      console.error('Failed to delete address:', err);
      showToast('Failed to delete address', 'error');
    } finally {
      setAddressToDelete(null);
    }
  };

  // Real-time Order Tracking
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const startTracking = async (order: any) => {
    setTrackingOrder(order);
    setIsTrackingModalOpen(true);
    setIsPolling(true);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && trackingOrder) {
      interval = setInterval(async () => {
        try {
          const updatedOrder = await ordersAPI.getById(trackingOrder.id);
          setTrackingOrder(updatedOrder);
          if (updatedOrder.status === 'delivered' || updatedOrder.status === 'cancelled') {
            setIsPolling(false);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 10000); // Poll every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isPolling, trackingOrder?.id]);

  useEffect(() => {
    // If we have a specific store selected, fetch just that store's orders
    // Otherwise fetch all orders across all stores
    if (user?.sellerId) {
      if (user?.stores) {
        const store = user.stores.find(s => s.id === user.sellerId);
        setSelectedStore(store);
      }
      fetchOrders(user.sellerId);
    } else {
      fetchAllOrders();
    }
  }, [user?.sellerId, user?.stores]);

  const fetchOrders = async (sellerId: string) => {
    setLoading(true);
    try {
      const res = await ordersAPI.getBySellerId(sellerId);
      setOrders(res);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.getAll();
      setOrders(res);
    } catch (err) {
      console.error('Failed to fetch all orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = async (storeId: string) => {
    await selectStore(storeId);
    // selectStore updates user in context, which triggers the useEffect
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      case 'pending': return 'bg-orange-100 text-orange-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'refund_requested': return 'bg-amber-100 text-amber-700';
      case 'refunded': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-bold text-gray-900">My Account</span>
            </div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Customer Portal</p>
          </div>
          <button 
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'orders' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Order History</span>
          </button>
          <button
            onClick={() => { navigate('/iyonicpay'); setIsSidebarOpen(false); }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Wallet className="w-5 h-5" />
            <span>IyonicPay Wallet</span>
          </button>
          <button
            onClick={() => { navigate('/refunds'); setIsSidebarOpen(false); }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Refund Center</span>
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                 <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Welcome, {user?.firstName || user?.name}</h1>
                <h1 className="text-lg font-bold text-gray-900 sm:hidden">Welcome!</h1>
              </div>
            </div>

            {/* Store Selector */}
            {user?.stores && user.stores.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 hidden sm:inline">Shopping at:</span>
                <select
                  value={user?.sellerId || ''}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 font-bold"
                >
                  <option value="">All Stores</option>
                  {user.stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.storeName}
                    </option>
                  ))}
                </select>
                {selectedStore && (
                  <Button 
                    size="sm" 
                    className="bg-indigo-600 hover:bg-indigo-700 ml-2"
                    onClick={() => navigate(`/shop/${selectedStore.subdomain}`)}
                  >
                    Go to Shop
                  </Button>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  <Card className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    </div>
                  </Card>
                  <Card className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {orders.filter(o => o.status === 'delivered').length}
                      </p>
                    </div>
                  </Card>
                  <Card className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {orders.filter(o => o.status === 'pending' || o.status === 'processing').length}
                      </p>
                    </div>
                  </Card>
                  <Card className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Refunded</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {orders.filter(o => o.status === 'refunded').length}
                      </p>
                    </div>
                  </Card>
                  <Card className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Refund Requests</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {orders.filter(o => o.status === 'refund_requested').length}
                      </p>
                    </div>
                  </Card>
                  <Card className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(
                          orders.reduce((sum, o) => sum + parseFloat(o.total), 0), 
                          selectedStore?.storeCurrency || (orders.length > 0 ? orders[0].currency : 'USD')
                        )}
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Recent Orders */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                      Recent Orders {selectedStore ? `from ${selectedStore.storeName}` : 'from All Stores'}
                    </h2>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-indigo-600 text-sm font-bold hover:text-indigo-700"
                    >
                      View All History
                    </button>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center p-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : orders.length > 0 ? (
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {orders.slice(0, 5).map((order) => (
                              <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">#{order.id.slice(0, 8)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatPrice(parseFloat(order.total), order.currency || selectedStore?.storeCurrency || 'USD')}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                    {order.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-12 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">No orders yet</h3>
                      <p className="text-gray-500 mb-6">
                        Looks like you haven't made any purchases {selectedStore ? `in this store` : 'yet'}.
                      </p>
                      {selectedStore && (
                        <Button 
                          className="bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => navigate(`/shop/${selectedStore.subdomain}`)}
                        >
                          Start Shopping
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search orders..." 
                      className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="p-6 hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-gray-50 rounded-xl">
                              <Package className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {order.items.slice(0, 3).map((item: any, i: number) => (
                                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                    {item.productName} x{item.quantity}
                                  </span>
                                ))}
                                {order.items.length > 3 && (
                                  <span className="text-xs text-gray-400">+{order.items.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between lg:justify-end lg:space-x-8 border-t lg:border-t-0 pt-4 lg:pt-0">
                            <div className="text-right">
                              <p className="text-xs text-gray-500 font-medium uppercase">Total Amount</p>
                              <p className="text-xl font-black text-gray-900">{formatPrice(parseFloat(order.total), order.currency || selectedStore?.storeCurrency || 'USD')}</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-xl font-bold"
                                onClick={() => startTracking(order)}
                              >
                                Track Order
                              </Button>
                              {order.status === 'delivered' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-xl font-bold border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => navigate(`/refunds?orderId=${order.id}&email=${order.customerEmail}`)}
                                >
                                  Request Refund
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No orders found.</p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
                  <p className="text-gray-500">Manage your account information and shipping addresses</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Profile Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                      <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden border-2 border-indigo-100 group-hover:border-indigo-300 transition-colors">
                              {profileData.avatar ? (
                                <img src={profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-10 h-10 text-indigo-300" />
                              )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl cursor-pointer shadow-lg hover:bg-indigo-700 transition-all">
                              <Camera className="w-4 h-4" />
                              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </label>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Profile Picture</h3>
                            <p className="text-sm text-gray-500">JPG, GIF or PNG. Max size 2MB</p>
                            <button 
                              type="button"
                              onClick={() => setProfileData(prev => ({ ...prev, avatar: '' }))}
                              className="text-xs text-red-600 font-bold mt-1 hover:text-red-700"
                            >
                              Remove Avatar
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">First Name</label>
                            <input 
                              type="text" 
                              value={profileData.firstName}
                              onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Last Name</label>
                            <input 
                              type="text" 
                              value={profileData.lastName}
                              onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Email Address</label>
                            <input type="email" value={user?.email} disabled className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Phone Number</label>
                            <input 
                              type="tel" 
                              value={profileData.phoneNumber}
                              onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          disabled={profileSaving}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl shadow-lg font-bold"
                        >
                          {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                        </Button>
                      </form>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-red-500">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Danger Zone</h3>
                      <p className="text-sm text-gray-500 mb-6">Once you deactivate your account, there is no going back. Please be certain.</p>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl">
                        Deactivate Account
                      </Button>
                    </Card>
                  </div>

                  {/* Address Management */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Addresses</h3>
                      <button 
                        onClick={() => { setEditingAddress(null); setIsAddressPopupOpen(true); }}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {addresses.length > 0 ? (
                        addresses.map((addr) => (
                          <Card key={addr.id} className={`p-4 relative hover:shadow-md transition-shadow ${addr.isDefault ? 'border-2 border-indigo-500' : ''}`}>
                            {addr.isDefault && (
                              <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm uppercase">Default</span>
                            )}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="font-bold text-sm text-gray-900">{addr.name}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <p className="font-bold text-gray-900">{addr.recipientName}</p>
                              <p>{addr.streetAddress}</p>
                              <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                              <p>{addr.country}</p>
                              <p className="font-medium pt-1">{addr.phoneNumber}</p>
                            </div>
                            <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-50">
                              <button 
                                onClick={() => { setEditingAddress(addr); setIsAddressPopupOpen(true); }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => setAddressToDelete(addr.id)}
                                className="text-xs font-bold text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                          <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No addresses saved yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <ConfirmPopup
          isOpen={!!addressToDelete}
          onClose={() => setAddressToDelete(null)}
          onConfirm={handleDeleteAddress}
          title="Delete Address"
          message="Are you sure you want to delete this address? This action cannot be undone."
          type="danger"
        />

        {/* Address Modal */}
        <Popup
          isOpen={isAddressPopupOpen}
          onClose={() => { setIsAddressPopupOpen(false); setEditingAddress(null); }}
          title={editingAddress ? 'Edit Address' : 'Add New Address'}
        >
          <form onSubmit={handleAddressSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Address Name (e.g. Home)</label>
                <input name="name" defaultValue={editingAddress?.name} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recipient Name</label>
                <input name="recipientName" defaultValue={editingAddress?.recipientName} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Phone Number</label>
                <input name="phoneNumber" defaultValue={editingAddress?.phoneNumber} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Street Address</label>
                <input name="streetAddress" defaultValue={editingAddress?.streetAddress} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">City</label>
                <input name="city" defaultValue={editingAddress?.city} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">State / Province</label>
                <input name="state" defaultValue={editingAddress?.state} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Postal Code</label>
                <input name="postalCode" defaultValue={editingAddress?.postalCode} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Country</label>
                <input name="country" defaultValue={editingAddress?.country || 'USA'} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" name="isDefault" id="isDefault" defaultChecked={editingAddress?.isDefault} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="isDefault" className="text-sm font-bold text-gray-700">Set as default shipping address</label>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button type="button" variant="outline" className="flex-1 py-4 rounded-xl font-bold" onClick={() => { setIsAddressPopupOpen(false); setEditingAddress(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addressLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl shadow-lg font-bold">
                {addressLoading ? 'Saving...' : 'Save Address'}
              </Button>
            </div>
          </form>
        </Popup>

        {/* Tracking Modal */}
        <Popup
          isOpen={isTrackingModalOpen}
          onClose={() => { setIsTrackingModalOpen(false); setTrackingOrder(null); setIsPolling(false); }}
          title={`Track Order #${trackingOrder?.id?.slice(0, 8)}`}
        >
          {trackingOrder && (
            <div className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Current Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${getStatusColor(trackingOrder.status)}`}>
                    {trackingOrder.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold uppercase">Estimated Delivery</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">2-3 Business Days</p>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {[
                  { label: 'Order Placed', status: 'pending', description: 'Your order has been received' },
                  { label: 'Processing', status: 'processing', description: 'Seller is preparing your items' },
                  { label: 'Shipped', status: 'shipped', description: 'Order is on the way to you' },
                  { label: 'Delivered', status: 'delivered', description: 'Order has been delivered' }
                ].map((step, i, arr) => {
                  const statuses = arr.map(s => s.status);
                  const currentIndex = statuses.indexOf(trackingOrder.status);
                  const stepIndex = i;
                  const isCompleted = stepIndex < currentIndex || trackingOrder.status === 'delivered';
                  const isActive = stepIndex === currentIndex && trackingOrder.status !== 'delivered';
                  
                  return (
                    <div key={step.status} className="relative">
                      <div className={`absolute -left-[29px] w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-colors ${
                        isCompleted ? 'bg-green-500' : isActive ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}>
                        {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.label}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border border-dashed border-gray-200 rounded-2xl">
                <div className="flex items-center space-x-3 text-gray-500">
                  <div className="animate-pulse w-2 h-2 bg-indigo-600 rounded-full" />
                  <p className="text-xs font-medium">Tracking in real-time. Status will update automatically.</p>
                </div>
              </div>

              <Button 
                onClick={() => { setIsTrackingModalOpen(false); setTrackingOrder(null); setIsPolling(false); }}
                className="w-full bg-gray-900 hover:bg-black py-4 rounded-xl font-bold"
              >
                Close Tracking
              </Button>
            </div>
          )}
        </Popup>
      </div>
    </div>
  );
};

export default CustomerDashboard;
