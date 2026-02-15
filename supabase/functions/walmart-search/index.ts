// supabase/functions/walmart-search/index.ts
// Searches Walmart.com for a product and returns real pricing data.
// Falls back gracefully if Walmart blocks the request.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Browser-like headers to avoid immediate bot detection
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
}

interface WalmartProduct {
  name: string
  price: number
  unitPrice: string
  image: string
  url: string
  size: string
  brand: string
}

/**
 * Try to extract product data from Walmart's __NEXT_DATA__ JSON embedded in HTML.
 */
function parseNextData(html: string): WalmartProduct[] {
  const products: WalmartProduct[] = []

  try {
    // Walmart embeds product data in a <script id="__NEXT_DATA__"> tag
    const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/)
    if (!nextDataMatch?.[1]) return products

    const nextData = JSON.parse(nextDataMatch[1])

    // Navigate the nested structure to find search results
    // Walmart's structure: props.pageProps.initialData.searchResult.itemStacks[0].items
    const pageProps = nextData?.props?.pageProps
    const initialData = pageProps?.initialData || pageProps?.initialProps?.initialData
    const searchResult = initialData?.searchResult || initialData?.search?.searchResult
    const itemStacks = searchResult?.itemStacks || []

    for (const stack of itemStacks) {
      const items = stack?.items || []
      for (const item of items) {
        if (!item?.name || item.__typename === 'AdItem') continue
        const price = item?.priceInfo?.currentPrice?.price
          ?? item?.priceInfo?.linePrice?.price
          ?? item?.price
          ?? 0
        if (typeof price !== 'number' || price <= 0) continue

        // Extract a clean size string (e.g. "32 oz", "3 lb") from various fields
        let size = item?.weightIncrement || ''
        if (!size) {
          // Try to pull a size from the product name or shortDescription
          const sizeSource = item?.name || item?.shortDescription || ''
          const sizeMatch = sizeSource.match(/(\d+\.?\d*)\s*(fl\.?\s*oz|oz|lb|lbs|gal|gallon|qt|quart|pt|pint|ct|count|pk|pack|kg|g|ml|l|liter)\b/i)
          if (sizeMatch) {
            size = sizeMatch[0]
          }
        }

        products.push({
          name: item.name || '',
          price,
          unitPrice: item?.priceInfo?.unitPrice?.priceString || '',
          image: item?.imageInfo?.thumbnailUrl || item?.image || '',
          url: item?.canonicalUrl
            ? `https://www.walmart.com${item.canonicalUrl}`
            : '',
          size,
          brand: item?.brand || '',
        })

        if (products.length >= 3) break
      }
      if (products.length >= 3) break
    }
  } catch (e) {
    console.error('parseNextData error:', e)
  }

  return products
}

/**
 * Fallback: try Walmart's autocomplete/typeahead API which is lighter.
 */
async function tryAutocomplete(query: string): Promise<WalmartProduct[]> {
  try {
    const url = `https://www.walmart.com/orchestra/home/auto-complete?query=${encodeURIComponent(query)}&limit=5`
    const res = await fetch(url, { headers: BROWSER_HEADERS })
    if (!res.ok) return []
    // Autocomplete doesn't return prices, so this is just for product names
    return []
  } catch {
    return []
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { query, neededQty } = body

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ fallback: true, error: 'No query provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const searchQuery = query.replace(/\(.*?\)/g, '').trim() // Strip "(3 lbs)" etc.
    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(searchQuery)}`

    let products: WalmartProduct[] = []

    try {
      const res = await fetch(searchUrl, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
      })

      if (res.ok) {
        const html = await res.text()
        products = parseNextData(html)
      }
    } catch (fetchErr) {
      console.warn('Walmart fetch failed:', fetchErr)
    }

    if (products.length === 0) {
      // Return fallback signal so the client uses AI estimates
      return new Response(JSON.stringify({
        fallback: true,
        query: searchQuery,
        walmartUrl: searchUrl,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return real product data
    return new Response(JSON.stringify({
      fallback: false,
      query: searchQuery,
      neededQty: neededQty || '',
      walmartUrl: searchUrl,
      products,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ fallback: true, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 even on error so client doesn't break
    })
  }
})
