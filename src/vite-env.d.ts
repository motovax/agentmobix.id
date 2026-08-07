/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOBIX_API_KEY?: string;
  readonly VITE_MOBIX_MRP_API_KEY?: string;
  readonly VITE_MOBIX_API_BASE?: string;
  readonly VITE_MOBIX_IMAGE_BASE?: string;
  readonly VITE_STRAPI_API_KEY?: string;
  readonly VITE_CMS_API_BASE?: string;
  readonly VITE_CMS_IMAGE_BASE?: string;
  readonly VITE_FALCON_API_BASE?: string;
  readonly VITE_FALCON_SSE_URL?: string;
  readonly VITE_FALCON_CLIENT?: string;
  readonly VITE_FALCON_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
