// Minimal OpenRouter client for the drafting routes: tries the preferred model
// then the fallbacks, returns the first non-empty answer or null.

export const DRAFTING_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash-lite',
  'minimax/minimax-01',
];

// Models that read images (flyers, screenshots); the drafting list does not all do.
export const VISION_MODELS = ['openai/gpt-4o-mini', 'google/gemini-2.5-flash'];

// CV, letter and offer reading run on Claude Haiku first. Every model here reads
// images too, so the list also serves the offer photos.
export const CV_MODELS = ['anthropic/claude-haiku-5.5', 'openai/gpt-4o-mini', 'google/gemini-2.5-flash'];

// Claude models think by default on OpenRouter and can spend the whole token
// budget on it, leaving an empty answer: these short tasks do without.
export const modelRequestOptions = (model: string): Record<string, unknown> =>
  model.startsWith('anthropic/') ? { reasoning: { enabled: false } } : {};

export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string | LlmContentPart[] };

export type LlmOptions = {
  temperature?: number;
  maxTokens?: number;
  title?: string;
  timeoutMs?: number;
  /** Replaces the drafting models, e.g. VISION_MODELS for a message with images. */
  models?: string[];
};

export const isLlmConfigured = (): boolean => Boolean(process.env.OPENROUTER_API_KEY);

export const callLlm = async (messages: LlmMessage[], options: LlmOptions = {}): Promise<string | null> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const models = options.models ?? Array.from(new Set([process.env.OPENROUTER_MODEL || DRAFTING_MODELS[0], ...DRAFTING_MODELS]));
  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
          'X-Title': options.title ?? 'Campus 360 Writing',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.5,
          max_tokens: options.maxTokens ?? 1500,
          ...modelRequestOptions(model),
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
      });
      if (!response.ok) {
        console.warn(`[llm] ${model} answered ${response.status}: ${(await response.text().catch(() => '')).slice(0, 200)}`);
        continue;
      }
      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) return content;
    } catch (error) {
      // try the next model
      console.warn(`[llm] ${model} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return null;
};

// The rewrite function expected by `polishAiTics`.
export const llmRewrite = (prompt: string) =>
  callLlm([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 2500, title: 'Campus 360 Proofreading' });
