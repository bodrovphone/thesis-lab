import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActivityFeed } from '@/features/company-detail/activity-feed';
import { CompanyHeader } from '@/features/company-detail/company-header';
import { CompanyMetadata } from '@/features/company-detail/company-metadata';
import { CompanyNotebook } from '@/features/company-detail/company-notebook';
import { ConvictionSelector } from '@/features/company-detail/conviction-selector';
import { CurrentThinkingPanel } from '@/features/company-detail/current-thinking-panel';
import { EnrichmentStatus } from '@/features/company-detail/enrichment-status';
import { getCompany, getTags } from '@/lib/api/backend-client';

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

  const notes = company.notes ?? [];

  return (
    <main className="research-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="text-muted w-fit text-sm hover:underline">
        ← Back to dashboard
      </Link>

      <CompanyHeader company={company} />

      <ConvictionSelector
        companyId={company.id}
        value={company.convictionLevel}
        options={taxonomy.convictionLevels}
      />

      <EnrichmentStatus companyId={company.id} status={company.enrichmentStatus} />

      <CompanyMetadata company={company} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="flex min-w-0 flex-col gap-8"><CurrentThinkingPanel companyId={company.id} noteCount={notes.length} initialSummary={company.currentThinkingSummary} initialGeneratedAt={company.summaryGeneratedAt} /><CompanyNotebook companyId={company.id} initialNotes={notes} moatPatterns={taxonomy.moatPatterns} businessModels={taxonomy.businessModels} /></div><ActivityFeed company={company} /></div>
    </main>
  );
}
