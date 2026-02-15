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

/** Invoke generate-text with retries so the nutrition path doesn't fail. Returns { data, error }. */
export async function invokeGenerateTextWithRetry(body) {
    const maxAttempts = 3;
    const delayMs = 1500;
    let lastError = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const { data, error } = await supabase.functions.invoke('generate-text', { body });
            if (!error && data != null) {
                return {
                    data: {
                        description: data.description ?? '',
                        nutrition: data.nutrition ?? null,
                        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
                    },
                    error: null,
                };
            }
            if (error) lastError = error;
        } catch (e) {
            lastError = e;
        }
        if (attempt < maxAttempts - 1) await delay(delayMs);
    }
    return { data: null, error: lastError };
}

// Route all AI text calls through the Supabase edge function to avoid CORS issues
const chatAI = async (messages, model = 'openai') => {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const { data, error } = await supabase.functions.invoke('pollinations-proxy', {
                body: {
                    type: 'chat',
                    messages,
                    model,
                    seed: Math.floor(Math.random() * 10000),
                },
            });
            if (error) {
                console.warn(`chatAI attempt ${attempt + 1} error:`, error);
                if (attempt === 0) { await delay(2000); continue; }
                throw error;
            }
            const text = data?.text || '';
            if (text && !text.includes('"error"')) return text;
            if (attempt === 0) { await delay(2000); continue; }
            return text;
        } catch (e) {
            console.warn(`chatAI attempt ${attempt + 1} exception:`, e);
            if (attempt === 0) { await delay(2000); continue; }
            throw e;
        }
    }
    return '';
};

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

/** Deterministic price estimate — NO randomness. Based on common Walmart pricing. */
const estimatePrice = (itemName, category) => {
    const lower = (itemName || '').toLowerCase();
    const qty = parseQuantity(extractNeededQty(itemName));

    // --- Specific item matching (most accurate) ---
    // Individual cheap produce
    if (/\blimes?\b/.test(lower)) return Math.max(0.25, qty.amount * 0.25);
    if (/\blemons?\b/.test(lower)) return Math.max(0.33, qty.amount * 0.33);
    if (/\bgarlic\b.*\bhead\b|\bhead\b.*\bgarlic\b|\bgarlic\s*\(\d/.test(lower)) return Math.max(0.50, qty.amount * 0.50);
    if (/\bonions?\b|\byellow onion\b/.test(lower)) return Math.max(0.75, qty.amount * 0.75);
    if (/\bjalape[nñ]o\b/.test(lower)) return Math.max(0.50, qty.amount * 0.25);
    if (/\bbell pepper\b|\bgreen pepper\b/.test(lower)) return Math.max(0.75, qty.amount * 0.75);
    if (/\bbananas?\b/.test(lower)) return Math.max(0.25, qty.amount * 0.25);
    if (/\bpotato\b|\bpotatoes\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 0.98 : Math.max(0.80, qty.amount * 0.80);
    if (/\btomato\b|\btomatoes\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 1.50 : Math.max(0.75, qty.amount * 0.75);
    if (/\bcucumber\b/.test(lower)) return Math.max(0.50, qty.amount * 0.50);
    if (/\bcarrot\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 1.00 : 1.00;
    if (/\bcelery\b/.test(lower)) return 1.25;
    if (/\bcilantro\b|\bparsley\b|\bbasil\b/.test(lower)) return 0.88;
    if (/\bginger\b/.test(lower)) return 0.75;
    if (/\bavocado\b/.test(lower)) return Math.max(1.00, qty.amount * 1.00);
    if (/\bcorn\b.*\bcob\b|\bcob\b.*\bcorn\b/.test(lower)) return Math.max(0.50, qty.amount * 0.50);
    if (/\bsweet potato\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 1.28 : Math.max(1.00, qty.amount * 1.00);
    if (/\blettuce\b|\bromaine\b/.test(lower)) return 1.50;
    if (/\bbroccoli\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 1.78 : 1.78;

    // Proteins (per lb pricing)
    if (/\bchicken breast\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 3.49 : Math.max(3.49, qty.amount * 3.49);
    if (/\bchicken thigh\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 2.49 : Math.max(2.49, qty.amount * 2.49);
    if (/\bchicken\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 2.99 : Math.max(2.99, qty.amount * 2.99);
    if (/\bground beef\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 4.98 : Math.max(4.98, qty.amount * 4.98);
    if (/\bground turkey\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 4.48 : Math.max(4.48, qty.amount * 4.48);
    if (/\bsteak\b|\bsirloin\b|\bribeye\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 8.98 : Math.max(8.98, qty.amount * 8.98);
    if (/\bbeef\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 5.98 : Math.max(5.98, qty.amount * 5.98);
    if (/\bpork chop\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 3.98 : Math.max(3.98, qty.amount * 3.98);
    if (/\bpork\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 3.48 : Math.max(3.48, qty.amount * 3.48);
    if (/\bsalmon\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 7.98 : Math.max(7.98, qty.amount * 7.98);
    if (/\bshrimp\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 6.98 : Math.max(6.98, qty.amount * 6.98);
    if (/\btilapia\b|\bcod\b|\bfish\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 5.48 : Math.max(5.48, qty.amount * 5.48);
    if (/\bturkey breast\b/.test(lower)) return qty.unit === 'lb' ? qty.amount * 4.48 : Math.max(4.48, qty.amount * 4.48);
    if (/\bsausage\b/.test(lower)) return 3.98;
    if (/\bbacon\b/.test(lower)) return 4.48;

    // Dairy
    if (/\bshredded cheese\b|\bcheese\b.*\bshredded\b/.test(lower)) return 2.48;
    if (/\bcheese\b.*\bslice\b|\bsliced cheese\b/.test(lower)) return 2.28;
    if (/\bcheese\b/.test(lower)) return 2.48;
    if (/\bsour cream\b/.test(lower)) return 1.98;
    if (/\bheavy cream\b|\bwhipping cream\b/.test(lower)) return 3.48;
    if (/\bcream cheese\b/.test(lower)) return 1.98;
    if (/\byogurt\b/.test(lower)) return 2.48;

    // Canned / jarred
    if (/\bbeans?\b.*\bcan\b|\bcan\b.*\bbeans?\b|\bcanned\s+\w*\s*bean/.test(lower)) return Math.max(0.78, qty.amount * 0.78);
    if (/\btomato paste\b/.test(lower)) return 0.78;
    if (/\btomato sauce\b|\bmarinara\b/.test(lower)) return 1.98;
    if (/\bcoconut milk\b/.test(lower)) return 1.78;
    if (/\bbroth\b|\bstock\b/.test(lower)) return 1.98;
    if (/\bcanned corn\b|\bcanned tomato\b|\bdiced tomato\b/.test(lower)) return 0.98;

    // Sauces & condiments
    if (/\bbbq sauce\b|\bbarbecue sauce\b/.test(lower)) return 2.48;
    if (/\bsoy sauce\b/.test(lower)) return 1.98;
    if (/\bteriyaki\b/.test(lower)) return 2.48;
    if (/\balfredo sauce\b/.test(lower)) return 2.28;
    if (/\bcurry paste\b/.test(lower)) return 2.98;
    if (/\bhot sauce\b|\bsriracha\b/.test(lower)) return 2.48;
    if (/\bsesame oil\b/.test(lower)) return 2.78;
    if (/\bolive oil\b/.test(lower)) return 4.48;

    // Grains / starches
    if (/\brice\b/.test(lower)) return qty.unit === 'cup' ? Math.max(1.50, qty.amount * 0.25) : 1.98;
    if (/\bpasta\b|\bspaghetti\b|\bpenne\b|\bfettuccine\b|\bmacaroni\b|\bnoodle/.test(lower)) return 1.28;
    if (/\btortilla\b/.test(lower)) return 2.48;
    if (/\btaco shell\b/.test(lower)) return 1.98;
    if (/\bbread\b|\bbun\b|\broll\b/.test(lower)) return 2.28;

    // Spices & seasonings (small amounts)
    if (/\btsp\b|\btbsp\b|\bpinch\b/.test(lower)) return 0.50;
    if (/\bseasoning\b.*\bpacket\b|\btaco seasoning\b/.test(lower)) return 1.08;
    if (/\bcumin\b|\bpaprika\b|\boregano\b|\bthyme\b|\brosemary\b|\bcayenne\b|\bchili powder\b|\bgarlic powder\b|\bonion powder\b/.test(lower)) return 1.98;

    // Pantry staples (often added as "common items")
    if (/\bsalt\b/.test(lower)) return 0.88;
    if (/\bblack pepper\b|\bpepper\b/.test(lower)) return 1.98;
    if (/\bflour\b/.test(lower)) return 2.48;
    if (/\bsugar\b/.test(lower)) return 2.28;
    if (/\beggs?\b/.test(lower)) return Math.max(2.48, qty.amount * 0.21);
    if (/\bmilk\b/.test(lower)) return qty.unit === 'gal' ? 2.98 : 2.48;
    if (/\bbutter\b/.test(lower)) return 3.48;
    if (/\bvegetable oil\b/.test(lower)) return 2.98;
    if (/\bvinegar\b/.test(lower)) return 1.98;
    if (/\bhoney\b/.test(lower)) return 3.98;
    if (/\bketchup\b/.test(lower)) return 1.98;
    if (/\bmustard\b/.test(lower)) return 1.48;
    if (/\bmayonnaise\b|\bmayo\b/.test(lower)) return 2.98;
    if (/\bcream of mushroom\b|\bcream of chicken\b/.test(lower)) return 1.18;
    if (/\bbreadcrumb/.test(lower)) return 1.48;

    // Category fallbacks (deterministic, no randomness)
    const prices = { 'Meat': 5.48, 'Produce': 1.48, 'Dairy': 2.48, 'Bakery': 2.28, 'Pantry': 1.98, 'Frozen': 3.28, 'Spices': 1.48, 'Beverages': 2.28, 'Other': 2.28 };
    return prices[category] || 2.28;
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

// 2. RECIPE BREAKDOWN — per-meal, AI only (simple & accurate)
// Returns: [{ meal: "Grilled Chicken w/ Rice & Beans", servings: 4, ingredients: ["Chicken breast (2 lbs)", ...] }]
export const breakDownRecipesAI = async (mealConfigs, onProgress) => {
    const results = []; // Array of { meal, servings, ingredients }

    for (const config of mealConfigs) {
        // Parse the config — could be a string or object
        let title, sides, servings;
        if (typeof config === 'string') {
            const titleMatch = config.match(/"([^"]+)"/);
            title = titleMatch ? titleMatch[1] : config;
            const sidesMatch = config.match(/Sides:\s*"([^"]*)"/);
            sides = sidesMatch ? sidesMatch[1].split(',').map(s => s.trim()).filter(s => s && s !== 'none') : [];
            const servingsMatch = config.match(/(\d+)\s*servings/);
            servings = servingsMatch ? parseInt(servingsMatch[1]) : 4;
        } else {
            title = config.title || '';
            sides = [config.side, config.side2].filter(Boolean);
            servings = config.quantity || 4;
        }

        if (!title) continue;

        const mealLabel = sides.length > 0
            ? `${title} w/ ${sides.join(' & ')}`
            : title;

        if (onProgress) onProgress(`Breaking down "${mealLabel}" for ${servings} servings...`);

        // Ask AI for ONE combined ingredient list for the whole meal (main + sides together)
        const ingredients = await getIngredientsForMeal(title, sides, servings);

        results.push({
            meal: mealLabel,
            servings,
            ingredients: ingredients,
        });

        await delay(500);
    }

    return results;
};

// Common ingredient templates for fallback when AI fails
const FALLBACK_INGREDIENTS = {
    protein: {
        chicken: ['Boneless skinless chicken breast', 'Chicken thighs'],
        beef: ['Ground beef', 'Beef chuck roast', 'Steak'],
        turkey: ['Ground turkey', 'Turkey breast'],
        pork: ['Pork chops', 'Pork tenderloin', 'Pork shoulder'],
        fish: ['Salmon fillets', 'Tilapia fillets', 'Cod fillets'],
        shrimp: ['Large shrimp (peeled & deveined)'],
        lamb: ['Ground lamb', 'Lamb chops'],
        sausage: ['Italian sausage links', 'Ground sausage'],
    },
    // Dish names that imply a specific protein (even if "beef" or "chicken" isn't in the name)
    dishProteinMap: {
        'goulash': 'Ground beef',
        'stew': 'Beef stew meat',
        'meatloaf': 'Ground beef',
        'meatball': 'Ground beef',
        'burger': 'Ground beef',
        'chili': 'Ground beef',
        'lasagna': 'Ground beef',
        'bolognese': 'Ground beef',
        'pot roast': 'Beef chuck roast',
        'fajita': 'Chicken breast',
        'gyro': 'Ground lamb',
        'jambalaya': 'Andouille sausage',
        'gumbo': 'Andouille sausage',
        'fried rice': 'Chicken breast',
        'lo mein': 'Chicken breast',
        'pad thai': 'Chicken breast',
        'parmesan': 'Chicken breast',
        'marsala': 'Chicken breast',
        'piccata': 'Chicken breast',
        'cacciatore': 'Chicken thighs',
        'tikka': 'Chicken thighs',
    },
    sides: {
        rice: ['Jasmine rice', 'Long grain white rice'],
        beans: ['Black beans (canned)', 'Pinto beans (canned)', 'Red kidney beans (canned)'],
        broccoli: ['Broccoli crowns'],
        cabbage: ['Red cabbage', 'Green cabbage'],
        corn: ['Corn on the cob', 'Canned corn'],
        potato: ['Russet potatoes', 'Red potatoes', 'Sweet potatoes'],
        pasta: ['Spaghetti', 'Penne pasta', 'Fettuccine'],
        salad: ['Romaine lettuce', 'Cherry tomatoes', 'Cucumber'],
        yuca: ['Frozen yuca'],
        plantain: ['Plantains'],
        coleslaw: ['Coleslaw mix (bag)'],
        greens: ['Collard greens (bunch)', 'Mixed greens (bag)'],
        asparagus: ['Fresh asparagus (1 bunch)'],
        squash: ['Yellow squash', 'Zucchini'],
    }
};

/** Round to nearest quarter for clean display */
const roundQty = (n) => Math.ceil(n * 4) / 4;

/** Generate a reasonable ingredient list locally when AI fails.
 *  Uses per-serving amounts based on real recipe standards. */
const generateLocalIngredients = (mainDish, sides, servings) => {
    const lower = mainDish.toLowerCase();
    const ingredients = [];
    const s = Math.max(1, servings); // servings, never less than 1

    // Is this a dish where protein is mixed in (stew, goulash, chili) vs. standalone (grilled chicken)?
    const isMixedDish = /goulash|stew|chili|soup|casserole|lasagna|bolognese|jambalaya|gumbo|curry|pot pie/i.test(lower);
    // Per-serving protein: standalone dishes ~0.33-0.5 lb, mixed dishes ~0.25 lb
    const proteinPerServing = isMixedDish ? 0.25 : 0.33;

    // Step 1: Detect protein — check direct keywords first, then dish name map
    let foundProtein = false;
    for (const [key, options] of Object.entries(FALLBACK_INGREDIENTS.protein)) {
        if (lower.includes(key)) {
            const lbs = roundQty(s * (key === 'shrimp' ? 0.25 : proteinPerServing));
            ingredients.push(`${options[0]} (${lbs} lbs)`);
            foundProtein = true;
            break;
        }
    }
    if (!foundProtein) {
        for (const [dishKey, proteinName] of Object.entries(FALLBACK_INGREDIENTS.dishProteinMap)) {
            if (lower.includes(dishKey)) {
                const lbs = roundQty(s * proteinPerServing);
                ingredients.push(`${proteinName} (${lbs} lbs)`);
                foundProtein = true;
                break;
            }
        }
    }
    if (!foundProtein) {
        ingredients.push(`Chicken breast (${roundQty(s * 0.33)} lbs)`);
    }

    // Step 2: Detect cooking style and add appropriate ingredients (scaled per serving)
    const cans = Math.ceil(s / 4); // 1 can per 4 servings
    const bottles = Math.ceil(s / 8); // 1 bottle per 8 servings
    const tbsp = Math.ceil(s / 2); // roughly 1 tbsp per 2 servings

    if (/bbq|barbecue/i.test(lower)) ingredients.push(`BBQ sauce (${bottles} bottle${bottles > 1 ? 's' : ''})`);
    if (/taco/i.test(lower)) { ingredients.push(`Taco seasoning (${Math.ceil(s / 6)} packet${Math.ceil(s/6) > 1 ? 's' : ''})`, `Taco shells (${s * 2} count)`, `Shredded cheese (${Math.ceil(s * 1)} oz)`, `Sour cream (${Math.ceil(s * 1)} oz)`); }
    if (/alfredo/i.test(lower)) ingredients.push(`Alfredo sauce (${cans} jar${cans > 1 ? 's' : ''})`, `Fettuccine pasta (${roundQty(s * 0.125)} lbs)`);
    if (/marinara|tomato sauce/i.test(lower)) ingredients.push(`Marinara sauce (${cans} jar${cans > 1 ? 's' : ''})`);
    if (/curry/i.test(lower)) ingredients.push(`Curry paste (1 jar)`, `Coconut milk (${cans} can${cans > 1 ? 's' : ''})`);
    if (/teriyaki/i.test(lower)) ingredients.push(`Teriyaki sauce (${bottles} bottle${bottles > 1 ? 's' : ''})`);
    if (/stir.?fry/i.test(lower)) ingredients.push(`Soy sauce (${tbsp} tbsp)`, `Sesame oil (${Math.ceil(tbsp/2)} tbsp)`, `Mixed stir fry vegetables (${roundQty(s * 0.25)} lbs)`);
    if (/goulash/i.test(lower)) ingredients.push(`Beef broth (${cans} can${cans > 1 ? 's' : ''})`, `Diced tomatoes (${cans} can${cans > 1 ? 's' : ''})`, `Tomato paste (1 can)`, `Elbow macaroni (${roundQty(s * 0.125)} lbs)`, `Paprika (${tbsp} tbsp)`);
    if (/stew/i.test(lower)) ingredients.push(`Beef broth (${cans} can${cans > 1 ? 's' : ''})`, `Carrots (${roundQty(s * 0.125)} lbs)`, `Russet potatoes (${roundQty(s * 0.2)} lbs)`, `Celery (${Math.ceil(s / 6)} bunch)`);
    if (/stuffed/i.test(lower)) ingredients.push(`Bell peppers (${s})`);
    if (/chili/i.test(lower)) ingredients.push(`Kidney beans (${cans} can${cans > 1 ? 's' : ''})`, `Diced tomatoes (${cans} can${cans > 1 ? 's' : ''})`, `Chili powder (${tbsp} tbsp)`);
    if (/parmesan/i.test(lower)) ingredients.push(`Parmesan cheese (${Math.ceil(s * 0.75)} oz)`, `Breadcrumbs (${Math.ceil(s * 0.125)} cups)`, `Marinara sauce (${cans} jar${cans > 1 ? 's' : ''})`);
    if (/korean|bbq chicken/i.test(lower)) ingredients.push(`Gochujang paste (1 jar)`, `Sesame oil (${Math.ceil(tbsp/2)} tbsp)`, `Rice vinegar (${tbsp} tbsp)`);

    // Step 3: Add common aromatics if the list is still short
    if (ingredients.length < 5) {
        ingredients.push(`Yellow onion (${Math.ceil(s / 4)})`, `Bell pepper (${Math.ceil(s / 3)})`);
    }

    // Step 4: Process sides (per-serving scaling)
    for (const side of sides) {
        if (!side) continue;
        const sideLower = side.toLowerCase();
        let foundSide = false;
        for (const [key, options] of Object.entries(FALLBACK_INGREDIENTS.sides)) {
            if (sideLower.includes(key)) {
                let qty;
                if (key === 'rice') qty = `${roundQty(s * 0.5)} cups`; // 0.5 cup dry per person
                else if (key === 'beans') qty = `${Math.ceil(s / 4)} cans`;
                else if (key === 'pasta') qty = `${roundQty(s * 0.125)} lbs`;
                else qty = `${roundQty(s * 0.2)} lbs`; // veggies: ~0.2 lb per person
                ingredients.push(`${options[0]} (${qty})`);
                foundSide = true;
                break;
            }
        }
        if (!foundSide) {
            ingredients.push(`${side} (${roundQty(s * 0.2)} lbs)`);
        }
    }

    return ingredients.slice(0, 12);
};

// Get ingredient list for a single complete meal (main + sides combined)
const getIngredientsForMeal = async (mainDish, sides, servings) => {
    const sidesText = sides.length > 0 ? `Side dishes: ${sides.join(', ')}` : 'No sides';
    const staplesText = DEFAULT_STAPLES.map(s => s.name.toLowerCase()).join(', ');

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await delay(500 + (attempt * 1500));

            // On third attempt, use a simpler prompt
            const isSimple = attempt === 2;
            const prompt = isSimple
                ? `I need to cook ${mainDish}${sides.length > 0 ? ' with ' + sides.join(' and ') : ''} for ${servings} people. List the specific grocery items I need to buy with exact quantities. Protein is about 0.25-0.33 lb per person. Example: ["Ground beef (${roundQty(servings * 0.25)} lbs)", "Jasmine rice (${roundQty(servings * 0.5)} cups)"]. Return JSON array of 6-10 strings. No markdown.`
                : `I am cooking this meal for EXACTLY ${servings} people. List every specific grocery item I need to BUY with quantities scaled for ${servings} servings.

Main dish: ${mainDish}
${sidesText}

QUANTITY SCALING GUIDE for ${servings} servings:
- Protein (standalone like grilled chicken): ~0.33 lb per person → ${servings} people = ${roundQty(servings * 0.33)} lbs
- Protein (mixed dishes like goulash/stew/chili): ~0.25 lb per person → ${servings} people = ${roundQty(servings * 0.25)} lbs  
- Rice/grains: ~0.5 cups dry per person → ${servings} people = ${roundQty(servings * 0.5)} cups
- Pasta: ~2 oz dry per person → ${servings} people = ${roundQty(servings * 0.125)} lbs
- Vegetables: ~0.2 lb per person → ${servings} people = ${roundQty(servings * 0.2)} lbs
- Canned goods (broth, tomatoes, beans): 1 can per 4 people → ${Math.ceil(servings / 4)} cans
- Sauces (BBQ, teriyaki): 1 bottle per 8 people

RULES:
- List SPECIFIC buyable grocery items: "Boneless chicken breast (${roundQty(servings * 0.33)} lbs)" NOT "Chicken" or "ingredients for chicken"
- Every item MUST have a quantity in parentheses: (X lbs), (X cups), (X cans), (X count)
- Scale ALL quantities for exactly ${servings} servings
- Skip pantry staples: ${staplesText}
- Include: protein, vegetables, starches, sauces, key seasonings
- Combine main dish and sides into ONE list
- 6-12 items maximum

Example for "Korean BBQ Chicken w/ Sticky Rice & Broccoli" for 10 servings:
["Boneless chicken thighs (5 lbs)", "Korean BBQ sauce (2 bottles)", "Sticky rice (8 cups)", "Broccoli crowns (3 lbs)", "Sesame seeds (2 tbsp)", "Green onions (2 bunches)", "Ginger root (1)", "Garlic (1 head)"]

Return ONLY a JSON array of strings.`;

            const responseText = await chatAI([
                { role: 'system', content: 'Recipe ingredient expert. Return ONLY a JSON array of strings — specific grocery items with quantities. NEVER return generic items like "ingredients for X". No markdown.' },
                { role: 'user', content: prompt }
            ]);
            const list = extractJSON(responseText);
            if (Array.isArray(list) && list.length >= 3 && list.length <= 20) {
                // Filter out items that look like dish names, not grocery items
                const dishWords = mainDish.toLowerCase().split(/\s+/);
                const cleaned = list.filter(item => {
                    const itemLower = item.toLowerCase();
                    // Reject "ingredients for X" or items that ARE the dish name
                    if (/^ingredients? for/i.test(item)) return false;
                    // Reject if the item contains 3+ consecutive words from the dish name (it's the dish, not an ingredient)
                    if (dishWords.length >= 3) {
                        const dishPhrase = dishWords.slice(0, 3).join(' ');
                        if (itemLower.includes(dishPhrase)) return false;
                    }
                    return true;
                });
                if (cleaned.length >= 3) return cleaned;
                console.warn('AI returned dish names as ingredients, retrying...');
            }
        } catch (err) { console.warn(`Meal ingredient attempt ${attempt + 1} failed:`, err); }
    }

    // If all AI attempts fail, use local fallback with real ingredients
    console.warn('All AI ingredient attempts failed, using local fallback for:', mainDish);
    return generateLocalIngredients(mainDish, sides, servings);
};

// --- QUANTITY PARSING ---

/** Parse a quantity string like "3 lbs", "2 cups", "6 cloves" into { amount, unit } */
const parseQuantity = (str) => {
    if (!str) return { amount: 1, unit: '' };
    // Match patterns like "3 lbs", "1/2 cup", "2.5 oz", "(3 lbs)"
    const match = str.match(/([\d.\/]+)\s*(lbs?|oz|cups?|tbsp|tsp|cloves?|cans?|bunch|medium|large|gallons?|quarts?|pints?|fl\s*oz|count|ct|each|pkg|bag|jar|bottle)?/i);
    if (!match) return { amount: 1, unit: '' };
    let amount = match[1];
    if (amount.includes('/')) {
        const [num, den] = amount.split('/');
        amount = parseFloat(num) / parseFloat(den);
    } else {
        amount = parseFloat(amount);
    }
    return { amount: isNaN(amount) ? 1 : amount, unit: (match[2] || '').toLowerCase().trim() };
};

/** Extract the quantity portion from an ingredient string like "Chicken breast (3 lbs)" */
const extractNeededQty = (ingredient) => {
    const parenMatch = ingredient.match(/\(([^)]+)\)/);
    if (parenMatch) return parenMatch[1];
    // Try matching quantity at start: "3 lbs chicken breast"
    const startMatch = ingredient.match(/^([\d.\/]+\s*\w+)/);
    return startMatch ? startMatch[1] : '';
};

/** Calculate how many packages are needed given neededQty and packageSize (same-unit) */
const calcPackages = (neededQtyStr, packageSizeStr) => {
    const needed = parseQuantity(neededQtyStr);
    const pkg = parseQuantity(packageSizeStr);
    if (!needed.amount || !pkg.amount || pkg.amount <= 0) return 1;

    const normalizeUnit = (u) => {
        let n = u.replace(/s$/, '').trim().toLowerCase();
        if (n === 'ounce') n = 'oz';
        if (n === 'pound') n = 'lb';
        if (n === 'fl oz') n = 'floz';
        return n;
    };
    const nu = normalizeUnit(needed.unit);
    const pu = normalizeUnit(pkg.unit);

    // If either unit is missing/empty, or units don't match, just use 1 package
    // This prevents absurd multiplications (e.g., "32 oz" vs "1 ct" → would wrongly give 32)
    if (!nu || !pu || nu !== pu) return 1;

    const result = Math.ceil(needed.amount / pkg.amount);
    // Cap at a reasonable maximum — no single recipe ingredient should need more than 5 packages
    return Math.min(result, 5);
};

// 3. WALMART PRODUCT SEARCH — Real prices with AI fallback

/** Search Walmart via the edge function for a single ingredient */
const searchWalmart = async (ingredient) => {
    try {
        const neededQty = extractNeededQty(ingredient);
        const { data, error } = await supabase.functions.invoke('walmart-search', {
            body: { query: ingredient, neededQty },
        });
        if (error) throw error;
        return data;
    } catch (e) {
        console.warn('Walmart search failed for:', ingredient, e);
        return { fallback: true };
    }
};

/** AI pricing for a batch of ingredients — with retries. Returns matched product info with prices. */
const matchWithAIFallback = async (ingredientsList) => {
    const generateLocalFallback = (items) => items.map(item => {
        const price = estimatePrice(item, 'Other');
        return {
            baseTerm: item, productName: item, price,
            totalPrice: price,
            category: 'Other', size: '', brand: '', isRealPrice: false,
        };
    });

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            if (attempt > 0) await delay(2000);

            const prompt = `You are a Walmart grocery pricing expert. For EACH ingredient below, tell me the TOTAL COST at Walmart to buy the exact quantity needed.

PRICING REFERENCE (use these as guidelines):
- Limes: $0.25 each → "4 limes" = $1.00
- Lemons: $0.33 each → "2 lemons" = $0.66
- Onions: $0.75 each → "2 onions" = $1.50
- Bell peppers: $0.75 each
- Garlic (head): $0.50
- Chicken breast: $3.49/lb → "3 lbs" = $10.47
- Ground beef 80/20: $4.98/lb → "2 lbs" = $9.96
- Ground turkey: $4.48/lb
- Rice (dry): $0.25/cup → "4 cups" = $1.00
- Broccoli: $1.78/lb
- Canned beans: $0.78/can
- BBQ sauce (bottle): $2.48
- Soy sauce: $1.98
- Shredded cheese (8oz): $2.48
- Sour cream (16oz): $1.98

INGREDIENTS TO PRICE:
${ingredientsList.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Return a JSON array with ONE object per ingredient, in the SAME ORDER:
[{ "baseTerm": "original ingredient text", "productName": "Walmart product name", "brand": "Great Value or brand", "size": "package size you'd buy", "price": total_cost_number, "category": "Meat|Produce|Dairy|Bakery|Pantry|Frozen|Beverages|Spices|Other" }]

RULES:
- "price" = total cost for the EXACT quantity listed, NOT per-unit or per-package
- Small amounts of spices cost pennies (1 tsp cumin = $0.15), not full jar price
- Return ONLY the JSON array. No markdown, no explanation.`;

            const responseText = await chatAI([
                { role: 'system', content: 'Walmart pricing expert. Return ONLY a JSON array. price = total cost for exact quantity needed. Use realistic Walmart prices. For ONE ingredient still return an array with one object: [{ "productName": "...", "price": number, ... }].' },
                { role: 'user', content: prompt }
            ]);
            let data = extractJSON(responseText);
            if (data && !Array.isArray(data) && typeof data === 'object' && data !== null) {
                data = [data];
            }
            const minNeeded = Math.max(1, Math.min(3, ingredientsList.length));
            if (Array.isArray(data) && data.length >= minNeeded) {
                const validated = data.slice(0, ingredientsList.length).map((d, idx) => {
                    const term = ingredientsList[idx] || d.baseTerm || '';
                    let price = typeof d.price === 'number' ? d.price : parseFloat(d.price);
                    if (isNaN(price) || price <= 0) price = estimatePrice(term, d.category || 'Other');
                    if (price > 50) price = estimatePrice(term, d.category || 'Other');
                    return {
                        baseTerm: term,
                        productName: d.productName || term,
                        brand: d.brand || '',
                        size: d.size || '',
                        price,
                        totalPrice: price,
                        category: d.category || 'Other',
                        isRealPrice: false,
                    };
                });
                return validated;
            }
        } catch (e) { console.warn(`AI pricing attempt ${attempt + 1} failed:`, e); }
    }
    console.warn('All AI pricing attempts failed, using local estimates');
    return generateLocalFallback(ingredientsList);
};

// 4a. Get ingredients only (no pricing) — list shows instantly; prices can load in background
export const getGroceryIngredientsOnly = async (mealConfig, onProgress) => {
    onProgress("Breaking down recipes into ingredients...", 5);
    const mealResults = await breakDownRecipesAI(mealConfig, (msg) => onProgress(msg, 10));
    if (!mealResults || mealResults.length === 0) {
        onProgress("No ingredients found", 100);
        return [];
    }
    const allItems = [];
    for (const mealGroup of mealResults) {
        for (const ingredient of mealGroup.ingredients) {
            allItems.push({ ingredient, meal: mealGroup.meal });
        }
    }
    onProgress("Done", 100);
    return allItems;
};

// 4. GROCERY ORCHESTRATOR — per-meal breakdown, Walmart search for ALL items, AI fallback
export const generateGroceryListReal = async (mealConfig, onProgress) => {
    // Step 1: Get ingredients per meal
    onProgress("Breaking down recipes into ingredients...", 5);
    const mealResults = await breakDownRecipesAI(mealConfig, (msg) => onProgress(msg, 10));

    if (!mealResults || mealResults.length === 0) {
        onProgress("No ingredients found", 100);
        return [];
    }

    // Flatten all ingredients with meal tags
    const allItems = [];
    for (const mealGroup of mealResults) {
        for (const ingredient of mealGroup.ingredients) {
            allItems.push({ ingredient, meal: mealGroup.meal });
        }
    }

    const totalIngredients = allItems.length;
    onProgress(`Found ${totalIngredients} ingredients across ${mealResults.length} meal(s) — searching Walmart...`, 15);

    // Step 2: Try Walmart search for EVERY item (best accuracy)
    // Initialize pricing array
    const pricedItems = allItems.map(item => ({
        baseTerm: item.ingredient,
        productName: item.ingredient,
        price: 0,
        totalPrice: 0,
        category: 'Other',
        size: '',
        brand: '',
        isRealPrice: false,
        walmartUrl: '',
        imageUrl: '',
    }));

    const walmartSuccessIndexes = new Set();
    const MAX_WALMART_CONCURRENT = 3; // process in small batches to avoid rate limits

    for (let batchStart = 0; batchStart < allItems.length; batchStart += MAX_WALMART_CONCURRENT) {
        const batchEnd = Math.min(batchStart + MAX_WALMART_CONCURRENT, allItems.length);
        const batchPromises = [];

        for (let i = batchStart; i < batchEnd; i++) {
            const ingredient = allItems[i].ingredient;
            const shortName = ingredient.replace(/\(.*?\)/g, '').trim().slice(0, 30);
            onProgress(`Walmart: ${shortName}...`, 15 + Math.round(((i + 1) / totalIngredients) * 50));
            batchPromises.push(
                searchWalmart(ingredient).then(result => ({ idx: i, result })).catch(() => ({ idx: i, result: { fallback: true } }))
            );
        }

        const batchResults = await Promise.all(batchPromises);

        for (const { idx, result } of batchResults) {
            if (!result.fallback && result.products?.length > 0) {
                const product = result.products[0];
                const productPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price);

                // Skip if the Walmart price itself is invalid or absurdly high for a single product
                if (isNaN(productPrice) || productPrice <= 0 || productPrice > 75) continue;

                const ingredient = allItems[idx].ingredient;
                const neededQty = extractNeededQty(ingredient);
                const packagesNeeded = calcPackages(neededQty, product.size || '');
                let totalPrice = packagesNeeded * productPrice;

                // Sanity cap: no single ingredient should cost more than $40 in a recipe
                // If it does, just use the single-package price (most likely only need 1)
                if (totalPrice > 40) {
                    totalPrice = productPrice;
                }

                pricedItems[idx] = {
                    baseTerm: ingredient,
                    productName: product.name || ingredient,
                    brand: product.brand || '',
                    size: product.size || '',
                    price: productPrice,
                    totalPrice,
                    packagesNeeded: totalPrice === productPrice ? 1 : packagesNeeded,
                    walmartUrl: product.url || result.walmartUrl || '',
                    imageUrl: product.image || '',
                    isRealPrice: true,
                    category: 'Other',
                };
                walmartSuccessIndexes.add(idx);
            }
        }

        // Small delay between batches to be respectful
        if (batchEnd < allItems.length) await delay(400);
    }

    // Step 3: For items Walmart didn't find, use AI pricing (batch)
    const unmatchedIndexes = [];
    const unmatchedIngredients = [];
    for (let i = 0; i < allItems.length; i++) {
        if (!walmartSuccessIndexes.has(i)) {
            unmatchedIndexes.push(i);
            unmatchedIngredients.push(allItems[i].ingredient);
        }
    }

    if (unmatchedIngredients.length > 0) {
        onProgress(`Getting AI price estimates for ${unmatchedIngredients.length} remaining items...`, 70);
        const aiPriced = await matchWithAIFallback(unmatchedIngredients);
        for (let j = 0; j < unmatchedIndexes.length; j++) {
            const idx = unmatchedIndexes[j];
            const ai = aiPriced[j] || {};
            pricedItems[idx] = {
                ...pricedItems[idx],
                productName: ai.productName || allItems[idx].ingredient,
                brand: ai.brand || '',
                size: ai.size || '',
                price: ai.totalPrice || ai.price || estimatePrice(allItems[idx].ingredient, ai.category || 'Other'),
                totalPrice: ai.totalPrice || ai.price || estimatePrice(allItems[idx].ingredient, ai.category || 'Other'),
                category: ai.category || 'Other',
                isRealPrice: false,
            };
        }
    }

    // Step 4: Build the final list with meal tags
    onProgress("Building your cart...", 95);
    const final = allItems.map((item, idx) => {
        const priced = pricedItems[idx] || {};
        const neededQty = extractNeededQty(item.ingredient);
        const totalPrice = (typeof priced.totalPrice === 'number' && priced.totalPrice > 0)
            ? priced.totalPrice
            : (typeof priced.price === 'number' && priced.price > 0)
                ? priced.price
                : estimatePrice(item.ingredient, priced.category || 'Other');
        const searchName = item.ingredient.replace(/\(.*?\)/g, '').trim();

        return {
            id: Math.random().toString(36).substr(2, 9),
            baseTerm: item.ingredient,
            realName: priced.productName || item.ingredient,
            brand: priced.brand || '',
            size: priced.size || '',
            category: priced.category || 'Other',
            price: totalPrice,
            totalPrice,
            packagesNeeded: priced.packagesNeeded || 1,
            neededQty: neededQty || '',
            walmartUrl: priced.walmartUrl || `https://www.walmart.com/search?q=${encodeURIComponent(searchName)}`,
            imageUrl: priced.imageUrl || '',
            isRealPrice: priced.isRealPrice || false,
            meal: item.meal,
            purchased: false,
        };
    });
    
    onProgress("Done!", 100);
    return final;
};

/** Look up a single ingredient: Walmart search, then AI/estimate. Returns one grocery item. */
export const lookupSingleIngredient = async (ingredientString) => {
    const trimmed = (ingredientString || '').trim();
    if (!trimmed) return null;

    const neededQty = extractNeededQty(trimmed);
    const searchName = trimmed.replace(/\(.*?\)/g, '').trim();
    const fallbackUrl = `https://www.walmart.com/search?q=${encodeURIComponent(searchName)}`;

    // Try Walmart first
    const walmartResult = await searchWalmart(trimmed);
    if (!walmartResult.fallback && walmartResult.products?.length > 0) {
        const product = walmartResult.products[0];
        const productPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price);
        if (!isNaN(productPrice) && productPrice > 0 && productPrice <= 75) {
            const packagesNeeded = calcPackages(neededQty, product.size || '');
            let totalPrice = packagesNeeded * productPrice;
            if (totalPrice > 40) totalPrice = productPrice;
            return {
                id: Math.random().toString(36).substr(2, 9),
                baseTerm: trimmed,
                realName: product.name || trimmed,
                brand: product.brand || '',
                size: product.size || '',
                category: 'Other',
                price: totalPrice,
                totalPrice,
                packagesNeeded: totalPrice === productPrice ? 1 : packagesNeeded,
                neededQty: neededQty || '',
                walmartUrl: product.url || walmartResult.walmartUrl || fallbackUrl,
                imageUrl: product.image || '',
                isRealPrice: true,
                meal: '',
                purchased: false,
            };
        }
    }

    // Fallback: AI pricing then estimate
    let aiResult = await matchWithAIFallback([trimmed]);
    let ai = aiResult[0] || {};
    let price = (typeof ai.totalPrice === 'number' && ai.totalPrice > 0) ? ai.totalPrice : (typeof ai.price === 'number' ? ai.price : estimatePrice(trimmed, ai.category || 'Other'));

    // If we got the generic $2.28 (Other), try a dedicated single-item AI call for better price
    const genericFallback = estimatePrice(trimmed, 'Other');
    if (price === genericFallback && genericFallback === 2.28) {
        try {
            const oneItemPrompt = `Estimate the total Walmart price to buy this exact grocery item. Return ONLY valid JSON: {"productName": "short product name", "price": number, "category": "Meat|Produce|Dairy|Pantry|Bakery|Spices|Other"}. Item: "${trimmed}". price = total cost to buy the quantity shown. No markdown.`;
            const text = await chatAI([
                { role: 'system', content: 'Walmart grocery pricing. Return ONLY one JSON object with productName, price (number), category. Realistic prices.' },
                { role: 'user', content: oneItemPrompt }
            ]);
            const one = extractJSON(text);
            if (one && typeof one.price === 'number' && one.price > 0 && one.price <= 75) {
                ai = { productName: one.productName || trimmed, price: one.price, totalPrice: one.price, category: one.category || 'Other' };
                price = one.price;
            }
        } catch (e) { /* keep batch result */ }
    }

    const capped = price > 40 ? estimatePrice(trimmed, ai.category || 'Other') : price;
    return {
        id: Math.random().toString(36).substr(2, 9),
        baseTerm: trimmed,
        realName: ai.productName || trimmed,
        brand: ai.brand || '',
        size: ai.size || '',
        category: ai.category || 'Other',
        price: capped,
        totalPrice: capped,
        packagesNeeded: 1,
        neededQty: neededQty || '',
        walmartUrl: fallbackUrl,
        imageUrl: '',
        isRealPrice: false,
        meal: '',
        purchased: false,
    };
};

// 5. NUTRITION — USDA-style estimates, fixed fallback (no randomness)
export const generateNutritionAI = async (dishName) => {
    const prompt = `Estimate accurate nutrition for ONE typical serving of "${dishName}". Use standard portion sizes and USDA-style values (e.g. 4 oz chicken ≈ 185 cal, 35g protein; 1/2 cup cooked rice ≈ 100 cal, 22g carbs). Include "servingSize" as a string (e.g. "4 oz", "1/2 cup", "1 cup (8 fl oz)", "1 quarter pound", "1 medium"). Return ONLY this JSON, no markdown: {"calories": number, "protein": "Xg", "carbs": "Xg", "fat": "Xg", "sugar": "Xg", "servingSize": "4 oz"}. Be consistent with real nutrition data.`;
    try {
        const text = await chatAI([
            { role: 'system', content: 'Nutrition expert. Use USDA-style typical values and standard portions. Include servingSize (oz, cup, quarter pound, etc.). Return ONLY raw JSON. No markdown.' },
            { role: 'user', content: prompt }
        ]);
        const result = extractJSON(text);
        if (result && typeof result.calories !== 'undefined' && result.calories > 0) {
            if (!result.servingSize) result.servingSize = '1 serving';
            return result;
        }
    } catch (e) {
        console.error('Nutrition AI error:', e);
    }
    // Fixed fallback (no randomness) — conservative typical meal values
    console.warn('Using fallback nutrition for:', dishName);
    return {
        calories: 450,
        protein: '30g',
        carbs: '40g',
        fat: '18g',
        sugar: '5g',
        servingSize: '1 serving',
    };
};