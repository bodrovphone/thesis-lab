import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { FinnhubSearchCacheService } from '../src/company-data/finnhub/finnhub-search-cache.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with the success body', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  it('GET /health returns 503 when the database is unavailable', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
      })
      .compile();

    const unavailableApp = moduleFixture.createNestApplication();
    await unavailableApp.init();

    await request(unavailableApp.getHttpServer()).get('/health').expect(503);

    await unavailableApp.close();
  });
});

const SEC_TICKER_DATASET_FIXTURE = {
  fields: ['cik', 'name', 'ticker', 'exchange'],
  data: [
    [320193, 'Apple Inc.', 'AAPL', 'Nasdaq'],
    [789019, 'Microsoft Corporation', 'MSFT', 'Nasdaq'],
  ],
};

const SEC_SUBMISSIONS_FIXTURES: Record<string, unknown> = {
  '0000320193': {
    cik: '0000320193',
    name: 'Apple Inc.',
    tickers: ['AAPL'],
    exchanges: ['Nasdaq'],
    sic: '3571',
    sicDescription: 'Electronic Computers',
  },
  '0000789019': {
    cik: '0000789019',
    name: 'Microsoft Corporation',
    tickers: ['MSFT'],
    exchanges: ['Nasdaq'],
    sic: '7372',
    sicDescription: 'Prepackaged Software',
  },
};

const FINNHUB_SEARCH_FIXTURE = {
  count: 1,
  result: [
    {
      description: 'Apple Inc',
      displaySymbol: 'AAPL',
      symbol: 'AAPL',
      type: 'Common Stock',
    },
  ],
};

const FINNHUB_PROFILE_FIXTURES: Record<string, unknown> = {
  AAPL: {
    name: 'Apple Inc',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    finnhubIndustry: 'Technology',
    country: 'US',
    currency: 'USD',
    marketCapitalization: 3000000,
    weburl: 'https://apple.com',
    logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png',
  },
  FOO: {
    name: 'Foo Corp',
    ticker: 'FOO',
    exchange: 'NASDAQ',
    finnhubIndustry: 'Retail',
    country: 'US',
    currency: 'USD',
    marketCapitalization: 1.5,
    weburl: 'https://foo.example',
    logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/FOO.png',
  },
};

const ALPHA_VANTAGE_OVERVIEW_FIXTURES: Record<string, unknown> = {
  AAPL: {
    Symbol: 'AAPL',
    Name: 'Apple Inc',
    Description:
      'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    Exchange: 'NASDAQ',
    Country: 'USA',
    Sector: 'TECHNOLOGY',
    Industry: 'CONSUMER ELECTRONICS',
    MarketCapitalization: '3000000000000',
  },
};

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function mockDualSourceFetch(options?: {
  secDirectoryOk?: boolean;
  secSubmissionsOk?: boolean;
  finnhubSearchOk?: boolean;
  finnhubProfileOk?: boolean;
  finnhubOnlySearch?: boolean;
  alphaVantageOverviewOk?: boolean;
}) {
  const {
    secDirectoryOk = true,
    secSubmissionsOk = true,
    finnhubSearchOk = true,
    finnhubProfileOk = true,
    finnhubOnlySearch = false,
    alphaVantageOverviewOk = false,
  } = options ?? {};

  global.fetch = jest.fn((input: string | URL) => {
    const url = String(input);

    if (url.includes('company_tickers_exchange.json')) {
      return secDirectoryOk
        ? jsonResponse(SEC_TICKER_DATASET_FIXTURE)
        : Promise.resolve({ ok: false, status: 503 });
    }

    const cikMatch = /CIK(\d{10})\.json/.exec(url);
    if (cikMatch) {
      if (!secSubmissionsOk) {
        return Promise.reject(
          new DOMException('The operation timed out', 'TimeoutError'),
        );
      }
      const fixture = SEC_SUBMISSIONS_FIXTURES[cikMatch[1]];
      if (fixture) {
        return jsonResponse(fixture);
      }
    }

    if (url.includes('finnhub.io/api/v1/search')) {
      if (!finnhubSearchOk) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      if (finnhubOnlySearch) {
        return jsonResponse({
          count: 1,
          result: [
            {
              description: 'Foo Corp',
              displaySymbol: 'FOO',
              symbol: 'FOO',
              type: 'Common Stock',
            },
          ],
        });
      }
      return jsonResponse(FINNHUB_SEARCH_FIXTURE);
    }

    if (url.includes('finnhub.io/api/v1/stock/profile2')) {
      if (!finnhubProfileOk) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      const symbolMatch = /symbol=([^&]+)/.exec(url);
      const symbol = symbolMatch ? decodeURIComponent(symbolMatch[1]) : '';
      const fixture = FINNHUB_PROFILE_FIXTURES[symbol];
      return fixture ? jsonResponse(fixture) : jsonResponse({});
    }

    if (url.includes('alphavantage.co/query')) {
      if (!alphaVantageOverviewOk) {
        return jsonResponse({});
      }
      const symbolMatch = /symbol=([^&]+)/.exec(url);
      const symbol = symbolMatch ? decodeURIComponent(symbolMatch[1]) : '';
      const fixture = ALPHA_VANTAGE_OVERVIEW_FIXTURES[symbol];
      return fixture ? jsonResponse(fixture) : jsonResponse({});
    }

    return Promise.resolve({ ok: false, status: 404 });
  });
}

function mockSecDirectoryFailure() {
  mockDualSourceFetch({ secDirectoryOk: false, finnhubSearchOk: false });
}

function mockSecPartialProfile() {
  mockDualSourceFetch({ finnhubSearchOk: false, finnhubProfileOk: false });
}

describe('Companies (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let finnhubSearchCache: FinnhubSearchCacheService;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    finnhubSearchCache = app.get(FinnhubSearchCacheService);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });

  beforeEach(async () => {
    global.fetch = originalFetch;
    finnhubSearchCache.clear();
    await prisma.company.deleteMany({
      where: { ticker: { in: ['AAPL', 'MSFT', 'FOO'] } },
    });
    await prisma.externalApiCacheEntry.deleteMany({
      where: { source: 'SEC_EDGAR', cacheKey: 'company_tickers_exchange:v1' },
    });
  });

  it('supports the full dual-source search -> create -> list -> get -> duplicate -> missing flow', async () => {
    mockDualSourceFetch();

    const searchResponse = await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'apple' })
      .expect(200);

    expect(searchResponse.body).toEqual({
      items: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc',
          cik: '0000320193',
          exchange: 'Nasdaq',
          sources: ['SEC_EDGAR', 'FINNHUB'],
        },
      ],
    });

    const createResponse = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'AAPL' })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc',
      cik: '0000320193',
      exchange: 'NASDAQ',
      industry: 'Technology',
      country: 'US',
      website: 'https://apple.com',
      logoUrl: FINNHUB_PROFILE_FIXTURES.AAPL.logo,
      marketCapUsd: '3000000000000',
      enrichmentStatus: 'COMPLETE',
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
    });
    const companyId = createResponse.body.id as string;

    const listResponse = await request(app.getHttpServer())
      .get('/companies')
      .expect(200);

    expect(listResponse.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ ticker: 'AAPL' })]),
    );

    const getResponse = await request(app.getHttpServer())
      .get(`/companies/${companyId}`)
      .expect(200);

    expect(getResponse.body).toEqual({
      ...createResponse.body,
      notes: [],
    });

    await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'AAPL' })
      .expect(409);

    await request(app.getHttpServer()).get('/companies/missing-id').expect(404);
  });

  it('persists a PARTIAL company and still returns 201 when only the SEC profile succeeds', async () => {
    mockSecPartialProfile();

    const response = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'MSFT' })
      .expect(201);

    expect(response.body).toMatchObject({
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      enrichmentStatus: 'PARTIAL',
      sourcesUsed: ['SEC_EDGAR'],
    });
    expect(response.body.lastEnrichedAt).toEqual(expect.any(String));
  });

  it('returns SEC candidates when Finnhub search fails', async () => {
    mockDualSourceFetch({ finnhubSearchOk: false });

    const response = await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'apple' })
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({
        ticker: 'AAPL',
        sources: ['SEC_EDGAR'],
      }),
    ]);
  });

  it('returns Finnhub candidates when SEC search fails', async () => {
    mockDualSourceFetch({ secDirectoryOk: false, finnhubOnlySearch: true });

    const response = await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'foo' })
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({
        ticker: 'FOO',
        sources: ['FINNHUB'],
      }),
    ]);
  });

  it('returns 503 for search when both sources fail', async () => {
    mockSecDirectoryFailure();

    await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'apple' })
      .expect(503);
  });

  it('returns 400 when the search query is too short', async () => {
    mockDualSourceFetch();

    await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'a' })
      .expect(400);
  });

  it('returns 404 when creating a ticker absent from all sources', async () => {
    mockDualSourceFetch();

    await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'ZZZZZZ' })
      .expect(404);
  });

  it('creates a Finnhub-only company with null CIK when Finnhub profile succeeds', async () => {
    mockDualSourceFetch({ secDirectoryOk: false, finnhubOnlySearch: true });

    await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'foo' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'FOO' })
      .expect(201);

    expect(response.body).toMatchObject({
      ticker: 'FOO',
      name: 'Foo Corp',
      cik: null,
      enrichmentStatus: 'PARTIAL',
      sourcesUsed: ['FINNHUB'],
      country: 'US',
    });
  });

  it('creates a FAILED minimal company when both profiles fail after resolution', async () => {
    mockDualSourceFetch({ secSubmissionsOk: false, finnhubProfileOk: false });

    const response = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'AAPL' })
      .expect(201);

    expect(response.body).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc',
      enrichmentStatus: 'FAILED',
      lastEnrichedAt: null,
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB'],
    });
  });

  it('merges Alpha Vantage overview fields without changing search or core enrichment status', async () => {
    mockDualSourceFetch({ alphaVantageOverviewOk: true });

    const searchResponse = await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'apple' })
      .expect(200);

    expect(searchResponse.body.items).toEqual([
      {
        ticker: 'AAPL',
        name: 'Apple Inc',
        cik: '0000320193',
        exchange: 'Nasdaq',
        sources: ['SEC_EDGAR', 'FINNHUB'],
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'AAPL' })
      .expect(201);

    expect(response.body).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc',
      sector: 'TECHNOLOGY',
      industry: 'CONSUMER ELECTRONICS',
      description:
        'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      country: 'US',
      website: 'https://apple.com',
      marketCapUsd: '3000000000000',
      enrichmentStatus: 'COMPLETE',
      sourcesUsed: ['SEC_EDGAR', 'FINNHUB', 'ALPHA_VANTAGE'],
    });
  });
});

describe('Notes and taxonomy (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });

  beforeEach(async () => {
    await prisma.note.deleteMany({});
    await prisma.company.deleteMany({
      where: { ticker: { in: ['NOTE1'] } },
    });
  });

  it('exposes taxonomy labels from GET /tags', async () => {
    const response = await request(app.getHttpServer()).get('/tags').expect(200);

    expect(response.body.moatPatterns).toEqual(
      expect.arrayContaining([
        { value: 'NETWORK_EFFECTS', label: 'Network effects' },
      ]),
    );
    expect(response.body.businessModels).toEqual(
      expect.arrayContaining([
        { value: 'B2B_SOFTWARE', label: 'B2B software' },
      ]),
    );
    expect(response.body.convictionLevels).toEqual(
      expect.arrayContaining([
        { value: 'WATCHING', label: 'Watching' },
      ]),
    );
  });

  it('supports note CRUD and conviction updates for a company', async () => {
    const company = await prisma.company.create({
      data: {
        ticker: 'NOTE1',
        name: 'Notes Test Co',
      },
    });

    const createNoteResponse = await request(app.getHttpServer())
      .post(`/companies/${company.id}/notes`)
      .send({
        body: '  First observation  ',
        moatPattern: 'NETWORK_EFFECTS',
        businessModel: 'B2B_SOFTWARE',
      })
      .expect(201);

    expect(createNoteResponse.body).toMatchObject({
      companyId: company.id,
      body: 'First observation',
      moatPattern: 'NETWORK_EFFECTS',
      businessModel: 'B2B_SOFTWARE',
    });
    const noteId = createNoteResponse.body.id as string;

    const listNotesResponse = await request(app.getHttpServer())
      .get(`/companies/${company.id}/notes`)
      .expect(200);

    expect(listNotesResponse.body.items).toHaveLength(1);

    const getCompanyResponse = await request(app.getHttpServer())
      .get(`/companies/${company.id}`)
      .expect(200);

    expect(getCompanyResponse.body.notes).toHaveLength(1);

    const updateNoteResponse = await request(app.getHttpServer())
      .patch(`/notes/${noteId}`)
      .send({
        body: 'Updated observation',
        moatPattern: null,
      })
      .expect(200);

    expect(updateNoteResponse.body).toMatchObject({
      body: 'Updated observation',
      moatPattern: null,
      businessModel: 'B2B_SOFTWARE',
    });

    await request(app.getHttpServer())
      .patch(`/companies/${company.id}`)
      .send({ convictionLevel: 'HIGH_CONVICTION' })
      .expect(200)
      .expect((response) => {
        expect(response.body.convictionLevel).toBe('HIGH_CONVICTION');
      });

    await request(app.getHttpServer()).delete(`/notes/${noteId}`).expect(204);

    const afterDelete = await request(app.getHttpServer())
      .get(`/companies/${company.id}/notes`)
      .expect(200);

    expect(afterDelete.body.items).toEqual([]);
  });

  it('rejects empty note bodies and invalid enum values', async () => {
    const company = await prisma.company.create({
      data: {
        ticker: 'NOTE1',
        name: 'Notes Test Co',
      },
    });

    await request(app.getHttpServer())
      .post(`/companies/${company.id}/notes`)
      .send({ body: '   ' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/companies/${company.id}/notes`)
      .send({ body: 'Valid', moatPattern: 'NOT_A_MOAT' })
      .expect(400);
  });

  it('persists AI audit metadata when aiAudit is supplied on create', async () => {
    const company = await prisma.company.create({
      data: {
        ticker: 'NOTE1',
        name: 'Notes Test Co',
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/companies/${company.id}/notes`)
      .send({
        body: 'Strong network effects on the platform',
        moatPattern: 'NETWORK_EFFECTS',
        businessModel: 'MARKETPLACES_AND_PLATFORMS',
        aiAudit: {
          suggestedMoatPattern: 'NETWORK_EFFECTS',
          suggestedBusinessModel: 'B2B_SOFTWARE',
        },
      })
      .expect(201);

    expect(response.body).toMatchObject({
      moatPattern: 'NETWORK_EFFECTS',
      businessModel: 'MARKETPLACES_AND_PLATFORMS',
    });

    const stored = await prisma.note.findUnique({
      where: { id: response.body.id as string },
    });

    expect(stored).toMatchObject({
      aiSuggestedMoatPattern: 'NETWORK_EFFECTS',
      aiSuggestedBusinessModel: 'B2B_SOFTWARE',
      tagEditedByUser: true,
    });
  });
});
