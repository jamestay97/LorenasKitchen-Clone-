import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Automatically determines the return address based on the environment.
 * If Vite is in 'development' mode (npm run dev), it uses localhost.
 * Otherwise, it uses your production GitHub Pages URL.
 */
export const getRedirectURL = () => {
  // import.meta.env.DEV is a built-in Vite variable that is true during 'npm run dev'
  let url = import.meta.env.DEV 
    ? 'http://localhost:5173/' 
    : 'https://jamestay97.github.io/LorenasKitchen-Clone-/';
  
  // Ensure the URL ends with a slash to avoid path errors
  url = url.endsWith('/') ? url : `${url}/`;
  
  return url;
};