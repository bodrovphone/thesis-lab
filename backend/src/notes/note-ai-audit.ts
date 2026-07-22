import type { BusinessModel, MoatPattern } from '../../generated/prisma/client';

export interface NoteAiAuditInput {
  suggestedMoatPattern?: MoatPattern | null;
  suggestedBusinessModel?: BusinessModel | null;
}

export interface ResolvedNoteAiAudit {
  aiSuggestedMoatPattern: MoatPattern | null;
  aiSuggestedBusinessModel: BusinessModel | null;
  tagEditedByUser: boolean | null;
}

export function resolveNoteAiAudit(
  savedMoatPattern: MoatPattern | null,
  savedBusinessModel: BusinessModel | null,
  aiAudit?: NoteAiAuditInput,
): ResolvedNoteAiAudit {
  if (aiAudit === undefined) {
    return {
      aiSuggestedMoatPattern: null,
      aiSuggestedBusinessModel: null,
      tagEditedByUser: null,
    };
  }

  const aiSuggestedMoatPattern = aiAudit.suggestedMoatPattern ?? null;
  const aiSuggestedBusinessModel = aiAudit.suggestedBusinessModel ?? null;
  const moatMatches = savedMoatPattern === aiSuggestedMoatPattern;
  const businessMatches = savedBusinessModel === aiSuggestedBusinessModel;

  return {
    aiSuggestedMoatPattern,
    aiSuggestedBusinessModel,
    tagEditedByUser: !(moatMatches && businessMatches),
  };
}
