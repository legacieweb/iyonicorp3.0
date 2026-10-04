import { THEME_IDS, THEME_PRICE_USD_CENTS } from '../../shared/themePricing.js';

export const VIP_THEME_IDS = THEME_IDS;
export const THEME_PRICES_USD_CENTS = THEME_PRICE_USD_CENTS;
export const themePriceUsd = (themeId: string) => THEME_PRICES_USD_CENTS[themeId] / 100;

export const isVipTheme = (themeId?: string | null) => Boolean(themeId && VIP_THEME_IDS.has(themeId));