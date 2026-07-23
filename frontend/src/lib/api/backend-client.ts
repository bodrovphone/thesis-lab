import 'server-only';
import type { z } from 'zod';
import type { CompanySearchCandidate, CompanyView } from '@/types/company';
import type { NoteView, TaxonomyView } from '@/types/note';
import {
  companyViewSchema,
  listCompaniesResultSchema,
  noteViewSchema,
  searchCompaniesResponseSchema,
  taxonomyViewSchema,
} from './schemas';

export class BackendApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
  }
}

export class BackendShapeError extends Error {
  constructor(path: string, cause: z.ZodError) {
    super(`Backend response for ${path} did not match the expected shape`);
    this.name = 'BackendShapeError';
    this.cause = cause;
  }
}

async function parseBody<Schema extends z.ZodTypeAny>(
  path: string,
  response: Response,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new BackendShapeError(path, result.error);
  }
  return result.data;
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

export interface ListCompaniesFilters {
  conviction?: string;
  moatPattern?: string;
  businessModel?: string;
  limit?: number;
}

export interface ListCompaniesResult {
  items: CompanyView[];
  totalTracked: number;
}

export async function listCompanies(
  filters?: ListCompaniesFilters,
): Promise<ListCompaniesResult> {
  const params = new URLSearchParams();
  if (filters?.conviction) {
    params.set('conviction', filters.conviction);
  }
  if (filters?.moatPattern) {
    params.set('moatPattern', filters.moatPattern);
  }
  if (filters?.businessModel) {
    params.set('businessModel', filters.businessModel);
  }
  if (filters?.limit) {
    params.set('limit', String(filters.limit));
  }

  const query = params.toString();
  const path = query ? `/companies?${query}` : '/companies';
  const response = await backendFetch(path);
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, listCompaniesResultSchema);
}

export async function getCompany(id: string): Promise<CompanyView | null> {
  const path = `/companies/${encodeURIComponent(id)}`;
  const response = await backendFetch(path);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, companyViewSchema);
}

export async function searchCompanies(
  query: string,
  limit = 10,
): Promise<CompanySearchCandidate[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const path = `/companies/search-external?${params.toString()}`;
  const response = await backendFetch(path);
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  const body = await parseBody(path, response, searchCompaniesResponseSchema);
  return body.items;
}

export async function createCompany(ticker: string): Promise<CompanyView> {
  const path = '/companies';
  const response = await backendFetch(path, {
    method: 'POST',
    body: JSON.stringify({ ticker }),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, companyViewSchema);
}

export async function getTags(): Promise<TaxonomyView> {
  const path = '/tags';
  const response = await backendFetch(path);
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, taxonomyViewSchema);
}

export async function updateCompanyConviction(
  id: string,
  convictionLevel: CompanyView['convictionLevel'],
): Promise<CompanyView> {
  const path = `/companies/${encodeURIComponent(id)}`;
  const response = await backendFetch(path, {
    method: 'PATCH',
    body: JSON.stringify({ convictionLevel }),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, companyViewSchema);
}

export async function updateCompanySummary(
  id: string,
  currentThinkingSummary: string,
): Promise<CompanyView> {
  const path = `/companies/${encodeURIComponent(id)}/summary`;
  const response = await backendFetch(path, {
    method: 'PATCH',
    body: JSON.stringify({ currentThinkingSummary }),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, companyViewSchema);
}

export async function refreshCompanyEnrichment(id: string): Promise<CompanyView> {
  const path = `/companies/${encodeURIComponent(id)}/refresh-enrichment`;
  const response = await backendFetch(path, { method: 'POST' });
  if (!response.ok) await throwForFailedResponse(response);
  return parseBody(path, response, companyViewSchema);
}

export async function createNote(
  companyId: string,
  input: {
    body: string;
    moatPattern?: string;
    businessModel?: string;
    aiAudit?: {
      suggestedMoatPattern: string | null;
      suggestedBusinessModel: string | null;
    };
  },
): Promise<NoteView> {
  const path = `/companies/${encodeURIComponent(companyId)}/notes`;
  const response = await backendFetch(path, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, noteViewSchema);
}

export async function updateNote(
  noteId: string,
  input: {
    body?: string;
    moatPattern?: string | null;
    businessModel?: string | null;
    aiAudit?: {
      suggestedMoatPattern: string | null;
      suggestedBusinessModel: string | null;
    };
  },
): Promise<NoteView> {
  const path = `/notes/${encodeURIComponent(noteId)}`;
  const response = await backendFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
  return parseBody(path, response, noteViewSchema);
}

export async function deleteNote(noteId: string): Promise<void> {
  const response = await backendFetch(`/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    await throwForFailedResponse(response);
  }
}
