import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import {
  Sparkles, Plus, Search, Save, Trash2,
  ChefHat, LogOut, Loader2, X,
  Users, MessageSquare, Archive, UserPlus, Edit2,
  RefreshCw, Wand2, Image as ImageIcon, LayoutGrid,
  ShieldCheck, AlertCircle, ExternalLink, Zap, Upload,
  Eye, EyeOff, CheckCircle, CheckSquare, Square, Check, 
  MapPin, Phone, Mail, FileText, ShoppingCart, Activity,
  Printer, ArrowRight, Hash, BadgeDollarSign,
  Cpu, ScanLine, Layers, Utensils, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- CONSTANTS ---
const DEFAULT_STAPLES = [
    { name: "Olive Oil", icon: "🫒" },
    { name: "Vegetable Oil", icon: "🌻" },
    { name: "Salt", icon: "🧂" },
    { name: "Black Pepper", icon: "⚫" },
    { name: "Garlic Cloves", icon: "🧄" },
    { name: "Butter", icon: "🧈" },
    { name: "Eggs", icon: "🥚" },
    { name: "Milk", icon: "🥛" },
    { name: "Onions", icon: "🧅" },
    { name: "Rice", icon: "🍚" },
    { name: "Flour", icon: "🌾" },
    { name: "Sugar", icon: "🍬" }
];

// --- ROBUST HELPER FUNCTIONS (Personal Shopper Edition) ---

// 0. DELAY HELPER (Prevents 429 Errors)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. SELF-HEALING JSON PARSER
const extractJSON = (text) => {
    if (!text) return null;
    try {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        const firstCurly = cleanText.indexOf('{');
        const lastCurly = cleanText.lastIndexOf('}');

        let jsonString = '';
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = cleanText.substring(firstBracket, lastBracket + 1);
        } else if (firstCurly !== -1 && lastCurly !== -1) {
            jsonString = cleanText.substring(firstCurly, lastCurly + 1);
        } else {
            return null;
        }
        jsonString = jsonString.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
    }
};

// 2. RECIPE BREAKER (Step 1: Extract Raw Ingredients)
const breakDownRecipesAI = async (mealRequests) => {
    // Retry logic loop
    for(let attempt = 0; attempt < 3; attempt++) {
        try {
            await delay(1000 + (attempt * 2000)); // Exponential backoff

            const prompt = `
            You are a professional Chef.
            Break down these meal requests into a consolidated shopping list of INDIVIDUAL raw ingredients.
            
            MEALS REQUESTED:
            ${mealRequests.join('\n')}

            CRITICAL INSTRUCTION:
            - EXTRACT ingredients for both the MAIN DISH and the SIDE DISHES.
            - Do NOT ignore the sides. 
            - Example: "Burger with Fries" -> List Ground Beef, Buns, AND Potatoes, Oil.
            - Ignore basic tap water.

            RULES:
            1. Combine quantities (e.g. if 2 meals need onions, list "Onions" once with total amount).
            2. Return a JSON ARRAY of strings only.
            
            EXAMPLE OUTPUT:
            ["Ground Beef (3lbs)", "Brioche Buns (1 pack)", "Potatoes (5lbs)", "Frying Oil"]
            `;

            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: 'JSON array of strings only.' }, { role: 'user', content: prompt }],
                    model: 'openai',
                    seed: Math.floor(Math.random() * 10000)
                })
            });
            
            if (response.status === 429) throw new Error("Rate Limit");
            
            const list = extractJSON(await response.text());
            if (Array.isArray(list) && list.length > 0) return list;
            
        } catch (err) {
            console.warn(`Attempt ${attempt + 1} failed:`, err);
        }
    }
    return null; // Failed after 3 attempts
};

// 3. FALLBACK PRICE ESTIMATOR (If AI fails or returns 0)
const estimatePrice = (itemName, category) => {
    const prices = {
        'Meat': 8.99,
        'Produce': 1.99,
        'Dairy': 4.50,
        'Pantry': 3.25,
        'Frozen': 5.99,
        'Other': 4.99
    };
    const base = prices[category] || 3.99;
    return parseFloat((base + (Math.random() * 3 - 1.5)).toFixed(2));
};

// 4. BATCH PRODUCT MATCHER (Step 2: Smart Quantity & Price)
const matchProductsBatchAI = async (ingredientsList) => {
    // Helper to generate fallback data locally if AI fails
    const generateLocalFallback = (items) => {
        return items.map(item => ({
            baseTerm: item,
            productName: item,
            price: estimatePrice(item, 'Other'),
            category: 'Other'
        }));
    };

    for(let attempt = 0; attempt < 2; attempt++) {
        try {
            await delay(2000 + (attempt * 2000)); 

            const prompt = `
            You are a Walmart Personal Shopper.
            Map these ingredients to SPECIFIC, PURCHASEABLE Walmart items.
            
            INGREDIENTS:
            ${JSON.stringify(ingredientsList)}

            CRITICAL RULES:
            1. Find the BEST MATCHING product.
            2. PRICE: Estimate the current shelf price. 
            3. QUANTITY: If the ingredient is small (1 tsp), buy the smallest container.
            
            RETURN A JSON ARRAY OF OBJECTS:
            [
              {
                "baseTerm": "Salt (1 tsp)",
                "productName": "Morton Iodized Salt, 26 oz",
                "price": 1.64,
                "category": "Pantry"
              },
              ...
            ]
            
            Categories: Meat, Produce, Dairy, Pantry, Frozen, Other.
            `;

            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: 'JSON array only.' }, { role: 'user', content: prompt }],
                    model: 'openai',
                    seed: Math.floor(Math.random() * 10000)
                })
            });

            if (response.status === 429) throw new Error("Rate Limit");

            const text = await response.text();
            const data = extractJSON(text);
            
            if (Array.isArray(data) && data.length > 0) return data;

        } catch (e) {
            console.warn(`Batch Match Attempt ${attempt + 1} failed:`, e);
        }
    }
    
    return generateLocalFallback(ingredientsList);
};

// 5. REAL PRODUCT IMAGE FINDER (Bing Search Proxy)
const getRealProductImage = (productName) => {
    if(!productName) return 'https://via.placeholder.com/100?text=No+Image';
    const query = `Walmart ${productName} product packaging`;
    return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(query)}&w=200&h=200&c=7&rs=1&p=0`;
};

// 6. LIST BUILDER ORCHESTRATOR
const generateGroceryListReal = async (mealConfig, onProgress) => {
    onProgress("Analyzing recipes (Mains & Sides)...", 10);
    
    // UPDATED PROMPT: Explicitly separates Main and Sides so AI sees both
    const requests = mealConfig.map(m => 
        `${m.quantity} servings of MAIN DISH: "${m.title}". ALSO INCLUDES ${m.quantity} servings of SIDE DISHES: "${m.side}".`
    );
    
    // Step 1: Breakdown
    let rawIngredients = await breakDownRecipesAI(requests);
    
    // Fallback if AI fails completely
    if (!rawIngredients || rawIngredients.length === 0) {
        rawIngredients = [];
        mealConfig.forEach(m => {
            rawIngredients.push(`${m.title} Ingredients`);
            if(m.side) rawIngredients.push(`${m.side} Ingredients`);
        });
    }

    onProgress(`Sourcing ${rawIngredients.length} ingredients...`, 30);

    // Step 2: Batch Match (Chunked to avoid limits)
    const results = [];
    const chunkSize = 8;
    
    for (let i = 0; i < rawIngredients.length; i += chunkSize) {
        const currentBatchNum = Math.ceil((i + 1) / chunkSize);
        const totalBatches = Math.ceil(rawIngredients.length / chunkSize);
        
        const percent = 30 + Math.round(((i) / rawIngredients.length) * 60);
        onProgress(`Matching Batch ${currentBatchNum} of ${totalBatches}...`, percent);
        
        if (i > 0) await delay(3000);

        const chunk = rawIngredients.slice(i, i + chunkSize);
        const chunkResults = await matchProductsBatchAI(chunk);
        results.push(...chunkResults);
    }

    onProgress("Finalizing prices...", 95);
    
    // Step 3: Clean & Format & Ensure Prices
    const final = results
        .filter(item => item && item.baseTerm) 
        .map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            baseTerm: item.baseTerm,
            realName: item.productName || item.baseTerm, 
            category: item.category || 'Other',
            // Force a price if 0 comes back
            price: (typeof item.price === 'number' && item.price > 0) ? item.price : estimatePrice(item.baseTerm, item.category || 'Other'),
            purchased: false,
            image: getRealProductImage(item.productName || item.baseTerm) 
        }));
    
    onProgress("Done!", 100);
    return final;
};

// ... (Standard AI Helpers for other tabs)
const generateNutritionAI = async (dishName) => {
    const prompt = `Nutrition for "${dishName}". Return JSON: { "calories": 500, "protein": "30g", "carbs": "40g", "fat": "20g" }. JSON ONLY.`;
    try {
        const response = await fetch('https://text.pollinations.ai/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'Output raw JSON only.' }, { role: 'user', content: prompt }], model: 'openai', seed: Math.floor(Math.random() * 1000) }) });
        return extractJSON(await response.text());
    } catch (e) { return null; }
};

const getAIText = async (main, side1, side2) => {
    const prompt = `Rewrite: "${main}, ${side1}, ${side2}". Appetizing names only. Max 15 words.`;
    try {
        const response = await fetch('https://text.pollinations.ai/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'Output raw text only.' }, { role: 'user', content: prompt }], model: 'openai' }) });
        return (await response.text()).replace(/["\n]/g, '').trim();
    } catch (e) { return `${main} with ${side1}`; }
};

const findImageInLibrary = async (query) => {
    if (!query || query.length < 3) return null;
    const { data: dish } = await supabase.from('dishes').select('image_url').ilike('name', `%${query}%`).limit(1);
    return dish?.[0]?.image_url || null;
};

const generateSingleImage = async (promptText) => {
    if(!promptText) return null;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=300&height=300&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
};

const generateAndUploadMealImage = async (main, side1, side2, forceNew = false) => {
  const mainItem = (main || '').trim();
  if (!mainItem) return null;
  const images = { main: null, side1: null, side2: null };
  if (!forceNew) {
      const memoryImage = await findImageInLibrary(mainItem);
      if (memoryImage) images.main = memoryImage;
  }
  if (!images.main) images.main = await generateSingleImage(`gourmet main dish, ${mainItem}, professional food photography, 4k`);
  if (side1) images.side1 = await generateSingleImage(`gourmet side dish, ${side1}, professional food photography`);
  if (side2) images.side2 = await generateSingleImage(`gourmet side dish, ${side2}, professional food photography`);
  return images;
};

// ================= MAIN COMPONENT =================
export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('builder');
  const [initialLoading, setInitialLoading] = useState(true);

  const [dishes, setDishes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [clients, setClients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [gallery, setGallery] = useState([]);

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
      const [dishRes, menuRes, clientRes, suggestionRes, galleryRes] = await Promise.all([
        supabase.from('dishes').select('*').order('name'),
        supabase.from('menus').select('*, meals(*)').order('week_start', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('suggestions').select('*').order('created_at', { ascending: false }),
        supabase.from('gallery_images').select('*').order('created_at', { ascending: false })
      ]);

      if (dishRes.data) setDishes(dishRes.data);
      if (menuRes.data) setMenus(menuRes.data);
      if (clientRes.data) setClients(clientRes.data);
      if (suggestionRes.data) setSuggestions(suggestionRes.data);
      if (galleryRes.data) setGallery(galleryRes.data);
    } catch (error) {
      console.error('Data load error', error);
    } finally {
      if (isFirstLoad) setInitialLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const handleEditMenu = (menu) => {
    setEditingMenuId(menu.id);
    setPrefillData(menu);
    setActiveTab('builder');
    toast.info(`Editing menu for week of ${menu.week_start}`);
  };

  const handleBulkDelete = async (ids) => {
    if (!window.confirm(`Delete ${ids.length} menus?`)) return;
    await supabase.from('meals').delete().in('menu_id', ids);
    await supabase.from('menus').delete().in('id', ids);
    toast.success("Deleted");
    fetchData();
  };

  const handleBulkStatusChange = async (ids, newStatus) => {
    await supabase.from('menus').update({ status: newStatus }).in('id', ids);
    toast.success("Updated");
    fetchData();
  };

  const newSuggestionCount = suggestions.filter(s => s.status === 'new').length;

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center bg-[#fcfdfa]"><Loader2 className="animate-spin text-[#2c5f4c] w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-[#fcfdfa] text-slate-800 font-sans">
      <div className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-[#2c5f4c] p-3 rounded-2xl shadow-lg shadow-[#2c5f4c]/20"><ChefHat className="w-8 h-8 text-white" /></div>
            <div><h1 className="text-2xl font-bold text-[#1a3c30] tracking-tight font-serif">Lorena's Kitchen</h1><p className="text-xs text-[#6b8c7e] font-bold uppercase tracking-wider">Command Center</p></div>
          </div>
          <button onClick={handleLogout} className="text-sm font-bold text-stone-400 hover:text-red-500 flex items-center gap-2"><LogOut className="w-4 h-4" /> Sign Out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-stone-100 overflow-x-auto">
            <TabButton active={activeTab === 'builder'} onClick={() => { setActiveTab('builder'); setEditingMenuId(null); setPrefillData(null); }} icon={<Sparkles className="w-4 h-4" />}>Menu Builder</TabButton>
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Archive className="w-4 h-4" />}>History</TabButton>
            <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<LayoutGrid className="w-4 h-4" />}>Gallery</TabButton>
            <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Search className="w-4 h-4" />}>Food Library</TabButton>
            <TabButton active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} icon={<Users className="w-4 h-4" />}>CRM</TabButton>
            <TabButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<ShoppingCart className="w-4 h-4" />}>Tools</TabButton>
            <TabButton active={activeTab === 'suggestions'} onClick={() => setActiveTab('suggestions')} icon={<MessageSquare className="w-4 h-4" />} badge={newSuggestionCount}>Suggestions</TabButton>
          </div>
        </div>

        <div className="animate-in fade-in duration-500">
          {activeTab === 'builder' && <MenuBuilder dishes={dishes} refreshData={() => fetchData(false)} editMode={!!editingMenuId} editId={editingMenuId} initialData={prefillData} onSuccess={() => { setEditingMenuId(null); setPrefillData(null); }} />}
          {activeTab === 'history' && <MenuHistory menus={menus} onEdit={handleEditMenu} onBulkDelete={handleBulkDelete} onBulkStatus={handleBulkStatusChange} />}
          {activeTab === 'gallery' && <GalleryManager gallery={gallery} refreshData={() => fetchData(false)} />}
          {activeTab === 'library' && <FoodLibrary dishes={dishes} refreshData={() => fetchData(false)} />}
          {activeTab === 'crm' && <CRM clients={clients} refreshData={() => fetchData(false)} />}
          {activeTab === 'tools' && <Tools menus={menus} />}
          {activeTab === 'suggestions' && <Suggestions suggestions={suggestions} refreshData={() => fetchData(false)} />}
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

// --- TOOLS MODULE (Shopping List & Nutrition) ---
function Tools({ menus }) {
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [mealQuantities, setMealQuantities] = useState({});
    
    // Grocery State
    const [groceryItems, setGroceryItems] = useState([]);
    const [newItemInput, setNewItemInput] = useState('');
    const [editingId, setEditingId] = useState(null);
    
    // Staples State
    const [pantryStaples, setPantryStaples] = useState([]);
    const [newStapleName, setNewStapleName] = useState('');
    const [isManagingStaples, setIsManagingStaples] = useState(false);

    // AI Loading State
    const [loadingGrocery, setLoadingGrocery] = useState(false);
    const [progress, setProgress] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);

    const [nutritionItem, setNutritionItem] = useState('');
    const [nutritionData, setNutritionData] = useState(null);
    const [loadingNutrition, setLoadingNutrition] = useState(false);

    useEffect(() => {
        // Load staples from local storage or default
        const saved = localStorage.getItem('loranas_pantry_staples');
        if (saved) {
            setPantryStaples(JSON.parse(saved));
        } else {
            setPantryStaples(DEFAULT_STAPLES);
        }
    }, []);

    const saveStaples = (newStaples) => {
        setPantryStaples(newStaples);
        localStorage.setItem('loranas_pantry_staples', JSON.stringify(newStaples));
    };

    const handleAddCustomStaple = () => {
        if(!newStapleName.trim()) return;
        const newItem = { name: newStapleName, icon: "🥘" }; 
        saveStaples([...pantryStaples, newItem]);
        setNewStapleName('');
        toast.success("Staple added!");
    };

    const handleDeleteStaple = (name) => {
        const filtered = pantryStaples.filter(s => s.name !== name);
        saveStaples(filtered);
    };

    useEffect(() => {
        if (selectedMenu) {
            const initialQ = {};
            selectedMenu.meals.forEach(m => { initialQ[m.id] = 4; });
            setMealQuantities(initialQ);
            setGroceryItems([]); 
        }
    }, [selectedMenu]);

    const handleQuantityChange = (id, val) => {
        setMealQuantities(prev => ({...prev, [id]: parseInt(val) || 0}));
    };

    // 1. GENERATE LIST
    const handleGenerateGrocery = async () => {
        if(!selectedMenu) return;
        setLoadingGrocery(true);
        setGroceryItems([]);
        setProgress('Starting AI Agent...');
        setProgressPercent(5);
        
        try {
            const mealConfig = selectedMenu.meals.map(m => ({
                title: m.title,
                side: m.side,
                quantity: mealQuantities[m.id] || 0
            })).filter(m => m.quantity > 0);

            if(mealConfig.length === 0) {
                toast.error("Please add at least 1 serving");
                setLoadingGrocery(false);
                return;
            }

            const list = await generateGroceryListReal(mealConfig, (msg, pct) => {
                setProgress(msg);
                if(pct) setProgressPercent(pct);
            });
            
            if (!list || list.length === 0) {
                toast.error("Could not generate ingredients.");
            } else {
                setGroceryItems(list);
            }
        } catch (e) {
            toast.error("Failed to generate list");
            console.error(e);
        } finally {
            setLoadingGrocery(false);
            setProgress('');
            setProgressPercent(0);
        }
    };

    // 2. MANUAL ADD
    const handleAddItem = async () => {
        if (!newItemInput.trim()) return;
        
        if (editingId) {
            setGroceryItems(prev => prev.map(item => 
                item.id === editingId ? { ...item, realName: newItemInput, baseTerm: newItemInput } : item
            ));
            setEditingId(null);
            setNewItemInput('');
            toast.success("Item updated");
        } else {
            const tempId = Date.now().toString();
            const inputName = newItemInput;
            setNewItemInput('');
            toast.info(`Adding "${inputName}"...`);

            const newItem = {
                id: tempId,
                baseTerm: inputName,
                realName: inputName,
                category: 'Other',
                price: estimatePrice(inputName, 'Other'),
                purchased: false,
                image: getRealProductImage(inputName)
            };
            setGroceryItems(prev => [newItem, ...prev]);
        }
    };

    const handleQuickAdd = (itemName) => {
        const tempId = Date.now().toString() + Math.random();
        toast.info(`Adding ${itemName}...`);
        
        const newItem = {
            id: tempId,
            baseTerm: itemName,
            realName: itemName, 
            category: 'Pantry',
            price: estimatePrice(itemName, 'Pantry'),
            purchased: false,
            image: getRealProductImage(itemName)
        };
        
        setGroceryItems(prev => [newItem, ...prev]);
    };

    const handleEditStart = (item) => {
        setNewItemInput(item.baseTerm);
        setEditingId(item.id);
        document.getElementById('grocery-input')?.focus();
    };

    const handleDeleteItem = (id) => {
        setGroceryItems(prev => prev.filter(i => i.id !== id));
    };

    const togglePurchased = (id) => {
        setGroceryItems(prev => prev.map(item => 
            item.id === id ? { ...item, purchased: !item.purchased } : item
        ));
    };

    const handleGenerateNutrition = async () => {
        if(!nutritionItem) return;
        setLoadingNutrition(true);
        const data = await generateNutritionAI(nutritionItem);
        setNutritionData(data);
        setLoadingNutrition(false);
    };

    const categories = ["Meat", "Produce", "Dairy", "Pantry", "Frozen", "Other"];
    const activeItems = groceryItems.filter(i => !i.purchased);
    const purchasedItems = groceryItems.filter(i => i.purchased);
    const estimatedTotal = activeItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* TOP: NUTRITION */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a3c30] mb-4 flex items-center gap-2"><Activity className="w-5 h-5" /> Quick Nutrition Check</h3>
                <div className="flex gap-2 mb-6">
                    <input placeholder="e.g. Turkey Tacos" className="flex-1 p-2 border rounded-xl text-sm" value={nutritionItem} onChange={(e) => setNutritionItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerateNutrition()}/>
                    <button onClick={handleGenerateNutrition} disabled={!nutritionItem || loadingNutrition} className="bg-[#2c5f4c] text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50">
                        {loadingNutrition ? <Loader2 className="w-4 h-4 animate-spin"/> : "Analyze"}
                    </button>
                </div>
                {nutritionData && (
                    <div className="border-2 border-black p-4 max-w-sm mx-auto bg-white font-sans animate-in zoom-in-95">
                        <h4 className="text-3xl font-black border-b-8 border-black pb-1">Nutrition Facts</h4>
                        <div className="py-2 border-b-4 border-black flex justify-between items-end"><div><p className="font-bold text-sm">Amount Per Serving</p><p className="text-3xl font-black">Calories</p></div><p className="text-4xl font-black">{nutritionData.calories}</p></div>
                        <div className="text-sm py-1 border-b border-stone-300 flex justify-between"><span className="font-bold">Total Fat</span><span>{nutritionData.fat}</span></div>
                        <div className="text-sm py-1 border-b border-stone-300 flex justify-between"><span className="font-bold">Total Carbohydrate</span><span>{nutritionData.carbs}</span></div>
                        <div className="text-sm py-1 border-b-4 border-black flex justify-between"><span className="font-bold">Protein</span><span>{nutritionData.protein}</span></div>
                    </div>
                )}
            </div>

            {/* BOTTOM: SHOPPING LIST */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a3c30] mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Shopping List Manager
                </h3>
                
                <div className="mb-6">
                    {/* QUICK ADD ESSENTIALS */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Quick Add Pantry Staples</label>
                            <button onClick={() => setIsManagingStaples(!isManagingStaples)} className="text-xs font-bold text-[#2c5f4c] hover:underline flex items-center gap-1">
                                <Settings className="w-3 h-3"/> {isManagingStaples ? "Done Editing" : "Edit Staples"}
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {pantryStaples.map((item) => (
                                <div key={item.name} className="relative group">
                                    <button
                                        onClick={() => !isManagingStaples && handleQuickAdd(item.name)}
                                        className={`flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-100 rounded-xl transition-all text-sm font-medium text-stone-600 ${isManagingStaples ? 'opacity-80 cursor-default' : 'hover:bg-white hover:shadow-md hover:border-[#2c5f4c] active:scale-95'}`}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.name}</span>
                                        {!isManagingStaples && <Plus className="w-3 h-3 opacity-50" />}
                                    </button>
                                    {isManagingStaples && (
                                        <button onClick={() => handleDeleteStaple(item.name)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm hover:scale-110">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            {isManagingStaples && (
                                <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                                    <input 
                                        value={newStapleName}
                                        onChange={(e) => setNewStapleName(e.target.value)}
                                        placeholder="New Item..."
                                        className="w-24 p-2 text-xs border rounded-lg"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStaple()}
                                    />
                                    <button onClick={handleAddCustomStaple} className="bg-[#2c5f4c] text-white p-2 rounded-lg">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-stone-100 w-full mb-8"></div>

                    {/* PROGRESS DASHBOARD */}
                    {loadingGrocery && (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-8 text-center shadow-inner animate-in fade-in zoom-in-95 mb-8">
                            <div className="flex items-center justify-center gap-3 mb-4 text-[#2c5f4c]">
                                <ScanLine className="w-8 h-8 animate-pulse" />
                                <Cpu className="w-8 h-8 animate-bounce" />
                                <Layers className="w-8 h-8 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-[#1a3c30] mb-2">{progressPercent}% Complete</h3>
                            <p className="text-stone-500 font-bold text-sm mb-6 animate-pulse">{progress}</p>
                            
                            <div className="w-full max-w-md mx-auto bg-stone-200 rounded-full h-4 mb-4 overflow-hidden border border-stone-300">
                                 <div 
                                    className="bg-gradient-to-r from-[#2c5f4c] to-emerald-500 h-full transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(44,95,76,0.5)]" 
                                    style={{ width: `${progressPercent}%` }}
                                 ></div>
                            </div>
                            <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">
                                Finding lowest prices... (Attempting auto-retry if busy)
                            </p>
                        </div>
                    )}

                    {!loadingGrocery && groceryItems.length === 0 && (
                        <>
                            <label className="text-xs font-bold text-stone-400 uppercase mb-2 block">1. Select Menu Source</label>
                            <select 
                                className="w-full p-3 border rounded-xl text-sm mb-4"
                                onChange={(e) => setSelectedMenu(menus.find(m => m.id === parseInt(e.target.value)))}
                            >
                                <option value="">Select a Menu...</option>
                                {menus.map(m => (
                                    <option key={m.id} value={m.id}>
                                        Week of {format(parseISO(m.week_start), 'MMM d')} ({m.meals.length} meals)
                                    </option>
                                ))}
                            </select>

                            {selectedMenu && (
                                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 mb-4 animate-in fade-in">
                                    <div className="space-y-3">
                                        {selectedMenu.meals.map(meal => (
                                            <div key={meal.id} className="flex justify-between items-center gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-[#1a3c30] truncate">{meal.title}</div>
                                                    <div className="text-xs text-stone-500 truncate" title={meal.side}>+ {meal.side}</div>
                                                </div>
                                                <input 
                                                    type="number" min="0" value={mealQuantities[meal.id] || 0}
                                                    onChange={(e) => handleQuantityChange(meal.id, e.target.value)}
                                                    className="w-16 p-1 border rounded text-center font-bold text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleGenerateGrocery} 
                                disabled={!selectedMenu || loadingGrocery}
                                className="w-full bg-[#2c5f4c] text-white px-4 py-3 rounded-xl font-bold disabled:opacity-50 flex justify-center items-center gap-2 hover:bg-[#1f4436] transition-colors shadow-lg shadow-[#2c5f4c]/20"
                            >
                                <Sparkles className="w-4 h-4"/> Generate New List
                            </button>
                        </>
                    )}

                    {!loadingGrocery && groceryItems.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex gap-2 mb-4 border-b pb-4 border-stone-100">
                                <input 
                                    id="grocery-input" type="text" value={newItemInput}
                                    onChange={(e) => setNewItemInput(e.target.value)}
                                    placeholder={editingId ? "Update base item..." : "Add item..."}
                                    className="flex-1 p-2 border rounded-lg text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                />
                                <button onClick={handleAddItem} className={`px-4 py-2 rounded-lg font-bold text-white text-sm ${editingId ? 'bg-blue-600' : 'bg-[#2c5f4c]'}`}>
                                    {editingId ? <Save className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                                </button>
                                {editingId && <button onClick={() => { setEditingId(null); setNewItemInput(''); }} className="text-stone-400 hover:text-red-500"><X className="w-5 h-5"/></button>}
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-stone-400">To Buy ({activeItems.length})</span>
                                    <span className="text-xl font-bold text-green-600">${estimatedTotal.toFixed(2)}</span>
                                </div>

                                {categories.map(cat => {
                                    const items = activeItems.filter(i => (i.category || 'Other') === cat);
                                    if(items.length === 0) return null;
                                    return (
                                        <div key={cat}>
                                            <h4 className="font-bold text-[#1a3c30] text-xs uppercase mb-2 tracking-wider">{cat}</h4>
                                            <ul className="space-y-2">
                                                {items.map((item) => (
                                                    <li key={item.id} className="flex items-center justify-between p-3 bg-white border border-stone-100 rounded-xl shadow-sm group hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <input type="checkbox" checked={item.purchased} onChange={() => togglePurchased(item.id)} className="w-5 h-5 accent-[#2c5f4c] cursor-pointer rounded"/>
                                                            <div className="w-12 h-12 bg-stone-100 rounded-lg overflow-hidden shrink-0 border border-stone-200">
                                                                <img src={item.image} alt="" className="w-full h-full object-contain p-1" />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 px-4 min-w-0">
                                                            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-wider mb-0.5">Looking for: {item.baseTerm}</p>
                                                            <h3 className="text-sm font-bold text-stone-800 leading-tight truncate" title={item.realName}>{item.realName}</h3>
                                                        </div>
                                                        <div className="text-right flex items-center gap-3">
                                                            <span className="text-lg font-bold text-green-700 block">${item.price?.toFixed(2)}</span>
                                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEditStart(item)} className="p-1 text-blue-400 hover:bg-blue-50 rounded"><Edit2 className="w-3 h-3"/></button>
                                                                <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>

                            {purchasedItems.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-stone-200">
                                    <h4 className="font-bold text-stone-400 text-xs uppercase mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Purchased ({purchasedItems.length})</h4>
                                    <ul className="space-y-1 opacity-60">
                                        {purchasedItems.map((item) => (
                                            <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors">
                                                <input type="checkbox" checked={item.purchased} onChange={() => togglePurchased(item.id)} className="w-5 h-5 accent-stone-400 cursor-pointer rounded"/>
                                                <span className="flex-1 text-sm text-stone-500 line-through truncate">{item.realName}</span>
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-stone-300 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <div className="flex gap-2 mt-6">
                                <button onClick={() => setGroceryItems([])} className="flex-1 py-3 text-red-400 font-bold text-sm bg-red-50 hover:bg-red-100 rounded-xl">Clear All</button>
                                <button onClick={() => window.print()} className="flex-1 py-3 text-[#1a3c30] font-bold text-sm bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
