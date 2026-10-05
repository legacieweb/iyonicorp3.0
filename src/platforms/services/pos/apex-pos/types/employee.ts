import type { Seller } from '../../../../../services/api';
import { DEFAULT_POS_SETTINGS, PosSettings } from './settings';

export type EmployeeRole = 'owner' | 'manager' | 'admin' | 'cashier' | 'kitchen' | 'server';
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'seated' | 'ordering' | 'served';
export type ShiftStatus = 'open' | 'closed' | 'active';
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'custom';
export type LogLevel = 'info' | 'warning' | 'error' | 'success';
export type ReportType = 'sales' | 'employees' | 'products' | 'customers' | 'inventory';

export interface PosEmployee {
  id: string;
  sellerId: string;
  name: string;
  role: EmployeeRole;
  pin: string;
  pinHash?: string;
  active: boolean;
  hoursThisWeek: number;
  totalSales: number;
  photo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getRoleLabel = (role: EmployeeRole): string => {
  const labels: Record<EmployeeRole, string> = {
    owner: 'Owner',
    manager: 'Manager',
    admin: 'Admin',
    cashier: 'Cashier',
    kitchen: 'Kitchen',
    server: 'Server',
  };
  return labels[role];
};

export const createDemoEmployees = (sellerId: string): PosEmployee[] => [
  { id: 'emp-1', sellerId, name: 'Alex Morgan', role: 'owner', pin: '0000', active: true, hoursThisWeek: 32, totalSales: 0 },
  { id: 'emp-2', sellerId, name: 'Jamie Chen', role: 'cashier', pin: '5678', active: true, hoursThisWeek: 28, totalSales: 0 },
  { id: 'emp-3', sellerId, name: 'Taylor Reed', role: 'kitchen', pin: '9012', active: true, hoursThisWeek: 24, totalSales: 0 },
];

export const createDemoApexSeller = (): Seller => ({
  id: 'apex-demo-seller',
  userId: '',
  storeName: 'Apex Café',
  subdomain: 'apex-demo',
  shopType: 'service',
  currency: 'USD',
  theme: {
    primaryColor: '#7c3609',
    secondaryColor: '#d97706',
    fontFamily: 'Inter',
    selectedTheme: 'apex-pos',
    customizations: {
      apexPos: {
        ...DEFAULT_POS_SETTINGS,
        receiptHeader: 'Apex Café',
        tableCount: 12,
      },
    },
  },
  subscription: { plan: 'starter', status: 'active', startDate: null, endDate: null },
  stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
  isLive: false,
  createdAt: '',
});

export const isApexPos = (seller?: Seller | null): boolean =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'apex-pos';
