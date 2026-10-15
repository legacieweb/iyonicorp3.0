/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_COOLIFY_API_URL: string;
  readonly VITE_COOLIFY_API_TOKEN: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
