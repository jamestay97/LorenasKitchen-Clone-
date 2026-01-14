import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function MealCard({ meal, index }) {
  const [imageLoaded, setImageLoaded] = useState(false)

  const seed = meal.image_seed || Math.floor(Math.random() * 1000) + index
  const mainPrompt = meal.title || 'gourmet meal'
  const sidesText = [meal.side, meal.side2].filter(Boolean).join(', ')
  const fullPrompt = sidesText ? `${mainPrompt} with ${sidesText}` : mainPrompt

  const imageUrl = `https://image.pollinations.ai/prompt/gourmet food dish, ${encodeURIComponent(
    fullPrompt
  )}?seed=${seed}&width=800&height=600&nologo=true&model=flux`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-[20px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 border border-black/5"
    >
      <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt={meal.title}
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#1b4d3e] shadow-sm">
          Day {index + 1}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-fresh text-3xl text-[#1b4d3e] leading-none mb-2">
          {meal.title}
        </h3>

        <div className="space-y-1 mb-6 flex-grow">
          {meal.side && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#82a898]" />
              {meal.side}
            </div>
          )}
          {meal.side2 && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#82a898]" />
              {meal.side2}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-400 font-medium">Chef's Special</div>
        </div>
      </div>
    </motion.div>
  )
}
