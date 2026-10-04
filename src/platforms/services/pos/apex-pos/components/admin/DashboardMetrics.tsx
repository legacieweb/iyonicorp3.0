import React from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3 } from 'lucide-react';
import { Order, Seller } from "../../../../../../services/api";
import { PosSettings, formatCurrency } from "../../apexTypes";

interface DashboardMetricsProps {
  orders: Order[];
  products: number;
  employees: number;
  seller: Seller | null;
  settings: PosSettings;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  orders,
  products,
  employees,
  seller,
  settings,
}) => {
  const currency = seller?.currency || settings.currency || 'USD';

  const completedOrders = orders.filter((o) =>
    ['processing', 'shipped', 'delivered'].includes(o.status)
  );
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const avgOrderValue =
    completedOrders.length > 0
      ? (totalRevenue / completedOrders.length).toFixed(2)
      : '0.00';

  const metrics = [
    { label: 'Gross Sales', value: formatCurrency(totalRevenue, currency), icon: <DollarSign size={20} /> },
    { label: 'Avg Order', value: `$${avgOrderValue}`, icon: <TrendingUp size={20} /> },
    { label: 'Open Orders', value: String(pendingOrders.length), icon: <ShoppingBag size={20} /> },
    { label: 'Menu Items', value: String(products), icon: <BarChart3 size={20} /> },
    { label: 'Active Employees', value: String(employees), icon: <Users size={20} /> },
  ];

  return (
    <div className="pos-admin__metrics">
      {metrics.map((m) => (
        <div className="pos-metric" key={m.label}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
            {m.icon}
          </div>
          <div className="pos-metric__value">{m.value}</div>
          <div className="pos-metric__label">{m.label}</div>
        </div>
      ))}
    </div>
  );
};
