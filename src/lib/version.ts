/**
 * The app version, injected at build time from package.json via the
 * `__APP_VERSION__` define in vite.config.ts. Never hard-code a version (or a
 * commit hash) in source — the bundle has no hash to show.
 */
declare const __APP_VERSION__: string;

export const APP_VERSION: string = __APP_VERSION__;
