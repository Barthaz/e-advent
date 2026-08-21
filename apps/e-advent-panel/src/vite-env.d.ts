/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STOREFRONT_URL: string;
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
