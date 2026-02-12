import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractPrice(result: any): number | null {
  const candidates = [
    result?.primary_offer?.offer_price,
    result?.primary_offer?.price,
    result?.price,
    result?.offer?.price,
    result?.offers?.primary?.price,
    result?.offers?.[0]?.price,
  ];

  for (const c of candidates) {
    if (typeof c === "number" && isFinite(c) && c > 0) return c;
    if (typeof c === "string") {
      const num = Number(c.replace(/[^0-9.]/g, ""));
      if (isFinite(num) && num > 0) return num;
    }
  }
  return null;
}

function extractUrl(result: any): string | null {
  return result?.link || result?.product_page_url || result?.product_url || result?.url || null;
}

function scoreResult(query: string, r: any): number {
  const q = (query || "").toLowerCase();
  const title = (r?.title || "").toLowerCase();
  if (!title) return -999;

  let score = 0;
  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = new Set(title.split(/\s+/).filter(Boolean));
  const overlap = qTokens.reduce((acc, tok) => acc + (tTokens.has(tok) ? 1 : 0), 0);
  score += overlap * 3;

  if (extractPrice(r) !== null) score += 5;
  if (r?.thumbnail) score += 2;
  if (typeof r?.rating === "number") score += Math.min(5, r.rating);
  if (title.includes("sponsored")) score -= 10;

  return score;
}

async function walmartSearchOne(query: string, apiKey: string) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "walmart");
  url.searchParams.set("query", query);
  // store_id optional; remove if you want locale auto selection
  url.searchParams.set("store_id", "5260");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data?.error) throw new Error(data.error);

  const results: any[] = data?.organic_results || [];
  if (!results.length) return { found: false, query };

  const top = results.slice(0, 8);
  const best = top
    .map((r) => ({ r, s: scoreResult(query, r) }))
    .sort((a, b) => b.s - a.s)[0]?.r;

  if (!best) return { found: false, query };

  const price = extractPrice(best);
  return {
    found: true,
    query,
    name: best.title,
    price: price ?? 0,
    image: best.thumbnail ?? null,
    rating: best.rating ?? null,
    productUrl: extractUrl(best),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const singleQuery = body?.query;
    const queries: string[] | undefined = body?.queries;

    const apiKey = Deno.env.get("SERPAPI_KEY");
    if (!apiKey) throw new Error("Missing SERPAPI_KEY");

    if (Array.isArray(queries) && queries.length > 0) {
      const out = [];
      for (const q of queries) {
        if (!q?.trim()) continue;
        out.push(await walmartSearchOne(q.trim(), apiKey));
      }

      return new Response(JSON.stringify({ items: out }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!singleQuery?.trim()) throw new Error("Missing query");

    const item = await walmartSearchOne(singleQuery.trim(), apiKey);
    return new Response(JSON.stringify(item), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
