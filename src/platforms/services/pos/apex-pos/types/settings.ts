import type { Seller } from '../../../../../services/api';

export interface PosSettings {
  currency: string;
  taxRate: number;
  serviceCharge: number;
  rounding: 'none' | 'up' | 'down' | 'nearest';
  tipSuggestions: number[];
  tableCount: number;
  sectionCount: number;
  receiptHeader: string;
  receiptFooter: string;
  autoPrintReceipts: boolean;
  requireCustomerInfo: boolean;
  showImages: boolean;
  compactLayout: boolean;
  kitchenDisplayMode: 'list' | 'grid';
  enableSplitBills: boolean;
  enableLoyalty: boolean;
  enableTableManagement: boolean;
  enableEmployeeLogin: boolean;
  enableOfflineMode: boolean;
  printerName?: string;
  language: string;
  timezone: string;
  kitchenCategories: string[];
  enableShifts: boolean;
  enableModifiers: boolean;
}

export const DEFAULT_TIP_SUGGESTIONS = [15, 18, 20, 25];

export const DEFAULT_POS_SETTINGS: PosSettings = {
  currency: 'USD',
  taxRate: 8.75,
  serviceCharge: 0,
  rounding: 'nearest',
  tipSuggestions: DEFAULT_TIP_SUGGESTIONS,
  tableCount: 16,
  sectionCount: 2,
  receiptHeader: 'Thank you for dining with us!',
  receiptFooter: 'We look forward to serving you again.',
  autoPrintReceipts: false,
  requireCustomerInfo: false,
  showImages: true,
  compactLayout: false,
  kitchenDisplayMode: 'list',
  enableSplitBills: true,
  enableLoyalty: true,
  enableTableManagement: true,
  enableEmployeeLogin: true,
  enableOfflineMode: false,
  language: 'en',
  timezone: 'America/New_York',
  kitchenCategories: ['All'],
  enableShifts: false,
  enableModifiers: true,
};

export const getPosSettings = (seller?: Seller | null): PosSettings => {
  const saved = seller?.theme?.customizations?.apexPos || {};
  const merged = { ...DEFAULT_POS_SETTINGS, ...saved };
  if (merged.currency === 'USD' && seller?.currency) {
    merged.currency = seller.currency;
  }
  return merged;
};

export const savePosSettings = (seller: Seller, settings: PosSettings): Partial<Seller> => ({
  theme: {
    ...seller.theme,
    customizations: {
      ...seller.theme?.customizations,
      apexPos: settings,
    },
  },
});
