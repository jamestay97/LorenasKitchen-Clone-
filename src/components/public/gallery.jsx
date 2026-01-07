import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      // 1. Fetch all menus (history)
      const menus = await base44.entities.Menu.list('-created_date', 50);
      
      // 2. Extract all meals from all menus into one big list
      const allMeals = menus.flatMap(menu => {
         if (!menu.meals || !Array.isArray(menu.meals)) return [];
         return menu.meals.map(meal => ({
            ...meal,
            menuDate: menu.week_start // Keep track of when this meal was served
         }));
      });

      // 3. Filter out empty ones and remove duplicates (optional)
      const validMeals = allMeals.filter(m => m.title && m.title.length > 2);
      
      setPhotos(validMeals);
    } catch (e) {
      console.error("Gallery Error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="text-center py-10">
        <h1 className="text-4xl font-fresh text-[#1b4d3e] mb-2">The Vault</h1>
        <p className="text-gray-500">A collection of our past culinary creations</p>
      </div>

      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 px-4">
          {photos.map((meal, idx) => (
            <GalleryItem key={idx} meal={meal} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

// A mini-component for each photo
function GalleryItem({ meal, index }) {
  const [loaded, setLoaded] = useState(false);

  // Reconstruct the AI Image URL
  const seed = meal.image_seed || Math.floor(Math.random() * 1000) + index;
  const fullPrompt = `${meal.title} ${meal.side ? 'with ' + meal.side : ''}`;
  const imageUrl = `https://image.pollinations.ai/prompt/gourmet food photography, ${encodeURIComponent(fullPrompt)}?seed=${seed}&width=600&height=800&nologo=true&model=flux`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 mb-6 group"
    >
      <div className="relative bg-gray-100 min-h-[200px]">
        <img 
            src={imageUrl} 
            alt={meal.title}
            className={`w-full h-auto object-cover transition-all duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
            onLoad={() => setLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <p className="text-white font-bold">{meal.title}</p>
        </div>
      </div>
    </motion.div>
  );
}