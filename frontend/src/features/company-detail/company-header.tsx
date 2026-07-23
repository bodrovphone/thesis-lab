import type { CompanyView } from '@/types/company';

export function CompanyHeader({ company }: { company: CompanyView }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-8 dark:border-white/10"><div className="flex items-start gap-4">
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
        </div><div className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> Research record</div></div>
  );
}
