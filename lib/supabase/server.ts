// Compatibility names retained while all callers move to the shared server/Runner store.
import { createDataClient, hasDataStore } from "../local-store/provider.cjs";

export function hasSupabaseEnv() {
  return hasDataStore();
}

export function getServiceSupabase() {
  return createDataClient();
}
