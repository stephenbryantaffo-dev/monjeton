import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Mon Jeton",
        short_name: "Mon Jeton",
        description: "Tu vas voir clair dans ton jeton !",
        theme_color: "#4a9a1e",
        background_color: "#0a1a0d",
        display: "standalone",
        start_url: "/",
        orientation: "portrait",
        icons: [
          { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes("node_modules")) return;
          // Keep React + React-DOM + Router + Query together to avoid
          // "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED" errors
          // caused by react-dom loading before react when split apart.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/") ||
            id.includes("@tanstack/react-query")
          ) {
            return "vendor-react";
          }
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@radix-ui") || id.includes("lucide-react")) return "vendor-ui";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) {
            return "vendor-forms";
          }
        },
      },
    },
    chunkSizeWarningLimit: 400,
    minify: "esbuild",
  },
}));
