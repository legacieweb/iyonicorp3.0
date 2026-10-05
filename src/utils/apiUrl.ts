export const getApiBaseUrl = (): string => (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:2823/api' : '/api')
);

export const getApiOrigin = (): string => (
  new URL(getApiBaseUrl(), window.location.origin).origin
);
