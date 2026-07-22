import { CompanyCard } from '@/components/company-card';
import { CompanySearch } from '@/components/company-search';
import { listCompanies } from '@/lib/api/backend-client';

export default async function Home() {
  const companies = await listCompanies();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Thesis Lab</h1>
        <CompanySearch />
      </div>

      {companies.length === 0 ? (
        <p className="text-muted">No companies tracked yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </main>
  );
}
