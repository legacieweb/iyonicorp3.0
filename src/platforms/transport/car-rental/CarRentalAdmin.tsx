import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, LogOut, MapPin, Plus, Save, Scissors, Send, ShoppingBag, Star, Trash2, TrendingUp, Users, Wallet, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, uploadAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { getThemeDashboardRoute } from '../../../utils/themeDashboard';
import { CarRentalOrderData, getCarRentalSettings, isCarRental, readCarRentalOrder, getVehicleCategoryLabel, getCategoryIcon, formatDate, getDaysDifference } from './carRentalTypes';
import './carRental.css';

type Tab = 'dashboard' | 'vehicles' | 'bookings' | 'profile';

const CarRentalAdmin: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [vehicles, setVehicles] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'economy' as string,
    images: [] as string[],
    file: null as File | null,
  });

  const load = useCallback(async () => {
    if (!user?.sellerId) {
      navigate(getThemeDashboardRoute(), { replace: true });
      return;
    }
    setLoading(true); setError('');
    try {
      const [owner, allOrders, allProducts] = await Promise.all([
        sellersAPI.getMe(),
        ordersAPI.getBySellerId(user.sellerId),
        productsAPI.getBySellerId(user.sellerId),
      ]);
      if (!isCarRental(owner) || owner.id !== user.sellerId) {
        navigate(getThemeDashboardRoute(owner.themeId || owner.theme?.selectedTheme), { replace: true });
        return;
      }
      setSeller(owner);
      setVehicles(allProducts.filter((p) => p.type === 'service'));
      setOrders(allOrders.filter((order) => readCarRentalOrder(order)));
    } catch {
      setError('Could not load the admin workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.sellerId]);

  useEffect(() => { void load(); }, [load]);

  const resetVehicleForm = () => {
    setVehicleForm({ name: '', description: '', price: '', category: 'economy', images: [], file: null });
    setEditingVehicle(null);
  };

  const openVehicleModal = (vehicle?: Product) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleForm({
        name: vehicle.name,
        description: vehicle.description || '',
        price: String(vehicle.price),
        category: vehicle.category || 'economy',
        images: vehicle.images || [],
        file: null,
      });
    } else {
      resetVehicleForm();
    }
    setShowVehicleModal(true);
  };

  const saveVehicle = async () => {
    if (!vehicleForm.name.trim() || !vehicleForm.price || !seller) return;
    setSaving(true); setError('');
    try {
      let imageUrls = vehicleForm.images;
      if (vehicleForm.file) {
        imageUrls = await uploadAPI.upload([vehicleForm.file]);
      }
      const vehicleData = {
        name: vehicleForm.name.trim(),
        description: vehicleForm.description.trim(),
        price: Number(vehicleForm.price),
        category: vehicleForm.category,
        type: 'service' as const,
        status: 'active' as const,
        images: imageUrls,
        stock: 1,
        sellerId: seller.id,
      };
      if (editingVehicle) {
        await productsAPI.update(editingVehicle.id, vehicleData);
      } else {
        await productsAPI.create(vehicleData);
      }
      setShowVehicleModal(false);
      resetVehicleForm();
      await load();
      setNotice(editingVehicle ? 'Vehicle updated.' : 'Vehicle added.');
    } catch {
      setError('Could not save this vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (vehicle: Product) => {
    if (!confirm(`Delete ${vehicle.name}? This cannot be undone.`)) return;
    try {
      await productsAPI.delete(vehicle.id);
      await load();
      setNotice('Vehicle removed.');
    } catch {
      setError('Could not delete this vehicle.');
    }
  };

  const updateOrderStatus = async (order: Order, status: Order['status']) => {
    try {
      const updated = await ordersAPI.update(order.id, { status });
      setOrders((list) => list.map((item) => (item.id === order.id ? updated : item)));
      setNotice(`Reservation marked as ${status}.`);
    } catch {
      setError('Could not update this reservation.');
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    const confirmedCount = orders.filter((o) => o.status === 'processing').length;
    const completedCount = orders.filter((o) => o.status === 'delivered').length;
    return { totalRevenue, pendingCount, confirmedCount, completedCount };
  }, [orders]);

  const sidebarItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Scissors size={18} /> },
    { id: 'bookings', label: 'Reservations', icon: <CalendarDays size={18} /> },
    { id: 'profile', label: 'Profile', icon: <Users size={18} /> },
  ];

  if (loading) {
    return (
      <div className="cr-admin-shell">
        <div className="cr-admin-loading"><div className="loading-spinner" /> Loading your workspace…</div>
      </div>
    );
  }
  if (!seller) {
    return (
      <div className="cr-admin-shell">
        <div className="cr-admin-loading" role="alert">{error || 'This workspace is unavailable.'}</div>
      </div>
    );
  }

  const settings = getCarRentalSettings(seller);

  return (
    <div className="cr-admin-shell cr-font-sans">
      <aside className="cr-sidebar">
        <div className="cr-sidebar-brand">
          <span className="cr-logo-icon"><Scissors size={18} /></span>
          <strong>Apex <em>Drive</em></strong>
          <small>ADMIN PANEL</small>
        </div>
        <nav className="cr-sidebar-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => { setTab(item.id); setSelectedOrder(null); }}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="cr-sidebar-bottom">
          <div className="cr-sidebar-avatar">
            {seller.storeName?.slice(0, 1).toUpperCase() || 'A'}
          </div>
          <div className="cr-sidebar-user">
            <strong>{seller.storeName}</strong>
            <small>Owner account</small>
          </div>
          <button onClick={logout} aria-label="Sign out" className="cr-sidebar-logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="cr-admin-main">
        <header className="cr-admin-topbar">
          <div className="cr-topbar-title">
            <span>APEX DRIVE</span>
            <i>/</i>
            <b>{selectedOrder ? 'RESERVATION' : tab === 'dashboard' ? 'DASHBOARD' : tab === 'vehicles' ? 'VEHICLES' : tab === 'bookings' ? 'RESERVATIONS' : 'PROFILE'}</b>
          </div>
          {selectedOrder && (
            <button className="cr-btn-ghost cr-btn-sm" onClick={() => setSelectedOrder(null)}>
              Back to list
            </button>
          )}
        </header>

        <div className="cr-dashboard-content">
          {notice && <div className="cr-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
          {error && <div className="cr-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

          {tab === 'dashboard' && (
            <>
              <div className="cr-dashboard-grid">
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><Wallet size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{formatPrice(stats.totalRevenue, seller.currency || 'USD')}</strong>
                    <p className="cr-stat-label">Lifetime revenue</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><Clock size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{stats.pendingCount}</strong>
                    <p className="cr-stat-label">Awaiting confirmation</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><Check size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{stats.confirmedCount}</strong>
                    <p className="cr-stat-label">Confirmed pickups</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><TrendingUp size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{stats.completedCount}</strong>
                    <p className="cr-stat-label">Completed rentals</p>
                  </div>
                </div>
                <div className="cr-stat-card">
                  <div className="cr-stat-icon"><Scissors size={20} /></div>
                  <div>
                    <strong className="cr-stat-value">{vehicles.length}</strong>
                    <p className="cr-stat-label">Vehicles in fleet</p>
                  </div>
                </div>
              </div>

              <div className="cr-card" style={{ marginTop: '2rem' }}>
                <div className="cr-card-header">
                  <h3><Clock size={18} /> Recent reservations</h3>
                </div>
                <div className="cr-table-container">
                  <table className="cr-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Customer</th>
                        <th>Pickup</th>
                        <th>Status</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => {
                        const hwData = readCarRentalOrder(order);
                        return (
                          <tr key={order.id}>
                            <td>{order.items[0]?.productName || 'Vehicle'}</td>
                            <td>{order.customerName}</td>
                            <td>{hwData ? formatDate(hwData.pickupDate) : '—'}</td>
                            <td><span className={`cr-badge ${order.status === 'pending' ? 'cr-badge-pending' : order.status === 'processing' ? 'cr-badge-processing' : order.status === 'delivered' ? 'cr-badge-completed' : 'cr-badge-pending'}`}>{order.status === 'pending' ? 'Awaiting confirmation' : order.status === 'processing' ? 'Confirmed' : order.status === 'delivered' ? 'Completed' : order.status}</span></td>
                            <td className="text-right">{formatPrice(order.total, order.currency || 'USD')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {(tab === 'vehicles' || selectedOrder) && !selectedOrder && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Your fleet</h3>
                <button className="cr-btn cr-btn-primary cr-btn-md" onClick={() => openVehicleModal()}>
                  <Plus size={16} /> Add vehicle
                </button>
              </div>

              {vehicles.length ? (
                <div className="cr-vehicle-grid-admin">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="cr-vehicle-admin-card">
                      {vehicle.images?.[0] ? (
                        <img src={vehicle.images[0]} alt={vehicle.name} />
                      ) : (
                        <div className="cr-vehicle-placeholder-admin">{getCategoryIcon(vehicle.category)}</div>
                      )}
                      <div className="cr-vehicle-admin-body">
                        <h3>{vehicle.name}</h3>
                        <p className="cr-vehicle-admin-category">{getVehicleCategoryLabel(vehicle.category)}</p>
                        <p className="cr-vehicle-admin-price">{formatPrice(vehicle.price, seller.currency || 'USD')}/day</p>
                      </div>
                      <div className="cr-vehicle-admin-actions">
                        <button className="cr-btn-ghost cr-btn-sm" onClick={() => openVehicleModal(vehicle)}>
                          Edit
                        </button>
                        <button className="cr-btn-ghost cr-btn-sm" onClick={() => deleteVehicle(vehicle)} style={{ color: 'var(--cr-error)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cr-empty">
                  <Scissors size={40} />
                  <h3>No vehicles in your fleet.</h3>
                  <p>Add your first vehicle to start accepting reservations.</p>
                  <button className="cr-btn cr-btn-primary" onClick={() => openVehicleModal()}>
                    Add vehicle <Plus size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'bookings' && !selectedOrder && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>All reservations</h3>
              {orders.length ? (
                <div className="cr-table-container">
                  <table className="cr-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Customer</th>
                        <th>Pickup</th>
                        <th>Return</th>
                        <th>Status</th>
                        <th className="text-right">Total</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const hwData = readCarRentalOrder(order);
                        return (
                          <tr key={order.id}>
                            <td>{order.items[0]?.productName || 'Vehicle'}</td>
                            <td>{order.customerName}</td>
                            <td>{hwData ? formatDate(hwData.pickupDate) : '—'}</td>
                            <td>{hwData ? formatDate(hwData.returnDate) : '—'}</td>
                            <td>
                              <select
                                className="cr-select"
                                style={{ maxWidth: '160px', fontSize: '0.8125rem' }}
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order, e.target.value as Order['status'])}
                              >
                                <option value="pending">Awaiting confirmation</option>
                                <option value="processing">Confirmed</option>
                                <option value="shipped">Picked up</option>
                                <option value="delivered">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="text-right">{formatPrice(order.total, order.currency || 'USD')}</td>
                            <td className="text-center">
                              <button className="cr-btn-ghost cr-btn-sm" onClick={() => setSelectedOrder(order)}>
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cr-empty">
                  <CalendarDays size={40} />
                  <h3>No reservations yet.</h3>
                  <p>Reservations will appear here once customers start booking.</p>
                </div>
              )}
            </div>
          )}

          {selectedOrder && (
            <div className="cr-card">
              <div className="cr-card-header">
                <h3><CalendarDays size={18} /> Reservation #{selectedOrder.id.slice(-6)}</h3>
              </div>
              {(() => {
                const hwData = readCarRentalOrder(selectedOrder);
                const days = hwData ? getDaysDifference(hwData.pickupDate, hwData.returnDate) : 0;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Vehicle</p>
                        <p style={{ fontWeight: 600 }}>{selectedOrder.items[0]?.productName || 'Vehicle'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Customer</p>
                        <p style={{ fontWeight: 600 }}>{selectedOrder.customerName}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--cr-slate)' }}>{selectedOrder.customerEmail}</p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--cr-slate)' }}>{selectedOrder.customerPhone}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Pickup</p>
                        <p style={{ fontWeight: 600 }}>{hwData ? formatDate(hwData.pickupDate) : '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Return</p>
                        <p style={{ fontWeight: 600 }}>{hwData ? formatDate(hwData.returnDate) : '—'} ({days} {days === 1 ? 'day' : 'days'})</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Pickup location</p>
                        <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}><MapPin size={14} />{hwData?.pickupLocation || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Insurance</p>
                        <p style={{ fontWeight: 600 }}>{hwData?.insuranceLevel || 'Premium'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Driver age</p>
                        <p style={{ fontWeight: 600 }}>{hwData?.driverAge || 25} years</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Payment</p>
                        <p style={{ fontWeight: 600 }}>Subtotal: {formatPrice(selectedOrder.subtotal || selectedOrder.total, selectedOrder.currency || 'USD')}</p>
                        <p style={{ fontWeight: 600, color: 'var(--cr-emerald)' }}>Deposit paid: {formatPrice(selectedOrder.amountPaid || 0, selectedOrder.currency || 'USD')}</p>
                        {(selectedOrder.remainingBalance || 0) > 0 && (
                          <p style={{ fontWeight: 600, color: 'var(--cr-error)' }}>Balance due: {formatPrice(selectedOrder.remainingBalance || 0, selectedOrder.currency || 'USD')}</p>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cr-slate)', marginBottom: '0.25rem' }}>Status</p>
                        <select
                          className="cr-select"
                          style={{ maxWidth: '180px' }}
                          value={selectedOrder.status}
                          onChange={(e) => updateOrderStatus(selectedOrder, e.target.value as Order['status'])}
                        >
                          <option value="pending">Awaiting confirmation</option>
                          <option value="processing">Confirmed</option>
                          <option value="shipped">Picked up</option>
                          <option value="delivered">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {tab === 'profile' && (
            <div className="cr-card">
              <div className="cr-card-header">
                <h3><Users size={18} /> Company profile</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label className="cr-form-label">Store name</label>
                  <input type="text" value={seller.storeName || ''} readOnly className="cr-input" />
                </div>
                <div>
                  <label className="cr-form-label">Subdomain</label>
                  <input type="text" value={seller.subdomain || ''} readOnly className="cr-input" />
                </div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <label className="cr-form-label">Currency</label>
                    <input type="text" value={seller.currency || 'USD'} readOnly className="cr-input" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="cr-form-label">Subscription plan</label>
                    <input type="text" value={seller.subscription?.plan || 'N/A'} readOnly className="cr-input" />
                  </div>
                </div>
                <div>
                  <label className="cr-form-label">Pickup locations</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {settings.locations.map((loc) => (
                      <span key={loc} className="cr-badge cr-badge-available">{loc}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="cr-form-label">Operating hours</label>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--cr-slate)' }}>
                    {settings.operatingHours.open} — {settings.operatingHours.close}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showVehicleModal && (
        <div className="cr-modal-overlay">
          <div className="cr-modal">
            <div className="cr-modal-header">
              <h3>{editingVehicle ? 'Edit vehicle' : 'Add vehicle'}</h3>
              <button className="cr-modal-close" onClick={() => { setShowVehicleModal(false); resetVehicleForm(); }}>
                <X size={20} />
              </button>
            </div>
            <div className="cr-modal-body">
              <div className="cr-form-field">
                <label className="cr-form-label">Vehicle name</label>
                <input type="text" value={vehicleForm.name} onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })} className="cr-input" placeholder="e.g., Tesla Model S" />
              </div>
              <div className="cr-form-field" style={{ marginTop: '1rem' }}>
                <label className="cr-form-label">Description</label>
                <textarea value={vehicleForm.description} onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })} className="cr-input" rows={3} placeholder="Vehicle features, passenger capacity, etc." />
              </div>
              <div className="cr-form-row" style={{ marginTop: '1rem' }}>
                <div className="cr-form-field">
                  <label className="cr-form-label">Daily rate ({seller.currency || 'USD'})</label>
                  <input type="number" min={0} step={0.01} value={vehicleForm.price} onChange={(e) => setVehicleForm({ ...vehicleForm, price: e.target.value })} className="cr-input" placeholder="e.g., 99" />
                </div>
                <div className="cr-form-field">
                  <label className="cr-form-label">Category</label>
                  <select value={vehicleForm.category} onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })} className="cr-select">
                    <option value="economy">Economy</option>
                    <option value="compact">Compact</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="luxury">Luxury</option>
                    <option value="convertible">Convertible</option>
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              </div>
              <div className="cr-form-field" style={{ marginTop: '1rem' }}>
                <label className="cr-form-label">Vehicle image</label>
                <input type="file" accept="image/*" onChange={(e) => setVehicleForm({ ...vehicleForm, file: e.target.files?.[0] || null })} className="cr-input" />
                {vehicleForm.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {vehicleForm.images.map((img, i) => (
                      <img key={i} src={img} alt="" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '0.375rem' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="cr-modal-footer">
              <button className="cr-btn cr-btn-ghost" onClick={() => { setShowVehicleModal(false); resetVehicleForm(); }}>
                Cancel
              </button>
              <button className="cr-btn cr-btn-primary" onClick={saveVehicle} disabled={saving}>
                {saving ? 'Saving…' : editingVehicle ? 'Update vehicle' : 'Add vehicle'} {saving ? <span className="button-spinner" /> : <Save size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarRentalAdmin;
