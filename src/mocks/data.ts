/**
 * Centralized mock data for DEV_BYPASS mode.
 * All IDs are consistent across hooks so navigation works end-to-end.
 */

// ─── Customers ───

export const MOCK_CUSTOMERS = [
  {
    id: "mock-customer-1",
    name: "M. & Mme Morel",
    email: "morel@email.fr",
    phone: "+33612345678",
    customer_type: "particulier" as const,
    status: "active",
    source_origin: "showroom",
    siret: null,
    created_at: "2026-01-15T10:00:00Z",
    modified_at: "2026-03-20T14:00:00Z",
    payload: {},
  },
  {
    id: "mock-customer-2",
    name: "Mme Durand",
    email: "durand@email.fr",
    phone: "+33698765432",
    customer_type: "particulier" as const,
    status: "active",
    source_origin: "referral",
    siret: null,
    created_at: "2026-02-01T09:00:00Z",
    modified_at: "2026-03-18T11:00:00Z",
    payload: {},
  },
  {
    id: "mock-customer-3",
    name: "SCI Les Alpes",
    email: "contact@sci-alpes.fr",
    phone: "+33450123456",
    customer_type: "professionnel" as const,
    status: "active",
    source_origin: "partner",
    siret: "12345678901234",
    created_at: "2026-01-20T08:00:00Z",
    modified_at: "2026-03-15T16:00:00Z",
    payload: {},
  },
];

// ─── Properties ───

export const MOCK_PROPERTIES = [
  {
    id: "mock-property-1",
    customer_id: "mock-customer-1",
    address_line1: "12 chemin des Érables",
    address_line2: null,
    city: "Annecy",
    postal_code: "74000",
    property_type: "house" as const,
    created_at: "2026-01-20T10:00:00Z",
  },
  {
    id: "mock-property-2",
    customer_id: "mock-customer-2",
    address_line1: "8 rue du Mont-Blanc",
    address_line2: "Bât. C",
    city: "Aix-les-Bains",
    postal_code: "73100",
    property_type: "apartment" as const,
    created_at: "2026-02-05T09:00:00Z",
  },
];

// ─── Projects ───

export const MOCK_PROJECTS = [
  {
    id: "mock-project-1",
    project_number: "PRJ-0047",
    status: "vt_planned" as const,
    customer_id: "mock-customer-1",
    property_id: "mock-property-1",
    origin: "showroom",
    created_at: "2026-02-10T10:00:00Z",
    modified_at: "2026-03-24T09:00:00Z",
    cancellation_reason: null,
    closed_at: null,
    customer: { id: "mock-customer-1", name: "M. & Mme Morel", email: "morel@email.fr", phone: "+33612345678", customer_type: "particulier" },
    property: { id: "mock-property-1", label: null, address_line1: "12 chemin des Érables", address_line2: null, city: "Annecy", postal_code: "74000", property_type: "house" },
  },
  {
    id: "mock-project-2",
    project_number: "PRJ-0045",
    status: "final_quote_sent" as const,
    customer_id: "mock-customer-2",
    property_id: "mock-property-2",
    origin: "referral",
    created_at: "2026-01-25T14:00:00Z",
    modified_at: "2026-03-22T11:00:00Z",
    cancellation_reason: null,
    closed_at: null,
    customer: { id: "mock-customer-2", name: "Mme Durand", email: "durand@email.fr", phone: "+33698765432", customer_type: "particulier" },
    property: { id: "mock-property-2", label: null, address_line1: "8 rue du Mont-Blanc", address_line2: "Bât. C", city: "Aix-les-Bains", postal_code: "73100", property_type: "apartment" },
  },
];

// ─── Quotes ───

export const MOCK_QUOTES = [
  {
    id: "mock-quote-1",
    quote_number: "DEV-2026-0047",
    quote_kind: "final" as const,
    quote_status: "sent" as const,
    project_id: "mock-project-1",
    customer_id: "mock-customer-1",
    property_id: "mock-property-1",
    customer: { id: "mock-customer-1", name: "M. & Mme Morel", email: "morel@email.fr", phone: "+33612345678" },
    property: { id: "mock-property-1", address_line1: "12 chemin des Érables", address_line2: null, city: "Annecy", postal_code: "74000" },
    total_ht: 4188.0,
    total_vat: 288.75,
    total_ttc: 4476.75,
    quote_date: "2026-03-20",
    expiry_date: "2026-04-20",
    version_number: 1,
    sent_at: "2026-03-21T10:00:00Z",
    signed_at: null,
    service_request_id: null,
    installation_id: null,
    previous_quote_id: null,
  },
];

// ─── Quote Lines ───

export const MOCK_QUOTE_LINES = [
  {
    id: "mock-line-1",
    quote_id: "mock-quote-1",
    label: "Poêle à bois Invicta Onsen 8kW",
    qty: 1,
    unit: "u" as const,
    unit_price_ht: 2890,
    vat_rate: 5.5,
    total_line_ht: 2890,
    sort_order: 1,
    product_id: null,
    metadata: null,
    product: { id: "prod-1", name: "Poêle à bois Invicta Onsen 8kW", sku: "INV-ONS-8K" },
  },
  {
    id: "mock-line-2",
    quote_id: "mock-quote-1",
    label: "Kit raccordement inox Ø150mm",
    qty: 1,
    unit: "u" as const,
    unit_price_ht: 485,
    vat_rate: 10,
    total_line_ht: 485,
    sort_order: 2,
    product_id: null,
    metadata: null,
    product: { id: "prod-2", name: "Kit raccordement inox Ø150mm", sku: "KIT-RAC-150" },
  },
  {
    id: "mock-line-3",
    quote_id: "mock-quote-1",
    label: "Main d'œuvre pose + MES",
    qty: 8,
    unit: "h" as const,
    unit_price_ht: 78,
    vat_rate: 10,
    total_line_ht: 624,
    sort_order: 3,
    product_id: null,
    metadata: null,
    product: null,
  },
];

// ─── Installations ───

export const MOCK_INSTALLATIONS = [
  {
    id: "mock-installation-1",
    customer_id: "mock-customer-1",
    appliance_label: "Poêle Jøtul F520",
    installation_status: "active",
    next_sweep_date: "2026-04-25",
    created_at: "2025-09-15T10:00:00Z",
  },
  {
    id: "mock-installation-2",
    customer_id: "mock-customer-2",
    appliance_label: "Insert Stûv 16",
    installation_status: "commissioned",
    next_sweep_date: "2026-03-10",
    created_at: "2025-12-20T14:00:00Z",
  },
];

// ─── Activities ───

export const MOCK_ACTIVITIES = [
  {
    id: "mock-act-1",
    activity_type: "wf_quote_sent",
    payload: null,
    occurred_at: "2026-03-21T10:00:00Z",
    actor: { full_name: "Patrick Lefèvre" },
  },
  {
    id: "mock-act-2",
    activity_type: "wf_status_change",
    payload: { from_status: "draft", to_status: "sent" },
    occurred_at: "2026-03-21T10:00:00Z",
    actor: { full_name: "Patrick Lefèvre" },
  },
  {
    id: "mock-act-3",
    activity_type: "wf_status_change",
    payload: { from_status: null, to_status: "draft" },
    occurred_at: "2026-03-18T08:00:00Z",
    actor: { full_name: "Système" },
  },
];

// ─── Dashboard KPIs ───

export const MOCK_DASHBOARD_KPIS = {
  revenue: { value: 18247, label: "CA du mois" },
  quotes: { count: 5, overdue: 2, label: "Devis en attente" },
  interventions: { count: 11, installation: 8, service: 3, label: "Interventions S.13" },
  overdue: { count: 2, amount: 4620, label: "Impayées > 30j" },
};

export const MOCK_PIPELINE = [
  { id: "mock-project-1", project_number: "PRJ-0047", status: "vt_planned", modified_at: "2026-03-24T09:00:00Z", customer_name: "M. & Mme Morel" },
  { id: "mock-project-2", project_number: "PRJ-0045", status: "final_quote_sent", modified_at: "2026-03-22T11:00:00Z", customer_name: "Mme Durand" },
];

// ─── Helper to find by ID ───

export function findMockCustomer(id: string) {
  return MOCK_CUSTOMERS.find((c) => c.id === id) ?? null;
}

export function findMockProject(id: string) {
  return MOCK_PROJECTS.find((p) => p.id === id) ?? null;
}

export function findMockQuote(id: string) {
  return MOCK_QUOTES.find((q) => q.id === id) ?? null;
}

export function getMockPropertiesForCustomer(customerId: string) {
  return MOCK_PROPERTIES.filter((p) => p.customer_id === customerId);
}

export function getMockProjectsForCustomer(customerId: string) {
  return MOCK_PROJECTS.filter((p) => p.customer_id === customerId);
}

export function getMockInstallationsForCustomer(customerId: string) {
  return MOCK_INSTALLATIONS.filter((i) => i.customer_id === customerId);
}

export function getMockQuotesForProject(projectId: string) {
  return MOCK_QUOTES.filter((q) => q.project_id === projectId);
}

export function getMockLinesForQuote(quoteId: string) {
  return MOCK_QUOTE_LINES.filter((l) => l.quote_id === quoteId);
}
