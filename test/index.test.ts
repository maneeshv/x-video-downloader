import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, type AppEnv } from "#src/index";
import { Store } from "#src/store";
import { FakeD1, FakeKV, FakeR2, fakeFetch, fixture, makeSigner, type Scripted } from "./fakes.ts";

const TEAM = "https://team.cloudflareaccess.com", AUD = "aud1", ORIGIN = "https://w.example";
const fixtureJson = fixture("bookmarks.json");

async function app() {
  const kv = new FakeKV(), r2 = new FakeR2(), d1 = new FakeD1();
  // access.ts's JWKS cache is keyed by team domain + kid; distinct kids per app() instance
  // avoid a stale-key collision when this file's tests share the module-level cache.
  const signer = await makeSigner(crypto.randomUUID());
  const f = fakeFetch((url): Scripted => {
    if (url.endsWith("/cdn-cgi/access/certs")) return { status: 200, body: { keys: [signer.jwk] } };
    if (url.includes("oauth2/token")) return { status: 200, body: { access_token: "A", refresh_token: "R", expires_in: 7200 } };
    if (url.includes("/users/me")) return { status: 200, body: { data: { id: "u1" } } };
    if (url.includes("/bookmarks")) return { status: 200, body: fixtureJson };
    return { status: 200, bodyBytes: new Uint8Array([1, 2, 3]), headers: { "content-type": "video/mp4", "content-length": "3" } };
  });
  const env: AppEnv = { X_CLIENT_ID: "c", X_CLIENT_SECRET: "s", TEAM_DOMAIN: TEAM, POLICY_AUD: AUD, PUBLIC_ORIGIN: ORIGIN, VIDEOS: r2.asR2(), KV: kv.asKV(), DB: d1.asD1() };
  const jwt = await signer.sign({ aud: [AUD], iss: TEAM, exp: Date.now() / 1000 + 60, email: "o@example.com" });
  // Regression: Workers/undici throw "Illegal invocation" when fetch is called as a method of another
  // object (`deps.fetch(url)`), so every internal caller must invoke it unbound.
  const strict = function (this: unknown, ...args: Parameters<typeof f>) { assert.equal(this, undefined, "fetch called with a bound this"); return f(...args); };
  const get = (path: string, headers: Record<string, string> = {}) => handle(new Request(ORIGIN + path, { headers: { "cf-access-jwt-assertion": jwt, ...headers } }), env, strict as typeof f);
  return { env, f, get, store: new Store(kv.asKV(), d1.asD1(), r2.asR2()), kv, r2 };
}

test("every route is 403 without a valid Access JWT", async () => {
  const { env, f } = await app();
  for (const p of ["/", "/status", "/oauth/start", "/oauth/callback?code=x&state=y", "/backfill", "/v/1.mp4"]) {
    assert.equal((await handle(new Request(ORIGIN + p), env, f)).status, 403, p);
  }
});

test("oauth start → callback stores tokens + user id, then backfill and index work", async () => {
  const a = await app();
  const start = await a.get("/oauth/start");
  assert.equal(start.status, 302);
  const loc = new URL(start.headers.get("location")!);
  assert.equal(loc.host, "x.com");
  assert.equal(loc.searchParams.get("redirect_uri"), `${ORIGIN}/oauth/callback`);
  const state = loc.searchParams.get("state")!;
  assert.ok(await a.kv.get(`pkce:${state}`));
  assert.equal((await a.get(`/oauth/callback?code=c1&state=wrong`)).status, 400);
  const cb = await a.get(`/oauth/callback?code=c1&state=${state}`);
  assert.equal(cb.status, 302);
  assert.equal((await a.store.getTokens())?.access, "A");
  assert.equal(await a.store.getUserId(), "u1");
  const bf = await a.get("/backfill");
  assert.equal(bf.status, 200);
  assert.equal(((await bf.json()) as { downloaded: number }).downloaded, 4);
  const idx = await a.get("/");
  assert.equal(idx.status, 200);
  const html = await idx.text();
  assert.match(html, /\/v\/1000000000000000001\.mp4/);
  assert.match(html, /two videos/);
  assert.doesNotMatch(html, /photo only/, "non-video bookmarks are not listed in v1");
  const st = await a.get("/status");
  assert.equal(((await st.json()) as { auth: string }).auth, "ok");
});

test("/v/:key streams from R2 with Range support and rejects bad keys", async () => {
  const a = await app();
  // VIDEO_KEY_RE (src/limits.ts) requires 5-25 digits — a real X post id — so the key
  // here must be long enough to pass, unlike the brief's illustrative "1.mp4".
  await a.r2.put("12345.mp4", new Uint8Array([1, 2, 3, 4, 5]), { httpMetadata: { contentType: "video/mp4" } });
  const full = await a.get("/v/12345.mp4");
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("content-type"), "video/mp4");
  assert.equal(full.headers.get("content-length"), "5");
  assert.equal(full.headers.get("content-range"), null, "a plain GET is not a 206, even though R2 reports a range internally");
  assert.equal((await full.arrayBuffer()).byteLength, 5);
  const part = await a.get("/v/12345.mp4", { range: "bytes=1-2" });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), "bytes 1-2/5");
  assert.equal(part.headers.get("accept-ranges"), "bytes");
  assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [2, 3]);
  assert.equal((await a.get("/v/missing.mp4")).status, 404);
  assert.equal((await a.get("/v/..%2Fsecret")).status, 404);
  assert.equal((await a.get("/v/%")).status, 404, "an undecodable key 404s instead of throwing");
});

test("/v/:key revalidation: If-None-Match hit → 304 with no body", async () => {
  const a = await app();
  await a.r2.put("12345.mp4", new Uint8Array([1, 2, 3, 4, 5]), { httpMetadata: { contentType: "video/mp4" } });
  const res = await a.get("/v/12345.mp4", { "if-none-match": '"12345.mp4"' });
  assert.equal(res.status, 304);
  assert.equal((await res.arrayBuffer()).byteLength, 0);
  assert.equal(res.headers.get("etag"), '"12345.mp4"');
});

test("/v/:key revalidation: If-Modified-Since not-modified → 304 with no body", async () => {
  const a = await app();
  await a.r2.put("12345.mp4", new Uint8Array([1, 2, 3, 4, 5]), { httpMetadata: { contentType: "video/mp4" } });
  const res = await a.get("/v/12345.mp4", { "if-modified-since": "Sat, 01 Aug 2026 00:00:00 GMT" });
  assert.equal(res.status, 304);
  assert.equal((await res.arrayBuffer()).byteLength, 0);
});

test("/v/:key: an unsatisfiable Range 416s", async () => {
  const a = await app();
  await a.r2.put("12345.mp4", new Uint8Array([1, 2, 3, 4, 5]), { httpMetadata: { contentType: "video/mp4" } });
  const res = await a.get("/v/12345.mp4", { range: "bytes=9999-" });
  assert.equal(res.status, 416);
});

test("/v/:key: a non-Range R2 fault propagates instead of becoming a 416", async () => {
  const a = await app();
  await assert.rejects(a.get("/v/99999.mp4"));
});

test("html escapes text", async () => {
  const { renderIndex } = await import("#src/html");
  const out = renderIndex([{ post_id: "1", first_seen_at: "2026-08-29T00:00:00Z", posted_at: null, text: "<script>x</script>", post_url: "https://x.com/i/status/1", has_video: 1, status: "downloaded", error: null, r2_key: "1.mp4", bytes: 1024, preview_url: null, updated_at: "" }], {});
  assert.doesNotMatch(out, /<script>x/);
  assert.match(out, /&lt;script&gt;/);
});
