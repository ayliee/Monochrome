import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: dir,
  publicDir: path.join(dir, "public"),
  build: {
    outDir: path.join(dir, "www"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
