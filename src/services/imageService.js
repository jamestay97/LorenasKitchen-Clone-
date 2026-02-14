import { supabase } from '../supabaseClient';

export const generateAndUploadMealImage = async (main, side1, side2) => {
  const mainItem = (main || '').trim();
  if (!mainItem) return null;

  try {
    // Calling your specific VIP Edge Function
    const { data, error } = await supabase.functions.invoke('pollinations-image', {
      body: { 
        prompt: `gourmet main dish, ${mainItem}, professional food photography, 4k`,
        width: 1024,
        height: 768
      }
    });

    if (error) throw error;
    return data.publicUrl; 
  } catch (err) {
    console.error("Image Service Error:", err);
    return null;
  }
};