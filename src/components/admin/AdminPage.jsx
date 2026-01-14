import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { format, startOfWeek, addDays } from 'date-fns';
import { 
  Sparkles, Plus, Search, Save, Trash2, Calendar,
  ChefHat, LogOut, Loader2, Check, X,
  Users, MessageSquare, Archive, UserPlus, Edit2,
  RefreshCw, Wand2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURATION ---
const API_KEY = 'sk_JhFUbZHtRYTp8gElg6l0IqdUlMAOdwRN'; 

// Helper: Generates URL with Key embedded (Bypasses CORS & Rate Limits)
const getAIImageUrl = (prompt, seed) => {
    // 1. Clean the prompt to keep URL short
    const safePrompt = encodeURIComponent(prompt.slice(0, 100));
    
    // 2. Add 'private=true' & 'apiKey' to use your paid credits
    // 3. Add 'cb' (Cache Buster) to force browser to ignore old "Limit Reached" images
    const cacheBuster = Math.random();
    
    return `https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=600&nologo=true&seed=${seed}&model=flux&private=true&apiKey=${API_KEY}&cb=${cacheBuster}`;
}

const getAIText = async (dishName) => {
    try {
        const prompt = `Describe ${dishName} in 10 words. Gourmet style.`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?private=true&apiKey=${API_KEY}`, {
             signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) return `Freshly prepared ${dishName}.`;
        const text = await res.text();
        return text.replace(/"/g, '') || `Freshly prepared ${dishName}.`; 
    } catch (e) {
        return `Freshly prepared ${dishName}.`;
    }
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('builder');
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [dishes, setDishes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [clients, setClients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

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
      const [dishRes, menuRes, clientRes, suggestionRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('menus').select('*, meals(*)').order('week_start', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('suggestions').select('*').order('created_at', { ascending: false })
      ]);

      if (dishRes.data) setDishes(dishRes.data);
      if (menuRes.data) setMenus(menuRes.data);
      if (clientRes.data) setClients(clientRes.data);
      if (suggestionRes.data) setSuggestions(suggestionRes.data);
    } catch (error) {
      console.error("Data load error", error);
    } finally {
      if (isFirstLoad) setInitialLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const newSuggestionCount = suggestions.filter(s => s.status === 'new').length;

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center bg-[#fcfdfa]"><Loader2 className="animate-spin text-[#2c5f4c] w-12 h-12"/></div>;

  return (
    <div className="min-h-screen bg-[#fcfdfa] text-slate-800 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-[#2c5f4c] p-3 rounded-2xl shadow-lg shadow-[#2c5f4c]/20">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a3c30] tracking-tight font-serif">Lorena's Kitchen</h1>
              <p className="text-xs text-[#6b8c7e] font-bold uppercase tracking-wider">Command Center</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm font-bold text-stone-400 hover:text-red-500 flex items-center gap-2 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* TABS */}
        <div className="flex gap-2 mb-10 bg-white p-2 rounded-2xl shadow-sm border border-stone-100 overflow-x-auto">
          <TabButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<Sparkles className="w-4 h-4" />}>Menu Builder</TabButton>
          <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Search className="w-4 h-4" />}>Food Library</TabButton>
          <TabButton active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} icon={<Users className="w-4 h-4" />}>CRM</TabButton>
          <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={<MessageSquare className="w-4 h-4" />} badge={newSuggestionCount}>Requests</TabButton>
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Archive className="w-4 h-4" />}>History</TabButton>
        </div>

        <div className="animate-in fade-in duration-500">
            {activeTab === 'builder' && <MenuBuilder dishes={dishes} refreshData={() => fetchData(false)} />}
            {activeTab === 'library' && <FoodLibrary dishes={dishes} refreshData={() => fetchData(false)} />}
            {activeTab === 'crm' && <CRM clients={clients} refreshData={() => fetchData(false)} />}
            {activeTab === 'requests' && <Requests suggestions={suggestions} refreshData={() => fetchData(false)} />}
            {activeTab === 'history' && <MenuHistory menus={menus} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
        active
          ? 'bg-[#2c5f4c] text-white shadow-lg shadow-[#2c5f4c]/20 transform scale-105'
          : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
      }`}
    >
      {icon}
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// --- 1. MENU BUILDER ---
function MenuBuilder({ dishes, refreshData }) {
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'));
  const [publishing, setPublishing] = useState(false);
  
  const [menuSlots, setMenuSlots] = useState([
    { main: null, side1: null, side2: null, description: '', image_seed: 123 },
    { main: null, side1: null, side2: null, description: '', image_seed: 456 },
    { main: null, side1: null, side2: null, description: '', image_seed: 789 }
  ]);

  const startDateObj = new Date(weekStart + 'T00:00:00'); 
  const endDateObj = addDays(startDateObj, 8); 
  const weekEnd = format(endDateObj, 'yyyy-MM-dd');
  const displayRange = `${format(startDateObj, 'MMM dd')} - ${format(endDateObj, 'MMM dd')}`;

  const handleDateSelect = (e) => {
    const selected = new Date(e.target.value + 'T00:00:00');
    const start = startOfWeek(selected, { weekStartsOn: 0 });
    setWeekStart(format(start, 'yyyy-MM-dd'));
  };

  const handleRegenerateImage = (index) => {
    const newSlots = [...menuSlots];
    if (!newSlots[index].main) return;
    newSlots[index].image_seed = Math.floor(Math.random() * 999999);
    setMenuSlots(newSlots);
    toast.success("Regenerating image...");
  }

  const handleRegenerateDescription = async (index) => {
    const newSlots = [...menuSlots];
    if (!newSlots[index].main) return;
    toast.promise(
        getAIText(newSlots[index].main.name).then(text => {
            newSlots[index].description = text;
            setMenuSlots([...newSlots]);
        }),
        { loading: 'Writing...', success: 'Updated!', error: 'Failed' }
    );
  }

  const handlePublish = async () => {
    if (menuSlots.some(s => !s.main || !s.side1 || !s.side2)) {
      toast.error('Please fill Main + 2 Sides for all meals');
      return;
    }
    setPublishing(true);
    try {
      const { data: menu, error: menuErr } = await supabase
        .from('menus')
        .insert([{ week_start: weekStart, week_end: weekEnd, status: 'active' }])
        .select().single();

      if (menuErr) throw menuErr;

      const mealsToInsert = menuSlots.map(slot => ({
          menu_id: menu.id,
          title: slot.main.name,
          side: slot.side1.name,
          description: slot.description || `Served with ${slot.side1.name} and ${slot.side2.name}`,
          price: 15.00,
          image_url: getAIImageUrl(`plate of ${slot.main.name}, ${slot.side1.name}, and ${slot.side2.name}`, slot.image_seed)
      }));

      const { error: mealsErr } = await supabase.from('meals').insert(mealsToInsert);
      if (mealsErr) throw mealsErr;

      toast.success(`Menu Published Successfully!`);
      refreshData();
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Target Week</label>
           <div className="flex items-center gap-3 mt-1">
              <Calendar className="w-5 h-5 text-[#2c5f4c]" />
              <input type="date" value={weekStart} onChange={handleDateSelect} className="font-serif font-bold text-xl text-stone-800 outline-none bg-transparent cursor-pointer" />
           </div>
           <div className="text-sm text-[#2c5f4c] font-bold mt-1 bg-[#e8f5e9] inline-block px-3 py-1 rounded-full">{displayRange}</div>
        </div>
        <button onClick={handlePublish} disabled={publishing} className="bg-[#2c5f4c] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-[#2c5f4c]/20 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50">
            {publishing ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
            {publishing ? 'Publishing...' : 'Publish Menu Live'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {menuSlots.map((slot, idx) => (
          <div key={idx} className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 relative group hover:shadow-xl transition-all duration-300">
             <div className="flex items-center gap-3 mb-6 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 bg-[#2c5f4c] rounded-xl flex items-center justify-center text-white font-bold shadow-md font-serif">{idx + 1}</div>
                <div><h3 className="font-bold text-stone-800">Meal {idx + 1}</h3><p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Main + 2 Sides</p></div>
             </div>
             <div className="space-y-5">
                <DishSelector label="Main Dish" type="main" value={slot.main} dishes={dishes} refreshData={refreshData} onChange={(d) => {
                        const newSlots = [...menuSlots]; newSlots[idx].main = d;
                        if(d && !newSlots[idx].description) handleRegenerateDescription(idx);
                        setMenuSlots(newSlots);
                    }} />
                <DishSelector label="Side 1" type="side" value={slot.side1} dishes={dishes} refreshData={refreshData} onChange={(d) => {
                        const newSlots = [...menuSlots]; newSlots[idx].side1 = d; setMenuSlots(newSlots);
                    }} />
                <DishSelector label="Side 2" type="side" value={slot.side2} dishes={dishes} refreshData={refreshData} onChange={(d) => {
                        const newSlots = [...menuSlots]; newSlots[idx].side2 = d; setMenuSlots(newSlots);
                    }} />
             </div>
             {slot.main && slot.side1 && slot.side2 && (
                 <div className="mt-6 pt-6 border-t border-stone-100 space-y-4">
                    <div className="relative h-48 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group/image">
                        <img 
                            src={getAIImageUrl(`plate of ${slot.main.name}, ${slot.side1.name}, and ${slot.side2.name}`, slot.image_seed)}
                            className="w-full h-full object-cover transition-opacity duration-500"
                            alt="Preview"
                        />
                        <button onClick={() => handleRegenerateImage(idx)} className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-[#2c5f4c] p-2 rounded-lg shadow-sm hover:scale-110 transition-all font-bold text-xs flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Redo
                        </button>
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">Description</label>
                        <textarea value={slot.description} onChange={(e) => {
                                const newSlots = [...menuSlots]; newSlots[idx].description = e.target.value; setMenuSlots(newSlots);
                            }} className="w-full text-sm p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 ring-[#2c5f4c]/20 min-h-[80px]" />
                        <button onClick={() => handleRegenerateDescription(idx)} className="absolute top-8 right-2 p-1.5 text-stone-400 hover:text-[#2c5f4c] rounded-lg transition-all"><Wand2 className="w-4 h-4" /></button>
                    </div>
                 </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 2. FOOD LIBRARY ---
function FoodLibrary({ dishes, refreshData }) {
  const [search, setSearch] = useState('');
  const handleDelete = async (id) => {
      if(!window.confirm("Delete this dish?")) return;
      await supabase.from('dishes').delete().eq('id', id);
      toast.success("Dish deleted");
      refreshData();
  }
  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 relative">
          <Search className="absolute left-9 top-9 w-5 h-5 text-stone-400" />
          <input type="text" placeholder="Search library..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#2c5f4c]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(dish => (
          <div key={dish.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-lg transition-all group">
            <div className="relative h-48 bg-stone-100">
              <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${dish.type === 'main' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{dish.type}</span>
            </div>
            <div className="p-5 flex justify-between items-start">
              <div><h3 className="font-bold text-stone-800 text-lg mb-1">{dish.name}</h3><p className="text-stone-500 text-xs line-clamp-2">{dish.description}</p></div>
              <button onClick={() => handleDelete(dish.id)} className="text-stone-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 3. CRM ---
function CRM({ clients, refreshData }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', email: '', phone: '', address: '', notes: '' });
  const handleOpenAdd = () => { setFormData({ id: null, name: '', email: '', phone: '', address: '', notes: '' }); setShowModal(true); }
  const handleOpenEdit = (client) => { setFormData(client); setShowModal(true); }
  const handleDelete = async (id) => {
    if(!window.confirm("Delete this client?")) return;
    await supabase.from('clients').delete().eq('id', id);
    refreshData();
  }
  const handleSave = async () => {
      const { id, ...data } = formData;
      if (id) await supabase.from('clients').update(data).eq('id', id);
      else await supabase.from('clients').insert([data]);
      setShowModal(false); refreshData();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex justify-between items-center">
         <h2 className="font-bold text-xl text-stone-800 font-serif">Customer Database</h2>
         <button onClick={handleOpenAdd} className="bg-[#2c5f4c] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#234b3c]"><UserPlus className="w-4 h-4" /> Add Client</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
                <tr><th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Name</th><th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Contact</th><th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
                {clients.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-stone-700">{c.name}</td>
                        <td className="px-6 py-4"><div className="text-sm text-stone-600 font-medium">{c.email}</div><div className="text-xs text-stone-400">{c.phone}</div></td>
                        <td className="px-6 py-4 flex gap-2">
                            <button onClick={() => handleOpenEdit(c)} className="p-2 text-stone-400 hover:text-[#2c5f4c] hover:bg-green-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(c.id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      {showModal && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white p-8 rounded-2xl w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-xl font-serif text-[#2c5f4c]">{formData.id ? 'Edit Client' : 'New Client'}</h3>
                <input placeholder="Name" className="w-full border p-3 rounded-xl bg-stone-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input placeholder="Email" className="w-full border p-3 rounded-xl bg-stone-50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input placeholder="Phone" className="w-full border p-3 rounded-xl bg-stone-50" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <textarea placeholder="Notes" className="w-full border p-3 rounded-xl bg-stone-50 min-h-[100px]" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                <button onClick={handleSave} className="w-full bg-[#2c5f4c] text-white py-3 rounded-xl font-bold hover:bg-[#234b3c]">Save Changes</button>
            </div>
         </div>
      )}
    </div>
  )
}

// --- 4. REQUESTS ---
function Requests({ suggestions, refreshData }) {
    const handleStatus = async (id, status) => { await supabase.from('suggestions').update({ status }).eq('id', id); refreshData(); }
    const handleDelete = async (id) => { if(!window.confirm("Delete?")) return; await supabase.from('suggestions').delete().eq('id', id); refreshData(); }

    return (
        <div className="space-y-4">
            {suggestions.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-start hover:shadow-md transition-all">
                    <div>
                        <div className="flex gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${s.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{s.status}</span>
                            <span className="text-xs text-stone-400 font-medium">{s.user_email || 'Anonymous'}</span>
                        </div>
                        <p className="font-medium text-stone-800">{s.message || s.content}</p>
                    </div>
                    <div className="flex gap-2">
                      {s.status === 'new' && <button onClick={() => handleStatus(s.id, 'reviewed')} className="bg-stone-50 p-2 rounded-lg hover:bg-green-100 hover:text-green-600"><Check className="w-4 h-4" /></button>}
                      <button onClick={() => handleDelete(s.id)} className="bg-stone-50 p-2 rounded-lg hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
        </div>
    )
}

// --- 5. HISTORY ---
function MenuHistory({ menus }) {
    return (
        <div className="grid gap-4">
            {menus.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[#2c5f4c] font-serif">Week of {m.week_start}</h3>
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Published</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {m.meals && m.meals.map((meal, i) => (
                            <div key={i} className="bg-stone-50 p-3 rounded-xl text-sm border border-stone-100">
                                <span className="font-bold block text-stone-700 mb-1">{meal.title}</span>
                                <span className="text-stone-500 text-xs line-clamp-2">{meal.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// --- DISH SELECTOR ---
function DishSelector({ label, type, value, dishes, refreshData, onChange }) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const filtered = dishes.filter(d => d.type === type && d.name.toLowerCase().includes(query.toLowerCase()));
  
    const handleCreate = async () => {
      if(!query) return;
      setCreating(true);
      const seed = Math.floor(Math.random() * 1000000);
      const prompt = type === 'main' ? `${query} food` : `side dish ${query}`;
      const imgUrl = getAIImageUrl(prompt, seed);
      const { data, error } = await supabase.from('dishes').insert([{ name: query, type, description: `Freshly prepared ${query}`, image_url: imgUrl, ai_seed: seed }]).select().single();
      if(!error && data) { refreshData(); onChange(data); setQuery(''); setIsOpen(false); toast.success(`Added ${query}`); } 
      else { toast.error("Failed"); }
      setCreating(false);
    };
  
    if (value) {
      return (
        <div>
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">{label}</label>
          <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 p-2 rounded-xl group relative">
             <img src={value.image_url} className="w-10 h-10 rounded-lg object-cover bg-stone-200" alt="" />
             <div className="flex-1"><p className="font-bold text-sm text-stone-700">{value.name}</p></div>
             <button onClick={() => onChange(null)} className="p-2 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
      );
    }
  
    return (
      <div className="relative">
        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">{label}</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
          <input type="text" value={query} onChange={e => { setQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} placeholder={`Search or add ${type}...`} className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl outline-none focus:border-[#2c5f4c] text-sm font-medium bg-white" />
        </div>
        {isOpen && (
          <>
            <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-xl border border-stone-100 max-h-60 overflow-y-auto">
              {filtered.map(dish => (
                <div key={dish.id} onClick={() => { onChange(dish); setIsOpen(false); setQuery(''); }} className="p-3 hover:bg-stone-50 cursor-pointer flex items-center gap-3 border-b border-stone-50 last:border-0">
                  <img src={dish.image_url} className="w-8 h-8 rounded object-cover bg-stone-200" alt="" />
                  <p className="font-semibold text-stone-700 text-sm">{dish.name}</p>
                </div>
              ))}
              {query && <button onClick={handleCreate} disabled={creating} className="w-full p-3 bg-[#2c5f4c]/5 text-[#2c5f4c] font-bold text-xs hover:bg-[#2c5f4c]/10 transition-colors flex items-center justify-center gap-2">{creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Create "{query}"</button>}
            </div>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          </>
        )}
      </div>
    );
}