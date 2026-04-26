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
