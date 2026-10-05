export const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'iyonicorp.com' || hostname.endsWith('.iyonicorp.com')) {
    return '/api';
  }

  return import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:2823/api' : '/api');
};

export const getApiOrigin = (): string => (
  new URL(getApiBaseUrl(), window.location.origin).origin
);
