import type { Order, Seller } from '../../../../../services/api';

export interface SalonBooking {
  platform: 'aura-salon';
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
  closingTime: '19:00',
  closedDays: [0],
  slotInterval: 30,
  leadTimeHours: 2,
  location: '',
  phone: '',
  email: '',
  assignments: {},
};

export const getSalonSettings = (seller?: Seller | null): SalonSettings => {
  const saved = seller?.theme?.customizations?.auraSalon || {};
  return { ...defaultSalonSettings, ...saved, staff: saved.staff || [], assignments: saved.assignments || {} };
};

export const hasConfiguredSalonHours = (seller?: Seller | null) => {
  const saved = seller?.theme?.customizations?.auraSalon;
  return typeof saved?.openingTime === 'string' &&
    typeof saved?.closingTime === 'string' &&
    /^\d{2}:\d{2}$/.test(saved.openingTime) &&
    /^\d{2}:\d{2}$/.test(saved.closingTime) &&
    saved.closingTime > saved.openingTime;
};

export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const favoriteStorageKey = (sellerId: string) => `aura-salon:favorites:${sellerId}`;

export const getFavoriteServiceIds = (sellerId: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(favoriteStorageKey(sellerId)) || '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const saveFavoriteServiceIds = (sellerId: string, ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(favoriteStorageKey(sellerId), JSON.stringify(ids));
  } catch {
    // Favorites remain available for the current view if storage is unavailable.
  }
};

export const getRequestTimes = (date: string, settings: SalonSettings, durationMinutes = 0, now = new Date()) => {
  if (!date || date < getLocalDateString(now)) return [];
  const appointmentDay = new Date(`${date}T12:00:00`).getDay();
  if (settings.closedDays.includes(appointmentDay)) return [];

  const [startHour, startMinute] = settings.openingTime.split(':').map(Number);
  const [endHour, endMinute] = settings.closingTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const interval = Math.max(15, Number(settings.slotInterval) || 30);
  const leadTime = Math.max(0, Number(settings.leadTimeHours) || 0) * 60;

  return Array.from({ length: Math.max(0, Math.ceil((end - start) / interval)) }, (_, index) => {
    const value = start + index * interval;
    const time = `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    const requestedAt = new Date(`${date}T${time}:00`);
    const minutesUntilRequest = (requestedAt.getTime() - now.getTime()) / 60000;
    return value + Math.max(0, durationMinutes) <= end && minutesUntilRequest >= leadTime ? time : null;
  }).filter((time): time is string => time !== null);
};

export const readSalonBooking = (order: Order): SalonBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'aura-salon' ? payload as SalonBooking : null;
  } catch {
    return null;
  }
};

export const isAuraSalon = (seller?: Seller | null) =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'aura-salon';

export const saveSalonSettings = (seller: Seller, settings: SalonSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, auraSalon: settings } },
});
