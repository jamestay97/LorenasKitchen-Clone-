import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Default index to 0 if not provided
export default function MealCard({ meal, index = 0 }) {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Fallback if seed isn't set
  const seed = meal.image_seed || Math.floor(Math.random() * 1000)
  
  // Clean up side dishes string
  const sidesText = [meal.side, meal.side2].filter(Boolean).join(', ')
  const description = meal.description || "Freshly prepared homemade meal."

  // Use the saved URL if available, otherwise generate one
  // Note: Using seed in Unsplash URL ensures consistency
  const displayImage = meal.image_url || `https://source.unsplash.com/800x600/?food,dinner&sig=${seed}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-[24px] shadow-xl shadow-stone-200/50 overflow-hidden flex flex-col h-full hover:-translate-y-2 transition-transform duration-300 border border-stone-100 group"
    >
      <div className="relative h-64 w-full bg-stone-100 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-stone-300">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        <img
          src={displayImage}
          alt={meal.title}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-[#1b4d3e] shadow-sm tracking-wide uppercase">
          Chef's Selection
        </div>
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3">
            <h3 className="font-serif text-2xl font-bold text-[#1b4d3e] leading-tight">
            {meal.title}
            </h3>
            <span className="bg-[#e6f0eb] text-[#1b4d3e] px-3 py-1 rounded-lg text-sm font-bold">
                ${meal.price}
            </span>
        </div>

        <p className="text-stone-500 mb-6 leading-relaxed line-clamp-3 flex-grow">
            {description}
        </p>

        <div className="pt-6 border-t border-stone-100">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Served With</p>
          <div className="flex flex-wrap gap-2">
             {sidesText ? (
                 <span className="text-stone-700 font-medium">{sidesText}</span>
             ) : (
                 <span className="text-stone-400 italic">No sides specified</span>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}