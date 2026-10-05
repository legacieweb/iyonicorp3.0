import React, { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, Package, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  Order,
  ordersAPI,
  Product,
  productsAPI,
  Seller,
  sellersAPI,
  employeesAPI,
  tablesAPI,
  inventoryAPI,
} from '../../../../services/api';
import {
  createDemoApexSeller,
  createDemoEmployees,
  createDemoTables,
  formatCurrency,
  formatDateTime,
  getPosSettings,
  isApexPos,
  PosEmployee,
  savePosSettings,
  TableStatus,
  getRoleLabel,
} from './apexTypes';
import { useApexStore } from './store/apexStore';
import {
  AdminSidebar,
  AdminTopbar,
  DashboardMetrics,
  SalesChart,
  OrderStatusBadge,
  RecentOrdersTable,
  ProductForm,
  EmployeeForm,
  SettingsForm,
} from './components';
import './apex-pos.css';

const ApexPosAdmin: React.FC = () => {
  const { user, logout } = useAuth();

  const {
    seller: storeSeller,
    orders,
    tables,
    employees,
    settings,
    inventory,
    setSeller: setStoreSeller,
    setSettings,
    setOrders,
    setEmployees,
    setTables,
    setInventory,
    updateOrderStatus,
    connectWebSocket,
    disconnectWebSocket,
  } = useApexStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState('dashboard');
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    stock: '0',
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PosEmployee | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  const primaryColor = storeSeller?.theme?.primaryColor || '#7c3609';
  const seller = storeSeller || createDemoApexSeller();
  const productsCount = storeSeller?.stats?.totalProducts || 0;

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const completedOrders = orders.filter((o) =>
    ['processing', 'shipped', 'delivered'].includes(o.status)
  );
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStockItems = inventory.filter((i) => i.currentStock <= i.lowStockThreshold);

  const load = useCallback(async () => {
    if (!user?.sellerId) return;
    setLoading(true);
    setError('');
    try {
      const owner = await sellersAPI.getMe();
      if (!isApexPos(owner)) {
        setError('This seller does not use Apex POS.');
        return;
      }
      setStoreSeller(owner);
      setSettings(getPosSettings(owner));

      const allOrders = await ordersAPI.getBySellerId(user.sellerId);
      setOrders(allOrders);

      try {
        const empData = await employeesAPI.getBySellerId(user.sellerId);
        setEmployees(empData);
      } catch {
        setEmployees(createDemoEmployees(user.sellerId));
      }

      try {
        const tableData = await tablesAPI.getBySellerId(user.sellerId);
        setTables(tableData.length ? tableData : createDemoTables(user.sellerId, 12));
      } catch {
        setTables(createDemoTables(user.sellerId, 12));
      }

      try {
        const invData = await inventoryAPI.getBySellerId(user.sellerId);
        setInventory(invData);
      } catch {
        setInventory([]);
      }
    } catch {
      setError('Could not load POS data.');
    } finally {
      setLoading(false);
    }
  }, [user?.sellerId, setStoreSeller, setSettings, setOrders, setEmployees, setTables, setInventory]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (seller?.id) {
      connectWebSocket(seller.id);
    }
    return () => disconnectWebSocket();
  }, [seller?.id, connectWebSocket, disconnectWebSocket]);

  const updateOrderStatusHandler = async (order: Order, status: Order['status']) => {
    try {
      const updated = await ordersAPI.updateStatus(order.id, status);
      updateOrderStatus(order.id, updated.status);
      setNotice('Order status updated.');
    } catch {
      setError('Could not update order status.');
    }
  };

  const saveSettingsHandler = async () => {
    if (!seller) return;
    setSaving(true);
    try {
      const updated = await sellersAPI.updateMe(savePosSettings(seller, settings));
      setStoreSeller(updated);
      setSettings(getPosSettings(updated));
      setNotice('Settings saved.');
    } catch {
      setError('Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const openProductModal = (product: Product | null) => {
    setEditingProduct(product);
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        category: product.category,
        image: product.images?.[0] || '',
        stock: String(product.stock || 0),
      });
    } else {
      setProductForm({ name: '', description: '', price: '', category: 'main', image: '', stock: '0' });
    }
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!user?.sellerId || !productForm.name.trim() || !productForm.price) return;
    try {
      const productData = {
        sellerId: user.sellerId,
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        category: productForm.category || 'main',
        type: 'service' as const,
        images: productForm.image ? [productForm.image] : [],
        stock: Number(productForm.stock),
        status: 'active' as const,
      };
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
      } else {
        await productsAPI.create(productData);
      }
      setShowProductModal(false);
      setNotice(`Product ${editingProduct ? 'updated' : 'created'}.`);
      void load();
    } catch {
      setError('Could not save product.');
    }
  };

  const openEmployeeModal = (employee: PosEmployee | null) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const saveEmployee = async () => {
    if (!user?.sellerId || !productForm.name.trim()) return;
    try {
      if (editingEmployee) {
        await employeesAPI.update(editingEmployee.id, {
          name: productForm.name,
          role: editingEmployee.role as any,
        });
      } else {
        await employeesAPI.create({
          name: productForm.name,
          role: 'cashier',
          pin: '',
        });
      }
      setShowEmployeeModal(false);
      setNotice(`Employee ${editingEmployee ? 'updated' : 'created'}.`);
      void load();
    } catch {
      setError('Could not save employee.');
    }
  };

  const getTableStatusColor = (status: TableStatus): string => {
    const colors: Record<TableStatus, string> = {
      available: '#10b981',
      occupied: '#f59e0b',
      reserved: '#3b82f6',
      seated: '#8b5cf6',
      ordering: '#f97316',
      served: '#6b7280',
    };
    return colors[status] || '#94a3b8';
  };

  if (loading) {
    return (
      <div className="pos-terminal apex-pos-app apex-pos-app--admin">
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div className="button-spinner" />
          <p>Loading Apex POS dashboard…</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="pos-terminal apex-pos-app apex-pos-app--admin">
        <div style={{ padding: '60px', textAlign: 'center' }} role="alert">
          {error || 'This POS workspace is unavailable.'}
        </div>
      </div>
    );
  }

  const sectionTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    orders: 'Orders',
    menu: 'Menu',
    tables: 'Tables',
    employees: 'Employees',
    shifts: 'Shifts',
    inventory: 'Inventory',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  return (
    <div className="pos-terminal apex-pos-app apex-pos-app--admin" style={{ '--apex-primary': primaryColor } as React.CSSProperties}>
      <div className="pos-terminal__body">
        <AdminSidebar
          storeName={seller.storeName}
          section={section as any}
          pendingCount={pendingOrders.length}
          lowStockCount={lowStockItems.length}
          onSelectSection={(sec) => setSection(sec)}
          onOpenTerminal={() => window.open('/pos/apex-pos?theme=apex-pos', '_blank')}
          onLogout={logout}
        />

        <main className="apex-admin__main">
          <AdminTopbar
            title={sectionTitles[section] || 'Dashboard'}
            onRefresh={() => void load()}
            onLogout={logout}
          />

          <div className="apex-admin__content">
            {error && (
              <div className="apex-alert">
                {error}
                <button
                  onClick={() => setError('')}
                  aria-label="Dismiss"
                  style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            )}
            {notice && <div className="apex-notice">✓ {notice}</div>}

            {section === 'dashboard' && (
              <div className="pos-admin__section">
                <div
                  className="pos-admin__section-title"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h2>Overview</h2>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #334159',
                      background: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '12px',
                    }}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>
                <DashboardMetrics
                  orders={orders}
                  products={productsCount}
                  employees={employees.length}
                  seller={seller}
                  settings={settings}
                />
                <div className="pos-admin__card" style={{ marginBottom: '16px' }}>
                  <h2>Daily Sales</h2>
                  <div style={{ height: '200px' }}>
                    <SalesChart
                      orders={orders}
                      currency={seller.currency || settings.currency}
                      dateRange={dateRange as any}
                    />
                  </div>
                </div>
                <RecentOrdersTable
                  orders={orders}
                  seller={seller}
                  settings={settings}
                  onStatusChange={updateOrderStatusHandler}
                />
              </div>
            )}

            {section === 'orders' && (
              <div className="pos-admin__section">
                <h2>Orders</h2>
                <div className="pos-admin__card">
                  <table className="pos-orders-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length ? (
                        orders
                          .slice()
                          .sort((a, b) =>
                            (b.createdAt || '').localeCompare(a.createdAt || '')
                          )
                          .map((order) => (
                            <tr key={order.id}>
                              <td>#{order.id.slice(0, 8)}</td>
                              <td>{order.customerName || 'Walk-in'}</td>
                              <td>{order.items?.length || 0}</td>
                              <td>
                                {formatCurrency(
                                  order.total,
                                  order.currency || seller.currency || 'USD'
                                )}
                              </td>
                              <td>
                                <OrderStatusBadge status={order.status} />
                              </td>
                              <td>{formatDateTime(order.createdAt || '')}</td>
                              <td>
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() =>
                                      updateOrderStatusHandler(order, 'processing')
                                    }
                                    aria-label="Start"
                                  >
                                    →
                                  </button>
                                )}
                                {order.status === 'processing' && (
                                  <button
                                    onClick={() =>
                                      updateOrderStatusHandler(order, 'delivered')
                                    }
                                    aria-label="Complete"
                                  >
                                    ✓
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            style={{ textAlign: 'center', padding: '32px' }}
                          >
                            <ShoppingBag
                              size={32}
                              style={{ color: '#64748b', marginBottom: '12px' }}
                            />
                            <p>No orders yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'menu' && (
              <div className="pos-admin__section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h2>Menu Items</h2>
                  <button
                    className="pos-btn pos-btn--primary"
                    style={{ width: 'auto' }}
                    onClick={() => openProductModal(null)}
                  >
                    + Add Item
                  </button>
                </div>
                <div className="pos-admin__card">
                  <table className="pos-orders-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsCount > 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ textAlign: 'center', padding: '16px' }}
                          >
                            Manage menu from the product catalog.
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ textAlign: 'center', padding: '32px' }}
                          >
                            <Package
                              size={32}
                              style={{ color: '#64748b', marginBottom: '12px' }}
                            />
                            <p>No menu items yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'tables' && (
              <div className="pos-admin__section">
                <h2>Table Management</h2>
                <div className="pos-admin__card">
                  <div className="apex-pos__tables-grid">
                    {tables.map((table) => (
                      <button
                        type="button"
                        key={table.id}
                        className={`apex-pos__table-card ${table.status}`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.currentTarget.click();
                          }
                        }}
                        onClick={async () => {
                          const newStatus: TableStatus =
                            table.status === 'available'
                              ? 'occupied'
                              : table.status === 'occupied'
                              ? 'reserved'
                              : table.status === 'reserved'
                              ? 'seated'
                              : table.status === 'seated'
                              ? 'available'
                              : table.status === 'ordering'
                              ? 'served'
                              : 'available';
                          try {
                            await tablesAPI.updateStatus(table.id, newStatus);
                          } catch {
                            console.error('Failed to update table status');
                          }
                        }}
                      >
                        <span
                          className="apex-pos__table-card--number"
                          style={{ color: getTableStatusColor(table.status) }}
                        >
                          {table.tableNumber}
                        </span>
                        <span className="apex-pos__table-card--status">
                          {table.status}
                        </span>
                        {table.notes && (
                          <span
                            style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}
                          >
                            {table.notes}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'employees' && (
              <div className="pos-admin__section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h2>Employees</h2>
                  <button
                    className="pos-btn pos-btn--primary"
                    style={{ width: 'auto' }}
                    onClick={() => openEmployeeModal(null)}
                  >
                    + Add Employee
                  </button>
                </div>
                <div className="pos-admin__card">
                  <table className="pos-orders-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Hours/Week</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length ? (
                        employees.map((emp) => (
                          <tr key={emp.id}>
                            <td>{emp.name}</td>
                            <td>{getRoleLabel(emp.role)}</td>
                            <td>{emp.hoursThisWeek} hrs</td>
                            <td>
                              <span
                                className={`apex-badge ${
                                  emp.active ? 'apex-badge--success' : 'apex-badge--danger'
                                }`}
                              >
                                {emp.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => openEmployeeModal(emp)}
                                aria-label={`Edit ${emp.name}`}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                }}
                              >
                                ✎
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ textAlign: 'center', padding: '32px' }}
                          >
                            <Users
                              size={32}
                              style={{ color: '#64748b', marginBottom: '12px' }}
                            />
                            <p>No employees yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'inventory' && (
              <div className="pos-admin__section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h2>Inventory</h2>
                  <button className="pos-btn pos-btn--primary" style={{ width: 'auto' }}>
                    + Add Item
                  </button>
                </div>
                <div className="pos-admin__card">
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Track inventory levels and receive low-stock alerts.
                  </p>
                  <table className="pos-orders-table" style={{ marginTop: '12px' }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Current Stock</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length ? (
                        inventory.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.currentStock}</td>
                            <td>
                              <span
                                className={`apex-badge ${
                                  item.currentStock <= item.lowStockThreshold
                                    ? 'apex-badge--warning'
                                    : 'apex-badge--success'
                                }`}
                              >
                                {item.currentStock <= item.lowStockThreshold
                                  ? 'Low Stock'
                                  : 'In Stock'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            style={{ textAlign: 'center', padding: '32px' }}
                          >
                            <Package
                              size={32}
                              style={{ color: '#64748b', marginBottom: '12px' }}
                            />
                            <p>No inventory items yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'analytics' && (
              <div className="pos-admin__section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h2>Analytics</h2>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #334159',
                      background: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '12px',
                    }}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>
                <DashboardMetrics
                  orders={orders}
                  products={productsCount}
                  employees={employees.length}
                  seller={seller}
                  settings={settings}
                />
                <div className="pos-admin__card" style={{ marginBottom: '16px' }}>
                  <h2>Sales Trend</h2>
                  <div style={{ height: '200px' }}>
                    <SalesChart
                      orders={orders}
                      currency={seller.currency || settings.currency}
                      dateRange={dateRange as any}
                    />
                  </div>
                </div>
                <div className="pos-admin__card">
                  <h2>Payment Methods</h2>
                  <table className="pos-orders-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Transactions</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['card', 'cash', 'mobile', 'custom'].map((method) => {
                        const methodOrders = orders.filter(
                          (o) => o.paymentMethod === method
                        );
                        const methodTotal = methodOrders.reduce(
                          (sum, o) => sum + (o.total || 0),
                          0
                        );
                        return (
                          <tr key={method}>
                            <td style={{ textTransform: 'capitalize' }}>
                              {method}
                            </td>
                            <td>{methodOrders.length}</td>
                            <td>
                              {formatCurrency(
                                methodTotal,
                                seller.currency || settings.currency
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'settings' && (
              <div className="pos-admin__section">
                <h2>POS Settings</h2>
                <SettingsForm
                  settings={settings}
                  onSettingsChange={setSettings}
                  onSave={saveSettingsHandler}
                  saving={saving}
                  onOpenTerminal={() =>
                    window.open('/pos/apex-pos?theme=apex-pos', '_blank')
                  }
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {showProductModal && (
        <ProductForm
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          editingProduct={editingProduct}
          settings={settings}
          onSave={() => void saveProduct()}
        />
      )}

      {showEmployeeModal && (
        <EmployeeForm
          isOpen={showEmployeeModal}
          onClose={() => setShowEmployeeModal(false)}
          editingEmployee={editingEmployee}
          onSave={() => void saveEmployee()}
        />
      )}
    </div>
  );
};

export default ApexPosAdmin;
