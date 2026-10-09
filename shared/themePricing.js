export const THEME_PRICE_USD_CENTS = Object.freeze({
  'neon-pulse': 3000,
  'modern-ecommerce': 4500,
  'beauty-store': 5000,
  'shoe-store': 5500,
  'bakery-store': 5500,
  'jewelry-store': 6500,
  'couture-store': 9000,
  'luxury-boutique': 10000,
  'creative-studio': 15000,
  'elite-consulting': 16000,
  'modern-wellness': 17000,
  'tamira-salon': 17500,
  'spa-retreat': 18000,
  'aura-salon': 20000,
  'craft-collective': 22000,
  'point-of-sale': 24000,
  'apex-pos': 30000,
  'event-planner': 22000,
  carnovga: 22000,
  'instagram-vip': 30000,
  'car-rental': 35000,
  'restaurant': 40000,
  'pulse-fit': 45000,
  'crown-stroke': 35000,
  'nlmsongs': 50000,
  'utorme': 55000,
  'evento': 60000,
  'homeworker': 65000,
  'ixstream': 80000,
  tspp: 150000,
  sms: 180000,
});

export const THEME_IDS = new Set(Object.keys(THEME_PRICE_USD_CENTS));

export const isValidThemePrice = (amountCents) =>
  Number.isInteger(amountCents) && amountCents >= 3000 && amountCents <= 180000;
