import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all domains (fixes localhost issues)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, model } = await req.json()

    // 2. Call Pollinations API
    // We remove 'max_tokens' to prevent the JSON list from being cut off mid-stream.
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Output only raw text or JSON as requested.' },
          { role: 'user', content: prompt }
        ],
        model: model || 'openai',
        seed: Math.floor(Math.random() * 1000)
      }),
    })

    if (!response.ok) {
      console.error("Pollinations Error:", response.statusText);
      return new Response(JSON.stringify({ error: "Upstream API Failed" }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Return the raw text
    const text = await response.text()

    return new Response(
      JSON.stringify({ 
        ok: true, 
        text: text 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})