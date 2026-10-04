import { nanoid } from 'nanoid';

export interface PosShift {
  id: string;
  employeeId: string;
  employeeName?: string;
  sellerId: string;
  startedAt: string;
  endedAt?: string;
  openingFloat: number;
  closingAmount?: number;
  cashSales: number;
  cardSales: number;
  status: 'open' | 'closed';
  cashCounted?: number;
  variance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const generateId = (): string => nanoid(12);

export const generateSalesData = (days: number = 30): number[] => {
  return Array.from({ length: days }, () => Math.floor(Math.random() * 500 + 200));
};

export const generateHourlyData = (): number[] => {
  return Array.from({ length: 24 }, (_, h) => {
    if (h >= 7 && h <= 10) return Math.floor(Math.random() * 300 + 200);
    if (h >= 11 && h <= 14) return Math.floor(Math.random() * 400 + 300);
    if (h >= 17 && h <= 20) return Math.floor(Math.random() * 500 + 400);
    return Math.floor(Math.random() * 100);
  });
};
