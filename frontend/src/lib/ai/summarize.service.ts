import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { buildSummaryPrompt, capNoteHistory, type NoteForSummary } from './cap-note-history';
import {
  NOTE_HISTORY_CHAR_BUDGET,
  SUMMARIZE_TIMEOUT_MS,
  type SummarizeResponse,
} from './summarize.constants';
import { GEMINI_FLASH_MODEL_ID } from './tag-suggest.constants';

const SYSTEM_PROMPT = `You synthesize a research notebook's note history into one short "current thinking" paragraph.
Summarize only the supplied notes. Acknowledge conflicting observations rather than silently picking one side.
Never invent financial figures, prices, targets, or buy/sell/hold-style recommendations.
Write in plain prose — no bullet lists unless the notes strongly warrant it.`;

export interface SummarizeDependencies {
  generate: typeof generateText;
  hasApiKey: boolean;
  modelId?: string;
}

function unavailable(message = 'Summary unavailable — try again later.'): SummarizeResponse {
  return {
    error: 'summary_unavailable',
    message,
  };
}

export async function summarizeCompanyNotes(
  companyName: string,
  notes: NoteForSummary[],
  dependencies: SummarizeDependencies = {
    generate: generateText,
    hasApiKey: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
    modelId: GEMINI_FLASH_MODEL_ID,
  },
): Promise<SummarizeResponse> {
  if (notes.length === 0) {
    return {
      error: 'nothing_to_summarize',
      message: 'Add at least one note before generating a summary.',
    };
  }

  if (!dependencies.hasApiKey) {
    return unavailable('Summary unavailable — AI provider is not configured.');
  }

  const capped = capNoteHistory(notes, NOTE_HISTORY_CHAR_BUDGET);
  const prompt = buildSummaryPrompt(companyName, capped);

  try {
    const result = await dependencies.generate({
      model: google(dependencies.modelId ?? GEMINI_FLASH_MODEL_ID),
      system: SYSTEM_PROMPT,
      prompt,
      abortSignal: AbortSignal.timeout(SUMMARIZE_TIMEOUT_MS),
    });

    const summary = result.text.trim();
    if (!summary) {
      return unavailable();
    }

    return {
      summary,
      notesOmitted: capped.omittedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('429') || message.toLowerCase().includes('quota')) {
      return {
        error: 'rate_limited',
        message: 'Rate limit reached — try again shortly.',
      };
    }
    return unavailable();
  }
}
