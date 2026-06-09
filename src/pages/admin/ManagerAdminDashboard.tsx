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
  Globe,
  Database,
  Cpu,
  HardDrive,
  Wifi,
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
  X
} from 'lucide-react';
import { analyticsAPI, adminAPI, User } from '../../services/api';

type TabType = 'overview' | 'sellers' | 'managers' | 'users' | 'iyonicpay' | 'analytics' | 'system' | 'security' | 'settings';

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
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [iyonicPayStats, setIyonicPayStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isIyonicPayLoading, setIsIyonicPayLoading] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    analyticsAPI.getAdminStats().then(setStats);
  }, [sellers]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'iyonicpay') {
      fetchIyonicPayData();
    }
  }, [activeTab]);

  const fetchIyonicPayData = async () => {
    setIsIyonicPayLoading(true);
    try {
      const [statsData, transData, withData] = await Promise.all([
        adminAPI.getIyonicPayStats(),
        adminAPI.getAllTransactions(),
        adminAPI.getAllWithdrawals()
      ]);
      setIyonicPayStats(statsData);
      setTransactions(transData);
      setWithdrawals(withData);
    } catch (error) {
      console.error('Failed to fetch IyonicPay data:', error);
    } finally {
      setIsIyonicPayLoading(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, status: 'completed' | 'failed') => {
    try {
      await adminAPI.updateWithdrawalStatus(id, status);
      setWithdrawals(withdrawals.map(w => w.id === id ? { ...w, status } : w));
      showToast(`Withdrawal marked as ${status}`, 'success');
      // Refresh stats and transactions too
      fetchIyonicPayData();
    } catch (error) {
      showToast('Failed to update withdrawal status', 'error');
    }
  };

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const data = await adminAPI.getAllUsers();
      setUsers(data);
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
    try {
      const result = await adminAPI.toggleUserSuspension(id);
      setUsers(users.map(u => u.id === id ? { ...u, isSuspended: result.isSuspended } : u));
      showToast(result.isSuspended ? 'User suspended' : 'User unsuspended', 'success');
    } catch (error) {
      showToast('Failed to update suspension status', 'error');
    }
  };

  const totalRevenue = sellers.reduce((sum, s) => sum + (s.stats?.totalRevenue || 0), 0);
  const totalOrders = sellers.reduce((sum, s) => sum + (s.stats?.totalOrders || 0), 0);
  const totalProducts = sellers.reduce((sum, s) => sum + (s.stats?.totalProducts || 0), 0);
  const totalCustomers = sellers.reduce((sum, s) => sum + (s.stats?.totalCustomers || 0), 0);

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
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
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
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Platform Overview</h2>
              <p className="text-gray-500">Complete system oversight and control</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${Number(totalRevenue || 0).toFixed(2)}</p>
                    <p className="text-sm text-green-600 mt-1">+15.3% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Sellers</p>
                    <p className="text-2xl font-bold text-gray-900">{sellers.length}</p>
                    <p className="text-sm text-green-600 mt-1">{sellers.filter(s => s.subscription?.status === 'active').length} active</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                    <p className="text-sm text-gray-500 mt-1">Across all stores</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Platform Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${stats?.totalPlatformRevenue?.toLocaleString() || '0'}</p>
                    <p className="text-sm text-green-600 mt-1">Across all stores</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Platform Health</p>
                    <p className="text-2xl font-bold text-green-600">99.9%</p>
                    <p className="text-sm text-gray-500 mt-1">Uptime this month</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader title="System Status" subtitle="Real-time platform metrics" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Cpu className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">CPU Usage</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }} />
                      </div>
                      <span className="font-medium text-gray-900 w-12 text-right">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <HardDrive className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Storage</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '62%' }} />
                      </div>
                      <span className="font-medium text-gray-900 w-12 text-right">62%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Database</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '38%' }} />
                      </div>
                      <span className="font-medium text-gray-900 w-12 text-right">38%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Wifi className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">Bandwidth</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: '71%' }} />
                      </div>
                      <span className="font-medium text-gray-900 w-12 text-right">71%</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Recent Activity" subtitle="Latest platform events" />
                <div className="space-y-4">
                  {[
                    { icon: <UserPlus className="w-4 h-4 text-green-600" />, text: 'New seller "Fashion Store" registered', time: '5 min ago' },
                    { icon: <DollarSign className="w-4 h-4 text-blue-600" />, text: 'Payment received: $2,450.00', time: '12 min ago' },
                    { icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />, text: 'High traffic alert on Tech Haven', time: '1 hour ago' },
                    { icon: <CheckCircle className="w-4 h-4 text-green-600" />, text: 'System backup completed', time: '2 hours ago' },
                    { icon: <UserMinus className="w-4 h-4 text-red-600" />, text: 'Seller "Old Store" suspended', time: '3 hours ago' },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {activity.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.text}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader title="Quick Actions" subtitle="Common administrative tasks" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <UserPlus className="w-6 h-6" />
                  <span>Add Manager</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <Store className="w-6 h-6" />
                  <span>View All Sellers</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <BarChart3 className="w-6 h-6" />
                  <span>Generate Report</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col space-y-2">
                  <Settings className="w-6 h-6" />
                  <span>System Settings</span>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* IyonicPay Tab */}
        {activeTab === 'iyonicpay' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">IyonicPay Administration</h2>
                <p className="text-gray-500">Monitor transactions and manage withdrawals</p>
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
                    <p className="text-sm text-gray-500 mb-1">Total Volume</p>
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
                    <p className="text-sm text-gray-500 mb-1">Total Balances</p>
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
                      <TableHead>Bank Details</TableHead>
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
                        return (
                        <TableRow key={w.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{w.userName}</p>
                              <p className="text-xs text-gray-500">@{w.userUsername || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{w.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-gray-900">${Number(w.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{bankDetails.bankName || 'N/A'}</p>
                              <p className="text-gray-500">{bankDetails.accountNo || 'N/A'}</p>
                              <p className="text-gray-400 text-xs">{bankDetails.accountName || 'N/A'}</p>
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
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleUpdateWithdrawalStatus(w.id, 'failed')}
                                >
                                  Reject
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
                      <TableCell className="font-medium">${(seller.stats?.totalRevenue || 0).toFixed(2)}</TableCell>
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
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
                            className={`p-2 rounded-lg transition-colors ${u.isSuspended ? 'text-green-600 hover:bg-green-50' : 'text-yellow-600 hover:bg-yellow-50'}`}
                            title={u.isSuspended ? 'Unsuspend' : 'Suspend'}
                          >
                            {u.isSuspended ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
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
              <p className="text-gray-500">Comprehensive platform insights</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader title="Revenue Distribution" subtitle="By subscription plan" />
                <div className="space-y-4">
                  {['starter', 'professional', 'enterprise'].map(plan => {
                    const planSellers = sellers.filter(s => s.subscription.plan === plan);
                    const planRevenue = planSellers.reduce((sum, s) => sum + s.stats.totalRevenue, 0);
                    const percentage = (planRevenue / totalRevenue) * 100;
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
                <CardHeader title="Top Performing Sellers" subtitle="By revenue" />
                <div className="space-y-4">
                  {sellers
                    .sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue)
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
                        <span className="font-medium text-gray-900">${Number(seller.stats.totalRevenue || 0).toFixed(2)}</span>
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
                  <p className="text-3xl font-bold text-gray-900">${(totalRevenue / sellers.length).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Avg Revenue/Seller</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">System Management</h2>
              <p className="text-gray-500">Monitor and manage platform infrastructure</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Server Status" subtitle="Infrastructure health" />
                <div className="space-y-4">
                  {[
                    { name: 'Web Server', status: 'healthy', uptime: '99.99%' },
                    { name: 'Database', status: 'healthy', uptime: '99.95%' },
                    { name: 'Cache Server', status: 'healthy', uptime: '99.98%' },
                    { name: 'File Storage', status: 'warning', uptime: '98.50%' },
                    { name: 'Email Service', status: 'healthy', uptime: '99.90%' },
                  ].map((server, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          server.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <span className="font-medium text-gray-900">{server.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Uptime: {server.uptime}</span>
                        <Badge variant={server.status === 'healthy' ? 'success' : 'warning'}>
                          {server.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader title="Recent Logs" subtitle="System events" />
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {[
                    { level: 'info', message: 'User login successful', time: '10:30:15' },
                    { level: 'info', message: 'New seller registered: Fashion Store', time: '10:25:42' },
                    { level: 'warning', message: 'High memory usage detected', time: '10:20:18' },
                    { level: 'info', message: 'Backup completed successfully', time: '10:15:33' },
                    { level: 'error', message: 'Payment gateway timeout', time: '10:10:05' },
                    { level: 'info', message: 'Cache cleared', time: '10:05:22' },
                  ].map((log, index) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <span className="text-gray-400 w-16 flex-shrink-0">{log.time}</span>
                      <Badge
                        variant={
                          log.level === 'error' ? 'danger' :
                          log.level === 'warning' ? 'warning' : 'info'
                        }
                        size="sm"
                      >
                        {log.level}
                      </Badge>
                      <span className="text-gray-600">{log.message}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Security</h2>
              <p className="text-gray-500">Platform security and access control</p>
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
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">IP Whitelisting</p>
                      <p className="text-sm text-gray-500">Restrict admin access to specific IPs</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
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
                      defaultValue="30"
                      className="w-32"
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Recent Security Events" subtitle="Security audit log" />
                <div className="space-y-3">
                  {[
                    { event: 'Failed login attempt', user: 'unknown@example.com', time: '2 min ago', severity: 'warning' },
                    { event: 'Password changed', user: 'admin@iyonicorp.com', time: '1 hour ago', severity: 'info' },
                    { event: 'New admin login', user: 'admin@iyonicorp.com', time: '3 hours ago', severity: 'info' },
                    { event: 'API key regenerated', user: 'admin@iyonicorp.com', time: '1 day ago', severity: 'info' },
                  ].map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{event.event}</p>
                        <p className="text-sm text-gray-500">{event.user} • {event.time}</p>
                      </div>
                      <Badge variant={event.severity === 'warning' ? 'warning' : 'info'}>
                        {event.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
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
          <Input label="Full Name" placeholder="Enter manager name" />
          <Input label="Email" placeholder="manager@example.com" />
          <Input label="Commission Rate" placeholder="5" helperText="Percentage of seller revenue" />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddManagerPopupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setIsAddManagerPopupOpen(false);
              showToast('Manager added successfully', 'success');
            }}>Add Manager</Button>
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
    </div>
  );
};
