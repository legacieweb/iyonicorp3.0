import type { LogLevel } from './employee';

export interface PosEventLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  orderId?: string;
  userId?: string;
}

export interface PosInventoryItem {
  id: string;
  sellerId: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  lowStockThreshold: number;
  cost: number;
  supplier?: string;
  lastRestocked?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  sellerId: string;
  type: 'restock' | 'usage' | 'adjustment';
  quantity: number;
  reason: string;
  employeeName?: string;
  createdAt: string;
}
