import type { BusinessModel, MoatPattern } from '@/types/note';

export interface NoteAiAuditPayload {
  suggestedMoatPattern: MoatPattern | null;
  suggestedBusinessModel: BusinessModel | null;
}

export type TagSuggestResponse =
  | {
      moatPattern: MoatPattern | null;
      businessModel: BusinessModel | null;
      rationale?: string;
    }
  | {
      moatPattern: null;
      businessModel: null;
      error: 'suggestion_unavailable';
    };

export function isTagSuggestUnavailable(
  response: TagSuggestResponse,
): response is Extract<TagSuggestResponse, { error: 'suggestion_unavailable' }> {
  return 'error' in response;
}
