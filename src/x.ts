import { BOOKMARK_QUERY, X_API, X_AUTHORIZE_URL, X_SCOPES, X_TOKEN_URL } from "#src/limits";

export type Variant = { bit_rate?: number; content_type: string; url: string };
export type Media = { media_key: string; type: "video" | "animated_gif" | "photo"; variants?: Variant[]; preview_image_url?: string };
export type Tweet = { id: string; text: string; created_at?: string; attachments?: { media_keys?: string[] } };
export type BookmarksResponse = {
  data?: Tweet[];
  includes?: { media?: Media[] };
  meta?: { result_count?: number; next_token?: string };
  errors?: unknown[];
};
export type Video = { key: string; url: string; bitRate: number };
export type Item = {
  postId: string; text: string; postedAt: string | null; postUrl: string;
  previewUrl: string | null; hasVideoMedia: boolean; videos: Video[];
};

export function selectVariant(variants: Variant[] | undefined): Variant | null {
  const mp4 = (variants ?? []).filter((v) => v.content_type === "video/mp4");
  if (mp4.length === 0) return null;
  return mp4.reduce((best, v) => ((v.bit_rate ?? 0) > (best.bit_rate ?? 0) ? v : best));
}

export function parseBookmarks(res: BookmarksResponse): Item[] {
  const media = new Map((res.includes?.media ?? []).map((m) => [m.media_key, m]));
  return (res.data ?? []).map((t) => {
    const vids = (t.attachments?.media_keys ?? [])
      .map((k) => media.get(k))
      .filter((m): m is Media => !!m && (m.type === "video" || m.type === "animated_gif"));
    const videos = vids.flatMap((m, i) => {
      const v = selectVariant(m.variants);
      if (!v) return [];
      const key = vids.length > 1 ? `${t.id}-${i + 1}.mp4` : `${t.id}.mp4`;
      return [{ key, url: v.url, bitRate: v.bit_rate ?? 0 }];
    });
    return {
      postId: t.id, text: t.text, postedAt: t.created_at ?? null,
      postUrl: `https://x.com/i/status/${t.id}`,
      previewUrl: vids[0]?.preview_image_url ?? null,
      hasVideoMedia: vids.length > 0, videos,
    };
  });
}

export type Fetch = typeof fetch;
export type OAuthCfg = { clientId: string; clientSecret: string; redirectUri: string };
export type Tokens = { access: string; refresh: string; prevRefresh?: string; expiresAt: number };

export class XApiError extends Error {
  status: number; path: string; rateLimitReset?: number;
  constructor(status: number, path: string, rateLimitReset?: number) {
    super(`X API ${status} on ${path}`);
    this.status = status; this.path = path; this.rateLimitReset = rateLimitReset;
  }
}

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export function authorizeUrl(cfg: OAuthCfg, state: string, challenge: string): string {
  const u = new URL(X_AUTHORIZE_URL);
  const p: Record<string, string> = {
    response_type: "code", client_id: cfg.clientId, redirect_uri: cfg.redirectUri, scope: X_SCOPES,
    state, code_challenge: challenge, code_challenge_method: "S256",
  };
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  return u.toString();
}

// The only place a bearer token is turned into a header. Never log the result.
function bearer(access: string): Record<string, string> {
  return { Authorization: `Bearer ${access}` };
}

async function tokenRequest(f: Fetch, cfg: OAuthCfg, form: Record<string, string>, now: number): Promise<Tokens> {
  const res = await f(X_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${cfg.clientId}:${cfg.clientSecret}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
  if (!res.ok) throw new XApiError(res.status, "/2/oauth2/token");
  const j = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { access: j.access_token, refresh: j.refresh_token, expiresAt: now + j.expires_in * 1000 };
}

export function exchangeCode(f: Fetch, cfg: OAuthCfg, code: string, verifier: string, now = Date.now()): Promise<Tokens> {
  return tokenRequest(f, cfg, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: cfg.redirectUri, client_id: cfg.clientId }, now);
}

export async function refreshTokens(f: Fetch, cfg: OAuthCfg, refresh: string, now = Date.now()): Promise<Tokens> {
  const t = await tokenRequest(f, cfg, { grant_type: "refresh_token", refresh_token: refresh, client_id: cfg.clientId }, now);
  return { ...t, prevRefresh: refresh };
}

async function apiGet<T>(f: Fetch, access: string, path: string): Promise<T> {
  const res = await f(`${X_API}${path}`, { headers: bearer(access) });
  if (!res.ok) {
    const reset = res.headers.get("x-rate-limit-reset");
    throw new XApiError(res.status, path.split("?")[0], reset ? Number(reset) : undefined);
  }
  return (await res.json()) as T;
}

export async function fetchMe(f: Fetch, access: string): Promise<string> {
  const j = await apiGet<{ data: { id: string } }>(f, access, "/users/me");
  return j.data.id;
}

export function fetchBookmarks(f: Fetch, access: string, userId: string, o: { maxResults: number; paginationToken?: string }): Promise<BookmarksResponse> {
  const q = new URLSearchParams(BOOKMARK_QUERY);
  q.set("max_results", String(o.maxResults));
  if (o.paginationToken) q.set("pagination_token", o.paginationToken);
  return apiGet<BookmarksResponse>(f, access, `/users/${userId}/bookmarks?${q}`);
}

export function fetchTweetsByIds(f: Fetch, access: string, ids: string[]): Promise<BookmarksResponse> {
  const q = new URLSearchParams(BOOKMARK_QUERY);
  q.set("ids", ids.join(","));
  return apiGet<BookmarksResponse>(f, access, `/tweets?${q}`);
}
