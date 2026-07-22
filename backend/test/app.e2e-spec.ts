import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
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

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function mockSecFetchSuccess() {
  global.fetch = jest.fn((input: string | URL) => {
    const url = String(input);
    if (url.includes('company_tickers_exchange.json')) {
      return jsonResponse(SEC_TICKER_DATASET_FIXTURE);
    }
    const cikMatch = /CIK(\d{10})\.json/.exec(url);
    if (cikMatch) {
      const fixture = SEC_SUBMISSIONS_FIXTURES[cikMatch[1]];
      if (fixture) {
        return jsonResponse(fixture);
      }
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

function mockSecDirectoryFailure() {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
}

function mockSecSubmissionsTimeout() {
  global.fetch = jest.fn((input: string | URL) => {
    const url = String(input);
    if (url.includes('company_tickers_exchange.json')) {
      return jsonResponse(SEC_TICKER_DATASET_FIXTURE);
    }
    return Promise.reject(
      new DOMException('The operation timed out', 'TimeoutError'),
    );
  });
}

describe('Companies (e2e)', () => {
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
    global.fetch = originalFetch;
    await prisma.company.deleteMany({
      where: { ticker: { in: ['AAPL', 'MSFT'] } },
    });
    await prisma.externalApiCacheEntry.deleteMany({
      where: { source: 'SEC_EDGAR', cacheKey: 'company_tickers_exchange:v1' },
    });
  });

  it('supports the full search -> create -> list -> get -> duplicate -> missing flow', async () => {
    mockSecFetchSuccess();

    const searchResponse = await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'apple' })
      .expect(200);

    expect(searchResponse.body).toEqual({
      items: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          cik: '0000320193',
          exchange: 'Nasdaq',
          source: 'SEC_EDGAR',
        },
      ],
    });

    const createResponse = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'AAPL' })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      ticker: 'AAPL',
      name: 'Apple Inc.',
      cik: '0000320193',
      exchange: 'Nasdaq',
      industry: 'Electronic Computers',
      enrichmentStatus: 'COMPLETE',
      sourcesUsed: ['SEC_EDGAR'],
    });
    const companyId = createResponse.body.id as string;
    expect(typeof companyId).toBe('string');

    const listResponse = await request(app.getHttpServer())
      .get('/companies')
      .expect(200);

    expect(listResponse.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ ticker: 'AAPL' })]),
    );

    const getResponse = await request(app.getHttpServer())
      .get(`/companies/${companyId}`)
      .expect(200);

    expect(getResponse.body).toEqual(createResponse.body);

    await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'AAPL' })
      .expect(409);

    await request(app.getHttpServer()).get('/companies/missing-id').expect(404);
  });

  it('persists a PARTIAL company and still returns 201 when the submissions profile times out', async () => {
    mockSecSubmissionsTimeout();

    const response = await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'MSFT' })
      .expect(201);

    expect(response.body).toMatchObject({
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      enrichmentStatus: 'PARTIAL',
      lastEnrichedAt: null,
      sourcesUsed: ['SEC_EDGAR'],
    });
  });

  it('returns 503 for search when the SEC directory is unavailable and there is no cache', async () => {
    mockSecDirectoryFailure();

    await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'apple' })
      .expect(503);
  });

  it('returns 400 when the search query is too short', async () => {
    mockSecFetchSuccess();

    await request(app.getHttpServer())
      .get('/companies/search-external')
      .query({ q: 'a' })
      .expect(400);
  });

  it('returns 404 when creating a ticker absent from the SEC directory', async () => {
    mockSecFetchSuccess();

    await request(app.getHttpServer())
      .post('/companies')
      .send({ ticker: 'ZZZZZZ' })
      .expect(404);
  });
});
