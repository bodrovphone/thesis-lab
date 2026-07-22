-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ConvictionLevel" AS ENUM ('WATCHING', 'BUILDING_CONVICTION', 'HIGH_CONVICTION');

-- CreateEnum
CREATE TYPE "MoatPattern" AS ENUM ('SCALE_ECONOMIES', 'NETWORK_EFFECTS', 'SWITCHING_COSTS', 'COUNTER_POSITIONING', 'BRAND', 'CORNERED_RESOURCE', 'PROCESS_POWER');

-- CreateEnum
CREATE TYPE "BusinessModel" AS ENUM ('LOW_COST_OPERATOR', 'FRANCHISOR', 'B2B_MIDDLEMAN', 'SERIAL_ACQUIRER', 'MISSION_CRITICAL_PRODUCTS_SERVICES', 'VERTICALLY_INTEGRATED_RETAILER', 'AUCTIONS_AND_CLASSIFIEDS', 'B2B_SOFTWARE', 'MARKETPLACES_AND_PLATFORMS', 'OEMS_WITH_INSTALLED_BASE', 'UNIQUE_IP_OR_BRANDS', 'PHYSICAL_INFRASTRUCTURE_NETWORKS', 'INSURERS_AND_FINANCIALS');

-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('SEC_EDGAR', 'FINNHUB', 'ALPHA_VANTAGE');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cik" TEXT,
    "exchange" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "country" TEXT,
    "marketCapUsd" BIGINT,
    "website" TEXT,
    "logoUrl" TEXT,
    "convictionLevel" "ConvictionLevel" NOT NULL DEFAULT 'WATCHING',
    "sourcesUsed" "DataSource"[] DEFAULT ARRAY[]::"DataSource"[],
    "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'PARTIAL',
    "lastEnrichedAt" TIMESTAMP(3),
    "currentThinkingSummary" TEXT,
    "summaryGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "moatPattern" "MoatPattern",
    "businessModel" "BusinessModel",
    "aiSuggestedMoatPattern" "MoatPattern",
    "aiSuggestedBusinessModel" "BusinessModel",
    "tagEditedByUser" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalApiCacheEntry" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalApiCacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ticker_key" ON "Company"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cik_key" ON "Company"("cik");

-- CreateIndex
CREATE INDEX "Company_convictionLevel_idx" ON "Company"("convictionLevel");

-- CreateIndex
CREATE INDEX "Note_companyId_createdAt_idx" ON "Note"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_moatPattern_idx" ON "Note"("moatPattern");

-- CreateIndex
CREATE INDEX "Note_businessModel_idx" ON "Note"("businessModel");

-- CreateIndex
CREATE INDEX "ExternalApiCacheEntry_expiresAt_idx" ON "ExternalApiCacheEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalApiCacheEntry_source_cacheKey_key" ON "ExternalApiCacheEntry"("source", "cacheKey");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
