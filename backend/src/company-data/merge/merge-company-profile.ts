import type {
  AdapterResult,
  CompanySearchCandidate,
  DataSourceName,
  MergedCompanyProfile,
  NormalizedCompanyProfile,
} from '../types/company-data.types';

const SOURCE_ORDER: DataSourceName[] = ['SEC_EDGAR', 'FINNHUB'];

function pickProfile(
  results: AdapterResult<NormalizedCompanyProfile>[],
  source: DataSourceName,
): NormalizedCompanyProfile | null {
  const match = results.find(
    (result) => result.source === source && result.status === 'ok',
  );
  return match?.status === 'ok' ? match.data : null;
}

function firstString(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function mergeCompanyProfile(
  candidate: CompanySearchCandidate,
  results: AdapterResult<NormalizedCompanyProfile>[],
  now: Date,
): MergedCompanyProfile {
  const secProfile = pickProfile(results, 'SEC_EDGAR');
  const finnhubProfile = pickProfile(results, 'FINNHUB');
  const successfulSources = SOURCE_ORDER.filter((source) =>
    results.some(
      (result) => result.source === source && result.status === 'ok',
    ),
  );

  const sourcesUsed = SOURCE_ORDER.filter(
    (source) =>
      candidate.sources.includes(source) || successfulSources.includes(source),
  );

  const enrichmentStatus =
    successfulSources.length >= 2
      ? 'COMPLETE'
      : successfulSources.length === 1
        ? 'PARTIAL'
        : 'FAILED';

  return {
    ticker: candidate.ticker.trim().toUpperCase(),
    name:
      firstString(finnhubProfile?.name, secProfile?.name, candidate.name) ??
      candidate.name,
    cik: firstString(secProfile?.cik, candidate.cik),
    exchange: firstString(
      finnhubProfile?.exchange,
      secProfile?.exchange,
      candidate.exchange,
    ),
    industry: firstString(finnhubProfile?.industry, secProfile?.industry),
    country: finnhubProfile?.country ?? null,
    marketCapUsd: finnhubProfile?.marketCapUsd ?? null,
    website: finnhubProfile?.website ?? null,
    logoUrl: finnhubProfile?.logoUrl ?? null,
    sourcesUsed,
    enrichmentStatus,
    lastEnrichedAt: successfulSources.length > 0 ? now : null,
  };
}
