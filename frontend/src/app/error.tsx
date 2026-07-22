'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start justify-center gap-4 p-8">
      <p className="eyebrow">Connection interrupted</p>
      <h1 className="text-2xl font-semibold">The research desk needs a retry</h1>
      <p className="text-muted">We couldn&apos;t load this page. Your saved research is still safe.</p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-md border border-black/10 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        Try again
      </button>
    </main>
  );
}
