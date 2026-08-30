import type { BookmarkRow, Status } from "#src/store";

const esc = (s: string | null) => (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mb = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : "");

export function renderIndex(rows: BookmarkRow[], status: Status): string {
  // ponytail: multi-video posts show the first video only; the others are in R2 as <id>-n.mp4 (rclone gets them).
  const items = rows.map((r) => `<li>
  <video controls preload="none" ${r.preview_url ? `poster="${esc(r.preview_url)}"` : ""} src="/v/${esc(r.r2_key)}"></video>
  <p>${esc(r.text)}</p>
  <p><a href="${esc(r.post_url)}">post</a> · <a href="/v/${esc(r.r2_key)}" download>download</a> · ${mb(r.bytes)} · ${esc((r.posted_at ?? r.first_seen_at).slice(0, 10))}</p>
</li>`).join("\n");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>x-downloader</title>
<style>body{font:16px system-ui;margin:1rem;max-width:720px}video{width:100%;max-height:70vh;background:#000}li{list-style:none;margin:0 0 2rem}p{margin:.3rem 0}</style>
<h1>x-downloader <small>${rows.length} videos · last run ${esc(status.lastRun ?? "never")}${status.auth === "needs_reauth" ? ' · <a href="/oauth/start">re-authorize</a>' : ""}</small></h1>
<ul>${items}</ul>`;
}
