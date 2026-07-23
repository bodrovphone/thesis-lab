import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConvictionLevel } from '@/types/company';
import { ConvictionSelector } from './conviction-selector';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
    push: vi.fn(),
  }),
}));

function renderWithQuery(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const options = [
  { value: 'WATCHING', label: 'Watching' },
  { value: 'BUILDING_CONVICTION', label: 'Building conviction' },
  { value: 'HIGH_CONVICTION', label: 'High conviction' },
];

describe('ConvictionSelector', () => {
  afterEach(() => {
    cleanup();
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it('optimistically updates conviction and refreshes on success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'c1', convictionLevel: 'HIGH_CONVICTION' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(
      <ConvictionSelector
        companyId="c1"
        value={'WATCHING' satisfies ConvictionLevel}
        options={options}
      />,
    );

    const select = screen.getByLabelText('Conviction');
    expect(select).toHaveValue('WATCHING');

    await user.selectOptions(select, 'HIGH_CONVICTION');

    expect(select).toHaveValue('HIGH_CONVICTION');
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/companies/c1',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('rolls back and shows an error when the mutation fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Could not update conviction' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQuery(
      <ConvictionSelector
        companyId="c1"
        value={'WATCHING' satisfies ConvictionLevel}
        options={options}
      />,
    );

    const select = screen.getByLabelText('Conviction');
    await user.selectOptions(select, 'HIGH_CONVICTION');

    expect(
      await screen.findByText('Could not update conviction'),
    ).toBeInTheDocument();
    expect(select).toHaveValue('WATCHING');
    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
