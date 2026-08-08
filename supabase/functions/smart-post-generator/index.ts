// BB Serviços Express Smart Post Generator
// Uses Lovable AI Gateway:
// - google/gemini-2.5-flash for text/copy/score (JSON via tool calling)
// - google/gemini-2.5-flash-image (Nano Banana) for the visual post

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface GenerateRequest {
  imageUrl: string;
  mode?: "viral" | "premium" | "venda_rapida" | "story";
  format?: "square" | "vertical";
  brand?: { name?: string; username?: string; avatarUrl?: string; verified?: boolean };
  userHint?: string;
}

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "analise_publicidade",
    description: "Analisa a imagem do utilizador e gera o conteúdo publicitário em PT-AO.",
    parameters: {
      type: "object",
      properties: {
        service_type: { type: "string", description: "Tipo de produto ou serviço identificado" },
        audience: { type: "string", description: "Público-alvo principal (ex: jovens 18-30 em Luanda)" },
        emotion: {
          type: "string",
          enum: ["urgencia", "confianca", "desejo", "alegria", "exclusividade"],
        },
        title: { type: "string", description: "Título curto chamativo (até 6 palavras)" },
        caption_short: { type: "string", description: "Legenda curta até 80 caracteres em PT-AO" },
        caption_medium: { type: "string", description: "Legenda média 80-180 caracteres" },
        caption_long: { type: "string", description: "Legenda longa 180-400 caracteres" },
        copy_direct: { type: "string", description: "Copy de venda direta, focada em ação" },
        copy_emotional: { type: "string", description: "Copy emocional/viral, contar uma micro-história" },
        cta: { type: "string", description: "Call to action curto (ex: 'Chama agora pelo WhatsApp')" },
        hashtags: {
          type: "array",
          items: { type: "string" },
          description: "5 a 10 hashtags relevantes em PT-AO",
        },
        score: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description: "Estimativa de chance de conversão (0-100)",
        },
      },
      required: [
        "service_type",
        "audience",
        "emotion",
        "title",
        "caption_short",
        "caption_medium",
        "caption_long",
        "copy_direct",
        "copy_emotional",
        "cta",
        "hashtags",
        "score",
      ],
      additionalProperties: false,
    },
  },
} as const;

async function generateAnalysis(apiKey: string, imageUrl: string, mode: string, hint?: string) {
  const systemPrompt = `Tu és o BB Serviços Express, especialista em marketing digital para o mercado angolano.
Analisas imagens e geras conteúdo publicitário profissional em Português de Angola (PT-AO).
Modo do post: ${mode}.
- viral: tom emocional, gancho forte, partilhável.
- premium: tom sofisticado, exclusivo, valor.
- venda_rapida: urgência, oferta clara, ação imediata.
- story: conversacional, próximo, primeira pessoa.
Usa expressões locais quando faz sentido (ex: "kota", "encomenda já", "envio em Luanda").
Evita anglicismos desnecessários.`;

  const userContent: any[] = [
    {
      type: "text",
      text: hint
        ? `Sobre o produto/serviço: ${hint}\nGera o conteúdo publicitário completo.`
        : "Analisa a imagem e gera o conteúdo publicitário completo.",
    },
    { type: "image_url", image_url: { url: imageUrl } },
  ];

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "function", function: { name: "analise_publicidade" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI analysis failed [${resp.status}]: ${t}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI did not return structured analysis");
  }
  return JSON.parse(toolCall.function.arguments);
}

async function generateVisual(
  apiKey: string,
  imageUrl: string,
  analysis: any,
  mode: string,
  format: string,
  brand: GenerateRequest["brand"],
) {
  const aspect = format === "vertical" ? "9:16 (story format)" : "1:1 (square Instagram)";
  const moodMap: Record<string, string> = {
    viral: "vibrant, bold colors, eye-catching gradient overlays, modern social media style",
    premium: "elegant, minimal, dark luxurious tones, gold accents, sophisticated",
    venda_rapida: "high energy, red/orange urgency colors, clear price highlight",
    story: "warm, friendly, soft gradient, personal vibe",
  };
  const mood = moodMap[mode] ?? moodMap.viral;
  const brandLine = brand?.name
    ? `Add a small profile badge in the top-left corner with the name "${brand.name}"${brand?.username ? ` (@${brand.username})` : ""}${brand?.verified ? " with a small blue verified checkmark" : ""}.`
    : "";

  const prompt = `Transform this product/service photo into a professional advertising post for the Angolan market.
Format: ${aspect}.
Style: ${mood}.
Subject: ${analysis.service_type}. Target emotion: ${analysis.emotion}.
Add a bold headline overlay at the top: "${analysis.title}".
Add a clear CTA button at the bottom with the text: "${analysis.cta}".
Keep the original product/subject visible and in focus, apply background blur if needed, balance composition, ensure text is highly legible (with subtle drop shadow or contrasting plate).
${brandLine}
Add small "BB Serviços Express" watermark in bottom-right corner.
Make it look like a real high-converting Instagram ad.`;

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI image gen failed [${resp.status}]: ${t}`);
  }
  const data = await resp.json();
  const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("AI did not return an image");
  return dataUrl as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const body = (await req.json()) as GenerateRequest;
    if (!body?.imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode = body.mode ?? "viral";
    const format = body.format ?? "square";

    const analysis = await generateAnalysis(apiKey, body.imageUrl, mode, body.userHint);
    const imageDataUrl = await generateVisual(apiKey, body.imageUrl, analysis, mode, format, body.brand);

    return new Response(
      JSON.stringify({ analysis, imageDataUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("smart-post-generator error:", msg);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
