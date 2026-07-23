export const queryKeys = {
  companySearch: (q: string) => ['company-search', q] as const,
  companyNotes: (companyId: string) => ['company-notes', companyId] as const,
};
