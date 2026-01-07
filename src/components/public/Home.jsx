import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';

const Home = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuDate, setMenuDate] = useState('JAN 04 - JAN 10'); // Default date
  
  // Suggestion State
  const [suggestionText, setSuggestionText] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get Meals
      const { data: mealData } = await supabase.from('meals').select('*').order('id');
      if (mealData) setMeals(mealData);

      // 2. Get Date Label
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'menu_dates')
        .single();
      
      if (settingsData) setMenuDate(settingsData.setting_value);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) return;
    setSendingSuggestion(true);
    
    const { error } = await supabase.from('suggestions').insert([{ message: suggestionText }]);
    
    if (error) {
      alert('Error sending suggestion.');
    } else {
      alert('Thanks for the suggestion!');
      setSuggestionText(''); // Clear the box
    }
    setSendingSuggestion(false);
  };

  if (loading) return <div className="p-20 text-center font-script text-3xl">Cooking up the menu...</div>;

  return (
    <div className="w-full max-w-5xl mx-auto pb-20">
      
      {/* HEADER SECTION */}
      <div className="text-center mb-12">
        <Link to="/login"> {/* Secret link to admin on the logo */}
            <h1 className="text-5xl md:text-6xl font-script text-[#1b4d3e] mb-2 hover:opacity-90">
            Lorena's Home Cooked Meals
            </h1>
        </Link>
        <div className="inline-block bg-[#FFF0E6] text-[#FF9500] px-4 py-1 rounded-full text-xs font-bold tracking-wider border border-[#FFE0CC]">
          📅 MENU FOR {menuDate}
        </div>
      </div>

      {/* MEALS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {meals.map((meal, index) => (
          <div key={meal.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
            <div className="relative h-64 overflow-hidden">
               {meal.image_url ? (
                <img src={meal.image_url} alt={meal.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>

            <div className="p-6 flex flex-col items-center text-center flex-1">
              <span className="bg-[#E6F4F1] text-[#1b4d3e] text-[10px] font-bold px-2 py-1 rounded mb-3">
                MEAL 0{index + 1}
              </span>
              <h2 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{meal.title}</h2>
              <button className="text-[10px] text-gray-400 underline mb-4 hover:text-gray-600">
                Nutrition Facts
              </button>
              <div className="text-xs text-gray-500 space-y-1">
                <p>{meal.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center border-t border-gray-200 pt-8 mb-12">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">PRICING</h3>
          <p className="text-lg font-bold text-[#1b4d3e]">$150 <span className="text-sm font-normal text-gray-500">/ 10 meals</span></p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">TO ORDER</h3>
          <p className="text-sm font-bold text-gray-700">📱 Text (813) 426-5096</p>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">PAYMENT</h3>
          <p className="text-sm font-bold text-gray-700">Zelle / Apple Cash</p>
          <p className="text-xs text-gray-400">lorenaolivar03@gmail.com</p>
        </div>
      </div>

      <div className="flex justify-center mb-12">
        <button className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          🖼️ View Gallery
        </button>
      </div>

      {/* BOTTOM CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* --- WORKING SUGGESTION BOX --- */}
        <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-300 text-center">
          <h3 className="font-script text-2xl text-[#1b4d3e] mb-2">Make a Suggestion</h3>
          <p className="text-xs text-gray-400 mb-4">Have a meal you'd love to see again?</p>
          
          <input 
            type="text" 
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
            placeholder="I'd love to see the Enchiladas again..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:border-[#1b4d3e]"
          />
          
          <button 
            onClick={handleSendSuggestion}
            disabled={sendingSuggestion}
            className="w-full bg-[#9CA3AF] text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-500 transition-colors disabled:opacity-50"
          >
            {sendingSuggestion ? 'Sending...' : 'Send Suggestion'}
          </button>
        </div>

        {/* PAST MENUS */}
        <div className="bg-[#1b4d3e] p-8 rounded-3xl text-center text-white flex flex-col justify-center items-center">
          <h3 className="font-script text-2xl mb-2">Past Menus</h3>
          <p className="text-xs text-gray-300 mb-6 max-w-xs">
            Missed a week? Check out our archive of delicious home cooked meals.
          </p>
          <button className="border border-white/30 text-white px-6 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
            ↺ View Archive
          </button>
        </div>
      </div>

    </div>
  );
};

export default Home;