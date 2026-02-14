import React, { useState, useEffect } from 'react';
// FIX 1: Go up two levels to find supabaseClient
import { supabase } from '../../supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Sparkles, Search, Archive, Users, MessageSquare, 
  ShoppingCart, LayoutGrid, ChefHat, LogOut, Loader2 
} from 'lucide-react';

// FIX 2: These are now in the SAME folder, so use "./"
import ToolsTab from './ToolsTab';
import MenuEditor from './MenuEditor';

import MenuHistory from './MenuHistory';
import FoodLibrary from './FoodLibrary';
import FeedbackTab from './FeedbackTab';
import GalleryTab from './GalleryTab';
import CRMTab from './CRMTab';

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('builder');
  const [initialLoading, setInitialLoading] = useState(true);

  // DATA STATE
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [clients, setClients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [gallery, setGallery] = useState([]);

  // EDITING STATE
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  useEffect(() => {
    checkSession();
    fetchData(true);
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate('/login');
  };

  const fetchData = async (isFirstLoad = false) => {
    if (isFirstLoad) setInitialLoading(true);
    try {
      const [dishRes, menuRes, clientRes, suggestionRes, feedbackRes, galleryRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('menus').select('*, meals(*)').order('week_start', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('suggestions').select('*').order('created_at', { ascending: false }),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }).then((r) => r).catch(() => ({ data: [] })),
        supabase.from('gallery_images').select('*').order('created_at', { ascending: false })
      ]);

      if (dishRes.data) setDishes(dishRes.data);
      if (menuRes.data) setMenus(menuRes.data);
      if (clientRes.data) setClients(clientRes.data);
      if (suggestionRes.data) setSuggestions(suggestionRes.data);
      setFeedback(feedbackRes?.data ?? []);
      if (galleryRes.data) setGallery(galleryRes.data);
    } catch (error) {
      console.error('Data load error', error);
      toast.error("Error loading data");
    } finally {
      if (isFirstLoad) setInitialLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const handleDeleteMenu = async (menu) => {
    if (!window.confirm(`Delete menu for ${menu.week_start} – ${menu.week_end}? This cannot be undone.`)) return;
    try {
      if (menu.id != null) {
        await supabase.from('meals').delete().eq('menu_id', menu.id);
        await supabase.from('menus').delete().eq('id', menu.id);
      }
      toast.success('Menu deleted');
      setEditingMenuId(null);
      setPrefillData(null);
      fetchData(false);
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center bg-[#fcfdfa]"><Loader2 className="animate-spin text-[#2c5f4c] w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-[#fcfdfa] text-slate-800 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-[#2c5f4c] p-3 rounded-2xl shadow-lg shadow-[#2c5f4c]/20"><ChefHat className="w-8 h-8 text-white" /></div>
            <div><h1 className="text-2xl font-bold text-[#1a3c30] tracking-tight font-serif">Lorena's Kitchen</h1><p className="text-xs text-[#6b8c7e] font-bold uppercase tracking-wider">Command Center</p></div>
          </div>
          <button onClick={handleLogout} className="text-sm font-bold text-stone-400 hover:text-red-500 flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-screen-2xl mx-auto px-8 py-8">
        {/* TABS */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-stone-100 overflow-x-auto">
            <TabButton active={activeTab === 'builder'} onClick={() => { setActiveTab('builder'); setEditingMenuId(null); setPrefillData(null); }} icon={<Sparkles className="w-4 h-4" />}>Menu Builder</TabButton>
            <TabButton active={activeTab === 'pastmenus'} onClick={() => setActiveTab('pastmenus')} icon={<Archive className="w-4 h-4" />}>Past Menus</TabButton>
            <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<LayoutGrid className="w-4 h-4" />}>Gallery</TabButton>
            <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Search className="w-4 h-4" />}>Food Library</TabButton>
            <TabButton active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} icon={<Users className="w-4 h-4" />}>CRM</TabButton>
            <TabButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<ShoppingCart className="w-4 h-4" />}>Tools</TabButton>
            <TabButton active={activeTab === 'suggestions'} onClick={() => setActiveTab('suggestions')} icon={<MessageSquare className="w-4 h-4" />} badge={suggestions.filter(s => s.status === 'new').length}>Suggestions</TabButton>
            <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={<MessageSquare className="w-4 h-4" />} badge={feedback.filter(f => f.status === 'pending').length}>Feedback</TabButton>
          </div>
        </div>

        {/* COMPONENT RENDERER */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'builder' && (
             <MenuEditor 
                dishes={dishes} 
                gallery={gallery}
                refreshData={() => fetchData(false)} 
                editMode={!!editingMenuId} 
                editId={editingMenuId} 
                initialData={prefillData} 
                onSuccess={() => { setEditingMenuId(null); setPrefillData(null); }} 
             />
          )}
          
          {activeTab === 'tools' && <ToolsTab menus={menus} />}

          {activeTab === 'pastmenus' && (
            <MenuHistory
              menus={menus}
              onEdit={(menu) => {
                setEditingMenuId(menu.id);
                setPrefillData({ week_start: menu.week_start, week_end: menu.week_end, meals: menu.meals || [] });
                setActiveTab('builder');
              }}
              onDelete={handleDeleteMenu}
            />
          )}
          {activeTab === 'gallery' && <GalleryTab gallery={gallery} onRefresh={() => fetchData(false)} />}
          {activeTab === 'library' && <FoodLibrary dishes={dishes} />}
          {activeTab === 'feedback' && <FeedbackTab feedbackList={feedback} onRefresh={() => fetchData(false)} />}
          {activeTab === 'crm' && <CRMTab clients={clients} onRefresh={() => fetchData(false)} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children, badge }) {
  return (
    <button onClick={onClick} className={`relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${active ? 'bg-[#2c5f4c] text-white shadow-lg shadow-[#2c5f4c]/20' : 'text-stone-500 hover:bg-stone-50'}`}>
      {icon} {children}
      {badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white">{badge}</span>}
    </button>
  );
}