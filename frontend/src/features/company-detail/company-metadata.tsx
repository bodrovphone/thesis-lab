import {
  formatMarketCapUsd,
  formatSourceLabel,
  type CompanyView,
} from '@/types/company';

export function CompanyMetadata({ company }: { company: CompanyView }) {
  const addedDate = new Date(company.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const marketCap = formatMarketCapUsd(company.marketCapUsd);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {company.sourcesUsed.map((source) => (
          <span
            key={source}
            className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
          >
            {formatSourceLabel(source)}
          </span>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Exchange</dt>
          <dd>{company.exchange ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">CIK</dt>
          <dd>{company.cik ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Industry</dt>
          <dd>{company.industry ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Country</dt>
          <dd>{company.country ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Market cap</dt>
          <dd>{marketCap ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Website</dt>
          <dd>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:underline"
              >
                {company.website}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Enrichment status</dt>
          <dd>{company.enrichmentStatus}</dd>
        </div>
      </dl>

      <p className="text-muted text-sm">Added {addedDate}</p>
    </>
  );
}
