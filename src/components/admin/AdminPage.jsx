import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  LayoutGrid, Users, LogOut, Loader2, ChefHat, 
  BookOpen, Image as ImageIcon, ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MenuEditor from './MenuEditor';
import CRM from './CRM';
import GroceryTools from './GroceryTools';
import GalleryManager from './GalleryManager';

export default function AdminPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('builder');
    const [dishes, setDishes] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return navigate('/login');
            await fetchData();
        };
        init();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        const [dishRes, recipeRes] = await Promise.all([
            supabase.from('dishes').select('*').order('name'),
            supabase.from('recipes').select('*').order('created_at', { ascending: false })
        ]);
        setDishes(dishRes.data || []);
        setRecipes(recipeRes.data || []);
        setLoading(false);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#f8f9f5]">
            <Loader2 className="animate-spin text-[#1b4d3e] w-12 h-12" />
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#f8f9f5]">
            {/* Sidebar - Fixed Width to prevent squishing */}
            <aside className="w-72 bg-white border-r border-stone-200 flex flex-col h-screen sticky top-0 shrink-0">
                <div className="p-8 border-b border-stone-100 flex items-center gap-3 text-[#1b4d3e]">
                    <ChefHat className="w-8 h-8" />
                    <span className="font-bold text-xl tracking-tighter uppercase">Kitchen Hub</span>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    <NavButton id="builder" icon={<LayoutGrid />} label="Menu Builder" active={activeTab} set={setActiveTab} />
                    <NavButton id="crm" icon={<Users />} label="Clients & CRM" active={activeTab} set={setActiveTab} />
                    <NavButton id="grocery" icon={<ShoppingCart />} label="Groceries" active={activeTab} set={setActiveTab} />
                    <NavButton id="gallery" icon={<ImageIcon />} label="Gallery" active={activeTab} set={setActiveTab} />
                </nav>
                <div className="p-6 border-t">
                    <button onClick={() => supabase.auth.signOut().then(() => navigate('/login'))} 
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all">
                        <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content - Flex-1 with proper padding */}
            <main className="flex-1 p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'builder' && (
                        <div className="space-y-10 animate-in fade-in duration-500">
                            <header>
                                <h2 className="text-5xl font-black text-[#1b4d3e] tracking-tight">Weekly Builder</h2>
                                <p className="text-stone-400 font-medium mt-2 text-lg">Create new meals with AI nutrition analysis.</p>
                            </header>
                            <MenuEditor dishes={dishes} refreshData={fetchData} />
                        </div>
                    )}
                    {activeTab === 'crm' && <CRM clients={[]} refreshData={fetchData} />}
                    {activeTab === 'grocery' && <GroceryTools recipes={recipes} />}
                    {activeTab === 'gallery' && <GalleryManager />}
                </div>
            </main>
        </div>
    );
}

const NavButton = ({ id, icon, label, active, set }) => (
    <button onClick={() => set(id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${active === id ? 'bg-[#1b4d3e] text-white shadow-xl translate-x-2' : 'text-stone-400 hover:bg-stone-50'}`}>
        {React.cloneElement(icon, { className: "w-5 h-5" })} {label}
    </button>
);