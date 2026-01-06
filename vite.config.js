import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/LorenasKitchen-Clone-/', // THIS MUST MATCH YOUR GITHUB REPO NAME
})