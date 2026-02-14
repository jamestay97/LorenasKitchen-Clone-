import { createClient } from '@supabase/supabase-js'

// In Vite, we use import.meta.env instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ✅ NEW: Helper function to get the correct URL for redirects
export const getRedirectURL = () => {
  // If running locally (npm run dev), use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:5173';
  }
  // If running in production (GitHub Pages), use your live URL
  // Make sure this matches your actual GitHub Pages URL exactly!
  return 'https://jamestay97.github.io/LorenasKitchen-Clone-/';
}