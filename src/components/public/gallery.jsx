import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Loader2, Image as ImageIcon, ArrowLeft, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      console.log("Loading gallery...");

      // 1. Fetch from 'gallery_images' (Manual Uploads)
      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (galleryError) console.error("Gallery Error:", galleryError);

      // 2. Fetch from 'meals' (Your Menu Items)
      // We check for both 'image_main' (new 3-image style) and 'image_url' (old style)
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .select('image_main, image_url, title')
        .or('image_main.neq.null,image_url.neq.null');

      if (mealError) console.error("Meal Error:", mealError);

      // 3. Combine Them
      let combined = [];

      // Process Gallery Uploads
      if (galleryData && galleryData.length > 0) {
        const manualImages = galleryData.map(item => ({
            id: `gal-${item.id}`,
            url: item.image_url,
            title: item.title,
            source: 'Gallery'
        }));
        combined = [...combined, ...manualImages];
      }

      // Process Menu Meals
      if (mealData && mealData.length > 0) {
         const mealImages = mealData.map((m, idx) => ({
             id: `meal-${idx}`,
             url: m.image_main || m.image_url, // Prefer new Main Image
             title: m.title,
             source: 'Menu'
         })).filter(img => img.url); // Safety check to remove empties
         
         combined = [...combined, ...mealImages];
      }

      console.log("Total Images Found:", combined.length);
      setImages(combined);

    } catch (error) {
      console.error('Critical Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-[#fcfdfa]">
        <Loader2 className="w-10 h-10 animate-spin text-[#1b4d3e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfa] pt-10 pb-20 px-4 font-sans text-slate-800">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1b4d3e] mb-4">
            The Gallery
          </h1>
          <p className="text-stone-500 max-w-2xl mx-auto text-lg">
            A visual collection of our fresh, homemade meals. 
          </p>
        </div>

        {/* Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
            {images.map((img) => (
              <div 
                key={img.id} 
                className="group relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-100 hover:shadow-xl transition-all duration-300"
              >
                <img 
                  src={img.url} 
                  alt={img.title || 'Food gallery image'} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
                    {img.source === 'Menu' ? <Utensils className="w-3 h-3 inline mr-1"/> : <ImageIcon className="w-3 h-3 inline mr-1"/>}
                    {img.source}
                  </span>
                  <p className="text-white font-medium text-lg drop-shadow-md transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 line-clamp-2">
                    {img.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 text-stone-400 bg-white rounded-3xl border-2 border-dashed border-stone-200">
            <div className="bg-stone-50 p-6 rounded-full mb-4">
              <ImageIcon className="w-12 h-12 text-stone-300" />
            </div>
            <p className="text-lg font-medium text-stone-500">No images found in Library or Menu.</p>
            <Link to="/" className="mt-6 text-[#1b4d3e] font-bold hover:underline flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back Home
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 text-center border-t border-stone-200 pt-10">
            <p className="text-stone-500 mb-6">See something you like?</p>
            <Link 
                to="/"
                className="inline-block bg-[#1b4d3e] text-white px-8 py-3 rounded-full font-bold hover:bg-[#153a2f] transition-colors shadow-lg shadow-[#1b4d3e]/20"
            >
                Order from Weekly Menu
            </Link>
        </div>
      </div>
    </div>
  );
}