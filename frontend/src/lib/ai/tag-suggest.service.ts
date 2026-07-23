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

const tagSuggestionSchema = z.object({
  moatPattern: z.enum(MOAT_PATTERN_VALUES).nullable(),
  businessModel: z.enum(BUSINESS_MODEL_VALUES).nullable(),
  // Gemini structured output is more reliable when every property is required.
  // A nullable field still lets the model omit a rationale semantically without
  // generating an optional/union schema that the provider may reject.
  rationale: z.string().max(240).nullable(),
});

const SYSTEM_PROMPT = `You classify research notes for an investment notebook.
Return at most one moat pattern and one business model from the allowed enums.
Use null for a dimension when the note text does not support a confident classification.
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
      output: Output.object({
        schema: tagSuggestionSchema,
      }),
      abortSignal: AbortSignal.timeout(TAG_SUGGEST_TIMEOUT_MS),
    });

    const output = result.output;
    return {
      moatPattern: output.moatPattern,
      businessModel: output.businessModel,
      ...(output.rationale ? { rationale: output.rationale } : {}),
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
