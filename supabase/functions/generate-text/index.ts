// supabase/functions/generate-text/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { main, side1, side2 } = await req.json()
  const apiKey = Deno.env.get('POLLINATIONS_API_KEY') || ''

  const prompt = `For the meal: Main "${main}", Side 1 "${side1}", Side 2 "${side2}".
  1) Estimate nutrition (typical serving).
  2) Write one short appetizing description sentence.
  3) List main ingredients as a JSON array of strings (e.g. ["chicken breast", "garlic", "olive oil"]).
  Return ONLY this JSON (no markdown): {"description": "...", "nutrition": {"calories": 0, "protein": "0g", "carbs": "0g", "fat": "0g", "sugar": "0g"}, "ingredients": ["item1", "item2"]}`;

  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&key=${apiKey}`;
  const response = await fetch(url);
  const text = await response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let body: Record<string, unknown> = { error: "Failed" };
  if (jsonMatch) {
    try {
      body = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      body = { error: "Parse failed" };
    }
  }
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
})