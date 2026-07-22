import { CompanyDataAggregatorService } from './company-data-aggregator.service';
import type { CompanySearchCandidate } from './types/company-data.types';

describe('CompanyDataAggregatorService', () => {
  function makeAdapter() {
    return {
      search: jest.fn(),
      resolveTicker: jest.fn(),
      fetchProfile: jest.fn(),
    };
  }

  it('delegates searchCandidates to the SEC EDGAR adapter search()', async () => {
    const adapter = makeAdapter();
    const candidates: CompanySearchCandidate[] = [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193',
        exchange: 'Nasdaq',
        source: 'SEC_EDGAR',
      },
    ];
    adapter.search.mockResolvedValue(candidates);
    const aggregator = new CompanyDataAggregatorService(adapter as never);

    await expect(aggregator.searchCandidates('apple', 5)).resolves.toEqual(
      candidates,
    );
    expect(adapter.search).toHaveBeenCalledWith('apple', 5);
  });

  it('delegates resolveCandidate to the SEC EDGAR adapter resolveTicker()', async () => {
    const adapter = makeAdapter();
    adapter.resolveTicker.mockResolvedValue(null);
    const aggregator = new CompanyDataAggregatorService(adapter as never);

    await expect(aggregator.resolveCandidate('AAPL')).resolves.toBeNull();
    expect(adapter.resolveTicker).toHaveBeenCalledWith('AAPL');
  });

  it('delegates fetchProfile to the SEC EDGAR adapter', async () => {
    const adapter = makeAdapter();
    const candidate: CompanySearchCandidate = {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      source: 'SEC_EDGAR',
    };
    adapter.fetchProfile.mockResolvedValue({
      source: 'SEC_EDGAR',
      status: 'ok',
      data: {},
    });
    const aggregator = new CompanyDataAggregatorService(adapter as never);

    await aggregator.fetchProfile(candidate);
    expect(adapter.fetchProfile).toHaveBeenCalledWith(candidate);
  });
});
