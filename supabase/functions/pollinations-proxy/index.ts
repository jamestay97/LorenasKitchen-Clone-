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
    const { type = 'image', prompt, seed, messages, model } = body
    const apiKey = Deno.env.get('POLLINATIONS_API_KEY') || ''
    
    const baseUrl = 'https://gen.pollinations.ai'
    let result;

    if (type === 'chat') {
       // Chat-style AI: proxy POST to text.pollinations.ai (avoids browser CORS)
       let text = ''
       try {
         const controller = new AbortController()
         const timeout = setTimeout(() => controller.abort(), 25000) // 25s timeout
         const response = await fetch('https://text.pollinations.ai/', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             messages: messages || [{ role: 'user', content: prompt || '' }],
             model: model || 'openai',
             seed: seed || Math.floor(Math.random() * 10000),
             ...(apiKey ? { key: apiKey } : {}),
           }),
           signal: controller.signal,
         })
         clearTimeout(timeout)
         text = await response.text()
       } catch (fetchErr) {
         console.warn('POST to pollinations failed, trying GET fallback:', fetchErr)
         // GET fallback
         try {
           const userMsg = (messages || []).find((m: any) => m.role === 'user')?.content || prompt || ''
           const fallbackUrl = `https://text.pollinations.ai/${encodeURIComponent(userMsg)}?model=${model || 'openai'}&seed=${seed || 42}`
           const fallbackRes = await fetch(fallbackUrl)
           text = await fallbackRes.text()
         } catch (getErr) {
           console.warn('GET fallback also failed:', getErr)
         }
       }
       if (!text || text.trim().length === 0) {
         text = '{"error": "AI returned empty response"}'
       }
       result = { text }
    } else if (type === 'text') {
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