import { z } from 'zod';

const convictionLevelSchema = z.enum([
  'WATCHING',
  'BUILDING_CONVICTION',
  'HIGH_CONVICTION',
]);

const enrichmentStatusSchema = z.enum(['COMPLETE', 'PARTIAL', 'FAILED']);

const dataSourceNameSchema = z.enum(['SEC_EDGAR', 'FINNHUB', 'ALPHA_VANTAGE']);

const moatPatternSchema = z.enum([
  'SCALE_ECONOMIES',
  'NETWORK_EFFECTS',
  'SWITCHING_COSTS',
  'COUNTER_POSITIONING',
  'BRAND',
  'CORNERED_RESOURCE',
  'PROCESS_POWER',
]);

const businessModelSchema = z.enum([
  'LOW_COST_OPERATOR',
  'FRANCHISOR',
  'B2B_MIDDLEMAN',
  'SERIAL_ACQUIRER',
  'MISSION_CRITICAL_PRODUCTS_SERVICES',
  'VERTICALLY_INTEGRATED_RETAILER',
  'AUCTIONS_AND_CLASSIFIEDS',
  'B2B_SOFTWARE',
  'MARKETPLACES_AND_PLATFORMS',
  'OEMS_WITH_INSTALLED_BASE',
  'UNIQUE_IP_OR_BRANDS',
  'PHYSICAL_INFRASTRUCTURE_NETWORKS',
  'INSURERS_AND_FINANCIALS',
]);

export const noteViewSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  body: z.string(),
  moatPattern: moatPatternSchema.nullable(),
  businessModel: businessModelSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const companyViewSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  cik: z.string().nullable(),
  exchange: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  description: z.string().nullable(),
  country: z.string().nullable(),
  marketCapUsd: z.string().nullable(),
  website: z.string().nullable(),
  logoUrl: z.string().nullable(),
  convictionLevel: convictionLevelSchema,
  sourcesUsed: z.array(dataSourceNameSchema),
  enrichmentStatus: enrichmentStatusSchema,
  lastEnrichedAt: z.string().nullable(),
  currentThinkingSummary: z.string().nullable(),
  summaryGeneratedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  notes: z.array(noteViewSchema).optional(),
});

export const companySearchCandidateSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  cik: z.string().nullable(),
  exchange: z.string().nullable(),
  sources: z.array(dataSourceNameSchema),
});

export const searchCompaniesResponseSchema = z.object({
  items: z.array(companySearchCandidateSchema),
});

const taxonomyOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const taxonomyViewSchema = z.object({
  moatPatterns: z.array(taxonomyOptionSchema),
  businessModels: z.array(taxonomyOptionSchema),
  convictionLevels: z.array(taxonomyOptionSchema),
});

export const listCompaniesResultSchema = z.object({
  items: z.array(companyViewSchema),
  totalTracked: z.number(),
});
