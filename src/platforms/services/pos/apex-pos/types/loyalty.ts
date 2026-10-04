import { PaymentMethod } from './employee';

export interface PosLoyaltyProgram {
  pointsBalance: number;
  tier: 'bronze' | 'silver' | 'gold';
  lifetimePoints: number;
  rewards: { id: string; name: string; pointsCost: number; description: string }[];
}

export interface PosLoyaltyTransaction {
  id: string;
  customerId: string;
  orderId: string;
  pointsEarned: number;
  pointsRedeemed: number;
  note?: string;
  createdAt: string;
}

export interface SplitBillItem {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  paymentMethod: PaymentMethod;
}

export interface LoyaltyTier {
  name: 'bronze' | 'silver' | 'gold';
  minPoints: number;
  multiplier: number;
  label: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: 'bronze', minPoints: 0, multiplier: 1, label: 'Bronze' },
  { name: 'silver', minPoints: 500, multiplier: 1.25, label: 'Silver' },
  { name: 'gold', minPoints: 2000, multiplier: 1.5, label: 'Gold' },
];

export const getLoyaltyTier = (lifetimePoints: number): LoyaltyTier => {
  return [...LOYALTY_TIERS].reverse().find((tier) => lifetimePoints >= tier.minPoints) || LOYALTY_TIERS[0];
};
