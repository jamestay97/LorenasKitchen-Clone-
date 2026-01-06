import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from "date-fns";
import { Settings } from "lucide-react";
import MealCard from '@/components/public/MealCard';
import { Button } from "@/components/ui/button";

export default function Home() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    checkAdmin();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Get menus from Supabase
      const menus = await base44.entities.Menu.list('-created_date', 20);
      
      // 2. Find the active one, or just take the first one found
      const active = menus.find(m => m.status === 'active') || menus[0];
      
      setActiveMenu(active);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    try {
      const user = await base44.auth.me();
      if (user) {
        // If user is logged in via Supabase, we treat them as admin for now
        setIsAdmin(true);
      }
    } catch (e) {
      // Not logged in
    }
  };

  const weekRange = activeMenu && activeMenu.week_start
    ? `${format(parseISO(activeMenu.week_start), 'MMM dd')} - ${format(parseISO(activeMenu.week_end || activeMenu.week_start), 'MMM dd')}`
    : "Coming Soon";

  return (
    <div className="pb-20">
      <header className="text-center py-10 relative">
        {isAdmin && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0 top-0"
                onClick={() => navigate(createPageUrl('Admin'))}
            >
                <Settings className="w-5 h-5 text-gray-400" />
            </Button>
        )}

        <div className="w-64 mx-auto mb-8">
             {/* You can replace this URL with your own logo later */}
             <div className="w-full h-32 bg-orange-50 rounded-full flex items-center justify-center text-orange-200 font-fresh text-4xl">
                Logo
             </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-fresh text-[#1b4d3e] transform -rotate-2 mb-4">
          Lorena's Home Cooked Meals
        </h1>
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#e6f0eb] rounded-full shadow-sm text-sm font-medium text-[#1b4d3e]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Menu for {weekRange}
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading menu...</div>
      ) : activeMenu ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {activeMenu.meals && Array.isArray(activeMenu.meals) ? (
             activeMenu.meals.map((meal, idx) => (
               <MealCard key={meal.id || idx} meal={meal} index={idx} />
             ))
           ) : (
             <div className="col-span-full text-center py-10 text-gray-500">
               No meals found for this menu.
             </div>
           )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <h3 className="text-xl font-fresh text-gray-400 mb-2">No Active Menu</h3>
          <p className="text-gray-400 text-sm">Check back later for next week's delicious meals!</p>
        </div>
      )}
    </div>
  );
}