import Link from 'next/link';
import { Badge } from '@astryxdesign/core/Badge';
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
      className="block rounded-2xl border border-black/10 bg-white/70 p-5 shadow-[0_12px_30px_rgb(34_53_47/0.05)] transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/50 hover:shadow-[0_18px_40px_rgb(34_53_47/0.1)] dark:border-white/15 dark:bg-white/[0.04]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-semibold tracking-tight">{company.ticker}</span>
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
        <Badge variant="neutral" label={CONVICTION_LABELS[company.convictionLevel]} />
        {company.enrichmentStatus !== 'COMPLETE' && (
          <Badge variant={company.enrichmentStatus === 'FAILED' ? 'error' : 'warning'} label={formatEnrichmentBadge(company.enrichmentStatus)} />
        )}
      </div>
    </Link>
  );
}
