import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  // MAKE SURE THIS MATCHES YOUR REPO NAME EXACTLY (Case Sensitive!)
  base: "/LorenasKitchen-Clone-/", 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
