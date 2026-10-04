import type { Order, Product } from '../../../../../services/api';

export type OrderType = 'dine-in' | 'takeout' | 'delivery';
export type OrderPaymentStatus = 'pending' | 'partial' | 'paid';

export interface PosOrderData {
  platform: 'apex-pos';
  tableId?: string;
  tableName?: string;
  employeeId?: string;
  employeeName?: string;
  terminalId?: string;
  customerId?: string;
  orderType: OrderType;
  paymentMethod?: string;
  paymentStatus?: OrderPaymentStatus;
  amountPaid?: number;
  remainingBalance?: number;
  isSplit?: boolean;
  loyaltyPointsUsed?: number;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  notes?: string;
  shiftId?: string;
}

export interface CartItem extends Product {
  quantity: number;
  notes?: string;
  modifiers?: CartItemModifier[];
}

export interface CartItemModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface ProductWithModifiers extends Product {
  modifierGroups?: ModifierGroup[];
}

export const readPosOrder = (order: Order): PosOrderData | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'apex-pos' ? (payload as PosOrderData) : null;
  } catch {
    return null;
  }
};
