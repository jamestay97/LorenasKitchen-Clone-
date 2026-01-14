import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  // REPLACE 'LorenasKitchen-Clone-' WITH YOUR EXACT REPO NAME
  base: "/LorenasKitchen-Clone-/", 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})