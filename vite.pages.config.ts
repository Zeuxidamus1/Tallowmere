import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "pages",
  base: "/Tallowmere/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
