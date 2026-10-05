export const getStorefrontUrl = (subdomain: string): string => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${window.location.origin}/?store=${encodeURIComponent(subdomain)}`;
  }

  const developmentDomain = hostname.endsWith('.test')
    ? hostname.split('.').slice(-2).join('.')
    : null;
  const domain = developmentDomain || 'iyonicorp.com';
  return `${window.location.protocol}//${subdomain}.${domain}`;
};
