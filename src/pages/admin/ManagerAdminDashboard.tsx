import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Popup, ConfirmPopup, Input, Select } from '../../components/ui';
import { 
  Users, 
  Store, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Settings,
  LogOut,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Activity,
  Database,
  Cpu,
  HardDrive,
  Bell,
  Lock,
  UserPlus,
  UserMinus,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Clock,
  Menu,
  X,
  Info
} from 'lucide-react';
import { analyticsAPI, adminAPI, User } from '../../services/api';
import { formatPrice } from '../../utils/currency';

type TabType = 'overview' | 'sellers' | 'managers' | 'users' | 'iyonicpay' | 'analytics' | 'system' | 'security';

export const ManagerAdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const { sellers, sellerManagers, refreshData } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddManagerPopupOpen, setIsAddManagerPopupOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [managerInvitations, setManagerInvitations] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [iyonicPayStats, setIyonicPayStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [withdrawalActionId, setWithdrawalActionId] = useState<string | null>(null);
  const [isIyonicPayLoading, setIsIyonicPayLoading] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [managerForm, setManagerForm] = useState({ firstName: '', lastName: '', email: '', commissionRate: '5' });
  const [isInvitingManager, setIsInvitingManager] = useState(false);
  const [userActionId, setUserActionId] = useState<string | null>(null);
  const [sellerActionId, setSellerActionId] = useState<string | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [selectedManager, setSelectedManager] = useState<any | null>(null);
  const [securitySettings, setSecuritySettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('iyonicorp-admin-security-settings') || '{"twoFactor":true,"ipWhitelist":false,"sessionTimeout":"30"}');
    } catch {
      return { twoFactor: true, ipWhitelist: false, sessionTimeout: '30' };
    }
  });

  useEffect(() => {
    analyticsAPI.getAdminStats().then(setStats);
    adminAPI.getActivities().then(setActivities);
  }, [sellers]);

  const fetchActivities = () => {
    adminAPI.getActivities().then(setActivities);
  };

  const fetchSystemStats = () => {
    adminAPI.getSystemStats().then(setSystemStats);
  };

  const fetchSecurityEvents = () => {
    adminAPI.getSecurityEvents().then(setSecurityEvents);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'iyonicpay') {
      fetchIyonicPayData();
    } else if (activeTab === 'system') {
      fetchSystemStats();
    } else if (activeTab === 'security') {
      fetchSecurityEvents();
    }
  }, [activeTab]);

  const fetchIyonicPayData = async () => {
    setIsIyonicPayLoading(true);
    try {
      const [statsData, transData, withData, walletData] = await Promise.all([
        adminAPI.getIyonicPayStats(),
        adminAPI.getAllTransactions(),
        adminAPI.getAllWithdrawals(),
        adminAPI.getAllWallets()
      ]);
      setIyonicPayStats(statsData);
      setTransactions(transData);
      setWithdrawals(withData);
      setWallets(walletData);
    } catch (error) {
      console.error('Failed to fetch IyonicPay data:', error);
    } finally {
      setIsIyonicPayLoading(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, status: 'completed' | 'failed') => {
    if (withdrawalActionId) return;
    setWithdrawalActionId(id);
    try {
      await adminAPI.updateWithdrawalStatus(id, status);
      setWithdrawals(withdrawals.map(w => w.id === id ? { ...w, status } : w));
      showToast(`Withdrawal marked as ${status}`, 'success');
      // Refresh stats, transactions, and activities
      fetchIyonicPayData();
      fetchActivities();
    } catch (error) {
      showToast('Failed to update withdrawal status', 'error');
    } finally {
      setWithdrawalActionId(null);
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const [data, invitations] = await Promise.all([adminAPI.getAllUsers(), adminAPI.getManagerInvitations()]);
      setUsers(data);
      setManagerInvitations(invitations);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to fetch users', 'error');
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await adminAPI.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      showToast('User deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete user', 'error');
    } finally {
      setConfirmDeleteUserId(null);
    }
  };

  const handleToggleSuspension = async (id: string) => {
    if (userActionId) return;
    setUserActionId(id);
    try {
      const result = await adminAPI.toggleUserSuspension(id);
      setUsers(users.map(u => u.id === id ? { ...u, isSuspended: result.isSuspended } : u));
      const statusMessage = result.isSuspended ? 'User suspended' : 'User restored';
      showToast(result.emailSent ? `${statusMessage}. Email sent.` : `${statusMessage}, but the email could not be delivered.`, result.emailSent ? 'success' : 'error');
    } catch (error) {
      showToast('Failed to update suspension status', 'error');
    } finally {
      setUserActionId(null);
    }
  };

  const handleInviteManager = async () => {
    if (!managerForm.firstName.trim() || !managerForm.lastName.trim() || !managerForm.email.trim()) {
      showToast('Enter the manager first name, last name, and email', 'warning');
      return;
    }
    setIsInvitingManager(true);
    try {
      await adminAPI.inviteManager({ firstName: managerForm.firstName, lastName: managerForm.lastName, email: managerForm.email, commissionRate: Number(managerForm.commissionRate) });
      showToast('Invitation email sent successfully', 'success');
      setManagerForm({ firstName: '', lastName: '', email: '', commissionRate: '5' });
      setIsAddManagerPopupOpen(false);
      await refreshData();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Failed to send manager invitation', 'error');
    } finally {
      setIsInvitingManager(false);
    }
  };

  const handleDeleteSeller = async (id: string) => {
    if (!window.confirm('Delete this seller and its store data?')) return;
    if (sellerActionId) return;
    setSellerActionId(id);
    try {
      await adminAPI.deleteSeller(id);
      showToast('Seller deleted successfully', 'success');
      await refreshData();
    } catch {
      showToast('Failed to delete seller', 'error');
    } finally {
      setSellerActionId(null);
    }
  };

  const handleEditSeller = async (seller: any) => {
    const storeName = window.prompt('Store name', seller.storeName);
    if (!storeName || storeName.trim() === seller.storeName) return;
    setSellerActionId(seller.id);
    try {
      await adminAPI.updateSeller(seller.id, { storeName: storeName.trim() });
      showToast('Seller updated successfully', 'success');
      await refreshData();
    } catch {
      showToast('Failed to update seller', 'error');
    } finally {
      setSellerActionId(null);
    }
  };

  const saveSecuritySettings = (updates: any) => {
    const nextSettings = { ...securitySettings, ...updates };
    setSecuritySettings(nextSettings);
    localStorage.setItem('iyonicorp-admin-security-settings', JSON.stringify(nextSettings));
    showToast('Security settings saved', 'success');
  };

  const totalRevenue = sellers.reduce((sum, s) => sum + (s.stats?.totalRevenue || 0), 0);
  const totalOrders = sellers.reduce((sum, s) => sum + (s.stats?.totalOrders || 0), 0);
  const totalProducts = sellers.reduce((sum, s) => sum + (s.stats?.totalProducts || 0), 0);
  const totalCustomers = sellers.reduce((sum, s) => sum + (s.stats?.totalCustomers || 0), 0);
  
  const CURRENCY_RATES_TO_USD: Record<string, number> = { 'USD': 1, 'KES': 125, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1500, 'GHS': 13 };
  const convertToUSD = (amount: number, currency?: string) => (amount || 0) / (CURRENCY_RATES_TO_USD[(currency || 'USD').toUpperCase()] || 1);
  const totalRevenueUSD = sellers.reduce((sum, s) => sum + convertToUSD(s.stats?.totalRevenue || 0, s.currency), 0);

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = seller.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || seller.subscription?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success',
      suspended: 'danger',
      cancelled: 'warning',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, 'info' | 'purple' | 'success'> = {
      starter: 'info',
      professional: 'purple',
      enterprise: 'success',
    };
    return <Badge variant={variants[plan] || 'default'}>{plan}</Badge>;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'sellers', label: 'All Sellers', icon: <Store className="w-5 h-5" /> },
    { id: 'managers', label: 'Seller Managers', icon: <Users className="w-5 h-5" /> },
    { id: 'iyonicpay', label: 'IyonicPay', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'system', label: 'System', icon: <Activity className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center space-x-3">
          <Menu 
            className="w-6 h-6 text-gray-600 cursor-pointer" 
            onClick={() => setSidebarOpen(true)}
          />
          <span className="font-bold text-gray-900">Iyonicorp Admin</span>
        </div>
        <Bell className="w-5 h-5 text-gray-400" />
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 pt-16 lg:pt-0`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm">
              <img src="/iyonicorp logo.png" alt="Iyonicorp" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Iyonicorp</h1>
              <p className="text-xs text-gray-500">Admin Control</p>
            </div>
          </div>
          <X 
            className="lg:hidden w-5 h-5 text-gray-400 cursor-pointer" 
            onClick={() => setSidebarOpen(false)}
          />
        </div>
        
        <nav className="p-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Admin control center</p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">Platform overview</h2>
              <p className="mt-2 text-gray-500">A live pulse check across stores, customers, orders, and revenue.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Revenue in USD', value: `$${Number(totalRevenueUSD || 0).toFixed(2)}`, detail: 'Across all stores', icon: DollarSign, iconClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
                { label: 'Active sellers', value: sellers.filter(s => s.subscription?.status === 'active').length, detail: `${sellers.length} total sellers`, icon: Store, iconClass: 'text-blue-600', bgClass: 'bg-blue-50' },
                { label: 'Orders processed', value: totalOrders.toLocaleString(), detail: 'Across all stores', icon: Activity, iconClass: 'text-violet-600', bgClass: 'bg-violet-50' },
                { label: 'Products listed', value: totalProducts.toLocaleString(), detail: 'Catalog coverage', icon: Database, iconClass: 'text-amber-600', bgClass: 'bg-amber-50' },
                { label: 'Customers reached', value: totalCustomers.toLocaleString(), detail: `${sellerManagers.length} seller managers`, icon: Users, iconClass: 'text-rose-600', bgClass: 'bg-rose-50' },
              ].map(({ label, value, detail, icon: Icon, iconClass, bgClass }) => (
                <Card key={label} className="relative overflow-hidden">
                  <div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${bgClass}`} />
                  <div className="relative"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500">{label}</p><Icon className={`h-5 w-5 ${iconClass}`} /></div><p className="mt-4 text-2xl font-bold text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2"><CardHeader title="Platform health" subtitle="Signals from the admin services" /><div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Service availability', value: '99.9%', status: 'Operational', icon: CheckCircle, iconClass: 'text-emerald-600', statusClass: 'text-emerald-600' },
                  { label: 'Active subscriptions', value: sellers.filter(s => s.subscription?.status === 'active').length, status: 'Billing current', icon: CreditCard, iconClass: 'text-blue-600', statusClass: 'text-blue-600' },
                  { label: 'Security posture', value: securitySettings.twoFactor ? 'Protected' : 'Review', status: securitySettings.twoFactor ? '2FA enabled' : '2FA disabled', icon: Shield, iconClass: securitySettings.twoFactor ? 'text-emerald-600' : 'text-amber-600', statusClass: securitySettings.twoFactor ? 'text-emerald-600' : 'text-amber-600' },
                ].map(({ label, value, status, icon: Icon, iconClass, statusClass }) => <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><Icon className={`h-5 w-5 ${iconClass}`} /><p className="mt-4 text-xl font-bold text-gray-900">{value}</p><p className="mt-1 text-sm font-medium text-gray-700">{label}</p><p className={`mt-1 text-xs ${statusClass}`}>{status}</p></div>)}
              </div></Card>
              <Card><CardHeader title="Operational snapshot" subtitle="Current workload" /><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-sm text-gray-500">Managers</span><span className="font-semibold text-gray-900">{sellerManagers.length}</span></div><div className="flex items-center justify-between"><span className="text-sm text-gray-500">Stores needing review</span><span className="font-semibold text-amber-600">{sellers.filter(s => s.subscription?.status !== 'active').length}</span></div><div className="flex items-center justify-between"><span className="text-sm text-gray-500">Platform revenue</span><span className="font-semibold text-gray-900">${Number(stats?.totalPlatformRevenueUsd || totalRevenueUSD || 0).toFixed(2)}</span></div><div className="border-t border-gray-100 pt-4"><p className="text-xs text-gray-500">Last activity sync</p><p className="mt-1 text-sm font-medium text-gray-900">{activities.length ? 'Up to date' : 'Waiting for events'}</p></div></div></Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5"><Card className="xl:col-span-3"><CardHeader title="Recent activity" subtitle="Latest platform events" action={<Button variant="ghost" size="sm" onClick={fetchActivities}>Refresh</Button>} /><div className="space-y-3">{activities.length > 0 ? activities.slice(0, 5).map((activity: any, index: number) => { const action = String(activity.action || ''); const Icon = action.includes('error') || action.includes('failed') ? AlertTriangle : action.includes('payment') || action.includes('withdrawal') ? DollarSign : action.includes('created') || action.includes('registered') ? UserPlus : Activity; return <button key={activity.id || index} onClick={() => setSelectedActivity(activity)} className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-gray-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50"><Icon className="h-4 w-4 text-blue-600" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-gray-900">{activity.description || action}</span><span className="mt-1 block text-xs text-gray-500">{activity.userEmail || activity.user_name || 'System'} · {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Recently'}</span></span><Info className="mt-1 h-4 w-4 shrink-0 text-gray-400" /></button>; }) : <p className="py-4 text-sm text-gray-500">No recent activity.</p>}</div></Card><Card className="xl:col-span-2"><CardHeader title="Quick tools" subtitle="Jump into common admin workflows" /><div className="grid grid-cols-2 gap-3"><Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setIsAddManagerPopupOpen(true)}><UserPlus className="h-5 w-5" /><span>Invite manager</span></Button><Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setActiveTab('sellers')}><Store className="h-5 w-5" /><span>Review sellers</span></Button><Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setActiveTab('analytics')}><BarChart3 className="h-5 w-5" /><span>Open analytics</span></Button><Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setActiveTab('system')}><Settings className="h-5 w-5" /><span>System settings</span></Button></div></Card></div>
          </div>
        )}

        {/* IyonicPay Tab */}
        {activeTab === 'iyonicpay' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">IyonicPay Administration</h2>
                <p className="text-gray-500">Monitor transactions and manage withdrawals (values shown in seller currency)</p>
              </div>
              <Button onClick={fetchIyonicPayData} variant="outline" leftIcon={<Activity className="w-5 h-5" />}>
                Refresh Data
              </Button>
            </div>

            {/* IyonicPay Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Volume (USD)</p>
                    <p className="text-2xl font-bold text-gray-900">${Number(iyonicPayStats?.totalVolume || 0).toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Balances (USD)</p>
                    <p className="text-2xl font-bold text-gray-900">${Number(iyonicPayStats?.totalWalletBalances || 0).toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Wallets</p>
                    <p className="text-2xl font-bold text-gray-900">{iyonicPayStats?.totalWallets || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending Withdrawals</p>
                    <p className="text-2xl font-bold text-orange-600">{iyonicPayStats?.pendingWithdrawals || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Withdrawal Requests */}
              <Card title="Withdrawal Requests" padding="none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payout Details</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">No withdrawal requests found</TableCell>
                      </TableRow>
                    ) : (
                      withdrawals.map((w) => {
                        const bankDetails = w.bankDetails || {};
                        const method = bankDetails.method || 'bank';
                        const isMobileWallet = method === 'mobile_wallet';
                        const walletCurrency = (bankDetails.walletCurrency || 'USD').toUpperCase();
                        const requestedCurrency = (bankDetails.requestedCurrency || walletCurrency).toUpperCase();
                        return (
                         <TableRow key={w.id}>
                           <TableCell>
                             <div>
                               <p className="font-medium text-gray-900">{w.userName}</p>
                               <p className="text-xs text-gray-500">@{w.userUsername || 'N/A'}</p>
                               <p className="text-xs text-gray-400">{w.userEmail}</p>
                             </div>
                           </TableCell>
                            <TableCell className="font-bold text-gray-900">
                              <div>
                                <p>{formatPrice(Number(w.amount), walletCurrency)}</p>
                                {walletCurrency !== requestedCurrency && bankDetails.requestedAmount && (
                                  <p className="text-xs text-gray-500">
                                    ≈ {formatPrice(Number(bankDetails.requestedAmount), requestedCurrency)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">≈ {formatPrice(Number(w.usdAmount), 'USD')}</p>
                              </div>
                            </TableCell>
                           <TableCell>
                             <div className="text-sm">
                               <div className="flex items-center gap-2 mb-1">
                                 <Badge variant={isMobileWallet ? 'info' : 'success'} className="text-xs">
                                   {isMobileWallet ? 'Mobile Wallet' : 'Bank Transfer'}
                                 </Badge>
                                 {bankDetails.country && <span className="text-xs text-gray-400">{bankDetails.country}</span>}
                               </div>
                               {isMobileWallet ? (
                                 <>
                                   <p className="font-medium text-gray-900">{bankDetails.walletProvider || 'N/A'}</p>
                                   <p className="text-gray-500">{bankDetails.walletNumber || 'N/A'}</p>
                                   <p className="text-gray-400 text-xs">{bankDetails.accountName || 'N/A'}</p>
                                 </>
                               ) : (
                                 <>
                                   <p className="font-medium text-gray-900">{bankDetails.bankName || 'N/A'}</p>
                                   <p className="text-gray-500">{bankDetails.accountNo || 'N/A'}</p>
                                   <p className="text-gray-400 text-xs">{bankDetails.accountName || 'N/A'}</p>
                                 </>
                               )}
                             </div>
                           </TableCell>
                           <TableCell>
                             {new Date(w.createdAt).toLocaleString()}
                           </TableCell>
                           <TableCell>
                             <Badge variant={w.status === 'completed' ? 'success' : w.status === 'pending' ? 'warning' : 'danger'}>
                               {w.status}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             {w.status === 'pending' && (
                               <div className="flex items-center space-x-2">
                                 <Button 
                                   size="sm" 
                                   className="bg-green-600 hover:bg-green-700 text-white"
                                   onClick={() => handleUpdateWithdrawalStatus(w.id, 'completed')}
                                   disabled={withdrawalActionId === w.id}
                                 >
                                   {withdrawalActionId === w.id ? 'Processing...' : 'Approve'}
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="outline" 
                                   className="text-red-600 border-red-200 hover:bg-red-50"
                                   onClick={() => handleUpdateWithdrawalStatus(w.id, 'failed')}
                                   disabled={withdrawalActionId === w.id}
                                 >
                                   {withdrawalActionId === w.id ? 'Processing...' : 'Reject'}
                                 </Button>
                               </div>
                             )}
                           </TableCell>
                         </TableRow>
                       )})
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Recent Transactions */}
              <Card title="Platform Transactions" padding="none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">No transactions found</TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {t.type === 'send' || t.type === 'withdrawal' ? (
                                <ArrowUpRight className="w-4 h-4 text-red-500" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4 text-green-500" />
                              )}
                              <span className="capitalize text-sm font-medium">{t.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-gray-900">${Number(t.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="text-xs text-gray-500">
                              {t.senderEmail && <p>From: {t.senderEmail}</p>}
                              {t.receiverEmail && <p>To: {t.receiverEmail}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.status === 'completed' ? 'success' : t.status === 'pending' ? 'warning' : 'danger'}>
                              {t.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <Card title="Wallet Directory" padding="none" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Wallet Currency</TableHead>
                    <TableHead>Native Balance</TableHead>
                    <TableHead>USD Balance</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No wallets found</TableCell></TableRow>
                  ) : wallets.map(wallet => (
                    <TableRow key={wallet.id}>
                      <TableCell className="font-medium text-gray-900">{wallet.userName || 'Unknown user'}</TableCell>
                      <TableCell className="text-gray-500">{wallet.userEmail || 'N/A'}</TableCell>
                      <TableCell><Badge variant="info">{wallet.userRole || 'user'}</Badge></TableCell>
                      <TableCell>{wallet.currency || 'USD'}</TableCell>
                      <TableCell>{Number(wallet.nativeBalance || 0).toFixed(2)} {wallet.currency || 'USD'}</TableCell>
                      <TableCell className="font-semibold">${Number(wallet.usdBalance || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-gray-500">{wallet.updatedAt ? new Date(wallet.updatedAt).toLocaleString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* All Sellers Tab */}
        {activeTab === 'sellers' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">All Sellers</h2>
                <p className="text-gray-500">Manage all platform sellers</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" leftIcon={<Filter className="w-5 h-5" />}>
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search sellers..."
                    leftIcon={<Search className="w-5 h-5" />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-40"
                />
                <Select
                  options={[
                    { value: 'all', label: 'All Plans' },
                    { value: 'starter', label: 'Starter' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'enterprise', label: 'Enterprise' },
                  ]}
                  className="w-40"
                />
              </div>
            </Card>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSellers.map(seller => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{seller.storeName}</p>
                          <p className="text-sm text-gray-500">{seller.subdomain}.iyonicorp.com</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{seller.ownerName || 'Owner Name'}</p>
                          <p className="text-sm text-gray-500">{seller.ownerEmail || 'owner@example.com'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(seller.subscription.plan)}</TableCell>
                      <TableCell>{seller.stats.totalProducts}</TableCell>
                      <TableCell>{seller.stats.totalOrders}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">${(seller.stats?.totalRevenue || 0).toFixed(2)} {seller.currency || 'USD'}</span>
                          <p className="text-xs text-gray-500">${convertToUSD(seller.stats?.totalRevenue || 0, seller.currency).toFixed(2)} USD</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(seller.subscription?.status || 'active')}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <a 
                            href={`#/shop/${seller.subdomain}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Shop"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => setSelectedSeller(seller)} title="Manage seller" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditSeller(seller)} disabled={sellerActionId === seller.id} title="Edit seller" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteSeller(seller.id)} disabled={sellerActionId === seller.id} title="Delete seller" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Seller Managers Tab */}
        {activeTab === 'managers' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Seller Managers</h2>
                <p className="text-gray-500">Manage platform managers</p>
              </div>
              <Button leftIcon={<UserPlus className="w-5 h-5" />} onClick={() => setIsAddManagerPopupOpen(true)}>
                Add Manager
              </Button>
            </div>

            <Card title="Pending Manager Invitations" className="mb-6" padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerInvitations.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-gray-500">No pending invitations</TableCell></TableRow>
                  ) : managerInvitations.map(invitation => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium text-gray-900">{invitation.firstName} {invitation.lastName}</TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{(Number(invitation.commissionRate || 0) * 100).toFixed(0)}%</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(invitation.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-gray-500">{new Date(invitation.expiresAt).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="warning">Pending</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Managed Sellers</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellerManagers.map(manager => (
                    <TableRow key={manager.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                            <img src="/logo.png" alt="Iyonicorp" className="w-7 h-7 object-contain" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{(manager as any).name || 'Manager Name'}</p>
                            <p className="text-sm text-gray-500">ID: {manager.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{(manager as any).email || 'manager@example.com'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{manager.stats.totalSellers}</p>
                          <p className="text-sm text-gray-500">{manager.stats.activeSellers} active</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${Number(manager.stats.totalRevenue || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">${Number(manager.stats.totalCommission || 0).toFixed(2)}</p>
                          <p className="text-sm text-gray-500">{(manager.commission * 100).toFixed(0)}% rate</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => setSelectedManager(manager)} title="Open manager tools" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setSelectedManager(manager)} title="Edit manager settings" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">User Management</h2>
                <p className="text-gray-500">Manage all platform users, suspend or delete accounts</p>
              </div>
              <Button leftIcon={<Search className="w-5 h-5" />} onClick={fetchUsers} variant="outline">
                Refresh Users
              </Button>
            </div>

            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isUsersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">No users found</TableCell>
                    </TableRow>
                  ) : users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.name}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" className="capitalize">{(u.role || '').replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {u.isSuspended ? (
                          <Badge variant="danger">Suspended</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleToggleSuspension(u.id)}
                            disabled={userActionId === u.id}
                            className={`p-2 rounded-lg transition-colors ${u.isSuspended ? 'text-green-600 hover:bg-green-50' : 'text-yellow-600 hover:bg-yellow-50'}`}
                            title={u.isSuspended ? 'Unsuspend' : 'Suspend'}
                          >
                            {userActionId === u.id ? <Activity className="w-5 h-5 animate-spin" /> : u.isSuspended ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteUserId(u.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Platform Analytics</h2>
              <p className="text-gray-500">Comprehensive platform insights (revenue values shown in seller's original currency)</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader title="Revenue Distribution" subtitle="By subscription plan (USD)" />
                <div className="space-y-4">
                  {['starter', 'professional', 'enterprise'].map(plan => {
                    const planSellers = sellers.filter(s => s.subscription.plan === plan);
                    const planRevenue = planSellers.reduce((sum, s) => sum + convertToUSD(s.stats?.totalRevenue || 0, s.currency), 0);
                    const percentage = totalRevenueUSD > 0 ? (planRevenue / totalRevenueUSD) * 100 : 0;
                    return (
                      <div key={plan} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getPlanBadge(plan)}
                          <span className="text-gray-600">{planSellers.length} sellers</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                plan === 'starter' ? 'bg-blue-500' :
                                plan === 'professional' ? 'bg-purple-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="font-medium text-gray-900 w-20 text-right">${Number(planRevenue || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <CardHeader title="Top Performing Sellers" subtitle="By revenue (USD converted)" />
                <div className="space-y-4">
                  {sellers
                    .map(s => ({...s, revenueUSD: convertToUSD(s.stats?.totalRevenue || 0, s.currency)}))
                    .sort((a, b) => b.revenueUSD - a.revenueUSD)
                    .slice(0, 5)
                    .map((seller, index) => (
                      <div key={seller.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{seller.storeName}</p>
                            <p className="text-sm text-gray-500">{seller.stats.totalOrders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-gray-900">${Number(seller.revenueUSD || 0).toFixed(2)}</span>
                          <p className="text-xs text-gray-500">${Number(seller.stats.totalRevenue || 0).toFixed(2)} {seller.currency || 'USD'}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            <Card>
              <CardHeader title="Platform Statistics" subtitle="Overall metrics" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
                  <p className="text-sm text-gray-500">Total Products</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
                  <p className="text-sm text-gray-500">Total Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">${(sellers.length > 0 ? totalRevenueUSD / sellers.length : 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Avg Revenue/Seller (USD)</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">System Management</h2>
                <p className="text-gray-500">Monitor and manage platform infrastructure</p>
              </div>
              <Button onClick={fetchSystemStats} variant="outline" leftIcon={<Activity className="w-5 h-5" />}>
                Refresh Stats
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader title="Platform Storage" subtitle="Database and uploaded files" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3"><HardDrive className="w-5 h-5 text-gray-400" /><span className="text-gray-600">Total platform storage</span></div>
                    <span className="font-semibold text-gray-900">{((systemStats?.platformStorageBytes || 0) / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3"><Database className="w-5 h-5 text-gray-400" /><span className="text-gray-600">Database storage</span></div>
                    <span className="font-semibold text-gray-900">{((systemStats?.databaseStorageBytes || 0) / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3"><HardDrive className="w-5 h-5 text-gray-400" /><span className="text-gray-600">Uploaded files</span></div>
                    <span className="font-semibold text-gray-900">{((systemStats?.uploadedStorageBytes || 0) / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Platform Stats" subtitle="System-wide metrics" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{systemStats?.totalUsers ?? 0}</p>
                    <p className="text-xs text-gray-500">Total Users</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{systemStats?.totalSellers ?? 0}</p>
                    <p className="text-xs text-gray-500">Total Sellers</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{systemStats?.totalOrders ?? 0}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{systemStats?.activeBots ?? 0}</p>
                    <p className="text-xs text-gray-500">Active Bots</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{systemStats?.totalWallets ?? 0}</p>
                    <p className="text-xs text-gray-500">Wallets</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">${Number(systemStats?.totalWalletBalance || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Wallet Balance</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <CardHeader title="Recent Sellers" subtitle="Newly registered stores" />
              <div className="space-y-3">
                {systemStats?.recent_sellers && systemStats.recent_sellers.length > 0 ? systemStats.recent_sellers.map((seller: any) => (
                  <div key={seller.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">{seller.store_name}</p>
                      <p className="text-sm text-gray-500">{seller.subdomain}.iyonicorp.com</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">{seller.total_products} products</span>
                      <Badge variant={seller.is_live ? 'success' : 'warning'}>
                        {seller.is_live ? 'Live' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No recent sellers</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Security</h2>
                <p className="text-gray-500">Platform security and access control</p>
              </div>
              <Button onClick={fetchSecurityEvents} variant="outline" leftIcon={<Activity className="w-5 h-5" />}>
                Refresh Events
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Security Settings" subtitle="Platform security options" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                    </div>
                    <input type="checkbox" checked={securitySettings.twoFactor} onChange={(e) => saveSecuritySettings({ twoFactor: e.target.checked })} className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">IP Whitelisting</p>
                      <p className="text-sm text-gray-500">Restrict admin access to specific IPs</p>
                    </div>
                    <input type="checkbox" checked={securitySettings.ipWhitelist} onChange={(e) => saveSecuritySettings({ ipWhitelist: e.target.checked })} className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Session Timeout</p>
                      <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                    </div>
                    <Select
                      options={[
                        { value: '15', label: '15 minutes' },
                        { value: '30', label: '30 minutes' },
                        { value: '60', label: '1 hour' },
                      ]}
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => saveSecuritySettings({ sessionTimeout: e.target.value })}
                      className="w-32"
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Recent Security Events" subtitle="Security audit log" />
                <div className="space-y-3">
                  {securityEvents && securityEvents.length > 0 ? securityEvents.map((event: any, index: number) => (
                    <div key={event.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.description}</p>
                        <p className="text-sm text-gray-500">{event.user_name || event.userEmail || 'Unknown user'} • {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Recently'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={event.severity === 'warning' || event.severity === 'error' ? 'warning' : 'info'}>
                          {event.severity}
                        </Badge>
                        <button
                          onClick={() => setSelectedActivity(event)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="View details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">No security events recorded</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Settings view intentionally removed from the admin navigation. */}
        {false && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Platform Settings</h2>
              <p className="text-gray-500">Configure global platform settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="General Settings" subtitle="Basic platform configuration" />
                <div className="space-y-4">
                  <Input label="Platform Name" defaultValue="Iyonicorp" />
                  <Input label="Support Email" defaultValue="support@iyonicorp.com" />
                  <Input label="Default Currency" defaultValue="USD" />
                  <Select
                    label="Timezone"
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'America/New_York', label: 'Eastern Time' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time' },
                      { value: 'Europe/London', label: 'London' },
                    ]}
                    defaultValue="UTC"
                  />
                  <Button>Save Settings</Button>
                </div>
              </Card>

              <Card>
                <CardHeader title="Notification Settings" subtitle="Global notification preferences" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Send email alerts for important events</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Slack Integration</p>
                      <p className="text-sm text-gray-500">Post alerts to Slack channel</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">SMS Alerts</p>
                      <p className="text-sm text-gray-500">Critical alerts via SMS</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Add Manager Popup */}
      <Popup
        isOpen={isAddManagerPopupOpen}
        onClose={() => setIsAddManagerPopupOpen(false)}
        title="Add New Manager"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" placeholder="Enter first name" value={managerForm.firstName} onChange={(e) => setManagerForm({ ...managerForm, firstName: e.target.value })} />
            <Input label="Last Name" placeholder="Enter last name" value={managerForm.lastName} onChange={(e) => setManagerForm({ ...managerForm, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" placeholder="manager@example.com" value={managerForm.email} onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })} />
          <Input label="Commission Rate" type="number" placeholder="5" helperText="Percentage of seller revenue" value={managerForm.commissionRate} onChange={(e) => setManagerForm({ ...managerForm, commissionRate: e.target.value })} />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddManagerPopupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteManager} disabled={isInvitingManager}>
              {isInvitingManager ? 'Sending invitation...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </Popup>

      <ConfirmPopup
        isOpen={!!confirmDeleteUserId}
        onClose={() => setConfirmDeleteUserId(null)}
        onConfirm={() => { if (confirmDeleteUserId) handleDeleteUser(confirmDeleteUserId); }}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone and all associated data will be removed."
        confirmText="Delete User"
        variant="danger"
      />

      <Popup
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
        title={selectedSeller ? `Manage ${selectedSeller.storeName}` : 'Manage Seller'}
      >
        {selectedSeller && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold">{selectedSeller.stats?.totalProducts || 0}</p><p className="text-xs text-gray-500">Products</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold">{selectedSeller.stats?.totalOrders || 0}</p><p className="text-xs text-gray-500">Orders</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xl font-bold">{selectedSeller.stats?.totalCustomers || 0}</p><p className="text-xs text-gray-500">Customers</p></div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(`#/shop/${selectedSeller.subdomain}`, '_blank')} leftIcon={<ExternalLink className="w-4 h-4" />}>Open Store</Button>
              <Button variant="outline" onClick={() => { setSelectedSeller(null); handleEditSeller(selectedSeller); }} leftIcon={<Edit className="w-4 h-4" />}>Edit Store</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => { setSelectedSeller(null); handleDeleteSeller(selectedSeller.id); }} leftIcon={<Trash2 className="w-4 h-4" />}>Delete Store</Button>
            </div>
          </div>
        )}
      </Popup>

      <Popup
        isOpen={!!selectedManager}
        onClose={() => setSelectedManager(null)}
        title={selectedManager ? `${selectedManager.displayName || selectedManager.name || 'Manager'} tools` : 'Manager tools'}
        size="lg"
      >
        {selectedManager && (() => {
          const managerSellers = sellers.filter(seller => seller.managerId === selectedManager.id);
          return (
            <div className="space-y-5">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">{selectedManager.displayName || selectedManager.name || 'Seller manager'}</p>
                <p className="mt-1 text-sm text-blue-700">{selectedManager.email || selectedManager.slug || 'Manager account'}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold text-gray-900">{selectedManager.stats?.totalSellers || managerSellers.length}</p><p className="text-xs text-gray-500">Managed sellers</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold text-gray-900">{selectedManager.stats?.activeSellers || managerSellers.filter(s => s.subscription?.status === 'active').length}</p><p className="text-xs text-gray-500">Active stores</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold text-gray-900">${Number(selectedManager.stats?.totalRevenue || 0).toFixed(2)}</p><p className="text-xs text-gray-500">Revenue</p></div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">Assigned stores</p>
                {managerSellers.length ? <div className="space-y-2">{managerSellers.slice(0, 5).map(seller => <div key={seller.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3"><span className="text-sm font-medium text-gray-900">{seller.storeName}</span>{getStatusBadge(seller.subscription?.status || 'active')}</div>)}</div> : <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No stores are currently assigned to this manager.</p>}
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
                <Button variant="outline" onClick={() => { setSelectedManager(null); setActiveTab('sellers'); }}>View sellers</Button>
                <Button onClick={() => { setSelectedManager(null); setIsAddManagerPopupOpen(true); }}>Invite another manager</Button>
              </div>
            </div>
          );
        })()}
      </Popup>

      {/* Activity Details Popup */}
      <Popup
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title="Activity Details"
      >
        {selectedActivity && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Action</label>
              <p className="text-sm text-gray-900 mt-1">{selectedActivity.action}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
              <p className="text-sm text-gray-900 mt-1">{selectedActivity.description}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">User</label>
              <p className="text-sm text-gray-900 mt-1">{selectedActivity.user_name || selectedActivity.userEmail || 'Unknown user'}</p>
            </div>
            {selectedActivity.userEmail && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">User Email</label>
                <p className="text-sm text-gray-900 mt-1">{selectedActivity.userEmail}</p>
              </div>
            )}
            {selectedActivity.entityType && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Entity Type</label>
                <p className="text-sm text-gray-900 mt-1 capitalize">{selectedActivity.entityType}</p>
              </div>
            )}
            {selectedActivity.severity && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Severity</label>
                <Badge variant={selectedActivity.severity === 'warning' || selectedActivity.severity === 'error' ? 'warning' : 'info'} className="mt-1">
                  {selectedActivity.severity}
                </Badge>
              </div>
            )}
            {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Metadata</label>
                <pre className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(selectedActivity.metadata, null, 2)}
                </pre>
              </div>
            )}
            {selectedActivity.createdAt && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Timestamp</label>
                <p className="text-sm text-gray-900 mt-1">{new Date(selectedActivity.createdAt).toLocaleString()}</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setSelectedActivity(null)}>Close</Button>
            </div>
          </div>
        )}
      </Popup>
    </div>
  );
};
