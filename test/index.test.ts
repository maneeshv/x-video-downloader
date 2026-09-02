import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, type AppEnv } from "#src/index";
import { MAX_FILE_BYTES, MIN_FILE_BYTES } from "#src/limits";
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
    if (url.includes("/tweets?")) {
      const ids = new Set(new URL(url).searchParams.get("ids")?.split(","));
      return { status: 200, body: { ...fixtureJson, data: fixtureJson.data.filter((t: { id: string }) => ids.has(t.id)) } };
    }
    if (url.includes("/bookmarks")) return { status: 200, body: fixtureJson };
    return { status: 200, bodyBytes: new Uint8Array([1, 2, 3]), headers: { "content-type": "video/mp4", "content-length": "3" } };
  });
  const env: AppEnv = { X_CLIENT_ID: "c", X_CLIENT_SECRET: "s", TEAM_DOMAIN: TEAM, POLICY_AUD: AUD, PUBLIC_ORIGIN: ORIGIN, VIDEOS: r2.asR2(), KV: kv.asKV(), DB: d1.asD1() };
  const jwt = await signer.sign({ aud: [AUD], iss: TEAM, exp: Date.now() / 1000 + 60, email: "o@example.com" });
  // Regression: Workers/undici throw "Illegal invocation" when fetch is called as a method of another
  // object (`deps.fetch(url)`), so every internal caller must invoke it unbound.
  const strict = function (this: unknown, ...args: Parameters<typeof f>) { assert.equal(this, undefined, "fetch called with a bound this"); return f(...args); };
  const get = (path: string, headers: Record<string, string> = {}) => handle(new Request(ORIGIN + path, { headers: { "cf-access-jwt-assertion": jwt, ...headers } }), env, strict as typeof f);
  const send = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
    handle(new Request(ORIGIN + path, { ...init, headers: { "cf-access-jwt-assertion": jwt, ...(init.headers ?? {}) } }), env, strict as typeof f);
  return { env, f, get, send, store: new Store(kv.asKV(), d1.asD1(), r2.asR2()), kv, r2 };
}

const dlRow = (post_id: string, over: Partial<Parameters<Store["upsertBookmark"]>[0]> = {}) => ({
  post_id, posted_at: "2026-08-01T00:00:00Z", text: "hello world", post_url: `https://x.com/i/status/${post_id}`, has_video: 1 as const,
  status: "downloaded" as const, error: null, r2_key: `${post_id}.mp4`, bytes: 5, duration_ms: 5000, preview_url: "https://pbs.twimg.com/p.jpg", now: "2026-08-02T00:00:00Z", ...over,
});
// One downloaded two-video post in D1 + R2.
async function seeded() {
  const a = await app();
  await a.store.upsertBookmark(dlRow("12345"));
  await a.r2.put("12345.mp4", new Uint8Array([1, 2, 3, 4, 5]), { httpMetadata: { contentType: "video/mp4" } });
  await a.r2.put("12345-1.mp4", new Uint8Array([1]), {});
  return a;
}
const jsonPost = (a: Awaited<ReturnType<typeof app>>, path: string, body: unknown, contentType = "application/json") =>
  a.send(path, { method: "POST", headers: { "content-type": contentType }, body: JSON.stringify(body) });

test("every route is 403 without a valid Access JWT", async () => {
  const { env, f } = await app();
  for (const p of ["/", "/status", "/oauth/start", "/oauth/callback?code=x&state=y", "/backfill", "/v/1.mp4", "/watch/12345", "/api/videos/12345", "/api/settings/max-file-bytes", "/stats"]) {
    assert.equal((await handle(new Request(ORIGIN + p), env, f)).status, 403, p);
  }
  assert.equal((await handle(new Request(ORIGIN + "/api/videos/12345", { method: "DELETE" }), env, f)).status, 403, "DELETE without JWT");
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
  const bf2 = await a.get("/backfill?downloads=2");
  assert.equal(((await bf2.json()) as { downloaded: number }).downloaded, 2, "?downloads=N caps the run");
  const bf = await a.get("/backfill");
  assert.equal(bf.status, 200);
  assert.equal(((await bf.json()) as { downloaded: number }).downloaded, 2, "remaining two on the default run");
  const idx = await a.get("/");
  assert.equal(idx.status, 200);
  const html = await idx.text();
  assert.match(html, /\/watch\/1000000000000000001"/);
  assert.match(html, /two videos/);
  assert.doesNotMatch(html, /photo only/, "non-video bookmarks are not listed in v1");
  const st = await a.get("/status");
  assert.equal(((await st.json()) as { auth: string }).auth, "ok");
});

test("duration backfill batches missing downloaded rows without downloading videos", async () => {
  const a = await app(), id = "1000000000000000004";
  await a.store.putTokens({ access: "A", refresh: "R", expiresAt: Date.now() + 3600_000 });
  await a.store.putUserId("u1");
  await a.store.upsertBookmark(dlRow(id, { duration_ms: null, r2_key: `${id}-2.mp4`, error: "http_404" }));
  for (let i = 0n; i < 100n; i++) {
    const missing = String(2_000_000_000_000_000_000n + i);
    await a.store.upsertBookmark(dlRow(missing, { duration_ms: null }));
  }
  await a.store.upsertBookmark(dlRow("3000000000000000001"));
  await a.store.upsertBookmark(dlRow("3000000000000000002", { status: "pending", duration_ms: null }));
  await a.store.upsertBookmark(dlRow("3000000000000000003", { duration_ms: null }));
  await a.store.markDeleted("3000000000000000003", "2026-09-02T00:00:00Z");
  const before = (await a.store.getBookmark(id))!;

  const res = await a.get("/backfill?durations=1");

  assert.equal(res.status, 200);
  assert.deepEqual((await res.json() as { durationBackfill: unknown }).durationBackfill, { checked: 101, updated: 1, unavailable: 100 });
  const after = (await a.store.getBookmark(id))!;
  assert.equal(after.duration_ms, 90000, "duration matches the stored second video");
  assert.equal((await a.store.getBookmark("2000000000000000000"))?.duration_ms, null, "an omitted post stays unknown");
  assert.deepEqual([after.status, after.error, after.r2_key, after.bytes, after.updated_at], [before.status, before.error, before.r2_key, before.bytes, before.updated_at]);
  const lookups = a.f.calls.filter(([url]) => url.includes("/tweets?"));
  assert.deepEqual(lookups.map(([url]) => new URL(url).searchParams.get("ids")!.split(",").length), [100, 1]);
  assert.equal(a.f.calls.some(([url]) => url.includes("/bookmarks") || url.includes("video.twimg.com")), false);
  assert.equal(a.r2.objects.size, 0);
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
  const out = renderIndex([{ post_id: "1", first_seen_at: "2026-08-29T00:00:00Z", posted_at: null, text: "<script>x</script>", post_url: "https://x.com/i/status/1", has_video: 1, status: "downloaded", error: null, r2_key: "1.mp4", bytes: 1024, duration_ms: null, preview_url: null, updated_at: "", title: null, description: null, favorite: 0, deleted_at: null }], {});
  assert.doesNotMatch(out, /<script>x/);
  assert.match(out, /&lt;script&gt;/);
});

test("library cards show video duration alongside file size", async () => {
  const { renderIndex } = await import("#src/html");
  const row = { post_id: "1", first_seen_at: "2026-08-29T00:00:00Z", posted_at: null, text: "t", post_url: "https://x.com/i/status/1", has_video: 1, status: "downloaded", error: null, r2_key: "1.mp4", bytes: 5 * 1024 ** 2, duration_ms: 65000, preview_url: null, updated_at: "", title: null, description: null, favorite: 0, deleted_at: null } as const;
  assert.match(renderIndex([row], {}), /5\.0 MB<\/span><span class="separator">·<\/span><span>1:05<\/span>/);
});

test("POST /api/videos/:id validates, then updates title/description/favorite", async () => {
  const a = await seeded();
  assert.equal((await jsonPost(a, "/api/videos/12345", { title: "T" }, "text/plain")).status, 415, "JSON content-type required (CSRF)");
  assert.equal((await a.send("/api/videos/12345", { method: "POST", headers: { "content-type": "application/json" }, body: "{" })).status, 400, "unparsable");
  assert.equal((await jsonPost(a, "/api/videos/12345", {})).status, 400, "no fields");
  assert.equal((await jsonPost(a, "/api/videos/12345", { favorite: "yes" })).status, 400, "wrong type");
  assert.equal((await jsonPost(a, "/api/videos/12345", { title: "x".repeat(201) })).status, 413);
  assert.equal((await jsonPost(a, "/api/videos/12345", { description: "x".repeat(2001) })).status, 413);
  assert.equal((await jsonPost(a, "/api/videos/99999", { title: "T" })).status, 404);
  assert.equal((await jsonPost(a, "/api/videos/abc", { title: "T" })).status, 404, "non-numeric id");
  assert.equal((await jsonPost(a, "/api/videos/12345", { title: "T", description: "D", favorite: true })).status, 204);
  const b = (await a.store.getBookmark("12345"))!;
  assert.deepEqual([b.title, b.description, b.favorite], ["T", "D", 1]);
  assert.equal((await a.send("/api/videos/12345", { method: "PUT" })).status, 405);
});

test("DELETE /api/videos/:id removes every R2 key, tombstones the row, and is idempotent", async () => {
  const a = await seeded();
  assert.equal((await a.send("/api/videos/99999", { method: "DELETE" })).status, 404);
  assert.equal((await a.send("/api/videos/12345", { method: "DELETE" })).status, 204);
  assert.deepEqual([...a.r2.objects.keys()], [], "both sibling keys gone");
  assert.ok((await a.store.getBookmark("12345"))!.deleted_at);
  assert.equal((await a.send("/api/videos/12345", { method: "DELETE" })).status, 204, "repeat delete");
  assert.equal((await a.get("/v/12345.mp4")).status, 404, "stream 404s once the object is gone");
  assert.equal((await jsonPost(a, "/api/videos/12345", { title: "T" })).status, 404, "deleted rows are not editable");
});

test("/ renders the grid and honours q, fav, sort; deleted videos leave it", async () => {
  const a = await seeded();
  await a.store.upsertBookmark(dlRow("12346", { text: "zebra crossing", posted_at: "2026-08-05T00:00:00Z", bytes: 10, duration_ms: 10000 }));
  await a.store.updateMeta("12346", { title: "Aardvark", favorite: true }, "2026-08-30T00:00:00Z");
  const html = async (p: string) => { const r = await a.get(p); assert.equal(r.status, 200, p); return r.text(); };
  let h = await html("/");
  assert.match(h, /href="\/watch\/12345"/);
  assert.match(h, /Aardvark/, "title shown");
  assert.match(h, /hello world/, "text fallback shown when no title");
  assert.match(h, /src="https:\/\/pbs\.twimg\.com\/p\.jpg"/, "poster hotlinked");
  assert.ok(h.indexOf("/watch/12346") < h.indexOf("/watch/12345"), "newest first");
  h = await html("/?sort=oldest");
  assert.ok(h.indexOf("/watch/12345") < h.indexOf("/watch/12346"));
  h = await html("/?sort=largest");
  assert.ok(h.indexOf("/watch/12346") < h.indexOf("/watch/12345"));
  assert.match(h, /<option value="largest" selected>Largest<\/option>/);
  h = await html("/?sort=smallest");
  assert.ok(h.indexOf("/watch/12345") < h.indexOf("/watch/12346"));
  h = await html("/?sort=longest");
  assert.ok(h.indexOf("/watch/12346") < h.indexOf("/watch/12345"));
  assert.match(h, /<option value="longest" selected>Longest<\/option>/);
  h = await html("/?sort=shortest");
  assert.ok(h.indexOf("/watch/12345") < h.indexOf("/watch/12346"));
  h = await html("/?q=zebra");
  assert.match(h, /\/watch\/12346\?q=zebra"/); assert.doesNotMatch(h, /\/watch\/12345\?q=zebra"/);
  assert.match(h, /value="zebra"/, "search box keeps the query");
  h = await html("/?fav=1");
  assert.match(h, /\/watch\/12346\?fav=1"/); assert.doesNotMatch(h, /\/watch\/12345\?fav=1"/);
  h = await html("/?q=nothing-matches");
  assert.match(h, /No matching videos/);
  await a.send("/api/videos/12346", { method: "DELETE" });
  assert.doesNotMatch(await html("/"), /\/watch\/12346"/, "deleted videos leave the grid");
});

test("/ paginates by 10, clamps pages, and allows up to 50 videos", async () => {
  const a = await seeded();
  for (let id = 12346; id <= 12356; id++) await a.store.upsertBookmark(dlRow(String(id)));
  const html = async (p: string) => { const r = await a.get(p); assert.equal(r.status, 200, p); return r.text(); };
  let h = await html("/");
  assert.equal((h.match(/class="video-card"/g) ?? []).length, 10, "default page size");
  assert.match(h, /1–10 of 12 videos/);
  assert.match(h, /name="perPage"/);
  assert.match(h, /<option value="50">50<\/option>/);
  assert.match(h, /href="\/\?page=2"/);
  h = await html("/?page=2");
  assert.equal((h.match(/class="video-card"/g) ?? []).length, 2);
  assert.match(h, /11–12 of 12 videos/);
  h = await html("/?page=999");
  assert.equal((h.match(/class="video-card"/g) ?? []).length, 2, "out-of-range page clamps to the last page");
  assert.match(h, /aria-current="page">2<\/a>/);
  h = await html("/?perPage=50");
  assert.equal((h.match(/class="video-card"/g) ?? []).length, 12);
  assert.match(h, /<option value="50" selected>50<\/option>/);
  h = await html("/?perPage=999");
  assert.equal((h.match(/class="video-card"/g) ?? []).length, 10, "invalid page size falls back to 10");
});

test("watch links carry library state and Back to library targets the originating card", async () => {
  const a = await seeded();
  for (let id = 12346; id <= 12368; id++) await a.store.upsertBookmark(dlRow(String(id)));
  const library = await (await a.get("/?q=hello&sort=oldest&page=2&perPage=20")).text();
  assert.equal((library.match(/class="video-card"/g) ?? []).length, 4);
  assert.match(library, /href="\/watch\/12365\?q=hello&amp;sort=oldest&amp;page=2&amp;perPage=20"/);
  const watch = await (await a.get("/watch/12365?q=hello&fav=1&sort=oldest&page=2&perPage=20")).text();
  assert.match(watch, /href="\/\?q=hello&amp;fav=1&amp;sort=oldest&amp;page=2&amp;perPage=20#video-12365"[^>]*>Back to library<\/a>/);
  assert.match(watch, /location\.href=backToLibrary/, "delete keeps the originating library state");
});

test("/watch/:id shows player + form; 404 for pending, deleted, unknown", async () => {
  const a = await seeded();
  await a.store.updateMeta("12345", { title: "My <title>", description: "desc" }, "2026-08-30T00:00:00Z");
  const r = await a.get("/watch/12345");
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<video[^>]*src="\/v\/12345\.mp4"/);
  assert.match(h, /value="My &lt;title&gt;"/, "escaped");
  assert.match(h, />desc<\/textarea>/);
  assert.match(h, /\/api\/videos\//, "mutation script present");
  await a.store.upsertBookmark(dlRow("12347", { status: "pending", r2_key: null }));
  assert.equal((await a.get("/watch/12347")).status, 404, "pending");
  assert.equal((await a.get("/watch/99999")).status, 404, "unknown");
  assert.equal((await a.get("/watch/abc")).status, 404, "bad id");
  await a.send("/api/videos/12345", { method: "DELETE" });
  assert.equal((await a.get("/watch/12345")).status, 404, "deleted");
});

test("library, watch and stats pages link to the Access logout URL", async () => {
  const { renderIndex, renderWatch } = await import("#src/html");
  const row = { post_id: "1", first_seen_at: "2026-08-29T00:00:00Z", posted_at: null, text: "t", post_url: "https://x.com/i/status/1", has_video: 1, status: "downloaded", error: null, r2_key: "1.mp4", bytes: 1024, duration_ms: null, preview_url: null, updated_at: "", title: null, description: null, favorite: 0, deleted_at: null } as const;
  assert.match(renderIndex([row], {}), /href="\/cdn-cgi\/access\/logout"/);
  assert.match(renderWatch(row), /href="\/cdn-cgi\/access\/logout"/);
  assert.match((await (await (await seeded()).get("/stats")).text()), /href="\/cdn-cgi\/access\/logout"/);
});

test("/stats shows counts, failures by reason, and the pending/failed posts; / links to it", async () => {
  const a = await seeded();
  await a.store.upsertBookmark(dlRow("12346", { bytes: 7 }));
  await a.store.upsertBookmark(dlRow("22222", { status: "failed", error: "too_large", r2_key: null, bytes: 1536 * 1024 ** 2, text: "<b>big</b> one" }));
  await a.store.upsertBookmark(dlRow("22223", { status: "failed", error: "too_large", r2_key: null, bytes: null }));
  await a.store.upsertBookmark(dlRow("33333", { status: "pending", r2_key: null, bytes: null }));
  await a.store.upsertBookmark(dlRow("44444", { status: "no_video", has_video: 0, r2_key: null, bytes: null }));
  await a.send("/api/videos/12346", { method: "DELETE" });
  await a.store.patchStatus({ lastRun: "2026-08-30T12:00:00Z", auth: "ok", alerts: { storage: "2026-08-30T12:00:37Z" }, counts: { seen: 20, downloaded: 5, failed: 0, pages: 1 } });
  const res = await a.get("/stats");
  assert.equal(res.status, 200);
  const body = await res.text();
  for (const needle of [
    'data-stat="downloaded">1<', 'data-stat="pending">1<', 'data-stat="failed">2<', 'data-stat="no_video">1<', 'data-stat="deleted">1<',
    'data-stat="bytes">5 B<', "too_large</td><td>2", "&lt;b&gt;big&lt;/b&gt; one", "2026-08-30T12:00:00Z", "storage", "seen 20",
    'href="https://x.com/i/status/33333"', 'data-retry="22222"', 'href="/backfill', "<th>Size</th>", '<td>1536.0 MB</td><td><button type="button" data-retry="22222"',
    'id="max-file-mb"', 'value="1024"', 'max="5120"', '5 GB hard maximum',
  ]) assert.ok(body.includes(needle), needle);
  assert.ok(!body.includes("<b>big</b>"), "text is escaped");
  assert.ok((await (await a.get("/")).text()).includes('href="/stats"'), "library header links to /stats");
});

test("POST /api/settings/max-file-bytes validates and persists the stats-page limit", async () => {
  const a = await app();
  const path = "/api/settings/max-file-bytes";
  assert.equal((await a.send(path, { method: "POST", body: "{}" })).status, 415, "JSON only");
  assert.equal((await a.send(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{" })).status, 400, "unparsable");
  for (const value of [null, "1", 1.5, MIN_FILE_BYTES - 1, MAX_FILE_BYTES + 1]) {
    assert.equal((await jsonPost(a, path, { maxFileBytes: value })).status, 400, String(value));
  }
  assert.equal((await jsonPost(a, path, { maxFileBytes: MAX_FILE_BYTES })).status, 204, "5 GiB boundary is accepted");
  const selected = 1536 * 1024 ** 2;
  assert.equal((await jsonPost(a, path, { maxFileBytes: selected })).status, 204);
  assert.equal(await a.store.getMaxFileBytes(), selected);
  const body = await (await a.get("/stats")).text();
  assert.ok(body.includes('id="max-file-mb"'));
  assert.ok(body.includes('value="1536"'));
  assert.equal((await a.get(path)).status, 405);
});

test("POST /api/videos/:id/retry resets a failed row to pending; 404 otherwise; json only", async () => {
  const a = await seeded();
  await a.store.upsertBookmark(dlRow("22222", { status: "failed", error: "too_large", r2_key: null, bytes: null }));
  assert.equal((await a.send("/api/videos/22222/retry", { method: "POST" })).status, 415, "no content-type");
  assert.equal((await jsonPost(a, "/api/videos/22222/retry", {})).status, 204);
  const b = (await a.store.getBookmark("22222"))!;
  assert.deepEqual([b.status, b.error], ["pending", null]);
  assert.equal((await jsonPost(a, "/api/videos/22222/retry", {})).status, 404, "already pending");
  assert.equal((await jsonPost(a, "/api/videos/12345/retry", {})).status, 404, "downloaded");
  assert.equal((await jsonPost(a, "/api/videos/99999/retry", {})).status, 404, "unknown");
  assert.equal((await jsonPost(a, "/api/videos/bad!/retry", {})).status, 404, "bad id");
  assert.equal((await a.send("/api/videos/22222/retry", { method: "GET" })).status, 405);
});

test("watch page carries a Download link to the same file the player uses", async () => {
  const { renderWatch } = await import("#src/html");
  const row = { post_id: "1", first_seen_at: "2026-08-29T00:00:00Z", posted_at: null, text: "t", post_url: "https://x.com/i/status/1", has_video: 1, status: "downloaded", error: null, r2_key: "1-2.mp4", bytes: 1024, duration_ms: null, preview_url: null, updated_at: "", title: null, description: null, favorite: 0, deleted_at: null } as const;
  assert.match(renderWatch(row), /<a[^>]*href="\/v\/1-2\.mp4"[^>]*download="1\.mp4"/);
});

test("POST /api/videos/retry-all resets every failed row to pending and returns the count; json only", async () => {
  const a = await seeded();
  await a.store.upsertBookmark(dlRow("22222", { status: "failed", error: "too_large", r2_key: null, bytes: null }));
  await a.store.upsertBookmark(dlRow("22223", { status: "failed", error: "http_403", r2_key: null, bytes: null }));
  assert.ok((await a.get("/stats")).ok);
  assert.ok((await (await a.get("/stats")).text()).includes('id="retry-all"'), "button in the failed section");
  assert.equal((await a.send("/api/videos/retry-all", { method: "POST" })).status, 415, "no content-type");
  assert.equal((await a.send("/api/videos/retry-all", { method: "GET" })).status, 405);
  const res = await jsonPost(a, "/api/videos/retry-all", {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /^application\/json/);
  assert.deepEqual(await res.json(), { retried: 2 });
  assert.equal((await a.store.getBookmark("22222"))!.status, "pending");
  assert.equal((await a.store.getBookmark("12345"))!.status, "downloaded");
  assert.deepEqual(await (await jsonPost(a, "/api/videos/retry-all", {})).json(), { retried: 0 });
});

test("DELETE /api/videos/:id subtracts the row's bytes from status.totalBytes once, clamped at 0", async () => {
  const a = await seeded();
  await a.store.patchStatus({ totalBytes: 12 });
  await a.send("/api/videos/12345", { method: "DELETE" });
  assert.equal((await a.store.getStatus()).totalBytes, 7);
  await a.send("/api/videos/12345", { method: "DELETE" });
  assert.equal((await a.store.getStatus()).totalBytes, 7, "repeat delete does not subtract again");
  await a.store.upsertBookmark(dlRow("12346"));
  await a.store.patchStatus({ totalBytes: 3 });
  await a.send("/api/videos/12346", { method: "DELETE" });
  assert.equal((await a.store.getStatus()).totalBytes, 0, "clamped at 0");
});
