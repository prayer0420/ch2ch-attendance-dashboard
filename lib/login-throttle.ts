// Login brute-force protection for a single shared access code.
// Per client: 5 free failures, then an exponential lock (1, 2, 4 ... 60 minutes).
// External clients also share a rolling 24 hour failure budget, so a short code
// cannot be guessed by rotating addresses. Logins typed on this PC itself
// (localhost without a proxy header) are exempt from the shared budget, so an
// attacker can never lock the owner out of the local screen.

const FREE_FAILURES = 5;
const BASE_LOCK_MS = 60_000;
const MAX_LOCK_MS = 60 * 60_000;
const WINDOW_MS = 24 * 60 * 60_000;
const EXTERNAL_DAILY_FAILURES = 60;
const MAX_TRACKED_CLIENTS = 5_000;

type ClientState = { failures: number; lockedUntil: number; lastFailure: number };
type ThrottleState = { clients: Map<string, ClientState>; externalFailures: number[] };

const globalState = globalThis as typeof globalThis & { __ch2chLoginThrottle?: ThrottleState };
const state: ThrottleState = globalState.__ch2chLoginThrottle ??= { clients: new Map(), externalFailures: [] };

export type LoginClient = { key: string; local: boolean };

const LOCAL_HOSTS = new Set(["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]);

export function loginClient(headers: Headers): LoginClient {
  const forwarded = headers.get("x-forwarded-for");
  const host = (headers.get("host") || "").toLowerCase();
  // The server listens on 127.0.0.1 only. A request without a proxy header and
  // with a loopback Host can only come from this PC; the HTTPS tunnel always
  // sends the public host name and X-Forwarded-For.
  if (!forwarded && LOCAL_HOSTS.has(host)) return { key: "local", local: true };
  // The tunnel appends the real client address last; earlier entries are client-controlled.
  const address = (forwarded || "").split(",").map((part) => part.trim()).filter(Boolean).pop() || "unknown";
  return { key: "ip:" + address.slice(0, 64), local: false };
}

function prune(now: number) {
  state.externalFailures = state.externalFailures.filter((time) => now - time < WINDOW_MS);
  for (const [key, client] of state.clients) {
    if (now - client.lastFailure >= WINDOW_MS && client.lockedUntil <= now) state.clients.delete(key);
  }
  while (state.clients.size > MAX_TRACKED_CLIENTS) {
    const oldest = state.clients.keys().next().value;
    if (oldest === undefined) break;
    state.clients.delete(oldest);
  }
}

/** Milliseconds until this client may try again; 0 when allowed. */
export function loginRetryAfterMs(client: LoginClient, now = Date.now()) {
  prune(now);
  const own = Math.max(0, (state.clients.get(client.key)?.lockedUntil ?? 0) - now);
  if (client.local || state.externalFailures.length < EXTERNAL_DAILY_FAILURES) return own;
  const shared = state.externalFailures[state.externalFailures.length - EXTERNAL_DAILY_FAILURES] + WINDOW_MS - now;
  return Math.max(own, shared, 0);
}

export function recordLoginFailure(client: LoginClient, now = Date.now()) {
  prune(now);
  const current = state.clients.get(client.key) ?? { failures: 0, lockedUntil: 0, lastFailure: 0 };
  current.failures += 1;
  current.lastFailure = now;
  if (current.failures >= FREE_FAILURES) {
    current.lockedUntil = now + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** (current.failures - FREE_FAILURES));
  }
  state.clients.delete(client.key);
  state.clients.set(client.key, current);
  if (!client.local) state.externalFailures.push(now);
}

export function recordLoginSuccess(client: LoginClient) {
  state.clients.delete(client.key);
}

export function resetLoginThrottleForTests() {
  state.clients.clear();
  state.externalFailures = [];
}
