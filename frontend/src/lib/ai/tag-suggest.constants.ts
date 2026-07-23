export const NOTE_BODY_MAX_LENGTH = 4000;
export const TAG_SUGGEST_MIN_BODY_LENGTH = 20;
// Gemini can take longer than ten seconds on a cold or busy request. Keep the
// tag call bounded, but use the same practical ceiling as note summaries.
export const TAG_SUGGEST_TIMEOUT_MS = 30_000;
export const GEMINI_FLASH_MODEL_ID = 'gemini-2.5-flash';

export const MOAT_PATTERN_VALUES = [
  'SCALE_ECONOMIES',
  'NETWORK_EFFECTS',
  'SWITCHING_COSTS',
  'COUNTER_POSITIONING',
  'BRAND',
  'CORNERED_RESOURCE',
  'PROCESS_POWER',
] as const;

export const BUSINESS_MODEL_VALUES = [
  'LOW_COST_OPERATOR',
  'FRANCHISOR',
  'B2B_MIDDLEMAN',
  'SERIAL_ACQUIRER',
  'MISSION_CRITICAL_PRODUCTS_SERVICES',
  'VERTICALLY_INTEGRATED_RETAILER',
  'AUCTIONS_AND_CLASSIFIEDS',
  'B2B_SOFTWARE',
  'MARKETPLACES_AND_PLATFORMS',
  'OEMS_WITH_INSTALLED_BASE',
  'UNIQUE_IP_OR_BRANDS',
  'PHYSICAL_INFRASTRUCTURE_NETWORKS',
  'INSURERS_AND_FINANCIALS',
] as const;

export type TagSuggestSuccessResponse = {
  moatPattern: (typeof MOAT_PATTERN_VALUES)[number] | null;
  businessModel: (typeof BUSINESS_MODEL_VALUES)[number] | null;
  rationale?: string;
};

export type TagSuggestUnavailableResponse = {
  moatPattern: null;
  businessModel: null;
  error: 'suggestion_unavailable';
};

export type TagSuggestResponse =
  | TagSuggestSuccessResponse
  | TagSuggestUnavailableResponse;

export function normalizeTagSuggestInput(
  noteText: unknown,
):
  | { ok: true; noteText: string }
  | { ok: false; status: 400; message: string } {
  if (typeof noteText !== 'string') {
    return { ok: false, status: 400, message: 'noteText is required' };
  }

  const trimmed = noteText.trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: 'noteText is required' };
  }

  if (trimmed.length > NOTE_BODY_MAX_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `noteText must be at most ${NOTE_BODY_MAX_LENGTH} characters`,
    };
  }

  return { ok: true, noteText: trimmed };
}

export function isTagSuggestBodyReady(noteText: string): boolean {
  return noteText.trim().length >= TAG_SUGGEST_MIN_BODY_LENGTH;
}

export function unavailableTagSuggestResponse(): TagSuggestUnavailableResponse {
  return {
    moatPattern: null,
    businessModel: null,
    error: 'suggestion_unavailable',
  };
}
