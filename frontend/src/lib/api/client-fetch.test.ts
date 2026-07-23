import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientApiError, clientFetch, getErrorMessage } from './client-fetch';

describe('clientFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns JSON on success and sets Content-Type for JSON bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'c1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await clientFetch<{ id: string }>('/api/companies', {
      method: 'POST',
      body: JSON.stringify({ ticker: 'AAPL' }),
    });

    expect(result).toEqual({ id: 'c1' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Content-Type')).toBe(
      'application/json',
    );
  });

  it('throws ClientApiError with the API message on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Already tracked' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(clientFetch('/api/companies')).rejects.toMatchObject({
      name: 'ClientApiError',
      status: 409,
      message: 'Already tracked',
    } satisfies Partial<ClientApiError>);
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(
      clientFetch<void>('/api/notes/n1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });
});

describe('getErrorMessage', () => {
  it('reads Error.message and falls back otherwise', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(getErrorMessage('not-an-error', 'fallback')).toBe('fallback');
  });
});
