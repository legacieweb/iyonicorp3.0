/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_COOLIFY_API_URL: string;
  readonly VITE_COOLIFY_API_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
