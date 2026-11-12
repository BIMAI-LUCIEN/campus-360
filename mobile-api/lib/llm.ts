// Minimal OpenRouter client for the drafting routes: tries the preferred model
// then the fallbacks, returns the first non-empty answer or null.

// Every AI feature runs on Claude Haiku 5.5 first; the others are fallbacks.
export const PRIMARY_MODEL = 'anthropic/claude-haiku-5.5';

export const DRAFTING_MODELS = [
  PRIMARY_MODEL,
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash-lite',
  'minimax/minimax-01',
];

// Models that read images (flyers, screenshots); the drafting list does not all do.
export const VISION_MODELS = [PRIMARY_MODEL, 'openai/gpt-4o-mini', 'google/gemini-2.5-flash'];

// CV, letter and offer reading. Every model here reads images too, so the list
// also serves the offer photos.
export const CV_MODELS = [PRIMARY_MODEL, 'openai/gpt-4o-mini', 'google/gemini-2.5-flash'];

// The preferred model (OPENROUTER_MODEL, else Haiku) followed by the fallbacks.
export const modelsToTry = (fallbacks: string[] = DRAFTING_MODELS): string[] =>
  Array.from(new Set([process.env.OPENROUTER_MODEL || PRIMARY_MODEL, ...fallbacks]));

type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORTS: ReasoningEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

// Claude reasoning effort, `high` unless OPENROUTER_REASONING_EFFORT says otherwise.
// Measured on a 250-word report section (2026-11-12): high 8.6 s, xhigh 18 s, max 60 s.
export const reasoningEffort = (): ReasoningEffort => {
  const value = process.env.OPENROUTER_REASONING_EFFORT?.trim().toLowerCase() as ReasoningEffort | undefined;
  return value && EFFORTS.includes(value) ? value : 'high';
};

// Thinking tokens come out of max_tokens on OpenRouter: without headroom a Claude
// model can spend the whole budget thinking and return an empty answer.
const THINKING_HEADROOM: Record<ReasoningEffort, number> = {
  low: 2_000,
  medium: 3_000,
  high: 6_000,
  xhigh: 16_000,
  max: 32_000,
};

const isClaude = (model: string) => model.startsWith('anthropic/');

export const modelRequestOptions = (model: string): Record<string, unknown> =>
  isClaude(model) ? { reasoning: { effort: reasoningEffort() } } : {};

/** max_tokens for a request whose visible answer needs `answerTokens`. */
export const outputTokensFor = (model: string, answerTokens: number): number =>
  isClaude(model) ? answerTokens + THINKING_HEADROOM[reasoningEffort()] : answerTokens;

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
  const models = options.models ?? modelsToTry();
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
          max_tokens: outputTokensFor(model, options.maxTokens ?? 1500),
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
