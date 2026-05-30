// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // <--- KABEL 1: Import Tailwind

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- KABEL 2: Masukkan ke plugin Vite
  ],
  server: {
    port: 5173,
  },
});