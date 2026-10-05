import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI, employeesAPI } from '../../../../services/api';
import {
  calculateGrandTotal,
  createDemoApexMenu,
  createDemoApexSeller,
  createDemoEmployees,
  createDemoTables,
  getPosSettings,
  PosEmployee,
  PosOrderData,
  PosSettings,
  CartItem,
} from './apexTypes';
import { useApexStore } from './store/apexStore';
import {
  TerminalHeader,
  CategoryTabs,
  MenuGrid,
  CartSummary,
  PayModal,
  TableSelector,
  PinEntry,
  ProductDetailModal,
} from './components';
import './apex-pos.css';

const ApexPosSite: React.FC<{ seller?: Seller; products?: Product[] }> = ({ seller: sellerProp, products = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    seller: storeSeller,
    cart,
    tables,
    employees,
    currentEmployee,
    activeShift,
    settings,
    selectedTable,
    addOrderToQueue,
    setSeller,
    setSettings,
    setEmployees,
    setTables,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    selectEmployee,
    updateTableStatus,
    assignTableToEmployee,
    openShift,
    closeShift,
    recordCashSale,
    recordCardSale,
    connectWebSocket,
    disconnectWebSocket,
  } = useApexStore();

  const [resolvedSeller] = useState<Seller>(sellerProp || createDemoApexSeller());
  const [menuItems, setMenuItems] = useState<Product[]>(products.length ? products : createDemoApexMenu(resolvedSeller.id || 'demo'));
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [pinVerifying, setPinVerifying] = useState(false);

  const primaryColor = resolvedSeller.theme?.primaryColor || '#7c3609';
  const seller = storeSeller || resolvedSeller;
  const effectiveSettings = settings || getPosSettings(seller);

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((item) => item.category));
    return ['all', ...Array.from(cats)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = (subtotal * effectiveSettings.taxRate) / 100;
  const serviceFee = effectiveSettings.serviceCharge > 0 ? (subtotal * effectiveSettings.serviceCharge) / 100 : 0;
  const grandTotal = calculateGrandTotal(
    subtotal,
    effectiveSettings.taxRate,
    effectiveSettings.serviceCharge,
    effectiveSettings.rounding,
    tipAmount
  );

  const ensureStoreData = useCallback(async () => {
    if (!seller) return;
    setSettings(getPosSettings(seller));
    if (employees.length === 0) {
      try {
        const empData = await employeesAPI.getBySellerId(seller.id);
        setEmployees(empData);
      } catch {
        setEmployees(createDemoEmployees(seller.id || ''));
      }
    }
    if (tables.length === 0) {
      setTables(createDemoTables(seller.id || '', effectiveSettings.tableCount));
    }
  }, [seller, effectiveSettings.tableCount, employees.length, tables.length, setSettings, setEmployees, setTables]);

  useEffect(() => {
    void ensureStoreData();
  }, [ensureStoreData]);

  useEffect(() => {
    if (seller?.id) {
      connectWebSocket(seller.id);
    }
    return () => {
      disconnectWebSocket();
    };
  }, [seller?.id, connectWebSocket, disconnectWebSocket]);

  const handleVerifyPin = async (employee: PosEmployee, pin: string): Promise<boolean> => {
    setPinVerifying(true);
    let isVerified = false;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:2823/api'}/pos/employees/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('iyonicorp_token') || '',
        },
        body: JSON.stringify({ employeeId: employee.id, pin, sellerId: seller?.id }),
      });
      isVerified = response.ok || employee.pin === pin;
    } catch {
      isVerified = employee.pin === pin;
    } finally {
      setPinVerifying(false);
    }

    if (isVerified) {
      selectEmployee(employee);
      setShowPinEntry(false);
    }
    return isVerified;
  };

  const handleSelectTable = (table: { id: string; tableNumber: string }) => {
    useApexStore.getState().selectTable(table.id);
    updateTableStatus(table.id, 'seated');
    if (currentEmployee) {
      assignTableToEmployee(table.id, currentEmployee.id);
    }
    setShowTables(false);
  };

  const handleItemSelect = (item: Product) => {
    addToCart(item);
  };

  const handlePlaceOrder = async (
    paymentMethod: string,
    tip: number,
    splitMode?: string,
    loyaltyPointsUsed?: number
  ) => {
    if (!seller || cart.length === 0) return;
    setOrderSubmitting(true);
    try {
      const orderData: PosOrderData = {
        platform: 'apex-pos',
        tableId: selectedTable || undefined,
        tableName: tables.find((t) => t.id === selectedTable)?.tableNumber,
        employeeId: currentEmployee?.id,
        employeeName: currentEmployee?.name,
        terminalId: seller.id,
        orderType: 'dine-in',
        paymentMethod: paymentMethod as any,
        paymentStatus: 'paid',
        amountPaid: grandTotal - (loyaltyPointsUsed ? loyaltyPointsUsed * 0.01 : 0),
        remainingBalance: 0,
        isSplit: splitMode !== 'none',
        loyaltyPointsUsed: loyaltyPointsUsed || 0,
        customerInfo: customerInfo.name ? { ...customerInfo } : undefined,
        shiftId: activeShift?.id,
      };

      const newOrder = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: grandTotal,
        customerName: customerInfo.name || '',
        customerEmail: customerInfo.email || '',
        customerPhone: customerInfo.phone || '',
        status: 'pending' as const,
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(orderData),
        currency: effectiveSettings.currency,
        paymentMethod: paymentMethod as any,
        amountPaid: grandTotal,
        remainingBalance: 0,
      });

      addOrderToQueue(newOrder);
      if (selectedTable) updateTableStatus(selectedTable, 'seated');
      if (paymentMethod === 'cash' && activeShift) recordCashSale(grandTotal);
      if (paymentMethod === 'card' && activeShift) recordCardSale(grandTotal);

      setShowPayModal(false);
      setTipAmount(0);
      clearCart();
    } catch (err) {
      console.error('Failed to place order:', err);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handlePay = () => setShowPayModal(true);

  const closeShiftHandler = () => {
    if (activeShift) {
      const counted = Number(prompt('Enter cash counted at close:', String(activeShift.cashSales + activeShift.openingFloat))) || 0;
      closeShift(counted);
    }
  };

  if (effectiveSettings.enableEmployeeLogin && !currentEmployee) {
    return (
      <div className="pos-terminal apex-pos-app apex-pos-app--terminal" style={{ '--apex-primary': primaryColor } as React.CSSProperties}>
        <PinEntry
          employees={employees.length ? employees : createDemoEmployees(seller.id || '')}
          currentEmployee={currentEmployee}
          isLoading={pinVerifying}
          onVerifyPin={handleVerifyPin}
          onSwitchEmployee={() => {}}
          onCancel={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="pos-terminal apex-pos-app apex-pos-app--terminal" style={{ '--apex-primary': primaryColor } as React.CSSProperties}>
      <TerminalHeader
        storeName={seller.storeName || seller.subdomain}
        primaryColor={primaryColor}
        currentEmployee={currentEmployee}
        onSwitchEmployee={() => setShowPinEntry(true)}
        onLogout={logout}
        activeShift={activeShift}
        onOpenShift={() => {
          const float = Number(prompt('Opening float amount:', '100')) || 0;
          if (currentEmployee) openShift(currentEmployee.id, float);
        }}
        onCloseShift={closeShiftHandler}
      />

      <div className="apex-pos__body">
        <div className="apex-pos__left">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            settings={effectiveSettings}
            onCategoryChange={setActiveCategory}
            onSearchChange={setSearchQuery}
            onOpenSettings={() => navigate('/pos/apex-pos/admin')}
          />
          <MenuGrid
            items={filteredItems}
            settings={effectiveSettings}
            onItemSelect={handleItemSelect}
          />
        </div>

        <CartSummary
          cart={cart}
          settings={effectiveSettings}
          selectedTable={selectedTable}
          selectedTableLabel={tables.find((table) => table.id === selectedTable)?.tableNumber || null}
          availableTableCount={tables.filter((table) =>
            ['available', 'reserved'].includes(table.status)
          ).length}
          subtotal={subtotal}
          tax={tax}
          serviceFee={serviceFee}
          grandTotal={grandTotal}
          tipAmount={tipAmount}
          customerInfo={customerInfo}
          tableCount={effectiveSettings.tableCount}
          onUpdateQuantity={(item, delta) => updateCartItemQuantity(item.id, delta)}
          onRemoveItem={(item) => removeFromCart(item.id)}
          onCustomerInfoChange={setCustomerInfo}
          onShowTables={() => setShowTables(true)}
          onPay={handlePay}
          onClear={clearCart}
        />
      </div>

      {showTables && (
        <TableSelector
          tables={tables}
          primaryColor={primaryColor}
          onSelectTable={handleSelectTable}
          onClose={() => setShowTables(false)}
          assignedTable={selectedTable}
        />
      )}

      {showProductDetail && selectedProduct && (
        <ProductDetailModal
          isOpen={showProductDetail}
          product={selectedProduct as any}
          settings={effectiveSettings}
          onClose={() => setShowProductDetail(false)}
          onAddToCart={(item) => addToCart(item, item.modifiers)}
        />
      )}

      {showPinEntry && (
        <PinEntry
          employees={employees.length ? employees : createDemoEmployees(seller.id || '')}
          currentEmployee={currentEmployee}
          isLoading={pinVerifying}
          onVerifyPin={handleVerifyPin}
          onSwitchEmployee={(emp) => selectEmployee(emp)}
          onCancel={() => setShowPinEntry(false)}
        />
      )}

      <PayModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        cart={cart}
        settings={effectiveSettings}
        customerInfo={customerInfo}
        currentEmployee={currentEmployee}
        subtotal={subtotal}
        tax={tax}
        serviceFee={serviceFee}
        grandTotal={grandTotal}
        tipAmount={tipAmount}
        selectedTable={selectedTable}
        onPlaceOrder={handlePlaceOrder}
        isSubmitting={orderSubmitting}
      />
    </div>
  );
};

export default ApexPosSite;
