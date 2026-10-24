import { api } from "./http.mjs";
import type {
  QuoteDetail,
  Quote,
  Subscription,
  Selection,
  ReviewList,
  ReviewState,
  Review,
  Page,
  BusinessProfile,
  PublicBusiness,
  Dashboard,
  Session,
  Customer,
  CustomerDeletion,
  PushSettings,
  Visit,
} from "../models/entities";
export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}
export function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return api(path, options);
}
export const quotes = {
  get: (id: string, token: string, signal?: AbortSignal) =>
    request<QuoteDetail>("/api/quotes/" + encodeURIComponent(id), {
      token,
      signal,
    }),
  create: (
    selection: Selection,
    token: string,
    privacyVersion: string,
    website = "",
  ) =>
    request<{ quote: Quote }>("/api/quotes", {
      method: "POST",
      body: { ...selection, submissionToken: token, privacyVersion, website },
    }),
};
export const memberships = {
  get: (id: string, token: string, signal?: AbortSignal) =>
    request<{ subscription: Subscription }>("/api/subscriptions/" + id, {
      token,
      signal,
    }),
  request: (id: string, token: string, body: unknown) =>
    request<{ quote: Quote }>("/api/subscriptions/" + id + "/requests", {
      method: "POST",
      token,
      body,
    }),
};
export const reviews = {
  list: (page = 0, signal?: AbortSignal) =>
    request<ReviewList>("/api/reviews?page=" + page, { signal }),
  state: (id: string, token: string, signal?: AbortSignal) =>
    request<ReviewState>("/api/quotes/" + id + "/review", { token, signal }),
  save: (id: string, token: string, body: unknown) =>
    request<{ review: Review }>("/api/quotes/" + id + "/review", {
      method: "POST",
      token,
      body,
    }),
  withdraw: (id: string, token: string) =>
    request<{ ok: boolean; withdrawn: boolean }>(
      "/api/quotes/" + id + "/review",
      { method: "DELETE", token },
    ),
};
export const business = {
  public: (signal?: AbortSignal) =>
    request<PublicBusiness>("/api/business", { signal }),
};
export const admin = {
  session: (signal?: AbortSignal) =>
    request<Session>("/api/admin/session", { signal }),
  login: (body: unknown, reauth = false) =>
    request<Session>("/api/admin/" + (reauth ? "reauth" : "session"), {
      method: "POST",
      body,
    }),
  logout: () => request("/api/admin/session", { method: "DELETE" }),
  dashboard: (signal?: AbortSignal) =>
    request<Dashboard>("/api/admin/dashboard", { signal }),
  quotes: (query: string, signal?: AbortSignal) =>
    request<Page<Quote>>("/api/admin/quotes?" + query, { signal }),
  quote: (id: string) => request<QuoteDetail>("/api/admin/quotes/" + id),
  subscriptions: (query: string, signal?: AbortSignal) =>
    request<Page<Subscription>>("/api/admin/subscriptions?" + query, {
      signal,
    }),
  subscription: (id: string) =>
    request<{ subscription: Subscription }>("/api/admin/subscriptions/" + id),
  customers: (q: string, signal?: AbortSignal) =>
    request<{ items: Customer[] }>(
      "/api/admin/customers?q=" + encodeURIComponent(q),
      { signal },
    ),
  deletion: (id: string) =>
    request<CustomerDeletion>("/api/admin/customers/" + id),
  agenda: (date: string, signal?: AbortSignal) =>
    request<{
      quotes: (Quote & { date: string; time: string })[];
      visits: Visit[];
    }>("/api/admin/agenda?date=" + date, { signal }),
  profile: (signal?: AbortSignal) =>
    request<{ profile: BusinessProfile }>("/api/admin/business", { signal }),
  notifications: (signal?: AbortSignal) =>
    request<PushSettings>("/api/admin/notifications", { signal }),
  mutate: <T = unknown>(path: string, body: unknown, method = "POST") =>
    request<T>("/api/admin/" + path, { method, body }),
};
