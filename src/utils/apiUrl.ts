export const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (!configuredUrl) return import.meta.env.DEV ? 'http://localhost:2823/api' : '/api';

  try {
    const url = new URL(configuredUrl, window.location.origin);
    // Product subdomains must call the shared API host. Correct the malformed
    // api.<product>.api.iyonicorp.com value that can be left in a product build.
    if (/^api\.[^.]+\.api\.iyonicorp\.com$/i.test(url.hostname)) {
      url.hostname = 'api.iyonicorp.com';
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
};

export const getApiOrigin = (): string => (
  new URL(getApiBaseUrl(), window.location.origin).origin
);
