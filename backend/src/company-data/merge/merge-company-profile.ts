import type {
  AdapterResult,
  CompanySearchCandidate,
  DataSourceName,
  MergedCompanyProfile,
  NormalizedCompanyProfile,
} from '../types/company-data.types';

const SOURCE_ORDER: DataSourceName[] = [
  'SEC_EDGAR',
  'FINNHUB',
  'ALPHA_VANTAGE',
];
const CORE_SOURCES: DataSourceName[] = ['SEC_EDGAR', 'FINNHUB'];

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

function buildSourcesUsed(
  candidate: CompanySearchCandidate,
  results: AdapterResult<NormalizedCompanyProfile>[],
  successfulSources: DataSourceName[],
): DataSourceName[] {
  return SOURCE_ORDER.filter((source) => {
    if (source === 'ALPHA_VANTAGE') {
      return successfulSources.includes('ALPHA_VANTAGE');
    }

    return (
      candidate.sources.includes(source) || successfulSources.includes(source)
    );
  });
}

export function mergeCompanyProfile(
  candidate: CompanySearchCandidate,
  results: AdapterResult<NormalizedCompanyProfile>[],
  now: Date,
): MergedCompanyProfile {
  const secProfile = pickProfile(results, 'SEC_EDGAR');
  const finnhubProfile = pickProfile(results, 'FINNHUB');
  const alphaVantageProfile = pickProfile(results, 'ALPHA_VANTAGE');
  const successfulSources = SOURCE_ORDER.filter((source) =>
    results.some(
      (result) => result.source === source && result.status === 'ok',
    ),
  );
  const coreSuccesses = CORE_SOURCES.filter((source) =>
    successfulSources.includes(source),
  );
  const optionalSuccesses = successfulSources.filter(
    (source) => source === 'ALPHA_VANTAGE',
  );

  const sourcesUsed = buildSourcesUsed(
    candidate,
    results,
    successfulSources,
  );

  const enrichmentStatus =
    coreSuccesses.length >= 2
      ? 'COMPLETE'
      : coreSuccesses.length === 1 || optionalSuccesses.length > 0
        ? 'PARTIAL'
        : 'FAILED';

  return {
    ticker: candidate.ticker.trim().toUpperCase(),
    name:
      firstString(
        finnhubProfile?.name,
        secProfile?.name,
        alphaVantageProfile?.name,
        candidate.name,
      ) ?? candidate.name,
    cik: firstString(secProfile?.cik, candidate.cik),
    exchange: firstString(
      finnhubProfile?.exchange,
      secProfile?.exchange,
      alphaVantageProfile?.exchange,
      candidate.exchange,
    ),
    sector: firstString(alphaVantageProfile?.sector),
    industry: firstString(
      alphaVantageProfile?.industry,
      finnhubProfile?.industry,
      secProfile?.industry,
    ),
    description: firstString(alphaVantageProfile?.description),
    country: firstString(finnhubProfile?.country, alphaVantageProfile?.country),
    marketCapUsd:
      finnhubProfile?.marketCapUsd ?? alphaVantageProfile?.marketCapUsd ?? null,
    website: finnhubProfile?.website ?? null,
    logoUrl: finnhubProfile?.logoUrl ?? null,
    sourcesUsed,
    enrichmentStatus,
    lastEnrichedAt: successfulSources.length > 0 ? now : null,
  };
}
