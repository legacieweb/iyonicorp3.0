import type { Order, Seller } from '../../../../services/api';

export interface PulseFitBooking {
  platform: 'pulse-fit';
  sessionDate: string;
  sessionTime: string;
  trainerName: string;
  notes: string;
}

export interface PulseFitSettings {
  trainers: { name: string; specialty: string }[];
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

export const defaultPulseFitSettings: PulseFitSettings = {
  trainers: [],
  openingTime: '06:00',
  closingTime: '22:00',
  closedDays: [0],
  slotInterval: 30,
  leadTimeHours: 2,
  location: '',
  phone: '',
  email: '',
  assignments: {},
};

export const getPulseFitSettings = (seller?: Seller | null): PulseFitSettings => {
  const saved = seller?.theme?.customizations?.pulseFit || {};
  return { ...defaultPulseFitSettings, ...saved, trainers: saved.trainers || [], assignments: saved.assignments || {} };
};

export const readPulseFitBooking = (order: Order): PulseFitBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'pulse-fit' ? payload as PulseFitBooking : null;
  } catch {
    return null;
  }
};

export const isPulseFit = (seller?: Seller | null) =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'pulse-fit';

export const savePulseFitSettings = (seller: Seller, settings: PulseFitSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, pulseFit: settings } },
});
