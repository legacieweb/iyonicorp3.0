export type VipAuthTheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  surface: string;
  headline: string;
  description: string;
};

const VIP_AUTH_THEMES: Record<string, VipAuthTheme> = {
  'event-planner': {
    id: 'event-planner',
    name: 'Carnovga',
    primary: '#c9a66b',
    secondary: '#0a192f',
    surface: '#f8f6f2',
    headline: 'Plan moments that matter.',
    description: 'Sign in to your event workspace and keep every detail moving with purpose.'
  },
  carnovga: {
    id: 'carnovga',
    name: 'Carnovga',
    primary: '#c9a66b',
    secondary: '#0a192f',
    surface: '#f8f6f2',
    headline: 'Plan moments that matter.',
    description: 'Sign in to your event workspace and keep every detail moving with purpose.'
  },
  'aura-salon': {
    id: 'aura-salon',
    name: 'Aura Salon',
    primary: '#c9a37a',
    secondary: '#1a1a18',
    surface: '#f8f6f2',
    headline: 'Make space for yourself.',
    description: 'Sign in to your salon workspace and keep your day moving with care.'
  },
  'craft-collective': {
    id: 'craft-collective',
    name: 'Craft Collective',
    primary: '#ed685d',
    secondary: '#1a1a18',
    surface: '#f8f6f2',
    headline: 'Where craft meets market.',
    description: 'Sign in to your marketplace desk and manage vendors, orders, and community.'
  },
  'tamira-salon': {
    id: 'tamira-salon',
    name: 'Tamira Salon',
    primary: '#ed685d',
    secondary: '#102b25',
    surface: '#f1f8f4',
    headline: 'Make room for yourself.',
    description: 'Sign in to your salon workspace and keep your day moving with care.'
  },
  'elite-consulting': {
    id: 'elite-consulting',
    name: 'Elite Consulting',
    primary: '#38b9ad',
    secondary: '#102a32',
    surface: '#eef5f4',
    headline: 'Lead with clarity.',
    description: 'Your client work, requests, and business insights are ready when you are.'
  },
  'creative-studio': {
    id: 'creative-studio',
    name: 'Creative Studio',
    primary: '#ff8068',
    secondary: '#241b1a',
    surface: '#f7f2ed',
    headline: 'Make good work happen.',
    description: 'Step into your studio workspace and bring the next idea to life.'
  },
  'modern-wellness': {
    id: 'modern-wellness',
    name: 'Modern Wellness',
    primary: '#88a94c',
    secondary: '#153d34',
    surface: '#f3f7ef',
    headline: 'A little more balance.',
    description: 'Sign in to care for your practice, your clients, and your time.'
  },
  utorme: {
    id: 'utorme',
    name: 'tutorme',
    primary: '#d8ef81',
    secondary: '#174b40',
    surface: '#f4f8ec',
    headline: 'Teach what moves them.',
    description: 'Sign in to your tutoring studio and help students make progress.'
  },
  nlmsongs: {
    id: 'nlmsongs',
    name: 'NLM Songs',
    primary: '#c9f75a',
    secondary: '#151710',
    surface: '#f3f0e7',
    headline: 'Your room. Your sound.',
    description: 'Sign in to return to your music, library, and listening space.'
  },
  restaurant: {
    id: 'restaurant',
    name: 'The Restaurant',
    primary: '#e63946',
    secondary: '#0d0d0d',
    surface: '#fdfbf8',
    headline: 'Welcome to your kitchen.',
    description: 'Sign in to manage your menu, reservations, and orders from your restaurant workspace.'
  },
  'instagram-vip': {
    id: 'instagram-vip',
    name: 'Instagram VIP',
    primary: '#833ae5',
    secondary: '#0d0d0d',
    surface: '#fdfbf8',
    headline: 'Welcome back, chef.',
    description: 'Sign in to manage your luxury restaurant storefront and reservations.'
  },
  'point-of-sale': {
    id: 'point-of-sale',
    name: 'Point of Sale',
    primary: '#7c3609',
    secondary: '#1a1a1a',
    surface: '#f5f5f5',
    headline: 'Welcome to your terminal.',
    description: 'Sign in to manage your POS dashboard, menu items, and orders from your point-of-sale workspace.'
  },
  'apex-pos': {
    id: 'apex-pos',
    name: 'Apex POS',
    primary: '#fbbf24',
    secondary: '#08111d',
    surface: '#111827',
    headline: 'Run a sharper service floor.',
    description: 'Sign in to power your retail and hospitality business with premium speed, clarity, and control.'
  },
  tspp: {
    id: 'tspp',
    name: 'TSPP',
    primary: '#a87a2a',
    secondary: '#0a2633',
    surface: '#f8fafc',
    headline: 'Verified teachers. Trusted schools.',
    description: 'Sign in to your TSPP workspace and manage verified hiring, shortlists, and interviews.'
  },
};

const getVipThemeFromTarget = (pathname: string, params: URLSearchParams) => {
  const candidate = params.get('vipTheme') || params.get('theme') || params.get('apply') || params.get('platform');
  if (candidate && VIP_AUTH_THEMES[candidate.toLowerCase()]) return VIP_AUTH_THEMES[candidate.toLowerCase()];
  if (pathname.startsWith('/nlmsongs')) return VIP_AUTH_THEMES.nlmsongs;
  if (pathname.startsWith('/events/carnovga') || pathname.startsWith('/events/event-planner')) return VIP_AUTH_THEMES['event-planner'];
  if (pathname.startsWith('/salon/aura-salon')) return VIP_AUTH_THEMES['aura-salon'];
  if (pathname.startsWith('/marketplace/craft-collective')) return VIP_AUTH_THEMES['craft-collective'];
  if (pathname.startsWith('/pos/point-of-sale')) return VIP_AUTH_THEMES['point-of-sale'];
  if (pathname.startsWith('/pos/apex-pos')) return VIP_AUTH_THEMES['apex-pos'];
  if (pathname.startsWith('/salon/tamira-salon')) return VIP_AUTH_THEMES['tamira-salon'];
  if (pathname.startsWith('/utorme')) return VIP_AUTH_THEMES.utorme;
  if (pathname.startsWith('/tspp')) return VIP_AUTH_THEMES.tspp;
  return null;
};

export const getVipAuthTheme = (pathname: string, search: string, sellerThemeId?: string | null) => {
  const params = new URLSearchParams(search);
  const currentTheme = getVipThemeFromTarget(pathname, params);
  if (currentTheme) return currentTheme;

  const sellerTheme = VIP_AUTH_THEMES[String(sellerThemeId || '').toLowerCase().trim()];
  if (sellerTheme) return sellerTheme;

  const redirect = params.get('redirect');
  if (!redirect) return null;

  try {
    const target = new URL(redirect, window.location.origin);
    return getVipThemeFromTarget(target.pathname, target.searchParams);
  } catch {
    return null;
  }
};