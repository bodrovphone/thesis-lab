export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-4">
        <div className="h-9 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-10 w-full max-w-xl animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="h-16 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-16 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-16 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
        <div className="h-32 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
      </div>
    </main>
  );
}
