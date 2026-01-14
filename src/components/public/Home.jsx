import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Link } from 'react-router-dom'
import MealCard from '../components/MealCard'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function Home() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('')
  const [suggestionText, setSuggestionText] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sendingSuggestion, setSendingSuggestion] = useState(false)

  useEffect(() => {
    fetchCurrentMenu()
  }, [])

  const fetchCurrentMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error

      if (data && data.meals) {
        setMeals(data.meals)
        const start = format(new Date(data.week_start), 'MMM dd')
        const end = format(new Date(data.week_end), 'MMM dd')
        setDateRange(`${start} - ${end}`.toUpperCase())
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      toast.error('Please enter a suggestion')
      return
    }

    setSendingSuggestion(true)

    try {
      const { error } = await supabase.from('suggestions').insert([
        {
          content: suggestionText,
          user_email: userEmail || null,
          status: 'new',
        },
      ])

      if (error) throw error

      toast.success('Thanks for your suggestion!')
      setSuggestionText('')
      setUserEmail('')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to send suggestion')
    } finally {
      setSendingSuggestion(false)
    }
  }

  if (loading) {
    return (
      <div className="p-20 text-center font-script text-3xl text-[#1b4d3e]">
        Cooking up the menu...
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-20 px-4">
      <div className="text-center mb-12 mt-8">
        <Link to="/login" className="inline-block">
          <h1 className="text-5xl md:text-6xl font-script text-[#1b4d3e] mb-2 hover:opacity-90">
            Lorena's Home Cooked Meals
          </h1>
        </Link>
        <div className="inline-block bg-[#FFF0E6] text-[#FF9500] px-4 py-1 rounded-full text-xs font-bold tracking-wider border border-[#FFE0CC]">
          📅 MENU FOR {dateRange || 'THIS WEEK'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {meals.map((meal, index) => (
          <MealCard key={meal.id || index} meal={meal} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center border-t border-gray-200 pt-8 mb-12">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            PRICING
          </h3>
          <p className="text-lg font-bold text-[#1b4d3e]">
            $150 <span className="text-sm font-normal text-gray-500">/ 10 meals</span>
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            TO ORDER
          </h3>
          <p className="text-sm font-bold text-gray-700">📱 Text (813) 426-5096</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            PAYMENT
          </h3>
          <p className="text-sm font-bold text-gray-700">Zelle / Apple Cash</p>
          <p className="text-xs text-gray-400">lorenaolivar03@gmail.com</p>
        </div>
      </div>

      <div className="flex justify-center mb-12">
        <Link to="/gallery">
          <button className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            🖼️ View Gallery
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-300 text-center">
          <h3 className="font-script text-2xl text-[#1b4d3e] mb-2">
            Make a Suggestion
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Have a meal you'd love to see again?
          </p>

          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com (optional)"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-2 focus:outline-none focus:border-[#1b4d3e]"
          />

          <textarea
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            placeholder="I'd love to see the Enchiladas again..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:border-[#1b4d3e] h-24 resize-none"
          />

          <button
            onClick={handleSendSuggestion}
            disabled={sendingSuggestion}
            className="w-full bg-[#9CA3AF] text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-500 transition-colors disabled:opacity-50"
          >
            {sendingSuggestion ? 'Sending...' : 'Send Suggestion'}
          </button>
        </div>

        <div className="bg-[#1b4d3e] p-8 rounded-3xl text-center text-white flex flex-col justify-center items-center">
          <h3 className="font-script text-2xl mb-2">Past Menus</h3>
          <p className="text-xs text-gray-300 mb-6 max-w-xs">
            Missed a week? Check out our archive of delicious home cooked meals.
          </p>
          <Link to="/gallery">
            <button className="border border-white/30 text-white px-6 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
              ↻ View Archive
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
