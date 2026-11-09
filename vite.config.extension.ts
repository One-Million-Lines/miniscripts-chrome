import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { resolve } from "path";
import { copyFileSync } from "fs";

function copyManifestPlugin() {
  return {
    name: "copy-manifest",
    closeBundle() {
      const manifestSrc = resolve(import.meta.dirname, "manifest.json");
      const manifestDest = resolve(import.meta.dirname, "dist/manifest.json");
      copyFileSync(manifestSrc, manifestDest);
    },
  };
}

// https://vitejs.dev/config/ - Extension build config
export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(import.meta.dirname, "src/background.ts"),
        contentRunner: resolve(import.meta.dirname, "src/contentRunner.ts"),
        sidepanel: resolve(import.meta.dirname, "sidepanel.html"),
        options: resolve(import.meta.dirname, "options.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  server: {
    hmr: {
      port: 24678,
    },
  },
});
