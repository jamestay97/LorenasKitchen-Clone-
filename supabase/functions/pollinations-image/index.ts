import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

function clampInt(v: unknown, fallback: number, min: number, max: number) {
  const n = typeof v === "number" ? Math.floor(v) : fallback;
  return Math.max(min, Math.min(max, n));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) throw new Error("Missing prompt");

    // Optional params (client can override)
    const width = clampInt(body?.width, 1024, 256, 2048);
    const height = clampInt(body?.height, 768, 256, 2048);
    const model = String(body?.model ?? "flux");
    const nologo = body?.nologo === false ? false : true;
    const seed = clampInt(body?.seed, Math.floor(Math.random() * 1_000_000), 0, 2_000_000_000);
    const forceNew = Boolean(body?.forceNew);

    // Pollinations VIP key (Bearer)
    const pollinationsKey = Deno.env.get("POLLINATIONS_API_KEY");
    if (!pollinationsKey) throw new Error("Missing POLLINATIONS_API_KEY secret");

    // Storage upload (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Cache key based on prompt + settings
    const cacheKey = await sha256(JSON.stringify({ prompt, width, height, model, nologo }));
    const bucket = "menu-images";
    const path = `generated/${cacheKey}.jpg`;

    // If already generated, return existing URL
    if (!forceNew) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      // getPublicUrl always returns a url; verify object exists cheaply
      const head = await fetch(pub.publicUrl, { method: "HEAD" });
      if (head.ok) {
        return new Response(
          JSON.stringify({ ok: true, cached: true, publicUrl: pub.publicUrl, path }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const url =
      `https://image.pollinations.ai/prompt/${encodedPrompt}` +
      `?width=${width}&height=${height}&model=${encodeURIComponent(model)}` +
      `&nologo=${nologo ? "true" : "false"}&seed=${seed}`;

    // Small retry/backoff for transient errors / 429
    let imgRes: Response | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const backoffMs = 800 + attempt * 1200;
      try {
        imgRes = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${pollinationsKey}` },
        });

        if (imgRes.ok) break;

        if (imgRes.status === 429 || imgRes.status >= 500) {
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        const errorText = await imgRes.text().catch(() => "");
        throw new Error(`Pollinations API Error: ${imgRes.status} - ${errorText}`);
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    if (!imgRes || !imgRes.ok) {
      const msg = lastErr instanceof Error ? lastErr.message : "Pollinations fetch failed";
      throw new Error(msg);
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: true,
    });

    if (uploadErr) throw uploadErr;

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

    return new Response(
      JSON.stringify({ ok: true, cached: false, publicUrl: pub.publicUrl, path }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Server Error:", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
