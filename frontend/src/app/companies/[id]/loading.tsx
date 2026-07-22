export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-8">
      <div className="h-4 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="h-9 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="h-5 w-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </main>
  );
}
