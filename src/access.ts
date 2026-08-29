import type { Fetch } from "#src/x";

type Jwk = JsonWebKey & { kid?: string };
// ponytail: module-level JWKS cache keyed by team domain; a Worker isolate is short-lived, 10 min is plenty.
const cache = new Map<string, { keys: Jwk[]; at: number }>();
const TTL_MS = 10 * 60_000;

const decode = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=")), (c) => c.charCodeAt(0));
const json = <T>(s: string): T => JSON.parse(new TextDecoder().decode(decode(s))) as T;

async function keys(f: Fetch, team: string, kid: string, now: number): Promise<Jwk> {
  let c = cache.get(team);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!c || now - c.at > TTL_MS || attempt === 1) {
      const res = await f(`${team}/cdn-cgi/access/certs`);
      if (!res.ok) throw new Error(`certs ${res.status}`);
      c = { keys: ((await res.json()) as { keys: Jwk[] }).keys, at: now };
      cache.set(team, c);
    }
    const k = c.keys.find((k) => k.kid === kid);
    if (k) return k;
  }
  throw new Error("unknown kid");
}

export async function verifyAccessJwt(f: Fetch, token: string, teamDomain: string, aud: string, now = Date.now()): Promise<{ email?: string }> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("malformed token");
  const header = json<{ alg?: string; kid?: string }>(h);
  if (header.alg !== "RS256" || !header.kid) throw new Error("unsupported alg");
  const payload = json<{ aud?: string | string[]; iss?: string; exp?: number; email?: string }>(p);
  if (payload.iss !== teamDomain) throw new Error("iss mismatch");
  if (!(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).includes(aud)) throw new Error("aud mismatch");
  if (!payload.exp || payload.exp * 1000 < now) throw new Error("exp");
  const jwk = await keys(f, teamDomain, header.kid, now);
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error("bad signature");
  return { email: payload.email };
}
