import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  BUSINESS_MODEL_VALUES,
  GEMINI_FLASH_MODEL_ID,
  MOAT_PATTERN_VALUES,
  TAG_SUGGEST_TIMEOUT_MS,
  type TagSuggestResponse,
  unavailableTagSuggestResponse,
} from './tag-suggest.constants';

// Keep the provider-facing schema deliberately simple. Gemini's structured
// output support is stricter than Zod: nullable enum unions can be rejected
// before the model is called. We normalize these strings into allowed enums
// after the response is received.
const tagSuggestionSchema = z.object({
  moatPattern: z.string(),
  businessModel: z.string(),
  rationale: z.string().max(240),
});

function normalizeAllowedValue<T extends string>(
  value: string,
  allowed: readonly T[],
): T | null {
  const normalized = value.trim().toUpperCase();
  return allowed.includes(normalized as T) ? (normalized as T) : null;
}

const SYSTEM_PROMPT = `You classify research notes for an investment notebook.
Return at most one moat pattern and one business model from the allowed enums.
Use an empty string for a dimension when the note text does not support a confident classification.
Use an empty string when no rationale is useful.
Do not invent company facts, financial figures, prices, or investment recommendations.
Classify only from the supplied note text.`;

export interface TagSuggestDependencies {
  generate: typeof generateText;
  hasApiKey: boolean;
  modelId?: string;
}

export async function suggestTagsFromNoteText(
  noteText: string,
  dependencies: TagSuggestDependencies = {
    generate: generateText,
    hasApiKey: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
    modelId: GEMINI_FLASH_MODEL_ID,
  },
): Promise<TagSuggestResponse> {
  if (!dependencies.hasApiKey) {
    return unavailableTagSuggestResponse();
  }

  try {
    const result = await dependencies.generate({
      model: google(dependencies.modelId ?? GEMINI_FLASH_MODEL_ID),
      system: SYSTEM_PROMPT,
      prompt: noteText,
      // Gemini's native structured-output mode rejects this schema in the
      // current provider version. The AI SDK still parses and validates the
      // object against tagSuggestionSchema when native mode is disabled.
      providerOptions: {
        google: {
          structuredOutputs: false,
        },
      },
      output: Output.object({
        schema: tagSuggestionSchema,
      }),
      abortSignal: AbortSignal.timeout(TAG_SUGGEST_TIMEOUT_MS),
    });

    const output = result.output;
    const moatPattern = normalizeAllowedValue(
      output.moatPattern,
      MOAT_PATTERN_VALUES,
    );
    const businessModel = normalizeAllowedValue(
      output.businessModel,
      BUSINESS_MODEL_VALUES,
    );

    return {
      moatPattern,
      businessModel,
      ...(output.rationale.trim() ? { rationale: output.rationale.trim() } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const category =
      message.includes('429') || message.includes('quota')
        ? 'rate_limited'
        : message.includes('timeout') || message.includes('aborted')
          ? 'timeout'
          : message.includes('schema') || message.includes('object')
            ? 'structured_output'
            : 'provider_error';

    // Do not log the API key, note text, prompt, or generated content.
    console.error('[tag-suggest] Gemini request failed', { category });
    return unavailableTagSuggestResponse();
  }
}
