import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Order } from "../../../../../../services/api";
import { formatCurrency } from "../../apexTypes";

interface SalesChartProps {
  orders: Order[];
  currency: string;
  dateRange: '7d' | '30d' | '90d';
}

export const SalesChart: React.FC<SalesChartProps> = ({ orders, currency, dateRange }) => {
  const data = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const now = new Date();
    const labels: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (days <= 7) {
        labels.push(d.toLocaleDateString([], { weekday: 'short' }));
      } else if (days <= 30) {
        labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      } else {
        labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      }
    }

    const salesByDay: Record<string, { date: string; revenue: number; orders: number }> = {};

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt || '');
      const dateKey = orderDate.toLocaleDateString();
      if (!salesByDay[dateKey]) {
        salesByDay[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
      }
      salesByDay[dateKey].revenue += order.total || 0;
      salesByDay[dateKey].orders += 1;
    });

    return labels.map((label, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const dateKey = d.toLocaleDateString();
      const entry = salesByDay[dateKey] || { date: dateKey, revenue: 0, orders: 0 };
      return {
        label,
        revenue: Math.round(entry.revenue),
        orders: entry.orders,
      };
    });
  }, [orders, dateRange]);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 20 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          hide
          domain={[0, maxRevenue]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #334159',
            borderRadius: '6px',
            fontSize: '11px',
          }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(value: any) => [formatCurrency(Number(value), currency), 'Revenue']}
        />
        <Bar
          dataKey="revenue"
          radius={[3, 3, 0, 0]}
          style={{ fill: 'var(--apex-primary, #fbbf24)' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
