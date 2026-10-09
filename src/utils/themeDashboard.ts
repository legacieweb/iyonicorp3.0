const THEME_DASHBOARD_ROUTES: Record<string, string> = {
  'event-planner': '/events/event-planner/admin',
  carnovga: '/events/event-planner/admin',
  tspp: '/tspp/owner',
  'aura-salon': '/salon/aura-salon/admin',
  'craft-collective': '/marketplace/craft-collective/admin',
  'point-of-sale': '/pos/point-of-sale/admin',
  'apex-pos': '/pos/apex-pos/admin',
  'pulse-fit': '/fit/pulse-fit/admin',
  'crown-stroke': '/pdp/crown-stroke/admin',
  evento: '/evento/admin',
  nlmsongs: '/nlmsongs/dashboard',
  ixstream: '/ixstream/dashboard',
  // Storefront and not-yet-routed service themes use the theme-configured seller workspace.
  'neon-pulse': '/seller/dashboard?tab=overview',
  'modern-ecommerce': '/seller/dashboard?tab=overview',
  'luxury-boutique': '/seller/dashboard?tab=overview',
  'beauty-store': '/seller/dashboard?tab=overview',
  'shoe-store': '/seller/dashboard?tab=overview',
  'jewelry-store': '/seller/dashboard?tab=overview',
  'bakery-store': '/seller/dashboard?tab=overview',
  'couture-store': '/seller/dashboard?tab=overview',
  'elite-consulting': '/seller/dashboard?tab=overview',
  'creative-studio': '/seller/dashboard?tab=overview',
  'modern-wellness': '/seller/dashboard?tab=overview',
  sms: '/sms/owner',
};

const THEME_CLIENT_DASHBOARD_ROUTES: Record<string, string> = {
  'event-planner': '/events/event-planner/client',
  carnovga: '/events/event-planner/client',
  'aura-salon': '/salon/aura-salon/client',
  'craft-collective': '/marketplace/craft-collective/vendor',
  evento: '/evento/client',
  'tamira-salon': '/salon/tamira-salon/client',
  'pulse-fit': '/fit/pulse-fit/client',
  'crown-stroke': '/pdp/crown-stroke/client',
  'homeworker': '/homeworker/student',
  'car-rental': '/car-rental/client',
  'restaurant': '/restaurant/client',
  'instagram-vip': '/restaurant/client',
  utorme: '/utorme/student',
  essayme: '/utorme/student',
  tspp: '/tspp/client',
  sms: '/sms/parent',
};

export const normalizeThemeId = (themeId?: string | null) => {
  const normalized = String(themeId || '').toLowerCase().trim();
  if (normalized === 'stillwater-spa') return 'spa-retreat';
  if (normalized === 'carnovga') return 'carnovga';
  return normalized;
};

export const getThemeDashboardRoute = (themeId?: string | null) => {
  const normalized = normalizeThemeId(themeId);
  return THEME_DASHBOARD_ROUTES[normalized] || '/seller/dashboard?tab=overview';
};

export const getThemeClientDashboardRoute = (themeId?: string | null) => {
  const normalized = normalizeThemeId(themeId);
  return THEME_CLIENT_DASHBOARD_ROUTES[normalized] || '/customer/dashboard';
};