import type { Order, Seller } from '../../../../services/api';

export interface EventBooking {
  platform: 'event-flow';
  eventType: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  plannerName?: string;
  eventBrief: string;
  venueLocation?: string;
}

export interface PlannerSettings {
  planners: { name: string; specialty: string }[];
  serviceTypes: { id: string; name: string; duration: number; price: number; description: string }[];
  availability: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  minimumNoticeDays: number;
  bookingLeadTime: number;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  assignments: Record<string, string>;
}

export const defaultPlannerSettings: PlannerSettings = {
  planners: [],
  serviceTypes: [],
  availability: {
    monday: '9:00-18:00',
    tuesday: '9:00-18:00',
    wednesday: '9:00-18:00',
    thursday: '9:00-18:00',
    friday: '9:00-18:00',
    saturday: 'closed',
    sunday: 'closed',
  },
  minimumNoticeDays: 2,
  bookingLeadTime: 2,
  assignments: {},
};

export const getPlannerSettings = (seller?: Seller | null): PlannerSettings => {
  const saved = seller?.theme?.customizations?.eventFlow || {};
  return {
    ...defaultPlannerSettings,
    ...saved,
    planners: saved.planners || [],
    serviceTypes: saved.serviceTypes || [],
    availability: { ...defaultPlannerSettings.availability, ...(saved.availability || {}) },
    assignments: saved.assignments || {},
  };
};

export const readEventBooking = (order: Order): EventBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'event-flow' ? payload as EventBooking : null;
  } catch {
    return null;
  }
};

export const isEventFlow = (seller?: Seller | null) => {
  const themeId = seller?.themeId || seller?.theme?.selectedTheme;
  return seller?.shopType === 'service' && ['event-planner', 'carnovga'].includes(String(themeId || ''));
};

export const savePlannerSettings = (seller: Seller, settings: PlannerSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, eventFlow: settings } },
});
