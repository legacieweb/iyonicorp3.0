import { TableStatus } from './employee';
import { DEFAULT_POS_SETTINGS } from './settings';
import { generateId } from './shift';

export interface PosTable {
  id: string;
  sellerId: string;
  tableNumber: string;
  seats: number;
  status: TableStatus;
  section?: string;
  currentOrderId?: string;
  assignedEmployeeId?: string;
  customerCount?: number;
  reservedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getTableStatusColor = (status: TableStatus): string => {
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

export const getTableStatusLabel = (status: TableStatus): string => {
  const labels: Record<TableStatus, string> = {
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    seated: 'Seated',
    ordering: 'Ordering',
    served: 'Served',
  };
  return labels[status];
};

export const createDemoTables = (sellerId: string, count: number = 16): PosTable[] =>
  Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    sellerId,
    tableNumber: String(i + 1),
    seats: Math.floor(i / 4) + 2,
    status: 'available' as TableStatus,
    notes: '',
  }));

