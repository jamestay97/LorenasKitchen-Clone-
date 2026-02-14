import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  ShoppingCart, Activity, Settings, Plus, X, 
  Printer, ScanLine, Cpu, Layers, Loader2 
} from 'lucide-react';
import { 
  DEFAULT_STAPLES, 
  generateGroceryListReal, 
  generateNutritionAI 
} from '../../services/aiService'; // Import from our new service

export default function ToolsTab({ menus }) {
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [mealQuantities, setMealQuantities] = useState({});
    const [groceryItems, setGroceryItems] = useState([]);
    const [newItemInput, setNewItemInput] = useState('');
    const [pantryStaples, setPantryStaples] = useState([]);
    const [newStapleName, setNewStapleName] = useState('');
    const [isManagingStaples, setIsManagingStaples] = useState(false);
    
    // Loading States
    const [loadingGrocery, setLoadingGrocery] = useState(false);
    const [progress, setProgress] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [nutritionItem, setNutritionItem] = useState('');
    const [nutritionData, setNutritionData] = useState(null);
    const [loadingNutrition, setLoadingNutrition] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('loranas_pantry_staples');
        setPantryStaples(saved ? JSON.parse(saved) : DEFAULT_STAPLES);
    }, []);

    const saveStaples = (newStaples) => {
        setPantryStaples(newStaples);
        localStorage.setItem('loranas_pantry_staples', JSON.stringify(newStaples));
    };

    const handleGenerateGrocery = async () => {
        if(!selectedMenu) return;
        setLoadingGrocery(true);
        setGroceryItems([]);
        setProgress('Starting AI Agent...');
        setProgressPercent(5);
        
        try {
            const mealConfig = selectedMenu.meals.map(m => ({
                title: m.title, side: m.side, quantity: mealQuantities[m.id] || 0
            })).filter(m => m.quantity > 0);

            if(mealConfig.length === 0) {
                toast.error("Please add at least 1 serving");
                return;
            }

            const list = await generateGroceryListReal(mealConfig, (msg, pct) => {
                setProgress(msg);
                if(pct) setProgressPercent(pct);
            });
            
            if (list) setGroceryItems(list);
        } catch (e) {
            toast.error("Failed to generate list");
        } finally {
            setLoadingGrocery(false);
        }
    };

    const handleGenerateNutrition = async () => {
        if(!nutritionItem) return;
        setLoadingNutrition(true);
        const data = await generateNutritionAI(nutritionItem);
        setNutritionData(data);
        setLoadingNutrition(false);
    };

    // ... (Add the togglePurchased, handleDeleteItem, handleAddItem logic here as needed)
    // For brevity, I am assuming you can copy those small handlers from your original file 
    // or I can provide them if you need.

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

            {/* BOTTOM: GROCERY */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-[#1a3c30] mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Shopping List Manager
                </h3>
                
                {/* MENU SELECTOR */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-stone-500 mb-2">Select a Menu Plan to Shop For</label>
                    <select 
                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-bold text-[#1a3c30]"
                        onChange={(e) => {
                            const m = menus.find(menu => menu.id === e.target.value);
                            setSelectedMenu(m);
                        }}
                    >
                        <option value="">-- Choose a Week --</option>
                        {menus.map(m => (
                            <option key={m.id} value={m.id}>Week of {m.week_start}</option>
                        ))}
                    </select>
                </div>

                {selectedMenu && (
                     <button 
                        onClick={handleGenerateGrocery} 
                        disabled={loadingGrocery}
                        className="w-full py-4 bg-[#1b4d3e] text-white rounded-xl font-bold shadow-lg shadow-[#1b4d3e]/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
                    >
                        {loadingGrocery ? "AI Agent Working..." : "Generate Shopping List"}
                    </button>
                )}

                {/* PROGRESS BAR */}
                {loadingGrocery && (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-8 text-center shadow-inner animate-in fade-in zoom-in-95 mt-8">
                        <div className="flex items-center justify-center gap-3 mb-4 text-[#2c5f4c]">
                            <ScanLine className="w-8 h-8 animate-pulse" />
                            <Cpu className="w-8 h-8 animate-bounce" />
                        </div>
                        <h3 className="text-2xl font-black text-[#1a3c30] mb-2">{progressPercent}% Complete</h3>
                        <p className="text-stone-500 font-bold text-sm mb-6 animate-pulse">{progress}</p>
                    </div>
                )}
                
                {/* LIST DISPLAY (Simplified for brevity - add mapping here) */}
                {groceryItems.length > 0 && (
                     <div className="mt-8">
                        <p className="text-center text-stone-400 mb-4">Generated {groceryItems.length} items</p>
                        <ul className="space-y-2">
                            {groceryItems.map(item => (
                                <li key={item.id} className="p-3 bg-stone-50 rounded border border-stone-100 flex justify-between">
                                    <span>{item.realName}</span>
                                    <span className="font-bold">${item.price}</span>
                                </li>
                            ))}
                        </ul>
                     </div>
                )}
            </div>
        </div>
    );
}