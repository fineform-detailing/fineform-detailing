export type Vehicle = "car" | "moto";
export type QuoteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "in_progress"
  | "ready"
  | "completed"
  | "cancelled";
export interface Selection {
  vehicle: Vehicle;
  model: string;
  mode: "single" | "plan" | "guidance";
  service: string;
  plan: string;
  goals: string[];
  extras: string[];
  treatments: string[];
  date: string;
  time: string;
  flexibleDate: boolean;
  name: string;
  phone: string;
  notes: string;
  ack: boolean;
  rememberLink?: boolean;
  plate?: string;
  plateVerified?: boolean;
}
export interface Budget {
  items: { id: string; label: string; price: number; kind: string }[];
  gross: number;
  discount: number;
  total: number;
  recurring: number;
  additional: number;
  hasBase: boolean;
}
export interface LocationDetails {
  address: string;
  mapsUrl: string;
  arrivalNote: string;
  sharedAt?: string;
}
export interface Quote {
  id: string;
  reference: string;
  kind: string;
  name: string;
  phone: string;
  vehicle: Vehicle;
  model: string;
  plate: string | null;
  plateVerified: boolean;
  selection: Selection;
  budget: Budget;
  status: QuoteStatus;
  message: string;
  preferredDate: string | null;
  preferredTime: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  subscriptionId: string | null;
  creditKind: string | null;
  confirmedTotal: number | null;
  location: LocationDetails | null;
  internalNote?: string;
  customerId?: string;
}
export interface QuoteEvent {
  status: string;
  message: string;
  created_at: string;
}
export interface QuoteDetail {
  quote: Quote;
  events: QuoteEvent[];
}
export interface Credit {
  quota: number;
  done: number;
  reserved: number;
  available: number;
}
export interface Cycle {
  id: string;
  starts_on: string;
  ends_on: string;
  price_cents: number;
  paid: number | boolean;
  credits: Record<string, Credit>;
  expired: boolean;
  notStarted: boolean;
}
export interface Visit {
  id: string;
  kind: string;
  status: string;
  date: string;
  time: string;
  plate: string | null;
  version: number;
  subscriptionId?: string;
  quote_id?: string;
  name?: string;
  model?: string;
}
export interface Subscription {
  id: string;
  name: string;
  phone?: string;
  vehicle: Vehicle;
  model: string;
  plate: string | null;
  plateVerified: boolean;
  planId: string;
  status: "active" | "paused" | "cancelled";
  version: number;
  cycle: Cycle | null;
  visits: Visit[];
  history: {
    id: string;
    start: string;
    end: string;
    price: number;
    paid: boolean;
    credits: Record<string, Credit>;
  }[];
  visitHistory: Visit[];
  customerId?: string;
  originQuoteId?: string;
}
export interface Review {
  id: string;
  rating: number;
  comment: string;
  firstName: string;
  vehicle: Vehicle;
  createdAt: string;
  published: boolean;
}
export interface ReviewState {
  eligible: boolean;
  firstName: string;
  review: Review | null;
}
export interface ReviewList {
  count: number;
  average: number | null;
  items: Review[];
  page: number;
  hasMore: boolean;
}
export interface Page<T> {
  items: T[];
  page: number;
  hasMore: boolean;
}
export interface BusinessProfile {
  legalName: string;
  cnpj: string;
  registeredAddress: string;
  visitAddress: string;
  mapsUrl: string;
  arrivalNote: string;
  publishIdentity: boolean;
  publishVisitAddress: boolean;
  version: number;
}
export interface PublicBusiness {
  supplier: { legalName: string; cnpj: string } | null;
  location: null;
}
export interface Customer {
  id: string;
  name: string;
  phone: string;
  model: string;
  plans: number;
}
export interface CustomerDeletion {
  customer: Customer;
  counts: Record<string, number>;
  snapshot: string;
}
export interface Dashboard {
  today: string;
  quotes: Partial<Record<QuoteStatus, number>>;
  activeSubscriptions: number;
  todayVisits: number;
  expiring: { id: string; name: string; ends_on: string }[];
}
export interface Session {
  authenticated: boolean;
  csrfToken?: string;
  expiresAt?: number;
  mfaRequired?: boolean;
}
export interface PushSettings {
  configured: boolean;
  publicKey?: string;
  maximum: number;
  deviceIds?: string[];
  devices?: {
    id: string;
    label: string;
    lastSentAt: string | null;
    lastError: string | null;
  }[];
}
