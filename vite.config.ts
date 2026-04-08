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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
          "vendor-motion": ["framer-motion"],
          "vendor-ui": ["lucide-react"],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-forms": ["react-hook-form", "zod", "@hookform/resolvers"],
        },
      },
    },
    chunkSizeWarningLimit: 400,
    minify: "esbuild",
  },
}));
