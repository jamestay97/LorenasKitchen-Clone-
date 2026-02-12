import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { format, parseISO } from 'date-fns';
import { Loader2, Calendar, MessageSquare, Send, Utensils, Image as ImageIcon, Mail, DollarSign, ChevronLeft, ChevronRight, Phone, Activity } from 'lucide-react';
import { toast } from 'sonner';

// --- LOGO URL ---
const LOGO_URL = "https://domtvkfulaimxsbyvryd.supabase.co/storage/v1/object/public/menu-images/Gemini_Generated_Image_a3ck5ta3ck5ta3ck.png";

export default function Home() {
  const [menus, setMenus] = useState([]); 
  const [currentMenuIndex, setCurrentMenuIndex] = useState(0); 
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState('');

  // Background image
  const heroImage = "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=2070&auto=format&fit=crop";

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public:menus')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menus' }, () => {
        console.log('Menu update detected!');
        fetchData();
      })
      .subscribe();

    const interval = setInterval(fetchData, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch menus and joined meals (which includes the new 'nutrition' column)
      const { data: allMenus } = await supabase
        .from('menus')
        .select('*, meals(*)')
        .eq('status', 'active')
        .order('week_start', { ascending: false }) 
        .order('created_at', { ascending: false });

      if (allMenus) {
        const uniqueMenus = [];
        const seenWeeks = new Set();
        for (const m of allMenus) {
          if (!seenWeeks.has(m.week_start)) {
            uniqueMenus.push(m);
            seenWeeks.add(m.week_start);
          }
        }
        setMenus(uniqueMenus);
      }

      const { data: galleryData } = await supabase
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      setGallery(galleryData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = async (e) => {
      e.preventDefault();
      if(!suggestion.trim()) return;
      
      const { error } = await supabase.from('suggestions').insert([{ content: suggestion }]);
      
      if(error) toast.error("Failed to send suggestion");
      else {
          toast.success("Suggestion sent! Thank you.");
          setSuggestion('');
      }
  };

  const activeMenu = menus[currentMenuIndex];

  const goNext = () => {
    if (currentMenuIndex > 0) setCurrentMenuIndex(currentMenuIndex - 1);
  };

  const goPrev = () => {
    if (currentMenuIndex < menus.length - 1) setCurrentMenuIndex(currentMenuIndex + 1);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfdfa]">
      <Loader2 className="w-12 h-12 animate-spin text-[#1b4d3e]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdfa] font-sans text-slate-800 pb-12">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-[85vh] min-h-[700px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="Lorena's Kitchen Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 flex flex-col items-center">
            
            {/* BIG CIRCULAR LOGO FRAME */}
            <div className="mb-10 p-2 relative">
                <div className="w-64 h-64 md:w-80 md:h-80 mx-auto rounded-full border-4 border-white shadow-2xl bg-white overflow-hidden relative">
                    <img 
                        src={LOGO_URL} 
                        alt="Lorena's Home Cooked Meals" 
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
            
            <p className="text-2xl md:text-3xl text-white/90 mb-12 font-light max-w-3xl mx-auto leading-relaxed drop-shadow-md">
              Fresh, homemade meals prepared weekly for your family. <br className="hidden md:block"/> No shopping. No cooking. Just heating.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <button onClick={() => document.getElementById('gallery-section').scrollIntoView({ behavior: 'smooth' })} className="px-10 py-4 text-lg font-bold rounded-full bg-white text-[#1b4d3e] hover:bg-stone-100 shadow-xl transition-all hover:scale-105">View Gallery</button>
              <button onClick={() => document.getElementById('menu-section').scrollIntoView({ behavior: 'smooth' })} className="px-10 py-4 text-lg font-bold rounded-full text-white border-2 border-white/30 hover:bg-white/10 backdrop-blur-sm transition-all">See This Week's Menu</button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fcfdfa] to-transparent" />
      </section>

      {/* --- MENU SECTION --- */}
      <section id="menu-section" className="py-24 container max-w-6xl mx-auto px-6 relative">
        
        {/* --- INFO CARD (FLOATING) --- */}
        <div className="max-w-4xl mx-auto mb-20 -mt-10 relative z-20">
            <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-around gap-6 text-center md:text-left animate-in slide-in-from-bottom-4 duration-700">
                
                {/* Email Section */}
                <div className="flex items-center gap-4 group">
                    <div className="p-4 bg-green-50 rounded-full text-[#1b4d3e] group-hover:scale-110 transition-transform">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Zelle / Email</p>
                        <a href="mailto:lorenaolivar03@gmail.com" className="font-bold text-[#1b4d3e] text-lg hover:underline">
                            lorenaolivar03@gmail.com
                        </a>
                    </div>
                </div>

                <div className="hidden md:block w-px h-12 bg-stone-200"></div>

                 {/* Phone Section */}
                 <div className="flex items-center gap-4 group">
                    <div className="p-4 bg-green-50 rounded-full text-[#1b4d3e] group-hover:scale-110 transition-transform">
                        <Phone className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Call / Text</p>
                        <span className="font-bold text-[#1b4d3e] text-lg">
                           (813) 426-5096
                        </span>
                    </div>
                </div>

                <div className="hidden md:block w-px h-12 bg-stone-200"></div>

                {/* Pricing Section */}
                <div className="flex items-center gap-4 group">
                    <div className="p-4 bg-green-50 rounded-full text-[#1b4d3e] group-hover:scale-110 transition-transform">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">Weekly Plan</p>
                        <span className="font-bold text-[#1b4d3e] text-lg">
                            $150
                        </span>
                    </div>
                </div>

            </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1b4d3e] mb-6">Our Menus</h2>
          
          {/* MENU NAVIGATION HEADER */}
          {activeMenu ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                <button 
                    onClick={goPrev} 
                    disabled={currentMenuIndex >= menus.length - 1}
                    className="p-3 rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all group"
                    title="Previous Menu"
                >
                    <ChevronLeft className="w-8 h-8 text-[#1b4d3e] group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="inline-flex items-center gap-3 bg-[#e6f0eb] text-[#1b4d3e] px-8 py-3 rounded-full text-xl font-bold shadow-sm">
                    <Calendar className="w-6 h-6" />
                    {format(parseISO(activeMenu.week_start), 'MMMM d')} - {format(parseISO(activeMenu.week_end), 'MMMM d')}
                    {currentMenuIndex === 0 && <span className="ml-2 bg-[#1b4d3e] text-white text-xs px-2 py-1 rounded-md uppercase tracking-wide">Latest</span>}
                </div>

                <button 
                    onClick={goNext} 
                    disabled={currentMenuIndex === 0}
                    className="p-3 rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all group"
                    title="Next Menu"
                >
                    <ChevronRight className="w-8 h-8 text-[#1b4d3e] group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
          ) : (
            <p className="text-lg text-stone-500">New menu coming soon!</p>
          )}
          
          <div className="h-1 w-24 bg-[#1b4d3e]/20 mx-auto mt-8 rounded-full" />
        </div>

        {/* MENU DISPLAY */}
        {activeMenu && activeMenu.meals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500" key={activeMenu.id}>
            {activeMenu.meals.map((meal, idx) => (
              <div key={meal.id} className="bg-white rounded-3xl shadow-lg border border-stone-100 flex flex-col group hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                
                {/* --- IMAGE AREA --- */}
                <div className="relative h-64 bg-stone-100">
                    {meal.image_main ? (
                        // NEW 3-IMAGE LAYOUT
                        <div className="grid grid-cols-3 h-full w-full gap-[1px] bg-white">
                            {/* Main Dish (Left, 2/3 width) */}
                            <div className="col-span-2 relative h-full overflow-hidden">
                                <img src={meal.image_main} alt={meal.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-[#1b4d3e] font-bold px-3 py-1 rounded-lg text-sm shadow-sm z-10">Meal {idx + 1}</div>
                            </div>
                            {/* Side Dishes (Right, stacked) */}
                            <div className="col-span-1 flex flex-col h-full gap-[1px]">
                                <div className="h-1/2 relative overflow-hidden">
                                    {meal.image_side1 && <img src={meal.image_side1} alt="Side 1" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />}
                                </div>
                                <div className="h-1/2 relative overflow-hidden">
                                    {meal.image_side2 && <img src={meal.image_side2} alt="Side 2" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // FALLBACK FOR OLD MENUS (Single Image)
                        <div className="w-full h-full overflow-hidden relative">
                             {meal.image_url ? (
                                <img src={meal.image_url} alt={meal.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-300"><Utensils className="w-12 h-12" /></div>
                             )}
                             <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-[#1b4d3e] font-bold px-3 py-1 rounded-lg text-sm shadow-sm">Meal {idx + 1}</div>
                        </div>
                    )}
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-2xl font-bold text-[#1b4d3e] font-serif leading-tight">{meal.title}</h3>
                    </div>
                    <p className="text-stone-500 leading-relaxed mb-6 flex-1">{meal.description}</p>
                    
                    {/* --- NUTRITION FACTS (NEW FEATURE) --- */}
                    {/* Only display if calories exist in the database */}
                    {meal.nutrition && meal.nutrition.calories > 0 && (
                        <div className="mb-6 bg-[#f8f9fa] rounded-xl p-3 border border-stone-100 shadow-inner">
                            <div className="flex items-center justify-center gap-2 mb-2 text-stone-400">
                                <Activity className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Nutrition Facts</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center divide-x divide-stone-200">
                                <div>
                                    <span className="block text-lg font-bold text-[#1b4d3e] leading-none">{meal.nutrition.calories}</span>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wide">Cals</span>
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-stone-600 leading-tight mt-1">{meal.nutrition.protein}</span>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wide">Pro</span>
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-stone-600 leading-tight mt-1">{meal.nutrition.carbs}</span>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wide">Carb</span>
                                </div>
                                <div>
                                    <span className="block text-sm font-bold text-stone-600 leading-tight mt-1">{meal.nutrition.fat}</span>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wide">Fat</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-stone-100">
                        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">Served With</span>
                        <div className="flex flex-wrap gap-2 text-[#1b4d3e] font-medium">
                            {/* If we have nice split sides, use them. Otherwise fallback to old 'side' string */}
                             {(meal.side && meal.side.includes('&')) ? (
                                <>
                                    <span className="px-2 py-1 bg-green-50 rounded-md text-sm">{meal.side.split('&')[0]}</span>
                                    <span className="px-2 py-1 bg-green-50 rounded-md text-sm">{meal.side.split('&')[1]}</span>
                                </>
                             ) : (
                                <span>{meal.side}</span>
                             )}
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200">
            <Utensils className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-stone-600">Menu is being prepared</h3>
            <p className="text-stone-400 mt-2">Please check back shortly.</p>
          </div>
        )}
      </section>

      {/* --- GALLERY SECTION --- */}
      <section id="gallery-section" className="py-20 bg-stone-50 border-y border-stone-100">
        <div className="container max-w-6xl mx-auto px-6">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <span className="text-[#1b4d3e] font-bold tracking-wider text-sm uppercase">Visual Feast</span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1b4d3e] mt-2">Fresh from the Kitchen</h2>
                </div>
            </div>
            {gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item) => (
                        <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden shadow-sm bg-white">
                            <img src={item.image_url} alt={item.title || "Gallery image"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <p className="text-white font-medium text-sm truncate">{item.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-stone-400"><ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>Gallery images coming soon.</p></div>
            )}
        </div>
      </section>

      {/* --- SUGGESTION BOX --- */}
      <section className="container max-w-4xl mx-auto px-6 my-20">
        <div className="bg-[#1b4d3e] rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-10 pattern-grid-lg"></div>
            <div className="relative z-10">
                <MessageSquare className="w-12 h-12 mx-auto mb-6 text-[#a3c9bb]" />
                <h2 className="text-4xl font-serif font-bold mb-4">Have a Request?</h2>
                <p className="text-[#a3c9bb] text-lg mb-10 max-w-2xl mx-auto">We love hearing what you want to see on next week's menu. Drop a suggestion below!</p>
                <form onSubmit={handleSuggestion} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <input type="text" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="e.g. Grandma's Lasagna..." className="flex-1 px-6 py-4 rounded-xl text-slate-800 outline-none focus:ring-4 ring-[#a3c9bb]/50 placeholder:text-slate-400" />
                    <button type="submit" className="bg-[#153a2f] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#0f2921] transition-colors flex items-center justify-center gap-2 shadow-lg">Send <Send className="w-4 h-4" /></button>
                </form>
            </div>
        </div>
      </section>
    </div>
  );
}