import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Utensils, Image as ImageIcon } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-[#1b4d3e] p-1.5 rounded-lg">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <span className="font-fresh text-2xl font-bold text-[#1b4d3e] pt-1">
            Lorena's Kitchen
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Current Menu</span>
            </button>
          </Link>

          <Link to="/gallery">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/gallery')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Meal Gallery</span>
            </button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
