// supabase/functions/generate-text/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

/** Dish-aware fallback descriptions — varied wording, no repeating "Savory" for every meal. */
function buildDescription(main: string, side1: string, side2: string): string {
  const m = (main || '').toLowerCase();
  const sides = [side1, side2].filter(Boolean);
  const sidesPhrase = sides.length === 2 ? `with ${sides[0]} and ${sides[1]}` : sides.length === 1 ? `with ${sides[0]}` : '';

  // Vary by dish type so descriptions don't all sound the same
  if (/\bgoulash\b|\bstew\b|\bbraised\b/.test(m)) {
    return sidesPhrase ? `Hearty ${main} ${sidesPhrase} — comforting and full of flavor.` : `Hearty ${main}, slow-cooked and full of flavor.`;
  }
  if (/\bbeef\b|\bmeatloaf\b|\bground beef\b/.test(m)) {
    return sidesPhrase ? `Rich ${main} ${sidesPhrase} for a satisfying plate.` : `Rich ${main}, prepared fresh for a filling meal.`;
  }
  if (/\bchicken\b|\bbq\b|\bkorean\b|\bteriyaki\b/.test(m)) {
    return sidesPhrase ? `Tender ${main} ${sidesPhrase} — a crowd-pleasing combo.` : `Tender ${main}, cooked to perfection.`;
  }
  if (/\bturkey\b|\blean\b/.test(m)) {
    return sidesPhrase ? `Lean ${main} ${sidesPhrase} — wholesome and satisfying.` : `Lean ${main}, light and satisfying.`;
  }
  if (/\bpork\b|\bham\b/.test(m)) {
    return sidesPhrase ? `Succulent ${main} ${sidesPhrase} for a hearty plate.` : `Succulent ${main}, prepared fresh.`;
  }
  if (/\bsalmon\b|\bfish\b|\bseafood\b/.test(m)) {
    return sidesPhrase ? `Fresh ${main} ${sidesPhrase} — light and delicious.` : `Fresh ${main}, simply prepared.`;
  }
  if (/\bpasta\b|\bmacaroni\b|\bnoodle\b/.test(m)) {
    return sidesPhrase ? `Classic ${main} ${sidesPhrase} — comfort in every bite.` : `Classic ${main}, made with care.`;
  }
  // Default: rotate a few openers so not every meal says the same thing
  const openers = ['Homestyle', 'Chef-style', 'Fresh', 'Hearty'];
  const i = (main.length + (side1?.length ?? 0) + (side2?.length ?? 0)) % openers.length;
  const opener = openers[i];
  return sidesPhrase ? `${opener} ${main} ${sidesPhrase} for a satisfying home-cooked meal.` : `${opener} ${main}, prepared fresh.`;
}

/** Meal-specific nutrition fallback when AI fails — so not every meal shows 500 cal */
function mealSpecificNutrition(main: string, side1: string, side2: string): Record<string, unknown> {
  const m = (main || '').toLowerCase();
  const s1 = (side1 || '').toLowerCase();
  const s2 = (side2 || '').toLowerCase();
  const sides = [s1, s2].join(' ');
  // Beef / goulash / stew: higher cal, more fat
  if (/\bgoulash\b|\bbeef\b|\bstew\b|\bground beef\b|\bmeatloaf\b/.test(m)) {
    const hasPasta = /\bpasta\b|\bmacaroni\b|elbow|noodle/.test(sides);
    return {
      calories: hasPasta ? 620 : 520,
      protein: "32g",
      carbs: hasPasta ? "52g" : "38g",
      fat: "22g",
      sugar: "6g",
      servingSize: "1 plate (5 oz beef, 1/2 cup starch, 1/2 cup vegetables)",
    };
  }
  // Ground turkey / lean
  if (/\bturkey\b|\blean\b/.test(m)) {
    const hasBeans = /\bbean\b/.test(sides);
    return {
      calories: 480,
      protein: "38g",
      carbs: hasBeans ? "48g" : "42g",
      fat: "14g",
      sugar: "4g",
      servingSize: "1 plate (5 oz turkey, 1/2 cup starch, 1/2 cup vegetables)",
    };
  }
  // Chicken (including BBQ, Korean, etc.)
  if (/\bchicken\b|\bbq\b|\bkorean\b/.test(m)) {
    const hasRice = /\brice\b|sticky/.test(sides);
    return {
      calories: 530,
      protein: "42g",
      carbs: hasRice ? "48g" : "35g",
      fat: "18g",
      sugar: "5g",
      servingSize: "1 plate (5 oz chicken, 1/2 cup rice or starch, 1/2 cup vegetables)",
    };
  }
  // Pork / fish
  if (/\bpork\b|\bsalmon\b|\bfish\b/.test(m)) {
    return {
      calories: 500,
      protein: "36g",
      carbs: "42g",
      fat: "20g",
      sugar: "4g",
      servingSize: "1 plate (5 oz protein, 1/2 cup starch, 1/2 cup vegetables)",
    };
  }
  // Default
  return {
    calories: 500,
    protein: "35g",
    carbs: "45g",
    fat: "18g",
    sugar: "5g",
    servingSize: "1 plate (5 oz protein, 1/2 cup starch, 1/2 cup vegetables)",
  };
}

function extractJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    // Strip markdown code fences
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    // Find the outermost JSON object
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first === -1 || last === -1) return null;
    let jsonStr = cleaned.substring(first, last + 1);
    // Fix trailing commas
    jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function safeJsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let main = '';
  let side1 = '';
  let side2 = '';
  try {
    const parsed = await req.json() as Record<string, unknown>;
    main = String(parsed?.main ?? '');
    side1 = String(parsed?.side1 ?? '');
    side2 = String(parsed?.side2 ?? '');
  } catch {
    return safeJsonResponse({
      description: 'Homestyle meal, prepared fresh.',
      nutrition: mealSpecificNutrition('Meal', '', ''),
      ingredients: [],
      error: 'Invalid request body',
    });
  }

  const apiKey = Deno.env.get('POLLINATIONS_API_KEY') || ''

  const sidesList = [side1, side2].filter(Boolean);
  const sidesText = sidesList.length > 0 ? `Sides: ${sidesList.join(' and ')}` : 'No sides';

  const prompt = `For this specific meal — Main: "${main}". ${sidesText}.

Do these three things:
1) Write a short (1-2 sentence) appetizing description that fits THIS dish. Mention "${main}" by name and each side: ${sidesList.map(s => `"${s}"`).join(', ') || 'none'}. Use varied, dish-appropriate language: e.g. "Hearty beef goulash..." or "Tender Korean chicken..." or "Fresh salmon..." or "Lean turkey...". Do NOT start every description with "Savory" — vary the opening (hearty, tender, fresh, rich, smoky, comforting, etc.) and make each description unique to this exact meal.
2) Estimate nutrition for ONE plate of THIS EXACT MEAL ONLY. You MUST use different numbers for different meals. Examples: beef goulash with cabbage and pasta = higher calories/carbs (e.g. 550-650 cal, 30-40g protein, 50-60g carbs). Korean BBQ chicken with rice and broccoli = moderate (e.g. 480-550 cal, 40-45g protein, 45-55g carbs). Ground turkey with yuca and black beans = lean and fiber-rich (e.g. 420-520 cal, 35-42g protein, 45-55g carbs). Base your answer on the actual main and sides listed above. Include "servingSize" specific to this meal (e.g. "1 plate (5 oz beef, 1/2 cup elbow pasta, 1/2 cup cabbage)" or "1 plate (5 oz chicken, 3/4 cup rice, 1/2 cup broccoli)"). Return calories as number; protein, carbs, fat, sugar as "Xg" strings.
3) List the main ingredients as a JSON array of strings.

Return ONLY valid JSON (no markdown): {"description": "...", "nutrition": {"calories": N, "protein": "Xg", "carbs": "Xg", "fat": "Xg", "sugar": "Xg", "servingSize": "1 plate (..."}, "ingredients": ["..."]}.`;

  const FETCH_TIMEOUT_MS = 22000; // avoid edge timeout; leave buffer
  const MAX_POST_ATTEMPTS = 3;

  let text = '';
  let parseSuccess = false;
  let body: Record<string, unknown> = {};

  const postPayload = {
    messages: [
      { role: 'system', content: 'You are a nutrition and menu copy expert. For each meal: (1) Write a short, appetizing description that fits that dish — use varied adjectives (hearty, tender, fresh, rich, smoky, comforting, lean, etc.) and do NOT start every description with "Savory". Make each description unique. (2) Return nutrition that matches THAT specific meal only; never use the same numbers for every meal. Use USDA-style portions. Output ONLY raw JSON. No markdown.' },
      { role: 'user', content: prompt }
    ],
    model: 'openai',
    seed: Math.floor(Math.random() * 10000),
    ...(apiKey ? { key: apiKey } : {}),
  };

  const fetchWithTimeout = (url: string, opts: RequestInit) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
  };

  try {
    // POST attempts (up to 3)
    for (let attempt = 0; attempt < MAX_POST_ATTEMPTS && !parseSuccess; attempt++) {
      try {
        const res = await fetchWithTimeout('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postPayload),
        });
        text = await res.text();
        console.log(`POST attempt ${attempt + 1} raw response:`, text.substring(0, 500));

        const parsed = extractJSON(text);
        if (parsed && parsed.description && typeof parsed.description === 'string') {
          const nutr = parsed.nutrition as Record<string, unknown> | undefined;
          if (nutr && typeof nutr === 'object' && typeof nutr.calories === 'number' && nutr.calories > 0) {
            body = parsed;
            parseSuccess = true;
          } else {
            body = parsed;
            parseSuccess = true;
          }
        }
      } catch (err) {
        console.warn(`POST attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_POST_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }

    // GET fallback
    if (!parseSuccess) {
      try {
        const seed = Math.floor(Math.random() * 10000);
        const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&seed=${seed}${apiKey ? `&key=${apiKey}` : ''}`;
        const fallback = await fetchWithTimeout(url, {});
        text = await fallback.text();
        console.log('GET fallback raw response:', text.substring(0, 500));
        const parsed = extractJSON(text);
        if (parsed && parsed.description) {
          body = parsed;
          parseSuccess = true;
        }
      } catch (err) {
        console.warn('GET fallback failed:', err);
      }
    }

    // Final fallback: description + nutrition + ingredients from meal names
    if (!parseSuccess || !body.description) {
      body.description = body.description || buildDescription(main, side1, side2);
    }

    const nutr = body.nutrition as Record<string, unknown> | undefined;
    if (!nutr || typeof nutr !== 'object' || !nutr.calories || (typeof nutr.calories === 'number' && nutr.calories <= 0)) {
      body.nutrition = mealSpecificNutrition(main, side1, side2);
    } else if (typeof (nutr as Record<string, unknown>).servingSize !== 'string') {
      (body.nutrition as Record<string, unknown>).servingSize = "1 plate";
    }

    if (!body.ingredients || !Array.isArray(body.ingredients) || (body.ingredients as unknown[]).length === 0) {
      body.ingredients = [main, ...[side1, side2].filter(Boolean)];
    }

    return safeJsonResponse(body);
  } catch (err) {
    console.error('generate-text unexpected error:', err);
    return safeJsonResponse({
      description: buildDescription(main, side1, side2),
      nutrition: mealSpecificNutrition(main, side1, side2),
      ingredients: [main, ...[side1, side2].filter(Boolean)],
    });
  }
})