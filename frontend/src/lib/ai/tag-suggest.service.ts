import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import {
  BUSINESS_MODEL_VALUES,
  GEMINI_FLASH_MODEL_ID,
  MOAT_PATTERN_VALUES,
  TAG_SUGGEST_TIMEOUT_MS,
  type TagSuggestResponse,
  unavailableTagSuggestResponse,
} from './tag-suggest.constants';

type ParsedTagSuggestion = {
  moatPattern: string;
  businessModel: string;
  rationale: string;
};

function parseTagSuggestion(text: string): ParsedTagSuggestion {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Tag suggestion did not contain a JSON object');
  }

  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Tag suggestion JSON was not an object');
  }

  const value = parsed as Record<string, unknown>;
  return {
    moatPattern:
      typeof value.moatPattern === 'string' ? value.moatPattern : '',
    businessModel:
      typeof value.businessModel === 'string' ? value.businessModel : '',
    rationale: typeof value.rationale === 'string' ? value.rationale : '',
  };
}

function normalizeAllowedValue<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  const normalized = value?.trim() ?? '';
  const canonical = normalized
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const directMatch = allowed.find(
    (candidate) =>
      candidate.toLowerCase().replace(/_/g, ' ') === canonical,
  );
  if (directMatch) {
    return directMatch;
  }

  // Gemini may use a natural-language category that is not part of the
  // product taxonomy. Map the closest supported business-model category.
  if (
    allowed.includes('INSURERS_AND_FINANCIALS' as T) &&
    ['fintech', 'fintech company', 'financial services', 'payments company'].includes(
      canonical,
    )
  ) {
    return 'INSURERS_AND_FINANCIALS' as T;
  }

  return null;
}

const SYSTEM_PROMPT = `You classify research notes for an investment notebook.
Return at most one moat pattern and one business model from the allowed enums.
Use an empty string for a dimension when the note text does not support a confident classification.
Use an empty string when no rationale is useful.
Return only a JSON object with exactly these string fields: moatPattern, businessModel, rationale.
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
      abortSignal: AbortSignal.timeout(TAG_SUGGEST_TIMEOUT_MS),
    });

    const output = parseTagSuggestion(result.text);
    // Safe diagnostic: record only the model's classification fields, never
    // the note text, prompt, rationale, or credentials.
    console.info('[tag-suggest] Gemini response fields', {
      moatPattern: output.moatPattern,
      businessModel: output.businessModel,
    });
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
      ...(output.rationale?.trim()
        ? { rationale: output.rationale.trim() }
        : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const category =
      message.includes('json object') || message.includes('json')
        ? 'response_parse'
        : message.includes('429') || message.includes('quota')
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
