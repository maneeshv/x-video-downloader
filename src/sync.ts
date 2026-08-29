import {
  BACKFILL_MAX_ITEMS, BACKFILL_MAX_REQUESTS, BACKFILL_PAGE_SIZE, BUFFER_IF_NO_LENGTH_BYTES, DOWNLOAD_JITTER_MS,
  MAX_DOWNLOADS_PER_RUN, MAX_FILE_BYTES, PAGE_SIZE, PAUSE_MS_AUTH, REFRESH_AHEAD_MS, STALE_PARSER_RUNS, STORAGE_ALERT_BYTES,
} from "#src/limits";
import type { BookmarkStatus, BookmarkUpsert, Store } from "#src/store";
import { fetchBookmarks, parseBookmarks, refreshTokens, XApiError, type Fetch, type Item, type OAuthCfg, type Video } from "#src/x";

export type Cfg = OAuthCfg & { publicOrigin: string; telegram?: { token: string; chatId: string } };
export type Deps = { store: Store; fetch: Fetch; cfg: Cfg; now?: () => number; sleep?: (ms: number) => Promise<void>; random?: () => number };
export type SyncResult = { skipped?: "paused" | "needs_reauth"; error?: string; pages: number; seen: number; downloaded: number; failed: number; bytes: number };

const now = (d: Deps) => (d.now ?? Date.now)();
const iso = (ms: number) => new Date(ms).toISOString();

export async function alert(d: Deps, key: string, text: string): Promise<void> {
  const s = await d.store.getStatus();
  if (s.alerts?.[key]) return;
  if (d.cfg.telegram) {
    const { token, chatId } = d.cfg.telegram;
    // https://core.telegram.org/bots/api#sendmessage — send before marking, so a failed send is retried next time.
    const ok = await d.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `x-downloader: ${text}` }),
    }).then((r) => r.ok).catch(() => false);
    if (!ok) return;
  }
  await d.store.patchStatus({ alerts: { ...s.alerts, [key]: iso(now(d)) } });
}

export async function clearAlert(d: Deps, key: string): Promise<void> {
  const s = await d.store.getStatus();
  if (!s.alerts?.[key]) return;
  const { [key]: _, ...rest } = s.alerts;
  await d.store.patchStatus({ alerts: rest });
}

// Refresh tokens are single-use and rotate (docs/GOTCHAS.md): persist the new pair BEFORE using it; fall back to prevRefresh once.
export async function ensureAccessToken(d: Deps, force = false): Promise<string | null> {
  const t = await d.store.getTokens();
  if (!t) return null;
  if (!force && t.expiresAt - now(d) > REFRESH_AHEAD_MS) return t.access;
  for (const r of [t.refresh, t.prevRefresh]) {
    if (!r) continue;
    try {
      const nt = await refreshTokens(d.fetch, d.cfg, r, now(d));
      if (r === t.prevRefresh) nt.prevRefresh = t.prevRefresh;
      await d.store.putTokens(nt);
      return nt.access;
    } catch (e) {
      if (!(e instanceof XApiError) || e.status >= 500) throw e;
    }
  }
  return null;
}

async function needsReauth(d: Deps, res: SyncResult): Promise<SyncResult> {
  await d.store.patchStatus({ auth: "needs_reauth", lastError: "needs_reauth", lastRun: iso(now(d)) });
  await d.store.pause(now(d) + PAUSE_MS_AUTH);
  await alert(d, "needs_reauth", `re-authorize at ${d.cfg.publicOrigin}/oauth/start`);
  return { ...res, skipped: "needs_reauth" };
}

function row(it: Item, status: BookmarkStatus, d: Deps, extra: Partial<BookmarkUpsert> = {}): BookmarkUpsert {
  return {
    post_id: it.postId, posted_at: it.postedAt, text: it.text, post_url: it.postUrl, has_video: it.hasVideoMedia ? 1 : 0,
    status, error: null, r2_key: it.videos[0]?.key ?? null, bytes: null, preview_url: it.previewUrl, now: iso(now(d)), ...extra,
  };
}

type Dl = { ok: true; bytes: number } | { ok: false; status: BookmarkStatus; error: string };

async function download(d: Deps, it: Item, v: Video): Promise<Dl> {
  const res = await d.fetch(v.url);
  if (!res.ok || !res.body) return { ok: false, status: res.status >= 500 ? "pending" : "failed", error: `http_${res.status}` };
  const len = Number(res.headers.get("content-length")) || 0;
  if (len > MAX_FILE_BYTES) return { ok: false, status: "failed", error: "too_large" };
  let body: ReadableStream | ArrayBuffer = res.body, bytes = len;
  if (!len) {
    // R2.put needs a known length for streams; buffer small unknown-length bodies, refuse big ones.
    const buf = await res.arrayBuffer();
    if (buf.byteLength > BUFFER_IF_NO_LENGTH_BYTES) return { ok: false, status: "failed", error: "no_length" };
    body = buf; bytes = buf.byteLength;
  }
  await d.store.putVideo(v.key, body, { postId: it.postId, text: it.text, postUrl: it.postUrl, postedAt: it.postedAt, previewUrl: it.previewUrl, bitRate: v.bitRate });
  return { ok: true, bytes };
}

async function processItem(d: Deps, it: Item, res: SyncResult, budget: { downloads: number }): Promise<void> {
  if (!it.hasVideoMedia) return d.store.upsertBookmark(row(it, "no_video", d));
  if (it.videos.length === 0) { res.failed++; return d.store.upsertBookmark(row(it, "failed", d, { error: "no_variants" })); }
  // Spec §5: failed rows are not retried unless the error is transient (http_5xx).
  const prev = await d.store.getBookmark(it.postId);
  if (prev?.status === "failed" && !prev.error?.startsWith("http_5")) return;
  let bytes = 0, complete = true, fail: Dl | null = null;
  for (const v of it.videos) {
    const head = await d.store.r2.head(v.key);
    if (head) { bytes += head.size; continue; }
    if (budget.downloads >= MAX_DOWNLOADS_PER_RUN) { complete = false; continue; }
    budget.downloads++;
    let r: Dl;
    try { r = await download(d, it, v); } catch { r = { ok: false, status: "pending", error: "exception" }; }
    if (r.ok) { bytes += r.bytes; res.downloaded++; res.bytes += r.bytes; }
    else { complete = false; fail = r; res.failed++; }
    const [lo, hi] = DOWNLOAD_JITTER_MS;
    await (d.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(lo + (d.random ?? Math.random)() * (hi - lo));
  }
  if (complete) return d.store.upsertBookmark(row(it, "downloaded", d, { bytes }));
  if (fail && !fail.ok) return d.store.upsertBookmark(row(it, fail.status, d, { error: fail.error }));
  return d.store.upsertBookmark(row(it, "pending", d));
}

async function breaker(d: Deps, e: XApiError, res: SyncResult): Promise<SyncResult> {
  const t = now(d);
  // Fold bytes downloaded before the failure into totalBytes first, so every exit path
  // below (including needsReauth's early return on a dead 401) accounts for them.
  const s = await d.store.getStatus();
  await d.store.patchStatus({ totalBytes: (s.totalBytes ?? 0) + res.bytes });
  if (e.status === 401) {
    const access = await ensureAccessToken(d, true);
    if (!access) return needsReauth(d, res);
  } else if (e.status === 429) {
    await d.store.pause(e.rateLimitReset ? e.rateLimitReset * 1000 : t + 15 * 60_000);
    await alert(d, "api_429", `rate limited, paused until ${iso(await d.store.getPausedUntil())}`);
  } else if (e.status === 403) {
    await d.store.pause(t + PAUSE_MS_AUTH);
    await alert(d, "api_403", `403 from X on ${e.path}; paused 24h. Check console.x.com credits/app.`);
  }
  await d.store.patchStatus({ lastRun: iso(t), lastError: e.message });
  return { ...res, error: e.message };
}

export async function sync(d: Deps, o: { backfill?: boolean } = {}): Promise<SyncResult> {
  const res: SyncResult = { pages: 0, seen: 0, downloaded: 0, failed: 0, bytes: 0 };
  if ((await d.store.getPausedUntil()) > now(d)) return { ...res, skipped: "paused" };

  const maxPages = o.backfill ? BACKFILL_MAX_REQUESTS : 1;
  const pageSize = o.backfill ? BACKFILL_PAGE_SIZE : PAGE_SIZE;
  const budget = { downloads: 0 };
  let paginationToken: string | undefined, resultCount = 0, sawMedia = false;
  try {
    const access = await ensureAccessToken(d);
    const userId = await d.store.getUserId();
    if (!access || !userId) return needsReauth(d, res);

    for (let page = 0; page < maxPages; page++) {
      const body = await fetchBookmarks(d.fetch, access, userId, { maxResults: pageSize, paginationToken });
      res.pages++;
      resultCount += body.meta?.result_count ?? 0;
      const items = parseBookmarks(body);
      res.seen += items.length;
      for (const it of items) {
        sawMedia ||= it.hasVideoMedia;
        await processItem(d, it, res, budget);
      }
      paginationToken = body.meta?.next_token;
      if (!paginationToken || res.seen >= BACKFILL_MAX_ITEMS) break;
    }
  } catch (e) {
    if (e instanceof XApiError) return breaker(d, e, res);
    await d.store.patchStatus({ lastRun: iso(now(d)), lastError: String(e) });
    throw e;
  }

  const s = await d.store.getStatus();
  const noMediaRuns = resultCount > 0 && !sawMedia ? (s.noMediaRuns ?? 0) + 1 : 0;
  if (noMediaRuns >= STALE_PARSER_RUNS) await alert(d, "stale_parser", `${noMediaRuns} runs with bookmarks but zero media — parser may be stale`);
  const totalBytes = (s.totalBytes ?? 0) + res.bytes;
  if (totalBytes > STORAGE_ALERT_BYTES) await alert(d, "storage", `stored ${(totalBytes / 1024 ** 3).toFixed(2)} GB (> 9 GB)`);
  await d.store.patchStatus({
    lastRun: iso(now(d)), lastError: null, auth: "ok", totalBytes, noMediaRuns,
    counts: { seen: res.seen, downloaded: res.downloaded, failed: res.failed, pages: res.pages },
  });
  for (const k of ["needs_reauth", "api_403", "api_429"]) await clearAlert(d, k);
  return res;
}
