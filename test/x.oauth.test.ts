import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeUrl, exchangeCode, fetchBookmarks, fetchMe, pkceChallenge, randomToken, refreshTokens, XApiError } from "#src/x";
import { fakeFetch } from "./fakes.ts";

const cfg = { clientId: "cid", clientSecret: "sec", redirectUri: "https://w.example/oauth/callback" };

test("pkce: verifier is base64url, challenge is S256 of it", async () => {
  const v = randomToken();
  assert.match(v, /^[A-Za-z0-9_-]{43}$/);
  // RFC 7636 appendix B vector
  assert.equal(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("authorizeUrl carries every required parameter", () => {
  const u = new URL(authorizeUrl(cfg, "st", "ch"));
  assert.equal(u.origin + u.pathname, "https://x.com/i/oauth2/authorize");
  const p = u.searchParams;
  assert.equal(p.get("response_type"), "code");
  assert.equal(p.get("client_id"), "cid");
  assert.equal(p.get("redirect_uri"), cfg.redirectUri);
  assert.equal(p.get("scope"), "bookmark.read tweet.read users.read offline.access");
  assert.equal(p.get("state"), "st");
  assert.equal(p.get("code_challenge"), "ch");
  assert.equal(p.get("code_challenge_method"), "S256");
});

test("exchangeCode posts basic auth + verifier, returns Tokens with expiresAt", async () => {
  const f = fakeFetch([{ status: 200, body: { access_token: "A", refresh_token: "R", expires_in: 7200 } }]);
  const t = await exchangeCode(f, cfg, "code1", "ver1", 1_000_000);
  assert.deepEqual(t, { access: "A", refresh: "R", expiresAt: 1_000_000 + 7200_000 });
  const [url, init] = f.calls[0];
  assert.equal(url, "https://api.x.com/2/oauth2/token");
  assert.equal((init.headers as Record<string, string>).Authorization, "Basic " + btoa("cid:sec"));
  const body = new URLSearchParams(init.body as string);
  assert.equal(body.get("grant_type"), "authorization_code");
  assert.equal(body.get("code"), "code1");
  assert.equal(body.get("code_verifier"), "ver1");
  assert.equal(body.get("redirect_uri"), cfg.redirectUri);
});

test("refreshTokens keeps the previous refresh token for fallback", async () => {
  const f = fakeFetch([{ status: 200, body: { access_token: "A2", refresh_token: "R2", expires_in: 7200 } }]);
  const t = await refreshTokens(f, cfg, "R1", 0);
  assert.deepEqual(t, { access: "A2", refresh: "R2", prevRefresh: "R1", expiresAt: 7200_000 });
  assert.equal(new URLSearchParams(f.calls[0][1].body as string).get("grant_type"), "refresh_token");
});

test("errors carry status/path/reset and never the token", async () => {
  const f = fakeFetch([{ status: 429, body: {}, headers: { "x-rate-limit-reset": "1700000000" } }]);
  await assert.rejects(fetchBookmarks(f, "SECRET-TOKEN", "u1", { maxResults: 20 }), (e: unknown) => {
    assert.ok(e instanceof XApiError);
    assert.equal(e.status, 429);
    assert.equal(e.rateLimitReset, 1700000000);
    assert.doesNotMatch(JSON.stringify({ ...e, message: e.message, stack: e.stack }), /SECRET-TOKEN/);
    return true;
  });
});

test("fetchBookmarks builds the exact query; fetchMe returns the id", async () => {
  const f = fakeFetch([
    { status: 200, body: { data: [], meta: { result_count: 0 } } },
    { status: 200, body: { data: { id: "42" } } },
  ]);
  await fetchBookmarks(f, "tok", "u1", { maxResults: 20, paginationToken: "p" });
  const u = new URL(f.calls[0][0] as string);
  assert.equal(u.pathname, "/2/users/u1/bookmarks");
  assert.equal(u.searchParams.get("max_results"), "20");
  assert.equal(u.searchParams.get("pagination_token"), "p");
  assert.equal(u.searchParams.get("expansions"), "attachments.media_keys");
  assert.equal(u.searchParams.get("tweet.fields"), "created_at,text,attachments");
  assert.equal((f.calls[0][1].headers as Record<string, string>).Authorization, "Bearer tok");
  assert.equal(await fetchMe(f, "tok"), "42");
});
