import type { Order, Seller } from '../../../../../services/api';

export interface SalonBooking {
  platform: 'tamira-salon';
  appointmentDate: string;
  appointmentTime: string;
  staffName: string;
  notes: string;
}

export interface SalonSettings {
  staff: { name: string; specialty: string }[];
  openingTime: string;
  closingTime: string;
  closedDays: number[];
  slotInterval: number;
  leadTimeHours: number;
  location: string;
  phone: string;
  email: string;
  assignments: Record<string, string>;
}

export const defaultSalonSettings: SalonSettings = {
  staff: [],
  openingTime: '09:00',
  closingTime: '18:00',
  closedDays: [0],
  slotInterval: 30,
  leadTimeHours: 2,
  location: '',
  phone: '',
  email: '',
  assignments: {},
};

export const getSalonSettings = (seller?: Seller | null): SalonSettings => {
  const saved = seller?.theme?.customizations?.tamiraSalon || {};
  return { ...defaultSalonSettings, ...saved, staff: saved.staff || [], assignments: saved.assignments || {} };
};

export const readSalonBooking = (order: Order): SalonBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'tamira-salon' ? payload as SalonBooking : null;
  } catch {
    return null;
  }
};

export const isTamiraSalon = (seller?: Seller | null) =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'tamira-salon';

export const saveSalonSettings = (seller: Seller, settings: SalonSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, tamiraSalon: settings } },
});