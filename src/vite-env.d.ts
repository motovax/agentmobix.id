/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Production API proxy base (Cloudflare Worker URL). Empty in dev. */
  readonly VITE_MOBIX_PROXY?: string;
  /** Production image origin for /unit-file-serve. Empty in dev. */
  readonly VITE_MOBIX_IMAGE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
