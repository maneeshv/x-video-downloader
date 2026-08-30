import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "#src/store";
import { FakeD1, FakeKV, FakeR2 } from "./fakes.ts";

const mk = () => { const kv = new FakeKV(), r2 = new FakeR2(), d1 = new FakeD1(); return { kv, r2, d1, s: new Store(kv.asKV(), d1.asD1(), r2.asR2()) }; };
const row = (over: Partial<Parameters<Store["upsertBookmark"]>[0]> = {}) => ({
  post_id: "1", posted_at: "2026-08-01T00:00:00Z", text: "t", post_url: "https://x.com/i/status/1", has_video: 1 as const,
  status: "pending" as const, error: null, r2_key: null, bytes: null, preview_url: null, now: "2026-08-29T00:00:00Z", ...over,
});

test("tokens, userId, status, pause round-trip through KV", async () => {
  const { s } = mk();
  assert.equal(await s.getTokens(), null);
  await s.putTokens({ access: "a", refresh: "r", expiresAt: 5 });
  assert.deepEqual(await s.getTokens(), { access: "a", refresh: "r", expiresAt: 5 });
  await s.putUserId("42"); assert.equal(await s.getUserId(), "42");
  assert.deepEqual(await s.getStatus(), {});
  await s.patchStatus({ lastRun: "x" }); await s.patchStatus({ auth: "ok" });
  assert.deepEqual(await s.getStatus(), { lastRun: "x", auth: "ok" });
  assert.equal(await s.getPausedUntil(), 0);
  await s.pause(123); assert.equal(await s.getPausedUntil(), 123);
  await s.clearPause(); assert.equal(await s.getPausedUntil(), 0);
});

test("pkce verifier is single-use", async () => {
  const { s } = mk();
  await s.putPkce("st", "ver");
  assert.equal(await s.takePkce("st"), "ver");
  assert.equal(await s.takePkce("st"), null);
});

test("upsert is idempotent, keeps first_seen_at, never downgrades downloaded", async () => {
  const { s } = mk();
  await s.upsertBookmark(row());
  await s.upsertBookmark(row({ now: "2026-08-30T00:00:00Z", status: "downloaded", r2_key: "1.mp4", bytes: 10 }));
  await s.upsertBookmark(row({ now: "2026-08-31T00:00:00Z", status: "pending" }));
  const b = await s.getBookmark("1");
  assert.equal(b?.first_seen_at, "2026-08-29T00:00:00Z");
  assert.equal(b?.updated_at, "2026-08-31T00:00:00Z");
  assert.equal(b?.status, "downloaded");
  assert.equal(b?.r2_key, "1.mp4");
  assert.equal(b?.bytes, 10);
  assert.equal((await s.listDownloaded()).length, 1);
});

test("listDownloaded is newest-first and only downloaded", async () => {
  const { s } = mk();
  await s.upsertBookmark(row({ post_id: "1", now: "2026-08-01T00:00:00Z", status: "downloaded", r2_key: "1.mp4" }));
  await s.upsertBookmark(row({ post_id: "2", now: "2026-08-02T00:00:00Z", status: "downloaded", r2_key: "2.mp4" }));
  await s.upsertBookmark(row({ post_id: "3", now: "2026-08-03T00:00:00Z", status: "no_video", has_video: 0 }));
  assert.deepEqual((await s.listDownloaded()).map((r) => r.post_id), ["2", "1"]);
});

test("putVideo stores metadata as strings; has() reflects R2", async () => {
  const { s, r2 } = mk();
  assert.equal(await s.has("1.mp4"), false);
  await s.putVideo("1.mp4", new TextEncoder().encode("abc").buffer, { postId: "1", text: "t", postUrl: "u", postedAt: null, previewUrl: null, bitRate: 5 });
  assert.equal(await s.has("1.mp4"), true);
  assert.equal(r2.objects.get("1.mp4")!.customMetadata.bitRate, "5");
  assert.equal(r2.objects.get("1.mp4")!.customMetadata.postedAt, "");
  assert.equal(r2.objects.get("1.mp4")!.contentType, "video/mp4");
});

test("migration 0002: library columns exist and default to unset", async () => {
  const { s } = mk();
  await s.upsertBookmark(row());
  const b = (await s.getBookmark("1"))!;
  assert.deepEqual([b.title, b.description, b.favorite, b.deleted_at], [null, null, 0, null]);
});
