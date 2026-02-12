import React, { useState } from 'react';
import { Sparkles, ShoppingCart, Loader2, Copy, DollarSign, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function GroceryTools({ recipes }) {
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [groceryList, setGroceryList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // --- AI LOGIC PORTED FROM BACKUP ---
    const extractJSON = (text) => {
        try {
            let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = clean.indexOf('[');
            const end = clean.lastIndexOf(']');
            if (start !== -1 && end !== -1) return JSON.parse(clean.substring(start, end + 1));
            return [];
        } catch (e) { return []; }
    };

    const estimatePrice = (item) => {
        // Simple heuristic for price estimation
        const base = 4.50; 
        const randomVar = (Math.random() * 2) - 1; 
        return (base + randomVar).toFixed(2);
    };

    const generateList = async () => {
        if (selectedRecipes.length === 0) return toast.error("Select recipes first");
        setLoading(true);
        setGroceryList([]);

        const prompt = `
            Professional Chef Task:
            Break down these meals into a consolidated shopping list of raw ingredients.
            MEALS: ${selectedRecipes.join(', ')}.
            
            Rules:
            1. Combine quantities (e.g., 2 meals need Onions -> "Onions (2)").
            2. Ignore water.
            3. Return a JSON ARRAY of strings only. Example: ["Ground Beef (2lbs)", "Milk (1 gal)"]
        `;

        try {
            const response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: 'JSON array of strings only.' }, { role: 'user', content: prompt }],
                    model: 'openai',
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            const text = await response.text();
            const ingredients = extractJSON(text);

            // Add Price Estimation
            const pricedList = ingredients.map(item => ({
                name: item,
                price: estimatePrice(item),
                checked: false
            }));

            setGroceryList(pricedList);
        } catch (e) {
            toast.error("Failed to generate list");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- ANYLIST EXPORT FORMAT ---
    const copyForAnyList = () => {
        // AnyList prefers plain text separated by newlines
        const text = groceryList.map(i => i.name).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied! Paste directly into AnyList.");
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleRecipe = (name) => {
        if (selectedRecipes.includes(name)) {
            setSelectedRecipes(selectedRecipes.filter(r => r !== name));
        } else {
            setSelectedRecipes([...selectedRecipes, name]);
        }
    };

    const totalPrice = groceryList.reduce((sum, item) => sum + parseFloat(item.price), 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Recipe Selector */}
            <div className="bg-white p-8 rounded-[40px] border border-stone-200 h-fit">
                <h3 className="text-2xl font-bold text-[#1b4d3e] mb-6">1. Select Meals</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {recipes.map(r => (
                        <div 
                            key={r.id} 
                            onClick={() => toggleRecipe(r.main_dish)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${selectedRecipes.includes(r.main_dish) ? 'bg-[#1b4d3e] text-white border-[#1b4d3e]' : 'bg-stone-50 border-stone-100 hover:bg-stone-100'}`}
                        >
                            <span className="font-bold">{r.main_dish}</span>
                            {selectedRecipes.includes(r.main_dish) && <Check className="w-5 h-5" />}
                        </div>
                    ))}
                </div>
                <button 
                    onClick={generateList} 
                    disabled={loading || selectedRecipes.length === 0}
                    className="w-full mt-6 bg-[#1b4d3e] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Generate Grocery List
                </button>
            </div>

            {/* Right: Grocery List Output */}
            <div className="bg-white p-8 rounded-[40px] border border-stone-200 h-fit">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-[#1b4d3e]">Shopping List</h3>
                    {groceryList.length > 0 && (
                        <button onClick={copyForAnyList} className="text-sm font-bold text-stone-400 hover:text-[#1b4d3e] flex items-center gap-1">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                            Copy for AnyList
                        </button>
                    )}
                </div>

                {groceryList.length > 0 ? (
                    <>
                        <div className="bg-stone-50 rounded-2xl p-4 mb-4 space-y-2 max-h-[500px] overflow-y-auto">
                            {groceryList.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-xl shadow-sm">
                                    <span className="font-bold text-stone-700 text-sm">{item.name}</span>
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                        ${item.price}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                            <span className="text-stone-400 font-bold uppercase text-xs">Estimated Total</span>
                            <span className="text-2xl font-black text-[#1b4d3e]">${totalPrice.toFixed(2)}</span>
                        </div>
                    </>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-stone-300">
                        <ShoppingCart className="w-12 h-12 mb-2" />
                        <p className="font-bold">List is empty</p>
                    </div>
                )}
            </div>
        </div>
    );
}