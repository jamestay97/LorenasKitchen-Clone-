import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function Gallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      const [menusRes, galleryRes] = await Promise.all([
        supabase.from('menus').select('*, meals(*)').order('week_start', { ascending: false }).limit(50),
        supabase.from('gallery_images').select('*').order('created_at', { ascending: false }).limit(50).then((r) => r).catch(() => ({ data: [] })),
      ])

      const allMeals = (menusRes?.data || []).flatMap((menu) => {
        if (!menu.meals || !Array.isArray(menu.meals)) return []
        return menu.meals.map((meal) => ({
          ...meal,
          menuDate: menu.week_start,
          week_end: menu.week_end,
        }))
      })
      const validMeals = allMeals.filter((m) => m.title && m.title.length > 2)

      const galleryItems = (galleryRes?.data || []).map((g) => ({
        id: g.id,
        title: g.title || 'Gallery',
        image_main: g.image_url,
        main_img: g.image_url,
        menuDate: g.created_at,
        side: null,
        side2: null,
      })).filter((g) => g.image_main || g.main_img)

      setPhotos([...validMeals, ...galleryItems])
    } catch (error) {
      console.error('Gallery Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-20 px-6 sm:px-8 max-w-7xl mx-auto">
      <div className="text-center py-14">
        <h1 className="text-4xl sm:text-5xl font-script font-bold text-[#1b4d3e] mb-2">
          Historical Meal Viewer
        </h1>
        <p className="text-stone-500 max-w-lg mx-auto">
          A collection of past culinary creations—browse what's been on the menu.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {photos.map((meal, idx) => (
            <GalleryItem key={idx} meal={meal} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

function GalleryItem({ meal, index }) {
  const [loaded, setLoaded] = useState(false)
  const mainImg = meal.image_main ?? meal.main_img
  const fallbackUrl = mainImg
    ? null
    : `https://image.pollinations.ai/prompt/gourmet%20food%20photography%2C%20${encodeURIComponent(
        [meal.title, meal.side, meal.side2].filter(Boolean).join(' ')
      )}?width=600&height=800&nologo=true&model=flux&seed=${index + 1}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-lg border border-stone-100 mb-6 group"
    >
      <div className="relative bg-stone-100 min-h-[200px]">
        <img
          src={mainImg || fallbackUrl}
          alt={meal.title}
          className={`w-full h-auto object-cover transition-all duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
          <div>
            <p className="text-white font-bold text-lg">{meal.title}</p>
            {(meal.side || meal.side2) && (
              <p className="text-white/80 text-sm">
                {[meal.side, meal.side2].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
