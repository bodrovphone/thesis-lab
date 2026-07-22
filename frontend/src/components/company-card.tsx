import Link from 'next/link';
import {
  formatEnrichmentBadge,
  formatMarketCapUsd,
  type CompanyView,
} from '@/types/company';

const CONVICTION_LABELS: Record<CompanyView['convictionLevel'], string> = {
  WATCHING: 'Watching',
  BUILDING_CONVICTION: 'Building conviction',
  HIGH_CONVICTION: 'High conviction',
};

export function CompanyCard({ company }: { company: CompanyView }) {
  const marketCap = formatMarketCapUsd(company.marketCapUsd);

  return (
    <Link
      href={`/companies/${company.id}`}
      className="block rounded-lg border border-black/10 p-4 transition-colors hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold">{company.ticker}</span>
        {company.exchange && (
          <span className="text-muted text-sm">{company.exchange}</span>
        )}
      </div>
      <p className="text-muted mt-1 text-sm">{company.name}</p>
      {(company.country || marketCap) && (
        <p className="text-muted mt-1 text-xs">
          {[company.country, marketCap].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
          {CONVICTION_LABELS[company.convictionLevel]}
        </span>
        {company.enrichmentStatus !== 'COMPLETE' && (
          <span className="badge-partial rounded-full px-2 py-0.5">
            {formatEnrichmentBadge(company.enrichmentStatus)}
          </span>
        )}
      </div>
    </Link>
  );
}
