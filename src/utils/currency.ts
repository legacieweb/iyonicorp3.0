export const formatPrice = (price: number | string, currency: string = 'USD') => {
  const amount = Number(price) || 0;
  const upperCurrency = currency.toUpperCase();
  
  // Choose locale based on currency for better symbol handling
  let locale = 'en-US';
  if (upperCurrency === 'KES') locale = 'en-KE';
  if (upperCurrency === 'EUR') locale = 'de-DE';
  if (upperCurrency === 'GBP') locale = 'en-GB';
  if (upperCurrency === 'NGN') locale = 'en-NG';
  if (upperCurrency === 'GHS') locale = 'en-GH';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: upperCurrency,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${upperCurrency} ${amount.toFixed(2)}`;
  }
};

export const timeAgo = (value: string | number | Date) => {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return 'just now';
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  if (elapsedSeconds < 2_592_000) return `${Math.floor(elapsedSeconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};
