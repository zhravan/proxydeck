/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Repo root `package.json` `version`, injected in `vite.config.ts`. */
  readonly VITE_PROXYDECK_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
