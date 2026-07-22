import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCompany } from '@/lib/api/backend-client';
import type { ConvictionLevel } from '@/types/company';

const CONVICTION_LABELS: Record<ConvictionLevel, string> = {
  WATCHING: 'Watching',
  BUILDING_CONVICTION: 'Building conviction',
  HIGH_CONVICTION: 'High conviction',
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) {
    notFound();
  }

  const addedDate = new Date(company.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-8">
      <Link href="/" className="text-muted w-fit text-sm hover:underline">
        ← Back to dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-semibold">{company.ticker}</h1>
        <p className="text-muted text-lg">{company.name}</p>
      </div>

      {company.enrichmentStatus === 'PARTIAL' && (
        <p className="badge-partial w-fit rounded-full px-3 py-1 text-sm">
          Partial SEC profile
        </p>
      )}

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
          <dt className="text-muted">Conviction</dt>
          <dd>{CONVICTION_LABELS[company.convictionLevel]}</dd>
        </div>
        <div>
          <dt className="text-muted">Enrichment status</dt>
          <dd>{company.enrichmentStatus}</dd>
        </div>
      </dl>

      <p className="text-muted text-sm">Added {addedDate}</p>
    </main>
  );
}
