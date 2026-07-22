import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyNotebook } from '@/components/company-notebook';
import { ConvictionSelector } from '@/components/conviction-selector';
import { getCompany, getTags } from '@/lib/api/backend-client';
import {
  formatEnrichmentBadge,
  formatMarketCapUsd,
  formatSourceLabel,
} from '@/types/company';

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, taxonomy] = await Promise.all([getCompany(id), getTags()]);

  if (!company) {
    notFound();
  }

  const addedDate = new Date(company.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const marketCap = formatMarketCapUsd(company.marketCapUsd);
  const notes = company.notes ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-8">
      <Link href="/" className="text-muted w-fit text-sm hover:underline">
        ← Back to dashboard
      </Link>

      <div className="flex items-start gap-4">
        {company.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt=""
            className="h-12 w-12 rounded-md border border-black/10 object-contain dark:border-white/15"
          />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{company.ticker}</h1>
          <p className="text-muted text-lg">{company.name}</p>
        </div>
      </div>

      <ConvictionSelector
        companyId={company.id}
        value={company.convictionLevel}
        options={taxonomy.convictionLevels}
      />

      {company.enrichmentStatus !== 'COMPLETE' && (
        <p className="badge-partial w-fit rounded-full px-3 py-1 text-sm">
          {formatEnrichmentBadge(company.enrichmentStatus)}
        </p>
      )}

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

      <CompanyNotebook
        companyId={company.id}
        initialNotes={notes}
        moatPatterns={taxonomy.moatPatterns}
        businessModels={taxonomy.businessModels}
      />
    </main>
  );
}
