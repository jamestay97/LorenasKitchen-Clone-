// supabase/functions/sidechef-recipe/index.ts
// Finds a recipe on SideChef.com and extracts structured ingredient + nutrition data.
// Flow: DuckDuckGo search → SideChef recipe page → parse JSON-LD or HTML → return structured data.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

interface Ingredient {
  name: string
  quantity: string
  unit: string
  raw: string // e.g. "1 lb Ground Turkey"
  productName?: string // Sponsored/branded product name if available
}

interface RecipeData {
  title: string
  url: string
  servings: number
  ingredients: Ingredient[]
  nutrition: {
    calories: number
    protein: string
    carbs: string
    fat: string
    sugar: string
  } | null
  costPerServing: string
  source: 'sidechef'
}

/**
 * Search DuckDuckGo HTML-only for SideChef recipe URLs.
 */
async function findSideChefUrl(dishName: string): Promise<string | null> {
  try {
    const query = `site:sidechef.com ${dishName} recipe`
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await fetch(ddgUrl, {
      headers: {
        ...BROWSER_HEADERS,
        'Accept': 'text/html',
      },
    })
    if (!res.ok) return null
    const html = await res.text()

    // DuckDuckGo HTML results contain links in <a class="result__a" href="...">
    // or redirect links like //duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.sidechef.com%2Frecipes%2F...
    const urlMatches = html.matchAll(/uddg=(https?%3A%2F%2F(?:www\.)?sidechef\.com%2Frecipes%2F[^&"]+)/gi)
    for (const match of urlMatches) {
      const decoded = decodeURIComponent(match[1])
      if (decoded.includes('/recipes/') && !decoded.endsWith('/recipes/')) {
        return decoded
      }
    }

    // Fallback: direct URLs in href
    const directMatches = html.matchAll(/href="(https?:\/\/(?:www\.)?sidechef\.com\/recipes\/\d+\/[^"]+)"/gi)
    for (const match of directMatches) {
      return match[1]
    }

    return null
  } catch (e) {
    console.error('DuckDuckGo search failed:', e)
    return null
  }
}

/**
 * Try to extract JSON-LD Recipe schema from the HTML.
 * Most recipe sites embed this for SEO.
 */
function parseJsonLd(html: string): any | null {
  try {
    const scripts = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    for (const match of scripts) {
      try {
        const data = JSON.parse(match[1])
        // Could be an array or a single object
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Recipe') return item
          // Check @graph
          if (item['@graph']) {
            const recipe = item['@graph'].find((g: any) => g['@type'] === 'Recipe')
            if (recipe) return recipe
          }
        }
      } catch { /* skip invalid JSON */ }
    }
  } catch (e) {
    console.error('JSON-LD parse error:', e)
  }
  return null
}

/**
 * Parse ingredients from HTML structure.
 * SideChef pages have a consistent ingredient list structure.
 */
function parseIngredientsFromHtml(html: string): Ingredient[] {
  const ingredients: Ingredient[] = []

  // Try to match ingredient patterns from SideChef HTML
  // Pattern: quantity text followed by ingredient name
  // SideChef uses spans/divs with ingredient info

  // Strategy 1: Look for structured ingredient data in JS objects embedded in the page
  const dataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/)
    || html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});/)
    || html.match(/"ingredients"\s*:\s*(\[[\s\S]*?\])\s*[,}]/)

  if (dataMatch) {
    try {
      const parsed = JSON.parse(dataMatch[1])
      if (Array.isArray(parsed)) {
        for (const ing of parsed) {
          if (typeof ing === 'string') {
            ingredients.push(parseIngredientString(ing))
          } else if (ing?.name || ing?.text) {
            ingredients.push({
              name: ing.name || ing.text || '',
              quantity: ing.quantity || ing.amount || '',
              unit: ing.unit || '',
              raw: `${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ing.text || ''}`.trim(),
              productName: ing.productName || ing.product || undefined,
            })
          }
        }
        if (ingredients.length > 0) return ingredients
      }
    } catch { /* continue to HTML parsing */ }
  }

  // Strategy 2: Parse from JSON-LD recipeIngredient
  const jsonLd = parseJsonLd(html)
  if (jsonLd?.recipeIngredient) {
    for (const raw of jsonLd.recipeIngredient) {
      if (typeof raw === 'string') {
        ingredients.push(parseIngredientString(raw))
      }
    }
    if (ingredients.length > 0) return ingredients
  }

  // Strategy 3: Regex parse the HTML for common ingredient patterns
  // SideChef pattern: quantity in one element, ingredient name in another
  const ingredientBlocks = html.matchAll(
    /(?:<[^>]*class="[^"]*ingredient[^"]*"[^>]*>)([\s\S]*?)(?:<\/(?:div|li|section)>)/gi
  )
  for (const block of ingredientBlocks) {
    const text = block[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text.length > 2 && text.length < 200) {
      ingredients.push(parseIngredientString(text))
    }
  }

  return ingredients
}

/**
 * Parse a raw ingredient string like "1 lb Ground Turkey" into structured data.
 */
function parseIngredientString(raw: string): Ingredient {
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  // Match: optional quantity (number/fraction), optional unit, then ingredient name
  const match = cleaned.match(
    /^([\d\/.\s]+)?\s*(tsp|tbsp|cup|cups|oz|lb|lbs|clove|cloves|pinch|bunch|medium|large|small|can|cans|pint|quart|gallon|fl oz|tablespoon|teaspoon|pound|ounce|bag|jar|bottle|package|pkg|head|stalk|stalks|bunch|bunches|slice|slices|piece|pieces)?\s*[.,]?\s*(.+)/i
  )

  if (match) {
    return {
      name: (match[3] || cleaned).trim(),
      quantity: (match[1] || '').trim(),
      unit: (match[2] || '').trim(),
      raw: cleaned,
    }
  }

  return { name: cleaned, quantity: '', unit: '', raw: cleaned }
}

/**
 * Parse nutrition info from JSON-LD or HTML.
 */
function parseNutrition(html: string, jsonLd: any): RecipeData['nutrition'] {
  // From JSON-LD
  if (jsonLd?.nutrition) {
    const n = jsonLd.nutrition
    return {
      calories: parseInt(n.calories) || 0,
      protein: n.proteinContent || '0g',
      carbs: n.carbohydrateContent || '0g',
      fat: n.fatContent || '0g',
      sugar: n.sugarContent || '0g',
    }
  }

  // Fallback: parse from HTML text
  try {
    const calMatch = html.match(/Calories\s*<[^>]*>\s*(\d+)/i)
    const protMatch = html.match(/Protein\s*<[^>]*>\s*([\d.]+\s*g)/i)
    const carbMatch = html.match(/Carbohydrates?\s*<[^>]*>\s*([\d.]+\s*g)/i)
    const fatMatch = html.match(/(?:Total\s+)?Fat\s*<[^>]*>\s*([\d.]+\s*g)/i)
    const sugarMatch = html.match(/Sugars?\s*<[^>]*>\s*([\d.]+\s*g)/i)

    if (calMatch) {
      return {
        calories: parseInt(calMatch[1]) || 0,
        protein: protMatch?.[1] || '0g',
        carbs: carbMatch?.[1] || '0g',
        fat: fatMatch?.[1] || '0g',
        sugar: sugarMatch?.[1] || '0g',
      }
    }
  } catch { /* no nutrition found */ }

  return null
}

/**
 * Extract servings count from the page.
 */
function parseServings(html: string, jsonLd: any): number {
  if (jsonLd?.recipeYield) {
    const yieldStr = Array.isArray(jsonLd.recipeYield) ? jsonLd.recipeYield[0] : jsonLd.recipeYield
    const num = parseInt(yieldStr)
    if (!isNaN(num)) return num
  }
  // Fallback
  const match = html.match(/Servings\s*<[^>]*>\s*(\d+)/i)
  return match ? parseInt(match[1]) || 4 : 4
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { dish, servings: requestedServings } = body

    if (!dish || typeof dish !== 'string') {
      return new Response(JSON.stringify({ found: false, error: 'No dish provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 1: Find the SideChef recipe URL via DuckDuckGo
    const recipeUrl = await findSideChefUrl(dish)
    if (!recipeUrl) {
      return new Response(JSON.stringify({ found: false, dish }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Fetch the recipe page
    const pageRes = await fetch(recipeUrl, { headers: BROWSER_HEADERS })
    if (!pageRes.ok) {
      return new Response(JSON.stringify({ found: false, dish, url: recipeUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const html = await pageRes.text()

    // Step 3: Parse JSON-LD first (most reliable)
    const jsonLd = parseJsonLd(html)

    // Step 4: Extract ingredients
    let ingredients: Ingredient[] = []
    if (jsonLd?.recipeIngredient) {
      ingredients = jsonLd.recipeIngredient
        .filter((s: any) => typeof s === 'string')
        .map((s: string) => parseIngredientString(s))
    }

    // Fallback to HTML parsing if JSON-LD didn't have ingredients
    if (ingredients.length === 0) {
      ingredients = parseIngredientsFromHtml(html)
    }

    if (ingredients.length === 0) {
      return new Response(JSON.stringify({ found: false, dish, url: recipeUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 5: Parse nutrition and servings
    const nutrition = parseNutrition(html, jsonLd)
    const baseServings = parseServings(html, jsonLd)

    // Step 6: Scale ingredients if requested servings differ from base
    const scaleFactor = requestedServings && baseServings ? requestedServings / baseServings : 1
    if (scaleFactor !== 1) {
      for (const ing of ingredients) {
        if (ing.quantity) {
          const num = parseFloat(ing.quantity)
          if (!isNaN(num)) {
            const scaled = num * scaleFactor
            ing.quantity = scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1)
            ing.raw = `${ing.quantity} ${ing.unit} ${ing.name}`.trim()
          }
        }
      }
    }

    // Step 7: Extract title and cost
    const title = jsonLd?.name
      || html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]?.replace(/<[^>]*>/g, '').trim()
      || dish
    const costMatch = html.match(/\$(\d+\.\d{2})/)

    const result: RecipeData = {
      title,
      url: recipeUrl,
      servings: baseServings,
      ingredients,
      nutrition,
      costPerServing: costMatch ? `$${costMatch[1]}` : '',
      source: 'sidechef',
    }

    return new Response(JSON.stringify({ found: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ found: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
