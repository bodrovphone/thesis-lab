import 'server-only';
import type { CompanySearchCandidate, CompanyView } from '@/types/company';
import type { NoteView, TaxonomyView } from '@/types/note';

export class BackendApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
  }
}

const FORWARDABLE_STATUSES = new Set([400, 404, 409, 503]);

export function isForwardableBackendStatus(status: number): boolean {
  return FORWARDABLE_STATUSES.has(status);
}

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error('BACKEND_URL is not configured');
  }
  return url;
}

async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${getBackendUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

async function readSafeErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    // Fall through to the generic message below.
  }
  return 'Backend request failed';
}

async function throwForFailedResponse(response: Response): Promise<never> {
  throw new BackendApiError(response.status, await readSafeErrorMessage(response));
}

export async function listCompanies(): Promise<CompanyView[]> {
  const response = await backendFetch('/companies');
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  const body = (await response.json()) as { items: CompanyView[] };
  return body.items;
}

export async function getCompany(id: string): Promise<CompanyView | null> {
  const response = await backendFetch(`/companies/${encodeURIComponent(id)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return (await response.json()) as CompanyView;
}

export async function searchCompanies(
  query: string,
  limit = 10,
): Promise<CompanySearchCandidate[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await backendFetch(`/companies/search-external?${params.toString()}`);
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  const body = (await response.json()) as { items: CompanySearchCandidate[] };
  return body.items;
}

export async function createCompany(ticker: string): Promise<CompanyView> {
  const response = await backendFetch('/companies', {
    method: 'POST',
    body: JSON.stringify({ ticker }),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return (await response.json()) as CompanyView;
}

export async function getTags(): Promise<TaxonomyView> {
  const response = await backendFetch('/tags');
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return (await response.json()) as TaxonomyView;
}

export async function updateCompanyConviction(
  id: string,
  convictionLevel: CompanyView['convictionLevel'],
): Promise<CompanyView> {
  const response = await backendFetch(`/companies/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ convictionLevel }),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return (await response.json()) as CompanyView;
}

export async function createNote(
  companyId: string,
  input: {
    body: string;
    moatPattern?: string;
    businessModel?: string;
  },
): Promise<NoteView> {
  const response = await backendFetch(
    `/companies/${encodeURIComponent(companyId)}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return (await response.json()) as NoteView;
}

export async function updateNote(
  noteId: string,
  input: {
    body?: string;
    moatPattern?: string | null;
    businessModel?: string | null;
  },
): Promise<NoteView> {
  const response = await backendFetch(`/notes/${encodeURIComponent(noteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return (await response.json()) as NoteView;
}

export async function deleteNote(noteId: string): Promise<void> {
  const response = await backendFetch(`/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
}
