import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; 
import { Link } from 'react-router-dom';
import { format } from 'date-fns';  // <-- Added this!
import { toast } from 'sonner';     // <-- Added this!

// Components
import MealCard from './MealCard';  // Correct path (one dot)
import InfoBar from './InfoBar';    // Correct path (one dot)

export default function Home() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('');
  
  // Suggestion State
  const [suggestionText, setSuggestionText] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  useEffect(() => {
    fetchCurrentMenu();
  }, []);

  const fetchCurrentMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no active menu, try to just get meals directly (fallback)
        const { data: mealData } = await supabase.from('meals').select('*').order('id');
        if (mealData) setMeals(mealData);
      } else if (data && data.meals) {
        setMeals(data.meals);
        if (data.week_start && data.week_end) {
            const start = format(new Date(data.week_start), 'MMM dd');
            const end = format(new Date(data.week_end), 'MMM dd');
            setDateRange(`${start} - ${end}`.toUpperCase());
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      toast.error('Please enter a suggestion');
      return;
    }

    setSendingSuggestion(true);

    try {
      const { error } = await supabase.from('suggestions').insert([
        {
          message: suggestionText, // Note: 'message' matches your DB column
          user_email: userEmail || null,
          status: 'new',
        },
      ]);

      if (error) throw error;

      toast.success('Thanks for your suggestion!');
      setSuggestionText('');
      setUserEmail('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send suggestion');
    } finally {
      setSendingSuggestion(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center font-script text-3xl text-[#1b4d3e]">
        Cooking up the menu...
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-20 px-4">
      {/* HEADER */}
      <div className="text-center mb-12 mt-8">
        <Link to="/login" className="inline-block">
          <h1 className="text-5xl md:text-6xl font-script text-[#1b4d3e] mb-2 hover:opacity-90 transform -rotate-2">
            Lorena's Home Cooked Meals
          </h1>
        </Link>
        <div className="inline-block bg-[#FFF0E6] text-[#FF9500] px-4 py-1 rounded-full text-xs font-bold tracking-wider border border-[#FFE0CC]">
          📅 MENU FOR {dateRange || 'THIS WEEK'}
        </div>
      </div>

      {/* MEALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {meals.map((meal, index) => (
          <MealCard key={meal.id || index} meal={meal} index={index} />
        ))}
      </div>

      {/* PRICING INFO BAR (Using the Component) */}
      <InfoBar />

      {/* VIEW GALLERY BUTTON */}
      <div className="flex justify-center mb-12 mt-12">
        <Link to="/gallery">
          <button className="bg-white border border-gray-300 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm">
            🖼️ View Gallery
          </button>
        </Link>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Suggestion Box */}
        <div className="bg-white p-8 rounded-[24px] border border-dashed border-gray-300 text-center">
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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm mb-2 focus:outline-none focus:border-[#1b4d3e]"
          />

          <textarea
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            placeholder="I'd love to see the Enchiladas again..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-[#1b4d3e] h-24 resize-none"
          />

          <button
            onClick={handleSendSuggestion}
            disabled={sendingSuggestion}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
          >
            {sendingSuggestion ? 'Sending...' : 'Send Suggestion'}
          </button>
        </div>

        {/* Past Menus Link */}
        <div className="bg-[#1b4d3e] p-8 rounded-[24px] text-center text-white flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
          <div className="relative z-10">
            <h3 className="font-script text-3xl mb-2">Past Menus</h3>
            <p className="text-xs text-gray-300 mb-6 max-w-xs mx-auto">
                Missed a week? Check out our archive of delicious home cooked meals.
            </p>
            <Link to="/gallery">
                <button className="bg-white/10 border border-white/30 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors backdrop-blur-sm">
                ↻ View Archive
                </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}