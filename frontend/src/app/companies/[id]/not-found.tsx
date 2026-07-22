import Link from 'next/link';

export default function CompanyNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">Company not found</h1>
      <p className="text-muted">
        We couldn&apos;t find a tracked company at this address.
      </p>
      <Link href="/" className="text-sm underline">
        Return to dashboard
      </Link>
    </main>
  );
}
