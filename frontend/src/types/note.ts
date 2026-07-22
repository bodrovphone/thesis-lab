export type MoatPattern =
  | 'SCALE_ECONOMIES'
  | 'NETWORK_EFFECTS'
  | 'SWITCHING_COSTS'
  | 'COUNTER_POSITIONING'
  | 'BRAND'
  | 'CORNERED_RESOURCE'
  | 'PROCESS_POWER';

export type BusinessModel =
  | 'LOW_COST_OPERATOR'
  | 'FRANCHISOR'
  | 'B2B_MIDDLEMAN'
  | 'SERIAL_ACQUIRER'
  | 'MISSION_CRITICAL_PRODUCTS_SERVICES'
  | 'VERTICALLY_INTEGRATED_RETAILER'
  | 'AUCTIONS_AND_CLASSIFIEDS'
  | 'B2B_SOFTWARE'
  | 'MARKETPLACES_AND_PLATFORMS'
  | 'OEMS_WITH_INSTALLED_BASE'
  | 'UNIQUE_IP_OR_BRANDS'
  | 'PHYSICAL_INFRASTRUCTURE_NETWORKS'
  | 'INSURERS_AND_FINANCIALS';

export interface NoteView {
  id: string;
  companyId: string;
  body: string;
  moatPattern: MoatPattern | null;
  businessModel: BusinessModel | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxonomyOption {
  value: string;
  label: string;
}

export interface TaxonomyView {
  moatPatterns: TaxonomyOption[];
  businessModels: TaxonomyOption[];
  convictionLevels: TaxonomyOption[];
}

export function labelForOption(
  options: TaxonomyOption[],
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }
  return options.find((option) => option.value === value)?.label ?? value;
}

export function formatNoteTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
