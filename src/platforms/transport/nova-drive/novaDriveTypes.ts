import type { Order, Seller } from '../../../services/api';

export type VehicleClass = 'economy' | 'compact' | 'midsize' | 'luxury' | 'suv' | 'electric';

export interface NovaBooking {
  platform: 'nova-drive';
  vehicleId: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  pickupLocation: string;
  returnLocation: string;
  driverAge: number;
  insuranceLevel: 'basic' | 'premium' | 'full';
  addOns: string[];
  specialInstructions?: string;
  totalDays: number;
}

export interface NovaSettings {
  locations: string[];
  operatingHours: { open: string; close: string };
  depositPercent: number;
  currency: string;
  insuranceOptions: {
    basic: { name: string; description: string; multiplier: number };
    premium: { name: string; description: string; multiplier: number };
    full: { name: string; description: string; multiplier: number };
  };
  addOnOptions: { id: string; name: string; price: number; description: string }[];
  fleetManagers: { id: string; name: string; phone: string }[];
  assignments: Record<string, string>;
}

export const defaultNovaSettings: NovaSettings = {
  locations: ['Downtown Garage', 'Airport Terminal 1', 'Airport Terminal 2', 'Business District'],
  operatingHours: { open: '07:00', close: '22:00' },
  depositPercent: 30,
  currency: 'USD',
  insuranceOptions: {
    basic: {
      name: 'Basic Coverage',
      description: 'Liability and collision damage waiver',
      multiplier: 1,
    },
    premium: {
      name: 'Premium Protection',
      description: 'Includes roadside assistance and theft protection',
      multiplier: 1.18,
    },
    full: {
      name: 'Full Coverage',
      description: 'Complete protection including accident forgiveness',
      multiplier: 1.35,
    },
  },
  addOnOptions: [
    { id: 'gps', name: 'GPS Navigation', price: 12, description: 'Premium GPS with real-time traffic' },
    { id: 'child-seat', name: 'Child Seat', price: 15, description: 'Installed by a certified technician' },
    { id: 'ski-rack', name: 'Ski Rack', price: 20, description: 'Roof-mounted rack for equipment' },
    { id: 'driver', name: 'Professional Driver', price: 75, description: 'Meet-and-greet with a licensed driver' },
  ],
  fleetManagers: [],
  assignments: {},
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const getNovaSettings = (seller?: Seller | null): NovaSettings => {
  const saved = seller?.theme?.customizations?.novaDrive || {};
  const availability: Record<string, { open: string; close: string }> = {};
  DAYS.forEach((day) => {
    if (saved.availability?.[day]) {
      availability[day] = saved.availability[day];
    } else {
      availability[day] = { open: '08:00', close: '18:00' };
    }
  });
  return {
    ...defaultNovaSettings,
    ...saved,
    locations: saved.locations || defaultNovaSettings.locations,
    operatingHours: saved.operatingHours || defaultNovaSettings.operatingHours,
    insuranceOptions: { ...defaultNovaSettings.insuranceOptions, ...(saved.insuranceOptions || {}) },
    addOnOptions: saved.addOnOptions || defaultNovaSettings.addOnOptions,
    fleetManagers: saved.fleetManagers || [],
    assignments: saved.assignments || {},
    availability,
  };
};

export const readNovaBooking = (order: Order): NovaBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'nova-drive' ? payload as NovaBooking : null;
  } catch {
    return null;
  }
};

export const isNovaDrive = (seller?: Seller | null): boolean =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'nova-drive';

export const saveNovaSettings = (seller: Seller, settings: NovaSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, novaDrive: settings } },
});

export const calculateRentalTotal = (
  dailyRate: number,
  days: number,
  booking?: NovaBooking | null,
  addOns: { id: string; price: number }[] = []
): number => {
  const base = dailyRate * Math.max(days, 1);
  const insuranceMultiplier = booking
    ? booking.insuranceLevel === 'premium'
      ? 1.18
      : booking.insuranceLevel === 'full'
      ? 1.35
      : 1
    : 1;
  const addOnTotal = addOns.reduce((sum, addOn) => sum + addOn.price, 0);
  return Math.round((base * insuranceMultiplier + addOnTotal) * 100) / 100;
};

export const getDaysDifference = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return timeString;
  }
};
