import {
  BusinessModel,
  ConvictionLevel,
  MoatPattern,
} from '../generated/prisma/client';

export interface TaxonomyOptionDto {
  value: string;
  label: string;
}

export const MOAT_PATTERN_LABELS: Record<MoatPattern, string> = {
  SCALE_ECONOMIES: 'Scale economies',
  NETWORK_EFFECTS: 'Network effects',
  SWITCHING_COSTS: 'Switching costs',
  COUNTER_POSITIONING: 'Counter positioning',
  BRAND: 'Brand',
  CORNERED_RESOURCE: 'Cornered resource',
  PROCESS_POWER: 'Process power',
};

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  LOW_COST_OPERATOR: 'Low cost operator',
  FRANCHISOR: 'Franchisor',
  B2B_MIDDLEMAN: 'B2B middleman',
  SERIAL_ACQUIRER: 'Serial acquirer',
  MISSION_CRITICAL_PRODUCTS_SERVICES: 'Mission critical products & services',
  VERTICALLY_INTEGRATED_RETAILER: 'Vertically integrated retailer',
  AUCTIONS_AND_CLASSIFIEDS: 'Auctions & classifieds',
  B2B_SOFTWARE: 'B2B software',
  MARKETPLACES_AND_PLATFORMS: 'Marketplaces & platforms',
  OEMS_WITH_INSTALLED_BASE: 'OEMs with installed base',
  UNIQUE_IP_OR_BRANDS: 'Unique IP or brands',
  PHYSICAL_INFRASTRUCTURE_NETWORKS: 'Physical infrastructure networks',
  INSURERS_AND_FINANCIALS: 'Insurers & financials',
};

export const CONVICTION_LEVEL_LABELS: Record<ConvictionLevel, string> = {
  WATCHING: 'Watching',
  BUILDING_CONVICTION: 'Building conviction',
  HIGH_CONVICTION: 'High conviction',
};

function toOptions<T extends string>(
  labels: Record<T, string>,
): TaxonomyOptionDto[] {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

export const MOAT_PATTERN_OPTIONS = toOptions(MOAT_PATTERN_LABELS);
export const BUSINESS_MODEL_OPTIONS = toOptions(BUSINESS_MODEL_LABELS);
export const CONVICTION_LEVEL_OPTIONS = toOptions(CONVICTION_LEVEL_LABELS);
