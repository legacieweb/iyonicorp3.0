import type { Order, Seller } from '../../../../services/api';

export interface EventoBooking {
  platform: 'evento';
  eventDate: string;
  eventTime: string;
  attendees: number;
  ticketType: string;
  cohostName: string;
  notes: string;
}

export interface EventoTicketTier {
  name: string;
  price: number;
}

export interface EventoSettings {
  venue: string;
  address: string;
  phone: string;
  email: string;
  leadTimeHours: number;
  cohosts: { name: string; specialty: string }[];
  ticketTiers: EventoTicketTier[];
  assignments: Record<string, string>;
}

export const defaultEventoSettings: EventoSettings = {
  venue: '',
  address: '',
  phone: '',
  email: '',
  leadTimeHours: 2,
  cohosts: [],
  ticketTiers: [],
  assignments: {},
};

export const getEventoSettings = (seller?: Seller | null): EventoSettings => {
  const saved = seller?.theme?.customizations?.evento || {};
  return {
    ...defaultEventoSettings,
    ...saved,
    cohosts: saved.cohosts || [],
    ticketTiers: saved.ticketTiers || [],
    assignments: saved.assignments || {},
  };
};

export const readEventoBooking = (order: Order): EventoBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'evento' ? (payload as EventoBooking) : null;
  } catch {
    return null;
  }
};

export const isEvento = (seller?: Seller | null) =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'evento';

export const saveEventoSettings = (seller: Seller, settings: EventoSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, evento: settings } },
});

export interface EventMeta {
  date: string;
  time: string;
  duration: string;
  capacity: string;
}

export const parseEventMeta = (description?: string): EventMeta => {
  const text = description || '';
  const date = text.match(/Date:\s*([\d-]+)/i)?.[1] || '';
  const time = text.match(/Time:\s*([\d:]+)/i)?.[1] || '';
  const duration = text.match(/Duration:\s*(\d+)/i)?.[1] || '';
  const capacity = text.match(/Capacity:\s*(\d+)/i)?.[1] || '';
  return { date, time, duration, capacity };
};

export const cleanEventDescription = (description?: string): string =>
  (description || '').replace(/\n?Date:\s*[\d-]+/i, '').replace(/\n?Time:\s*[\d:]+/i, '').replace(/\n?Duration:\s*\d+\s*min/i, '').replace(/\n?Capacity:\s*\d+/i, '').replace(/\n{3,}/g, '\n\n').trim();
