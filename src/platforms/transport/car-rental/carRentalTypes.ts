import type { Order, Seller } from '../../../services/api';

export type VehicleCategory = 'economy' | 'compact' | 'sedan' | 'suv' | 'luxury' | 'convertible' | 'truck' | 'van';

export interface CarRentalOrderData {
  platform: 'car-rental';
  vehicleId: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  returnLocation: string;
  driverAge: number;
  insuranceLevel: 'basic' | 'premium' | 'full';
  instructions?: string;
}

export interface CarRentalSettings {
  currency: string;
  depositPercent: number;
  locations: string[];
  operatingHours: { open: string; close: string };
}

export const defaultCarRentalSettings: CarRentalSettings = {
  currency: 'USD',
  depositPercent: 30,
  locations: ['Downtown Terminal', 'Airport Terminal A', 'Airport Terminal B', 'City Center'],
  operatingHours: { open: '08:00', close: '20:00' },
};

export const getCarRentalSettings = (seller?: Seller | null): CarRentalSettings => {
  const saved = seller?.theme?.customizations?.carRental || {};
  return { ...defaultCarRentalSettings, ...saved, currency: saved.currency || seller?.currency || 'USD' };
};

export const isCarRental = (seller?: Seller | null): boolean =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'car-rental';

export const readCarRentalOrder = (order: Order): CarRentalOrderData | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'car-rental' ? payload as CarRentalOrderData : null;
  } catch {
    return null;
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return timeString;
  }
};

export const getDaysDifference = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
};

export const calculateTotal = (dailyRate: number, days: number, orderData?: CarRentalOrderData | null): number => {
  const base = dailyRate * Math.max(days, 1);
  const insuranceMultiplier = orderData?.insuranceLevel === 'premium' ? 1.15 : orderData?.insuranceLevel === 'full' ? 1.3 : 1;
  return Math.round(base * insuranceMultiplier * 100) / 100;
};

export const getVehicleCategoryLabel = (category?: string): string => {
  const labels: Record<string, string> = {
    economy: 'Economy',
    compact: 'Compact',
    sedan: 'Sedan',
    suv: 'SUV',
    luxury: 'Luxury',
    convertible: 'Convertible',
    truck: 'Truck',
    van: 'Van',
  };
  return labels[category || ''] || category || 'Standard';
};

export const getCategoryIcon = (category?: string): string => {
  const icons: Record<string, string> = {
    economy: '🚗',
    compact: '🚘',
    sedan: '🚗',
    suv: '🚙',
    luxury: '🏎️',
    convertible: '🚓',
    truck: '🚚',
    van: '🚐',
  };
  return icons[category || ''] || '🚗';
};
