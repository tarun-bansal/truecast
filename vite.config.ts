import { readFileSync } from "node:fs";
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// The version comes from package.json, the single source of truth:
// process.env.npm_package_version is only populated when the build runs
// through npm, so a direct `npx vite build` used to inject "0.0.0".
const { version: appVersion } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version?: string };

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // The About section shows the version only; the commit hash is not in the
  // bundle, so it is injected here at build time rather than hard-coded.
  define: {
    __APP_VERSION__: JSON.stringify(appVersion ?? "0.0.0"),
  },
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
    },
  },
  build: {
    outDir: "dist",
  },
})
