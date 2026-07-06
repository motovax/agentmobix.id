/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOBIX_API_KEY?: string;
  readonly VITE_MOBIX_API_BASE?: string;
  readonly VITE_MOBIX_IMAGE_BASE?: string;
  readonly VITE_STRAPI_API_KEY?: string;
  readonly VITE_CMS_API_BASE?: string;
  readonly VITE_CMS_IMAGE_BASE?: string;
  readonly VITE_DSF_BEARER_TOKEN?: string;
  readonly VITE_DSF_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
