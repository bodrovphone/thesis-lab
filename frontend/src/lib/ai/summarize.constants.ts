export const NOTE_HISTORY_CHAR_BUDGET = 12_000;
export const SUMMARIZE_TIMEOUT_MS = 30_000;

export type SummarizeErrorCode =
  | 'summary_unavailable'
  | 'rate_limited'
  | 'nothing_to_summarize';

export type SummarizeSuccessResponse = {
  summary: string;
  notesOmitted: number;
};

export type SummarizeErrorResponse = {
  error: SummarizeErrorCode;
  message: string;
};

export type SummarizeResponse = SummarizeSuccessResponse | SummarizeErrorResponse;

export function isSummarizeError(
  response: SummarizeResponse,
): response is SummarizeErrorResponse {
  return 'error' in response;
}
