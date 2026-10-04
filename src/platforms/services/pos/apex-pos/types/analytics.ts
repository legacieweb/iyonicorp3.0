import { PaymentMethod } from './employee';

export interface PosAnalytics {
  dailySales: number[];
  hourlySales: number[];
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  employeeSales: Array<{ name: string; sales: number; orders: number }>;
  paymentBreakdown: Record<PaymentMethod, number>;
  averageOrderValue: number;
  peakHours: number[];
}
