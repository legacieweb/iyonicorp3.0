import type { Order, Seller, Product } from '../../../../services/api';

export interface HomeworkerOrderData {
  platform: 'homeworker';
  pageCount: number;
  questionCount: number;
  academicLevel: string;
  subject: string;
  deadline: string;
  instructions: string;
  fileUrls: string[];
  workerId?: string | null;
  deliverableUrls?: string[];
  messages?: HomeworkerMessage[];
}

export interface HomeworkerMessage {
  id: string;
  sender: 'student' | 'worker';
  text: string;
  timestamp: string;
}

export interface HomeworkerSettings {
  pricingModel: 'per-page' | 'per-question';
  pricePerPage: number;
  pricePerQuestion: number;
  depositPercent: number;
  workers: HomeworkerWorker[];
}

export interface HomeworkerWorker {
  id: string;
  name: string;
  subject: string;
  credentials: string;
  rating: number;
  rate: number;
  bio: string;
  tags: string[];
  initials: string;
  color: 'coral' | 'green' | 'blue' | 'gold';
}

export const defaultHomeworkerSettings: HomeworkerSettings = {
  pricingModel: 'per-page',
  pricePerPage: 0,
  pricePerQuestion: 0,
  depositPercent: 50,
  workers: [],
};

export const createDemoHomeworkerServices = (sellerId: string): Product[] => [
  { id: 'homeworker-demo-writing', sellerId, name: 'Essay & writing support', description: 'Thoughtful structure, clear research, and polished academic writing.', price: 18, category: 'WRITING', type: 'service', images: [], stock: 0, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'homeworker-demo-problem-solving', sellerId, name: 'Problem set walkthrough', description: 'Step-by-step help with quantitative and technical coursework.', price: 12, category: 'PROBLEM SOLVING', type: 'service', images: [], stock: 0, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'homeworker-demo-research', sellerId, name: 'Research & citation review', description: 'A clearer argument, stronger sources, and consistent citations.', price: 22, category: 'RESEARCH', type: 'service', images: [], stock: 0, status: 'active', createdAt: '', updatedAt: '' },
];

export const createDemoHomeworkerSeller = (): Seller => ({
  id: 'demo-seller',
  userId: '',
  storeName: 'Homeworker Preview',
  subdomain: 'demo',
  shopType: 'service',
  currency: 'KES',
  theme: {
    primaryColor: '#2458a6',
    secondaryColor: '#347254',
    fontFamily: 'DM Sans',
    selectedTheme: 'homeworker',
    customizations: { homeworker: { pricingModel: 'per-page', pricePerPage: 18, pricePerQuestion: 4, depositPercent: 50, workers: [] } },
  },
  subscription: { plan: 'starter', status: 'active', startDate: null, endDate: null },
  stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0 },
  isLive: false,
  createdAt: '',
});

export const getHomeworkerSettings = (seller?: Seller | null): HomeworkerSettings => {
  const saved = seller?.theme?.customizations?.homeworker || {};
  return { ...defaultHomeworkerSettings, ...saved, workers: saved.workers || [] };
};

export const saveHomeworkerSettings = (seller: Seller, settings: HomeworkerSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, homeworker: settings } },
});

export const isHomeworker = (seller?: Seller | null) =>
  seller?.shopType === 'service' && (seller.themeId || seller.theme?.selectedTheme) === 'homeworker';

export const readHomeworkerOrder = (order: Order): HomeworkerOrderData | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'homeworker' ? payload as HomeworkerOrderData : null;
  } catch {
    return null;
  }
};

export const formatDeadline = (deadline: string): string => {
  try {
    return new Date(deadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return deadline;
  }
};
