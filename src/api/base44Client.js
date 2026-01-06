import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase
// We will set these variables in the next step
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Helper to map "base44" syntax to Supabase syntax
const createEntityHandler = (tableName) => ({
  list: async (sort = '-created_date', limit = 100) => {
    let query = supabase.from(tableName).select('*');
    // Handle sorting
    if (sort) {
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.substring(1) : sort;
        query = query.order(column, { ascending: !isDesc });
    }
    if (limit) query = query.limit(limit);
    
    const { data, error } = await query;
    if (error) {
        console.error(`Error listing ${tableName}:`, error);
        return [];
    }
    return data;
  },

  filter: async (criteria) => {
    let query = supabase.from(tableName).select('*');
    Object.entries(criteria).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) {
        console.error(`Error filtering ${tableName}:`, error);
        return [];
    }
    return data;
  },

  create: async (data) => {
    // Remove ID if it's empty so Supabase generates one
    if (data.id === '') delete data.id;
    
    const { data: result, error } = await supabase.from(tableName).insert(data).select().single();
    if (error) throw error;
    return result;
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase.from(tableName).update(data).eq('id', id).select();
    if (error) throw error;
    return result;
  },

  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
});

// 3. The "Base44" Adapter Object
export const base44 = {
  entities: {
    Menu: createEntityHandler('Menu'),
    Recipe: createEntityHandler('Recipe'),
    Client: createEntityHandler('Client'),
    Suggestion: createEntityHandler('Suggestion'),
    Admin: createEntityHandler('Admin'),
    Photo: createEntityHandler('Photo'),
  },

  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) user.role = 'authenticated';
      return user;
    },
    // MAKE SURE THIS FUNCTION IS HERE:
    signInWithOtp: async ({ email }) => {
      return await supabase.auth.signInWithOtp({ email });
    },
    redirectToLogin: (redirectUrl) => {
        window.location.href = '/login'; 
    },
    signOut: async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    }
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const { data, error } = await supabase.storage
          .from('images') // Make sure you created this bucket in Supabase!
          .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);
          
        return { file_url: publicUrl };
      },
      // IMPORTANT: InvokeLLM cannot run securely in the browser.
      // You must replace this with a Supabase Edge Function later.
      InvokeLLM: async ({ prompt }) => {
        console.warn("InvokeLLM is currently running in 'Offline Mode'.");
        return { 
          calories: 600, 
          total_fat: 22, 
          saturated_fat: 8, 
          cholesterol: 65,
          sodium: 850, 
          total_carbs: 75, 
          fiber: 8, 
          sugars: 12, 
          protein: 35 
        };
      }
    }
  }
};