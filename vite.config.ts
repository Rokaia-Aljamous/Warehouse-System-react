// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ProxyOptions } from "vite";

const LARAVEL_URL = "http://localhost:8000";

const laravelProxy = (opts?: Partial<ProxyOptions>): ProxyOptions => ({
  target: LARAVEL_URL,
  changeOrigin: true,
  configure: (proxy) => {
    proxy.on("proxyRes", (proxyRes) => {
      const loc = proxyRes.headers.location;
      if (typeof loc === "string" && loc.startsWith(LARAVEL_URL)) {
        proxyRes.headers.location = loc.replace(LARAVEL_URL, "");
      }
    });
  },
  ...opts,
});

const proxyRoutes: Record<string, ProxyOptions> = {
  "/sanctum": laravelProxy(),
  "/register": laravelProxy(),
  "/logout": laravelProxy(),
  "/forgot-password": laravelProxy(),
  "/reset-password": laravelProxy(),
  "/email": laravelProxy(),
  "/subscription-plans": laravelProxy(),
  "/tenants": laravelProxy(),
  "/checkout/paypal": laravelProxy(),
  "/tenant": laravelProxy(),
  "/platform": laravelProxy(),
  "/customers": laravelProxy(),
  "/platform-admin": laravelProxy(),
  "/verify-email": laravelProxy(),
  "/login": laravelProxy({
    bypass: (req) => {
      if (req.method === "GET") return req.url;
    },
  }),
  "/api": laravelProxy(),

  // Dashboard routes (/{slug}/login, /{slug}/warehouses, /{slug}/owner/warehouses, etc.)
  "^/([^/]+)/(?:owner/)?(login|logout|me|warehouses|products|shipments|force-password-change|forgot-password|reset-password|manager|keeper|inventory-movements)(/.*)?$": laravelProxy(),
};

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: proxyRoutes,
    },
  },
});
