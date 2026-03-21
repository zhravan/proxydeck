/**
 * Shared API and cross-layer types. Domain rows use Drizzle-inferred types from `repositories/*`.
 */
export type { ApiResult } from "./api";
export type { ConfigHistoryEntry } from "../repositories/configHistory.repository";
export type { ProxyConfig, Site, Route, Upstream } from "../proxy/types";
