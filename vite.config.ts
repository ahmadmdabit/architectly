import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  base: isProd ? "/architectly/" : "/",
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(__dirname, "src/styles")],
      },
    },
    devSourcemap: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',     // Original entry
        '404': './404.html',      // Add 404 as second entry
      },
      output: {
        // manualChunks(id: string): string | undefined {
        //   if (id.includes("node_modules/marked") || id.includes("node_modules/dompurify")) return "vendor-md";
        //   if (id.includes("node_modules/i18next")) return "vendor-i18n";
        //   if (id.includes("node_modules/jspdf")) return "vendor-pdf";
        //   if (id.includes("node_modules/docx")) return "vendor-docx";
        //   return undefined;
        // },
        chunkFileNames: 'chunks/[name].[hash].js',
        entryFileNames: 'entries/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  server: { port: 5173, strictPort: false },
});
