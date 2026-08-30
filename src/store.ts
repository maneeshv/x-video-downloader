import type { Tokens } from "#src/x";

export type BookmarkStatus = "no_video" | "pending" | "downloaded" | "failed";
export type BookmarkRow = {
  post_id: string; first_seen_at: string; posted_at: string | null; text: string | null; post_url: string;
  has_video: 0 | 1; status: BookmarkStatus; error: string | null; r2_key: string | null; bytes: number | null;
  preview_url: string | null; updated_at: string;
  // Library metadata (migration 0002, ADR-0011). Owner-set; sync never writes them.
  title: string | null; description: string | null; favorite: 0 | 1; deleted_at: string | null;
};
export type BookmarkUpsert = Omit<BookmarkRow, "first_seen_at" | "updated_at" | "title" | "description" | "favorite" | "deleted_at"> & { now: string };
export type Status = {
  lastRun?: string; lastError?: string | null; auth?: "ok" | "needs_reauth"; counts?: Record<string, number>;
  totalBytes?: number; noMediaRuns?: number; alerts?: Record<string, string>;
};
export type VideoMeta = { postId: string; text: string; postUrl: string; postedAt: string | null; previewUrl: string | null; bitRate: number };

// R2 head(key) is the download truth (ADR-0003); D1 is the index (ADR-0007); KV is small mutable state.
const UPSERT = `INSERT INTO bookmarks (post_id, first_seen_at, posted_at, text, post_url, has_video, status, error, r2_key, bytes, preview_url, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(post_id) DO UPDATE SET
  status      = CASE WHEN bookmarks.status = 'downloaded' THEN 'downloaded' ELSE excluded.status END,
  error       = CASE WHEN bookmarks.status = 'downloaded' THEN bookmarks.error ELSE excluded.error END,
  r2_key      = COALESCE(excluded.r2_key, bookmarks.r2_key),
  bytes       = COALESCE(excluded.bytes, bookmarks.bytes),
  preview_url = COALESCE(excluded.preview_url, bookmarks.preview_url),
  posted_at   = COALESCE(excluded.posted_at, bookmarks.posted_at),
  text        = COALESCE(excluded.text, bookmarks.text),
  has_video   = MAX(bookmarks.has_video, excluded.has_video),
  updated_at  = excluded.updated_at`;

export class Store {
  readonly kv: KVNamespace;
  readonly db: D1Database;
  readonly r2: R2Bucket;
  constructor(kv: KVNamespace, db: D1Database, r2: R2Bucket) {
    this.kv = kv;
    this.db = db;
    this.r2 = r2;
  }

  getTokens(): Promise<Tokens | null> { return this.kv.get<Tokens>("oauth", "json"); }
  putTokens(t: Tokens): Promise<void> { return this.kv.put("oauth", JSON.stringify(t)); }
  clearTokens(): Promise<void> { return this.kv.delete("oauth"); }
  getUserId(): Promise<string | null> { return this.kv.get("userId"); }
  putUserId(id: string): Promise<void> { return this.kv.put("userId", id); }

  async getStatus(): Promise<Status> { return (await this.kv.get<Status>("status", "json")) ?? {}; }
  async patchStatus(p: Partial<Status>): Promise<Status> {
    const s = { ...(await this.getStatus()), ...p };
    await this.kv.put("status", JSON.stringify(s));
    return s;
  }
  async getPausedUntil(): Promise<number> { return Number(await this.kv.get("paused_until")) || 0; }
  pause(untilMs: number): Promise<void> { return this.kv.put("paused_until", String(untilMs)); }
  clearPause(): Promise<void> { return this.kv.delete("paused_until"); }

  putPkce(state: string, verifier: string): Promise<void> { return this.kv.put(`pkce:${state}`, verifier, { expirationTtl: 600 }); }
  async takePkce(state: string): Promise<string | null> {
    const v = await this.kv.get(`pkce:${state}`);
    if (v) await this.kv.delete(`pkce:${state}`);
    return v;
  }

  async upsertBookmark(r: BookmarkUpsert): Promise<void> {
    await this.db.prepare(UPSERT)
      .bind(r.post_id, r.now, r.posted_at, r.text, r.post_url, r.has_video, r.status, r.error, r.r2_key, r.bytes, r.preview_url, r.now)
      .run();
  }
  getBookmark(postId: string): Promise<BookmarkRow | null> {
    return this.db.prepare("SELECT * FROM bookmarks WHERE post_id = ?").bind(postId).first<BookmarkRow>();
  }
  async listDownloaded(limit = 500): Promise<BookmarkRow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM bookmarks WHERE status = 'downloaded' ORDER BY first_seen_at DESC, post_id DESC LIMIT ?")
      .bind(limit).all<BookmarkRow>();
    return results;
  }

  async has(key: string): Promise<boolean> { return (await this.r2.head(key)) !== null; }
  // body typed ArrayBufferLike (not ArrayBuffer): workerd's ambient TextEncoder.encode()
  // returns bare `Uint8Array` (worker-configuration.d.ts), whose `.buffer` widens to
  // ArrayBufferLike under esnext lib. Real callers never produce a SharedArrayBuffer, so the
  // narrowing cast to R2Bucket.put's own ArrayBuffer type below is safe.
  async putVideo(key: string, body: ReadableStream | ArrayBufferLike, meta: VideoMeta, contentType = "video/mp4"): Promise<void> {
    const customMetadata = Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, v === null ? "" : String(v)]));
    await this.r2.put(key, body as ReadableStream | ArrayBuffer, { httpMetadata: { contentType }, customMetadata });
  }
  getVideo(key: string, reqHeaders: Headers): Promise<R2ObjectBody | R2Object | null> {
    return this.r2.get(key, { range: reqHeaders, onlyIf: reqHeaders });
  }
}
