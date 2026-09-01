// Hard caps (ADR-0005). Compile-time constants on purpose: raising one is a code change + journal line.
export const VERSION = "v2";
export const MAX_API_REQUESTS_PER_RUN = 3;          // documents the structural bound of one run (1 bookmarks page + ≤2 token calls + ≤2 forced-refresh calls on 401); asserted by tests, not enforced at runtime.
export const MAX_DOWNLOADS_PER_RUN = 5;             // rest wait for the next tick (ADR-0008)
export const MAX_FILE_BYTES = 1024 ** 3;            // spec §5 said 200 MB; owner raised to 350 MB on 2026-08-30, then to 1 GB on 2026-08-31 (52 real bookmarks failed `too_large`) — ADR-0005 amendments
export const STORAGE_ALERT_BYTES = 9 * 1024 ** 3;   // alert, keep downloading (owner default Q6)
export const STORAGE_ALERT_STEP_BYTES = 3 * 1024 ** 3; // re-alert once per 3 GiB step crossed (9, 12, 15 …); 2026-08-31, `alerts.storage` had fired once at 14.56 GB and never again — ADR-0005 amendment
export const PAUSE_MS_AUTH = 24 * 3600_000;         // 401/403 → pause 24 h
export const REFRESH_AHEAD_MS = 5 * 60_000;         // refresh when < 5 min left (access token lives 2 h)
export const PAGE_SIZE = 20;                        // per cron run
export const BACKFILL_PAGE_SIZE = 90;               // >90 breaks next_token — devcommunity.x.com/t/257339
export const BACKFILL_MAX_ITEMS = 800;              // X returns at most the 800 most recent bookmarks
export const BACKFILL_MAX_REQUESTS = 10;            // 800/90 = 9 pages
export const BACKFILL_MAX_DOWNLOADS = 30;           // ceiling for /backfill?downloads=N (owner-driven drain, 2026-08-30); cron keeps MAX_DOWNLOADS_PER_RUN
export const STALE_PARSER_RUNS = 30;                // consecutive runs with results but zero media → alert
export const DOWNLOAD_JITTER_MS: readonly [number, number] = [1000, 2000];
export const VIDEO_KEY_RE = /^\d{5,25}(-\d{1,2})?\.mp4$/;
export const POST_ID_RE = /^\d{5,25}$/;              // route :postId — same digit range as VIDEO_KEY_RE
export const TITLE_MAX = 200;                        // library metadata caps (spec 2026-08-30 §6)
export const DESCRIPTION_MAX = 2000;

// X API v2 — docs.x.com/x-api/users/get-bookmarks, docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
export const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
export const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
export const X_API = "https://api.x.com/2";
export const X_SCOPES = "bookmark.read tweet.read users.read offline.access";
// No author_id / user.fields: may bill as $0.01 user reads (docs/research/2026-08-29-x-api-v2.md)
export const BOOKMARK_QUERY =
  "expansions=attachments.media_keys&media.fields=media_key,type,variants,preview_image_url,duration_ms&tweet.fields=created_at,text,attachments";
