/**
 * ROUTEUR LLM UNIFIÉ — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════
 * Ordre de priorité (économie de crédits API) :
 *   1️⃣  LM Studio local (minicpm-v-2_6 — port 1234)  → GRATUIT, local
 *   2️⃣  Gemini 2.5 Flash (Google AI)                  → Clé GEMINI_API_KEY
 *   3️⃣  OpenRouter AI (GPT-4o-mini, Claude, Llama…)   → Clé OPENROUTER_API_KEY
 *
 * En cas d'échec d'un fournisseur, le suivant est automatiquement essayé.
 * Tous les résultats sont normalisés en { content, modelUsed, provider }.
 * ════════════════════════════════════════════════════════════════════════
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface LLMResult {
  content: string;
  modelUsed: string;
  provider: "lmstudio" | "gemini" | "openrouter" | "error";
  latencyMs?: number;
}

// ── 1. LM Studio local ───────────────────────────────────────────────────────
async function callLMStudio(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
}): Promise<LLMResult> {
  const base = process.env.LM_STUDIO_BASE_URL || "http://localhost:1234";
  const model = process.env.LM_STUDIO_MODEL || "minicpm-v-2_6";
  const url = `${base}/v1/chat/completions`;
  const t0 = Date.now();

  const allMessages: LLMMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.messages,
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: allMessages,
      temperature: 0.3,
      max_tokens: params.maxTokens || 2048,
      stream: false,
    }),
    signal: AbortSignal.timeout(10_000), // 10s max pour LM Studio (local)
  });

  if (!res.ok) {
    throw new Error(`LM Studio HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LM Studio: réponse vide");

  return {
    content,
    modelUsed: data.model || model,
    provider: "lmstudio",
    latencyMs: Date.now() - t0,
  };
}

// ── 2. Gemini (Google AI) ────────────────────────────────────────────────────
async function callGemini(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
  useGrounding?: boolean;
  attachmentData?: { mimeType: string; data: string };
}): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non définie");

  const apiModel = "gemini-2.5-flash";
  const t0 = Date.now();

  // Construire les contents Gemini
  const contentsArray: any[] = [];
  params.messages.forEach((msg) => {
    if (msg.role === "system") return; // géré via systemInstruction
    contentsArray.push({
      role: msg.role === "user" ? "user" : "model",
      parts: typeof msg.content === "string"
        ? [{ text: msg.content }]
        : msg.content.map((c) =>
            c.type === "text"
              ? { text: c.text }
              : { inlineData: { mimeType: c.image_url?.url?.split(";")[0]?.split(":")[1] || "image/jpeg", data: c.image_url?.url?.split(",")[1] || "" } }
          ),
    });
  });

  // Ajouter l'attachement image si présent (dernier message user)
  if (params.attachmentData) {
    const lastUserIdx = [...contentsArray].reverse().findIndex((c) => c.role === "user");
    if (lastUserIdx >= 0) {
      const idx = contentsArray.length - 1 - lastUserIdx;
      contentsArray[idx].parts.unshift({
        inlineData: { mimeType: params.attachmentData.mimeType, data: params.attachmentData.data },
      });
    }
  }

  const body: any = {
    systemInstruction: { parts: [{ text: params.systemPrompt }] },
    contents: contentsArray,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: params.maxTokens || 2048,
    },
  };

  if (params.useGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini: réponse vide ou filtrée");

  return {
    content,
    modelUsed: apiModel,
    provider: "gemini",
    latencyMs: Date.now() - t0,
  };
}

// ── 3. OpenRouter (fallback ultime) ─────────────────────────────────────────
async function callOpenRouter(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
  model?: string;
}): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.length < 10) throw new Error("OPENROUTER_API_KEY non définie");

  const model = params.model || "openai/gpt-4o-mini";
  const t0 = Date.now();

  const allMessages: LLMMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.messages,
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://archicam.cm",
      "X-Title": "ARCHI CAM AI",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: allMessages,
      temperature: 0.3,
      max_tokens: params.maxTokens || 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter: réponse vide");

  return {
    content,
    modelUsed: data.model || model,
    provider: "openrouter",
    latencyMs: Date.now() - t0,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTEUR PRINCIPAL — Cascade Local → Gemini → OpenRouter
// ════════════════════════════════════════════════════════════════════════════
export async function routeLLM(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  maxTokens?: number;
  useGrounding?: boolean;
  preferLocal?: boolean;         // false → skip LM Studio, aller direct Gemini
  attachmentData?: { mimeType: string; data: string };
  openRouterModel?: string;      // ex: "anthropic/claude-3-5-haiku", "meta-llama/llama-3.3-70b-instruct"
}): Promise<LLMResult> {
  const {
    systemPrompt,
    messages,
    maxTokens,
    useGrounding = false,
    preferLocal = true,
    attachmentData,
    openRouterModel,
  } = params;

  const errors: string[] = [];

  // ── Étape 1 : LM Studio local (si preferLocal et pas de pièce jointe) ──────
  if (preferLocal && !attachmentData && !useGrounding) {
    try {
      const result = await callLMStudio({ systemPrompt, messages, maxTokens });
      console.log(`[LLM Router] ✅ LM Studio — ${result.modelUsed} (${result.latencyMs}ms)`);
      return result;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[LLM Router] ⚠️ LM Studio indisponible: ${msg}`);
      errors.push(`LMStudio: ${msg}`);
    }
  }

  // ── Étape 2 : Gemini Google AI ───────────────────────────────────────────
  try {
    const result = await callGemini({ systemPrompt, messages, maxTokens, useGrounding, attachmentData });
    console.log(`[LLM Router] ✅ Gemini — ${result.modelUsed} (${result.latencyMs}ms)`);
    return result;
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn(`[LLM Router] ⚠️ Gemini échoué: ${msg}`);
    errors.push(`Gemini: ${msg}`);
  }

  // ── Étape 3 : OpenRouter (fallback ultime) ───────────────────────────────
  try {
    const result = await callOpenRouter({ systemPrompt, messages, maxTokens, model: openRouterModel });
    console.log(`[LLM Router] ✅ OpenRouter — ${result.modelUsed} (${result.latencyMs}ms)`);
    return result;
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[LLM Router] ❌ OpenRouter échoué: ${msg}`);
    errors.push(`OpenRouter: ${msg}`);
  }

  // ── Aucun fournisseur disponible ────────────────────────────────────────
  console.error("[LLM Router] ❌ Tous les fournisseurs LLM ont échoué.", errors);
  return {
    content: "Désolé, tous les services IA sont temporairement indisponibles. Veuillez réessayer dans quelques instants.",
    modelUsed: "none",
    provider: "error",
  };
}
