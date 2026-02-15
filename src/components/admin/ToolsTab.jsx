import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  ShoppingCart, Activity, Plus, X, ExternalLink, Pencil, Trash2,
  Printer, ScanLine, Cpu, Loader2, Copy, Download, ListChecks, BadgeCheck, BadgeAlert, RefreshCw
} from 'lucide-react';
import { 
  DEFAULT_STAPLES, 
  getGroceryIngredientsOnly,
  generateNutritionAI,
  lookupSingleIngredient,
} from '../../services/aiService';

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
    const [addingStapleName, setAddingStapleName] = useState('');
    const [refreshingPrices, setRefreshingPrices] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('loranas_pantry_staples');
        setPantryStaples(saved ? JSON.parse(saved) : DEFAULT_STAPLES);
    }, []);

    const saveStaples = (newStaples) => {
        setPantryStaples(newStaples);
        localStorage.setItem('loranas_pantry_staples', JSON.stringify(newStaples));
    };

    const handleGenerateGrocery = async () => {
        if (!selectedMenu) return;
        setLoadingGrocery(true);
        setGroceryItems([]);
        setProgress('Starting...');
        setProgressPercent(5);

        try {
            const meals = selectedMenu.meals || [];
            if (meals.length === 0) {
                toast.error('This menu has no meals. Add meals first.');
                return;
            }
            const mealConfig = meals.map(m => ({
                title: m.title, side: m.side || '', side2: m.side2 || '', quantity: mealQuantities[m.id] || 0
            })).filter(m => m.quantity > 0);

            if (mealConfig.length === 0) {
                toast.error("Please add at least 1 serving");
                return;
            }

            const allItems = await getGroceryIngredientsOnly(mealConfig, (msg, pct) => {
                setProgress(msg);
                if (pct != null) setProgressPercent(pct);
            });

            if (!allItems || allItems.length === 0) {
                toast.error("No ingredients found");
                setLoadingGrocery(false);
                return;
            }

            const searchName = (ing) => (ing || '').replace(/\(.*?\)/g, '').trim();
            const placeholders = allItems.map(({ ingredient, meal }) => ({
                id: Math.random().toString(36).substr(2, 9),
                baseTerm: ingredient,
                realName: ingredient,
                category: 'Other',
                price: 0,
                totalPrice: 0,
                priceLoading: true,
                walmartUrl: `https://www.walmart.com/search?q=${encodeURIComponent(searchName(ingredient))}`,
                purchased: false,
                meal: meal || '',
            }));

            setGroceryItems(placeholders);
            setLoadingGrocery(false);
            setProgress(`List ready — loading prices for ${placeholders.length} items...`);
            setProgressPercent(100);
            toast.success(`Added ${placeholders.length} items. Prices loading...`);

            const staggerMs = 350;
            placeholders.forEach((item, index) => {
                const doLookup = () =>
                    lookupSingleIngredient(item.baseTerm)
                    .then((priced) => {
                        if (priced) {
                            setGroceryItems((prev) =>
                                prev.map((i) =>
                                    i.id === item.id
                                        ? {
                                            ...priced,
                                            id: item.id,
                                            meal: item.meal,
                                            priceLoading: false,
                                        }
                                        : i
                                )
                            );
                        } else {
                            setGroceryItems((prev) =>
                                prev.map((i) => (i.id === item.id ? { ...i, priceLoading: false } : i))
                            );
                        }
                    })
                    .catch(() => {
                        setGroceryItems((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, priceLoading: false } : i))
                        );
                    });
                if (index === 0) doLookup();
                else setTimeout(doLookup, index * staggerMs);
            });
        } catch (e) {
            toast.error("Failed to generate list");
            setLoadingGrocery(false);
        }
    };

    const handleGenerateNutrition = async () => {
        if (!nutritionItem?.trim()) return;
        setLoadingNutrition(true);
        setNutritionData(null);
        try {
            const result = await generateNutritionAI(nutritionItem.trim());
            if (result && typeof result.calories !== 'undefined') {
                setNutritionData({
                    calories: result.calories,
                    protein: result.protein ?? '—',
                    carbs: result.carbs ?? '—',
                    fat: result.fat ?? '—',
                    servingSize: result.servingSize ?? null,
                });
            } else {
                toast.error('Could not parse nutrition. Try again.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Quick nutrition check failed. Try again.');
        } finally {
            setLoadingNutrition(false);
        }
    };

    const togglePurchased = (id) => {
        setGroceryItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, purchased: !item.purchased } : item
            )
        );
    };

    const handleDeleteItem = (id) => {
        setGroceryItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleRefreshPrices = async () => {
        if (groceryItems.length === 0) return;
        setRefreshingPrices(true);
        const total = groceryItems.length;
        let updated = [...groceryItems];
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        try {
            for (let i = 0; i < total; i++) {
                const item = updated[i];
                const query = (item.baseTerm || item.realName || '').trim();
                if (!query) continue;
                const fresh = await lookupSingleIngredient(query);
                if (fresh) {
                    updated[i] = { ...item, realName: fresh.realName, brand: fresh.brand, size: fresh.size, price: fresh.totalPrice ?? fresh.price, totalPrice: fresh.totalPrice ?? fresh.price, walmartUrl: fresh.walmartUrl, imageUrl: fresh.imageUrl || item.imageUrl, isRealPrice: fresh.isRealPrice };
                }
                if (i < total - 1) await delay(400);
            }
            setGroceryItems(updated);
            toast.success(`Live prices updated for ${total} item${total !== 1 ? 's' : ''}`);
        } catch (e) {
            console.warn(e);
            toast.error('Could not refresh some prices. Try again.');
        } finally {
            setRefreshingPrices(false);
        }
    };

    const handleAddItem = () => {
        const name = newItemInput.trim();
        if (!name) return;
        if (groceryItems.some((i) => (i.realName || i.baseTerm || '').toLowerCase() === name.toLowerCase())) {
            toast.info('Already in list');
            return;
        }
        const placeholderId = Math.random().toString(36).substr(2, 9);
        const placeholder = {
            id: placeholderId,
            baseTerm: name,
            realName: name,
            category: 'Other',
            price: 0,
            totalPrice: 0,
            priceLoading: true,
            walmartUrl: `https://www.walmart.com/search?q=${encodeURIComponent(name)}`,
            purchased: false,
        };
        setGroceryItems((prev) => [...prev, placeholder]);
        setNewItemInput('');
        toast.success(`Added "${name}" — loading price...`);

        lookupSingleIngredient(name)
            .then((item) => {
                if (item) {
                    setGroceryItems((prev) =>
                        prev.map((i) =>
                            i.id === placeholderId
                                ? { ...item, id: placeholderId, priceLoading: false }
                                : i
                        )
                    );
                    toast.success(`Price loaded: $${(item.totalPrice || item.price || 0).toFixed(2)}`);
                } else {
                    setGroceryItems((prev) =>
                        prev.map((i) => (i.id === placeholderId ? { ...i, priceLoading: false } : i))
                    );
                }
            })
            .catch(() => {
                setGroceryItems((prev) =>
                    prev.map((i) => (i.id === placeholderId ? { ...i, priceLoading: false } : i))
                );
            });
    };

    const updateItemPrice = (id, price) => {
        const num = parseFloat(price);
        const value = isNaN(num) ? 0 : num;
        setGroceryItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, price: value, totalPrice: value } : item))
        );
    };

    const updateItemName = (id, realName) => {
        setGroceryItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, realName: realName || item.realName } : item))
        );
    };

    const addStapleToCart = (staple) => {
        const name = typeof staple === 'string' ? staple : (staple?.name || staple?.label || '');
        if (!name) return;
        if (groceryItems.some((i) => (i.realName || i.baseTerm || '').toLowerCase() === name.toLowerCase())) {
            toast.info('Already in list');
            return;
        }
        const placeholderId = Math.random().toString(36).substr(2, 9);
        const placeholder = {
            id: placeholderId,
            baseTerm: name,
            realName: name,
            category: 'Pantry',
            price: 0,
            totalPrice: 0,
            priceLoading: true,
            walmartUrl: `https://www.walmart.com/search?q=${encodeURIComponent(name)}`,
            purchased: false,
        };
        setGroceryItems((prev) => [...prev, placeholder]);
        toast.success(`Added "${name}" — loading price...`);

        lookupSingleIngredient(name)
            .then((item) => {
                if (item) {
                    setGroceryItems((prev) =>
                        prev.map((i) =>
                            i.id === placeholderId
                                ? { ...item, id: placeholderId, category: 'Pantry', priceLoading: false }
                                : i
                        )
                    );
                    toast.success(`Price loaded: $${(item.totalPrice || item.price || 0).toFixed(2)}`);
                } else {
                    setGroceryItems((prev) =>
                        prev.map((i) => (i.id === placeholderId ? { ...i, priceLoading: false } : i))
                    );
                }
            })
            .catch(() => {
                setGroceryItems((prev) =>
                    prev.map((i) => (i.id === placeholderId ? { ...i, priceLoading: false } : i))
                );
            });
    };

    const getAnyListText = () => {
        return groceryItems.map((i) => i.realName || i.baseTerm || '').filter(Boolean).join('\n');
    };

    const copyForAnyList = () => {
        const text = getAnyListText();
        if (!text) {
            toast.error('List is empty');
            return;
        }
        navigator.clipboard?.writeText(text).then(() => toast.success('Copied! Paste into AnyList (Add Item → pasteboard → Paste).'));
    };

    const downloadList = () => {
        const lines = groceryItems.map((i) => {
            const name = i.realName || i.baseTerm || '';
            const price = typeof i.price === 'number' && i.price > 0 ? `, $${i.price.toFixed(2)}` : '';
            return `${name}${price}`;
        });
        const total = groceryItems.reduce((sum, i) => sum + (typeof i.price === 'number' ? i.price : 0), 0);
        if (total > 0) lines.push('', `Total (estimated), $${total.toFixed(2)}`);
        const text = lines.join('\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `grocery-list-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('List downloaded');
    };

    const printList = () => {
        const total = groceryItems.reduce((sum, i) => sum + (typeof i.price === 'number' ? i.price : 0), 0);
        const toFind = groceryItems.filter((i) => !i.purchased);
        const found = groceryItems.filter((i) => i.purchased);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>Grocery List</title>
          <style>body{font-family:sans-serif;padding:20px;max-width:500px;margin:0 auto}
          h1{font-size:1.25rem} .section{margin:1rem 0} .item{display:flex;justify-content:space-between;padding:4px 0}
          .found{text-decoration:line-through;color:#666} .total{margin-top:1rem;font-weight:bold;border-top:2px solid #000;padding-top:8px}</style>
          </head><body>
          <h1>Grocery List</h1>
          <div class="section"><strong>To find</strong>
          ${toFind.map((i) => `<div class="item"><span>${(i.realName || '').replace(/</g, '&lt;')}</span><span>$${(typeof i.price === 'number' ? i.price : 0).toFixed(2)}</span></div>`).join('')}
          </div>
          ${found.length ? `<div class="section"><strong>Found</strong>${found.map((i) => `<div class="item found"><span>${(i.realName || '').replace(/</g, '&lt;')}</span></div>`).join('')}</div>` : ''}
          ${total > 0 ? `<div class="total">Total (estimated): $${total.toFixed(2)}</div>` : ''}
          </body></html>`);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    };

    const totalCost = groceryItems.reduce((sum, i) => {
        const itemCost = typeof i.totalPrice === 'number' && i.totalPrice > 0 ? i.totalPrice : (typeof i.price === 'number' ? i.price : 0);
        return sum + itemCost;
    }, 0);
    const toFindItems = groceryItems.filter((i) => !i.purchased);
    const foundItems = groceryItems.filter((i) => i.purchased);

    // Group unpurchased items by meal
    const groupedByMeal = {};
    for (const item of toFindItems) {
        const mealKey = item.meal || 'Other Items';
        if (!groupedByMeal[mealKey]) groupedByMeal[mealKey] = [];
        groupedByMeal[mealKey].push(item);
    }
    const mealGroups = Object.entries(groupedByMeal);

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
                        {nutritionData.servingSize && (
                            <div className="py-1.5 border-b border-stone-300 flex justify-between items-center text-sm">
                                <span className="font-bold">Serving size</span>
                                <span>{nutritionData.servingSize}</span>
                            </div>
                        )}
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
                        value={selectedMenu?.id ?? ''}
                        onChange={(e) => {
                            const m = menus?.find(menu => String(menu.id) === e.target.value);
                            setSelectedMenu(m || null);
                        }}
                    >
                        <option value="">-- Choose a Week --</option>
                        {(menus || []).map(m => (
                            <option key={m.id} value={m.id}>Week of {m.week_start}</option>
                        ))}
                    </select>
                </div>

                {selectedMenu && (selectedMenu.meals || []).length === 0 && (
                    <p className="mb-6 text-amber-600 font-medium">This menu has no meals yet. Add meals in the Menu Editor first.</p>
                )}
                {selectedMenu && (selectedMenu.meals || []).length > 0 && (
                    <div className="mb-6 space-y-3">
                        <label className="block text-sm font-bold text-stone-500">Servings per meal</label>
                        {(selectedMenu.meals || []).map(m => (
                            <div key={m.id} className="flex items-center justify-between gap-4 p-3 bg-stone-50 rounded-xl">
                                <span className="font-medium text-stone-800">{m.title}</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={mealQuantities[m.id] ?? ''}
                                    onChange={(e) => setMealQuantities(prev => ({ ...prev, [m.id]: parseInt(e.target.value, 10) || 0 }))}
                                    placeholder="0"
                                    className="w-20 rounded-lg border border-stone-200 px-3 py-2 text-center"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {selectedMenu && (
                     <button 
                        onClick={handleGenerateGrocery} 
                        disabled={loadingGrocery || (selectedMenu.meals || []).length === 0}
                        className="w-full py-4 bg-[#1b4d3e] text-white rounded-xl font-bold shadow-lg shadow-[#1b4d3e]/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
                
                {/* Common items (staples) - add to list */}
                <div className="mt-6 mb-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <label className="block text-sm font-bold text-stone-500">Common items</label>
                        <button
                            type="button"
                            onClick={() => setIsManagingStaples(!isManagingStaples)}
                            className="text-xs font-semibold text-[#2c5f4c] hover:underline"
                        >
                            {isManagingStaples ? 'Done' : 'Manage list'}
                        </button>
                    </div>
                    {isManagingStaples ? (
                        <div className="flex flex-wrap gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                            <input
                                type="text"
                                value={newStapleName}
                                onChange={(e) => setNewStapleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (saveStaples([...pantryStaples, { name: newStapleName.trim(), icon: '📌' }]), setNewStapleName(''))}
                                placeholder="Add staple (e.g. Olive Oil)"
                                className="flex-1 min-w-[120px] p-2 border rounded-lg text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const name = newStapleName.trim();
                                    if (name) {
                                        saveStaples([...pantryStaples, { name, icon: '📌' }]);
                                        setNewStapleName('');
                                    }
                                }}
                                className="bg-stone-200 text-stone-700 px-3 py-2 rounded-lg font-bold text-sm"
                            >
                                Add
                            </button>
                            <div className="w-full flex flex-wrap gap-1.5 mt-2">
                                {pantryStaples.map((s, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 bg-white border rounded-full pl-2 pr-1 py-0.5 text-sm">
                                        {s.icon} {s.name}
                                        <button type="button" onClick={() => saveStaples(pantryStaples.filter((_, i) => i !== idx))} className="rounded-full p-0.5 hover:bg-red-100 text-red-600">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {pantryStaples.slice(0, 14).map((s, idx) => {
                                const name = s?.name || s?.label || '';
                                const isAdding = addingStapleName === name;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => addStapleToCart(s)}
                                        disabled={!!addingStapleName}
                                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : s.icon} {name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {groceryItems.length > 0 && (
                    <div className="mt-6">
                        {/* Add item to list */}
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Add Item to List</p>
                            <p className="text-xs text-stone-400 mb-2">Type an ingredient (e.g. Ground beef (2 lbs) or Chicken breast). We&apos;ll search Walmart and add a price &amp; link.</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItemInput}
                                    onChange={(e) => setNewItemInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    placeholder="e.g. Ground beef (2 lbs), Olive oil (1 bottle)"
                                    className="flex-1 p-3 border border-stone-200 rounded-xl text-sm bg-white"
                                />
                                <button type="button" onClick={handleAddItem} disabled={!newItemInput.trim()} className="bg-[#2c5f4c] text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#1a3c30] disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                        </div>

                        {/* Actions toolbar */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <button type="button" onClick={handleRefreshPrices} disabled={refreshingPrices} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2c5f4c] text-white font-semibold text-sm hover:bg-[#1a3c30] disabled:opacity-60 disabled:cursor-not-allowed" title="Fetch current prices from Walmart">
                                {refreshingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Get live prices
                            </button>
                            <button type="button" onClick={copyForAnyList} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200">
                                <Copy className="w-4 h-4" /> Copy
                            </button>
                            <button type="button" onClick={downloadList} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200">
                                <Download className="w-4 h-4" /> Download
                            </button>
                            <button type="button" onClick={printList} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200">
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button type="button" onClick={() => { if (window.confirm('Clear all items?')) setGroceryItems([]); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 ml-auto">
                                <Trash2 className="w-4 h-4" /> Clear All
                            </button>
                        </div>

                        <p className="text-xs text-stone-400 mb-3">Prices are not saved—use &quot;Get live prices&quot; before shopping. Click any item name to edit it, price to adjust, X to delete.</p>

                        <p className="text-sm font-bold text-stone-500 mb-4 flex items-center gap-2"><ListChecks className="w-4 h-4" /> To find ({toFindItems.length} items across {mealGroups.length} meal{mealGroups.length !== 1 ? 's' : ''})</p>

                        {mealGroups.map(([mealName, items]) => {
                            const mealSubtotal = items.reduce((s, i) => s + (typeof i.totalPrice === 'number' && i.totalPrice > 0 ? i.totalPrice : (typeof i.price === 'number' ? i.price : 0)), 0);
                            return (
                            <div key={mealName} className="mb-6">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <h4 className="text-sm font-bold text-[#1a3c30] flex items-center gap-2">
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                        {mealName}
                                        <span className="text-xs font-normal text-stone-400">({items.length} items)</span>
                                    </h4>
                                    {mealSubtotal > 0 && <span className="text-xs font-bold text-stone-500">~${mealSubtotal.toFixed(2)}</span>}
                                </div>
                                <ul className="space-y-1.5">
                                    {items.map((item) => (
                                        <li key={item.id} className="p-3 rounded-xl border bg-white border-stone-200 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={false} onChange={() => togglePurchased(item.id)} className="rounded border-stone-300 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <input
                                                            type="text"
                                                            value={item.realName || ''}
                                                            onChange={(e) => updateItemName(item.id, e.target.value)}
                                                            className="flex-1 min-w-0 bg-transparent border-none p-0 text-stone-800 font-medium focus:ring-0 text-sm"
                                                        />
                                                        {item.isRealPrice ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                                                                <BadgeCheck className="w-3 h-3" /> Walmart
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {(item.brand || item.neededQty) && (
                                                        <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-stone-400">
                                                            {item.brand && <span>{item.brand}</span>}
                                                            {item.neededQty && <span className="text-amber-600 font-semibold">({item.neededQty})</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {item.priceLoading ? (
                                                        <span className="flex items-center gap-1 font-bold text-sm text-stone-500">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> ...
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-0.5 font-bold text-sm text-stone-700">
                                                            $<input
                                                                type="number"
                                                                min={0}
                                                                step={0.01}
                                                                value={typeof item.totalPrice === 'number' && item.totalPrice > 0 ? item.totalPrice : (typeof item.price === 'number' && item.price > 0 ? item.price : '')}
                                                                onChange={(e) => updateItemPrice(item.id, e.target.value)}
                                                                className="w-14 rounded border border-stone-200 px-1.5 py-1 text-right text-sm"
                                                                placeholder="0"
                                                            />
                                                        </span>
                                                    )}
                                                    <a
                                                        href={item.walmartUrl || `https://www.walmart.com/search?q=${encodeURIComponent((item.baseTerm || '').replace(/\(.*?\)/g, '').trim())}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 shrink-0"
                                                        title="View on Walmart"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                    <button type="button" onClick={() => handleDeleteItem(item.id)} className="p-1 rounded-lg hover:bg-red-100 text-red-600 shrink-0" title="Remove"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            );
                        })}

                        {foundItems.length > 0 && (
                            <>
                                <p className="text-sm font-bold text-stone-500 mb-2">Found ({foundItems.length})</p>
                                <ul className="space-y-2 mb-4">
                                    {foundItems.map((item) => (
                                        <li key={item.id} className="p-3 rounded-xl border flex items-center gap-2 bg-stone-100 border-stone-200 text-stone-500">
                                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                                <input type="checkbox" checked onChange={() => togglePurchased(item.id)} className="rounded border-stone-300" />
                                                <span className="truncate line-through">{item.realName}</span>
                                            </label>
                                            <span className="font-bold shrink-0">${typeof item.totalPrice === 'number' ? item.totalPrice.toFixed(2) : (typeof item.price === 'number' ? item.price.toFixed(2) : '0.00')}</span>
                                            {item.walmartUrl && (
                                                <a href={item.walmartUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 shrink-0" title="View on Walmart">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            <button type="button" onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 shrink-0" title="Remove"><X className="w-4 h-4" /></button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {totalCost > 0 && (
                            <div className="pt-4 border-t-2 border-stone-200">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-stone-700">Total estimated cost</span>
                                    <span className="text-xl font-black text-[#1a3c30]">${totalCost.toFixed(2)}</span>
                                </div>
                                {groceryItems.some(i => i.isRealPrice) && groceryItems.some(i => !i.isRealPrice) && (
                                    <p className="text-xs text-stone-400 mt-1">
                                        Mix of live Walmart prices and AI estimates. Click the link icon to verify on Walmart.com.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}