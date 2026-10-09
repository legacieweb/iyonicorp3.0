import type { Order, Seller } from '../../../../services/api';

export interface PulseFitBooking {
  platform: 'pulse-fit';
  sessionDate: string;
  sessionTime: string;
  trainerName?: string;
  notes: string;
  duration?: number;
  membershipId?: string;
  location?: string;
}

export interface PulseFitTrainer {
  id: string;
  name: string;
  specialty?: string;
  bio?: string;
  photo?: string;
  certifications?: string[];
  specialties?: string[];
  instagram?: string;
}

export interface PulseFitAvailabilitySlot {
  day: number;
  time: string;
}

export interface PulseFitClassSchedule {
  classId: string;
  capacity: number;
  recurring: PulseFitAvailabilitySlot[];
}

export type PlanPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface PulseFitPlan {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  period: PlanPeriod;
  features?: string[];
}

export interface PulseFitBrand {
  color: string;
  logo: string;
  favicon: string;
  studioName: string;
  tagline: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
}

export interface PulseFitSettings {
  trainers: PulseFitTrainer[];
  staff: { name: string; specialty: string }[];
  openingTime: string;
  closingTime: string;
  closedDays: number[];
  slotInterval: number;
  leadTimeHours: number;
  location: string;
  phone: string;
  email: string;
  address?: string;
  assignments: Record<string, string>;
  classSchedules: Record<string, PulseFitClassSchedule>;
  memberships: PulseFitPlan[];
  brand: PulseFitBrand;
}

export const WEEKDAYS: { short: string; full: string; key: number }[] = [
  { short: 'Sun', full: 'Sunday', key: 0 },
  { short: 'Mon', full: 'Monday', key: 1 },
  { short: 'Tue', full: 'Tuesday', key: 2 },
  { short: 'Wed', full: 'Wednesday', key: 3 },
  { short: 'Thu', full: 'Thursday', key: 4 },
  { short: 'Fri', full: 'Friday', key: 5 },
  { short: 'Sat', full: 'Saturday', key: 6 },
];

const defaultTrainer: PulseFitTrainer = {
  id: 'default',
  name: '',
  specialty: 'Fitness coach',
  bio: '',
  photo: '',
  certifications: [],
  specialties: [],
  instagram: '',
};

export const defaultPulseFitSettings: PulseFitSettings = {
  trainers: [],
  staff: [],
  openingTime: '06:00',
  closingTime: '22:00',
  closedDays: [0],
  slotInterval: 30,
  leadTimeHours: 2,
  location: '',
  phone: '',
  email: '',
  address: '',
  assignments: {},
  classSchedules: {},
  memberships: [],
  brand: {
    color: '#00f0ff',
    logo: '',
    favicon: '',
    studioName: 'Pulse Fit',
    tagline: 'Stronger every day.',
    heroTitle: 'Stronger every',
    heroAccent: 'day.',
    heroDescription: 'Drop-in classes, personal training, and membership plans built around your schedule and goals.',
  },
};

const legacyTrainer = (raw: any): PulseFitTrainer => ({
  id: raw?.id || raw?.name || 'legacy',
  name: raw?.name || '',
  specialty: raw?.specialty || 'Fitness coach',
  bio: raw?.bio || '',
  photo: raw?.photo || raw?.avatar || '',
  certifications: raw?.certifications || [],
  specialties: raw?.specialties || (raw?.specialty ? [raw.specialty] : []),
  instagram: raw?.instagram || '',
});

export const getPulseFitSettings = (seller?: Seller | null): PulseFitSettings => {
  const saved = seller?.theme?.customizations?.pulseFit || {};
  const trainers = Array.isArray(saved.trainers)
    ? saved.trainers.map((raw: any) => (raw?.photo || raw?.bio ? raw : legacyTrainer(raw)))
    : [];
  const merged: PulseFitSettings = {
    ...defaultPulseFitSettings,
    ...saved,
    trainers,
    staff: Array.isArray(saved.staff) ? saved.staff : [],
    assignments: saved.assignments || {},
    classSchedules: saved.classSchedules || {},
    memberships: Array.isArray(saved.memberships) ? saved.memberships : [],
    brand: { ...defaultPulseFitSettings.brand, ...(saved.brand || {}) },
  };
  return merged;
};

export const readPulseFitBooking = (order: Order): PulseFitBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    if (payload?.platform === 'pulse-fit') return payload as PulseFitBooking;
    return null;
  } catch {
    return null;
  }
};

export const isPulseFit = (seller?: Seller | null) =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'pulse-fit';

export const savePulseFitSettings = (seller: Seller, settings: PulseFitSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, pulseFit: settings } },
});

export const classDuration = (product: { description?: string; duration?: number }): number => {
  const match = product.description?.match(/Duration:\s*(\d+)/i);
  return Number(match?.[1]) || product.duration || 45;
};

export const trainerLabel = (trainer?: PulseFitTrainer | string): string => {
  if (!trainer) return '';
  if (typeof trainer === 'string') return trainer;
  return trainer.name;
};

export const isFutureDate = (value: string): boolean => !value || new Date(`${value}T12:00:00`).getTime() >= Date.now();
