import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { cartographer } from "@replit/vite-plugin-cartographer";
import { devBanner } from "@replit/vite-plugin-dev-banner";
import viteImagemin from 'vite-plugin-imagemin';

const devPlugins =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
    ? [
        cartographer(),
        devBanner(),
      ]
    : [];

const enableSourceMaps = process.env.BUILD_SOURCEMAP === "true";
const enableImageMinify = process.env.BUILD_IMAGE_MINIFY === "true";

const manualChunkPackages: Array<[string, string[]]> = [
  ["vendor", ["react", "react-dom", "wouter"]],
  ["ui-core", ["@radix-ui/react-label", "@radix-ui/react-separator", "@radix-ui/react-slot"]],
  [
    "ui-overlays",
    [
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-dialog",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-popover",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
    ],
  ],
  [
    "ui-navigation",
    [
      "@radix-ui/react-accordion",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-tabs",
    ],
  ],
  [
    "ui-forms",
    [
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "cmdk",
    ],
  ],
  ["icons", ["lucide-react"]],
  ["query", ["@tanstack/react-query"]],
  ["forms", ["react-hook-form", "@hookform/resolvers", "zod", "zod-validation-error"]],
  ["state", ["zustand", "react-use"]],
  ["charts", ["recharts"]],
  ["pdf-jspdf", ["jspdf"]],
  ["pdf-html2canvas", ["html2canvas"]],
  ["maps", ["leaflet", "react-leaflet"]],
  ["date-fns", ["date-fns"]],
  ["animation", ["framer-motion", "motion"]],
];

function manualChunks(id: string) {
  if (!id.includes("node_modules")) return undefined;

  for (const [chunkName, packages] of manualChunkPackages) {
    if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`/node_modules/${pkg}\\`))) {
      return chunkName;
    }
  }

  if (id.includes("/node_modules/@mui/x-charts/")) {
    return "mui-charts";
  }
  if (
    id.includes("/node_modules/@mui/material/") ||
    id.includes("/node_modules/@mui/base/") ||
    id.includes("/node_modules/@mui/x-date-pickers/") ||
    id.includes("/node_modules/dayjs/") ||
    id.includes("/node_modules/@emotion/react/") ||
    id.includes("/node_modules/@emotion/styled/")
  ) {
    return "mui";
  }
  if (
    id.includes("/node_modules/@dnd-kit/core/") ||
    id.includes("/node_modules/@dnd-kit/sortable/") ||
    id.includes("/node_modules/@dnd-kit/utilities/")
  ) {
    return "dnd-kit";
  }
  if (id.includes("/node_modules/@base-ui/react/")) {
    return "base-ui";
  }

  return undefined;
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(enableImageMinify
      ? [
          viteImagemin({
            gifsicle: { optimizationLevel: 7, interlaced: false },
            optipng: { optimizationLevel: 7 },
            mozjpeg: { quality: 80 },
            pngquant: { quality: [0.8, 0.9], speed: 4 },
            svgo: {
              plugins: [
                { name: 'removeViewBox' },
                { name: 'removeEmptyAttrs', active: false },
              ],
            },
            webp: { quality: 75 },
          }),
        ]
      : []),
    ...devPlugins,
  ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    css: {
      postcss: {
        plugins: [],
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      sourcemap: enableSourceMaps,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 450,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      // When Vite runs in Express middleware mode (see `server/vite.ts`),
      // it still needs to know which port the HMR websocket client should use.
      port: Number(process.env.PORT || 5000),
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["../tests/setup/vitest.setup.ts"],
    include: ["../tests/unit/**/*.test.ts", "../tests/unit/**/*.test.tsx"],
    css: true,
  },
});
