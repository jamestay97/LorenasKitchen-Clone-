import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. Define the CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows requests from any site (like your GitHub Pages)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 2. Handle the CORS preflight request (the browser sends this first)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { type = 'image', prompt, seed } = body
    const apiKey = Deno.env.get('POLLINATIONS_API_KEY') || ''
    
    // Stable Unified Endpoint
    const baseUrl = 'https://gen.pollinations.ai'
    let result;

    if (type === 'text') {
       const url = `${baseUrl}/prompt/${encodeURIComponent(prompt)}?model=openai&seed=${seed || 42}&key=${apiKey}`
       const response = await fetch(url)
       const text = await response.text()
       result = { text }
    } else if (type === 'image') {
       const imageUrl = `${baseUrl}/image/${encodeURIComponent(prompt)}?width=800&height=600&model=flux&nologo=true&seed=${seed || 123}&key=${apiKey}`
       result = { url: imageUrl }
    } 

    // 3. Include corsHeaders in your successful response
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // 4. Include corsHeaders even in error responses
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})