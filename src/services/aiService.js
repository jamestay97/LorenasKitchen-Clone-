import { supabase } from '../supabaseClient'; // Ensure path is correct

// --- CONSTANTS ---
export const DEFAULT_STAPLES = [
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

// --- HELPER FUNCTIONS ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const estimatePrice = (itemName, category) => {
    const prices = { 'Meat': 8.99, 'Produce': 1.99, 'Dairy': 4.50, 'Pantry': 3.25, 'Frozen': 5.99, 'Other': 4.99 };
    const base = prices[category] || 3.99;
    return parseFloat((base + (Math.random() * 3 - 1.5)).toFixed(2));
};

const getRealProductImage = (productName) => {
    if(!productName) return 'https://via.placeholder.com/100?text=No+Image';
    const query = `Walmart ${productName} product packaging`;
    return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(query)}&w=200&h=200&c=7&rs=1&p=0`;
};

// --- CORE AI SERVICES ---

// 1. IMAGE GENERATOR (THE FIX)
export const generateAndUploadMealImage = async (main, side1, side2, forceNew = false) => {
    const mainItem = (main || '').trim();
    if (!mainItem) return null;

    // Check DB first
    if (!forceNew) {
        const { data: dish } = await supabase.from('dishes').select('image_url').ilike('name', `%${mainItem}%`).limit(1);
        if (dish?.[0]?.image_url) {
            return { main: dish[0].image_url };
        }
    }

    try {
        // CALL THE EDGE FUNCTION (VIP POLLINATIONS)
        const { data, error } = await supabase.functions.invoke('pollinations-image', {
            body: { 
                prompt: `gourmet main dish, ${mainItem}, ${side1 || ''}, ${side2 || ''}, professional food photography, 4k`,
                width: 1024,
                height: 768,
                model: 'flux'
            }
        });

        if (error) throw error;
        return { main: data.publicUrl };

    } catch (err) {
        console.error("Edge Function Failed, falling back to direct URL:", err);
        // Fallback to direct URL if Edge Function fails
        const seed = Math.floor(Math.random() * 1000000);
        return { 
            main: `https://image.pollinations.ai/prompt/${encodeURIComponent(mainItem)}?width=1024&height=768&model=flux&nologo=true&seed=${seed}`
        };
    }
};

// 2. RECIPE BREAKDOWN
export const breakDownRecipesAI = async (mealRequests) => {
    for(let attempt = 0; attempt < 3; attempt++) {
        try {
            await delay(1000 + (attempt * 2000));
            const prompt = `
            You are a professional Chef. Break down these meal requests into a consolidated shopping list of INDIVIDUAL raw ingredients.
            MEALS: ${mealRequests.join('\n')}
            RULES: Return a JSON ARRAY of strings only.
            Example: ["Ground Beef (3lbs)", "Potatoes (5lbs)"]`;

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
        } catch (err) { console.warn(`Attempt ${attempt + 1} failed:`, err); }
    }
    return null;
};

// 3. PRODUCT MATCHING
export const matchProductsBatchAI = async (ingredientsList) => {
    const generateLocalFallback = (items) => items.map(item => ({
        baseTerm: item, productName: item, price: estimatePrice(item, 'Other'), category: 'Other'
    }));

    for(let attempt = 0; attempt < 2; attempt++) {
        try {
            await delay(2000 + (attempt * 2000)); 
            const prompt = `You are a Personal Shopper. Map these ingredients to Walmart items: ${JSON.stringify(ingredientsList)}. Return JSON Array of objects with baseTerm, productName, price, category.`;
            
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
            const data = extractJSON(await response.text());
            if (Array.isArray(data) && data.length > 0) return data;
        } catch (e) { console.warn(`Batch Match Attempt ${attempt + 1} failed:`, e); }
    }
    return generateLocalFallback(ingredientsList);
};

// 4. GROCERY ORCHESTRATOR
export const generateGroceryListReal = async (mealConfig, onProgress) => {
    onProgress("Analyzing recipes...", 10);
    const requests = mealConfig.map(m => `${m.quantity} servings of "${m.title}". Sides: "${m.side}".`);
    
    let rawIngredients = await breakDownRecipesAI(requests);
    if (!rawIngredients || rawIngredients.length === 0) {
        rawIngredients = [];
        mealConfig.forEach(m => rawIngredients.push(`${m.title} Ingredients`));
    }

    onProgress(`Sourcing ${rawIngredients.length} ingredients...`, 30);
    const results = [];
    const chunkSize = 8;
    
    for (let i = 0; i < rawIngredients.length; i += chunkSize) {
        onProgress(`Matching Batch...`, 30 + Math.round(((i) / rawIngredients.length) * 60));
        if (i > 0) await delay(3000);
        const chunk = rawIngredients.slice(i, i + chunkSize);
        results.push(...await matchProductsBatchAI(chunk));
    }

    onProgress("Finalizing...", 95);
    const final = results.map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        baseTerm: item.baseTerm,
        realName: item.productName || item.baseTerm, 
        category: item.category || 'Other',
        price: (typeof item.price === 'number' && item.price > 0) ? item.price : estimatePrice(item.baseTerm, item.category || 'Other'),
        purchased: false,
        image: getRealProductImage(item.productName || item.baseTerm) 
    }));
    
    onProgress("Done!", 100);
    return final;
};

// 5. NUTRITION
export const generateNutritionAI = async (dishName) => {
    const prompt = `Nutrition for "${dishName}". Return JSON: { "calories": 500, "protein": "30g", "carbs": "40g", "fat": "20g" }. JSON ONLY.`;
    try {
        const response = await fetch('https://text.pollinations.ai/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'Output raw JSON only.' }, { role: 'user', content: prompt }], model: 'openai', seed: Math.floor(Math.random() * 1000) }) });
        return extractJSON(await response.text());
    } catch (e) { return null; }
};