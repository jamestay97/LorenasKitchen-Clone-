import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Card, Input } from '@/components/ui/UiKit';
import { ArrowLeft, ChefHat, Users, MessageSquare, Book, Archive, Trash2, Plus, Save, Search } from "lucide-react";
import { toast } from "sonner";

// --- SUB-COMPONENTS (INLINED FOR SIMPLICITY) ---

// 1. MENU EDITOR
const MenuEditor = ({ activeMenu }) => {
  const [meals, setMeals] = useState(activeMenu?.meals || []);
  const [dateLabel, setDateLabel] = useState('JAN 04 - JAN 10');

  useEffect(() => {
    // Load current menu meals if they exist, otherwise placeholders
    if (activeMenu?.meals) setMeals(activeMenu.meals);
  }, [activeMenu]);

  const handleSave = async () => {
    // 1. Update the Date Label Setting
    await supabase.from('site_settings').upsert({ setting_key: 'menu_dates', setting_value: dateLabel }, { onConflict: 'setting_key' });
    
    // 2. Update the Meals
    // In a real app we'd update specific rows, but here we can just upsert
    for (const meal of meals) {
      if (meal.id) {
        await supabase.from('meals').upsert(meal);
      }
    }
    toast.success("Menu Updated!");
  };

  const updateMeal = (index, field, value) => {
    const newMeals = [...meals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setMeals(newMeals);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-bold mb-4">Menu Settings</h3>
        <label className="text-sm text-gray-500">Date Label on Homepage</label>
        <div className="flex gap-2">
          <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} />
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2"/> Save All</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {meals.map((meal, idx) => (
          <Card key={idx} className="p-4 space-y-3">
            <div className="font-bold text-[#1b4d3e]">Meal {idx + 1}</div>
            <Input placeholder="Title" value={meal.title} onChange={e => updateMeal(idx, 'title', e.target.value)} />
            <Input placeholder="Description" value={meal.description} onChange={e => updateMeal(idx, 'description', e.target.value)} />
            <Input placeholder="Price" value={meal.price} onChange={e => updateMeal(idx, 'price', e.target.value)} />
            <Input placeholder="Image URL" value={meal.image_url} onChange={e => updateMeal(idx, 'image_url', e.target.value)} />
          </Card>
        ))}
      </div>
    </div>
  );
};

// 2. CRM (CLIENTS)
const CRM = () => {
  const [clients, setClients] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from('clients').select('*');
      setClients(data || []);
    };
    fetchClients();
  }, []);

  const addClient = async () => {
    if(!newName) return;
    const { error } = await supabase.from('clients').insert([{ name: newName }]);
    if(!error) {
      toast.success("Client added");
      setNewName('');
      // Refresh list logic here
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-xl">Client List</h2>
        <div className="flex gap-2">
           <Input placeholder="New Client Name" value={newName} onChange={e => setNewName(e.target.value)} className="w-48" />
           <Button onClick={addClient}><Plus className="w-4 h-4"/></Button>
        </div>
      </div>
      <div className="space-y-2">
        {clients.length === 0 && <p className="text-gray-400">No clients yet.</p>}
        {clients.map(c => (
          <div key={c.id} className="flex justify-between p-3 bg-gray-50 rounded border">
            <span>{c.name}</span>
            <span className="text-gray-400 text-sm">{c.email || 'No email'}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// 3. REQUESTS (SUGGESTIONS)
const Requests = () => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
      setSuggestions(data || []);
    };
    fetch();
  }, []);

  const deleteSuggestion = async (id) => {
    await supabase.from('suggestions').delete().eq('id', id);
    setSuggestions(suggestions.filter(s => s.id !== id));
    toast.success("Deleted");
  };

  return (
    <Card className="p-6">
      <h2 className="font-bold text-xl mb-4">Customer Suggestions</h2>
      <div className="space-y-2">
        {suggestions.map(s => (
          <div key={s.id} className="flex justify-between items-start p-4 bg-gray-50 rounded border">
             <div>
               <p className="font-medium">{s.message}</p>
               <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</p>
             </div>
             <Button variant="ghost" size="icon" onClick={() => deleteSuggestion(s.id)}>
               <Trash2 className="w-4 h-4 text-red-400" />
             </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

// --- MAIN ADMIN PAGE ---

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("menu");
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    // Fetch the active menu (meals) on load
    const loadData = async () => {
      const { data } = await supabase.from('meals').select('*').order('id');
      // Structure it to look like the "Menu" object
      setActiveMenu({ meals: data });
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f0] pb-20 p-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="font-bold text-xl text-[#1b4d3e]">Lorena's Dashboard</h1>
        </div>
        <Button variant="outline" onClick={handleLogout}>Log Out</Button>
      </div>

      <div className="max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white p-2 h-auto flex-wrap justify-start gap-2 shadow-sm rounded-xl">
            <TabsTrigger value="menu" activeTab={activeTab} setActiveTab={setActiveTab} className="px-4 py-2">
              <ChefHat className="w-4 h-4 mr-2" /> Menu Editor
            </TabsTrigger>
            <TabsTrigger value="crm" activeTab={activeTab} setActiveTab={setActiveTab} className="px-4 py-2">
              <Users className="w-4 h-4 mr-2" /> CRM
            </TabsTrigger>
            <TabsTrigger value="requests" activeTab={activeTab} setActiveTab={setActiveTab} className="px-4 py-2">
              <MessageSquare className="w-4 h-4 mr-2" /> Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" activeTab={activeTab}>
            <MenuEditor activeMenu={activeMenu} />
          </TabsContent>

          <TabsContent value="crm" activeTab={activeTab}>
            <CRM />
          </TabsContent>

          <TabsContent value="requests" activeTab={activeTab}>
            <Requests />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}