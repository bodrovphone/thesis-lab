import { relativeTime } from '@/lib/format/datetime';
import type { CompanyView } from '@/types/company';
import type { NoteView } from '@/types/note';

export function ActivityFeed({ company }: { company: CompanyView }) {
  const notes = company.notes ?? [];
  const events = [
    { id: 'company', label: `Started tracking ${company.ticker}`, date: company.createdAt, tone: 'teal' },
    ...notes.slice(0, 4).map((note: NoteView) => ({
      id: note.id,
      label: note.updatedAt !== note.createdAt ? 'Updated a research note' : 'Added a research note',
      date: note.updatedAt ?? note.createdAt,
      tone: 'ink',
    })),
    ...(company.summaryGeneratedAt ? [{ id: 'summary', label: 'Regenerated current thinking', date: company.summaryGeneratedAt, tone: 'gold' }] : []),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()).slice(0, 5);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/60 p-5 shadow-[0_16px_40px_rgb(34_53_47/0.06)] dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-5 flex items-end justify-between gap-3"><div><p className="eyebrow">Research trail</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Recent activity</h2></div><span className="text-muted text-xs">{events.length} signals</span></div>
      <ol className="space-y-4">
        {events.map((event) => <li key={event.id} className="flex gap-3"><span className={`activity-dot-${event.tone} mt-1.5 h-2 w-2 shrink-0 rounded-full`} aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{event.label}</p><time className="text-muted text-xs" dateTime={event.date}>{relativeTime(event.date)}</time></div></li>)}
      </ol>
    </section>
  );
}
