import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseAllowedHosts(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const uiHost = process.env.PHISHNET_UI_HOST ?? "127.0.0.1";
const uiPort = Number(process.env.PHISHNET_UI_PORT ?? 54321);
const apiPort = Number(process.env.VITE_API_PORT ?? 8787);
const lanMode = isTruthy(process.env.LAN_MODE);
const configuredAllowedHosts = parseAllowedHosts(
  process.env.PHISHNET_UI_ALLOWED_HOSTS,
);
const allowedHosts =
  configuredAllowedHosts.length > 0
    ? configuredAllowedHosts
    : lanMode
      ? true
      : undefined;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: uiHost,
    port: uiPort,
    strictPort: true,
    allowedHosts,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
      "/health": `http://127.0.0.1:${apiPort}`,
    },
  },
  preview: {
    host: uiHost,
    port: uiPort,
    strictPort: true,
    allowedHosts,
  },
});
