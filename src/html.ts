import type { BookmarkRow, LibraryQuery, StatRow, Status } from "#src/store";

const esc = (s: string | null) => (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mb = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : "");
const bytes = (b: number) => (b < 1024 ? `${b} B` : b < 1024 ** 3 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${(b / 1024 ** 3).toFixed(2)} GB`);
// Only https URLs are ever emitted into src/href (spec §7); anything else renders empty.
const url = (u: string | null) => (u && u.startsWith("https://") ? esc(u) : "");
const title = (r: BookmarkRow) => r.title ?? ((r.text ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || r.post_id);
const day = (r: BookmarkRow) => (r.posted_at ?? r.first_seen_at).slice(0, 10);

const CSS = `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101418;color:#e6e9ee;font:15px/1.4 system-ui,sans-serif}
a{color:inherit;text-decoration:none}
header{position:sticky;top:0;z-index:1;background:#161b22;border-bottom:1px solid #262c36;padding:.6rem 1rem}
header,header form{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}header form{flex:1}.brand{font-weight:700;margin-right:.5rem}.out{margin-left:auto}
input,select,textarea,button{font:inherit;color:inherit;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:.4rem .6rem}
input[type=search]{flex:1;min-width:10rem}
.pill{border:1px solid #30363d;border-radius:999px;padding:.3rem .8rem}.pill.on,button.on{background:#f0b429;color:#101418;border-color:#f0b429}
.count{margin-left:auto;color:#8b949e;font-size:.85rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;padding:1rem}
.card{display:block;background:#161b22;border-radius:8px;overflow:hidden;transition:transform .1s}.card:hover{transform:scale(1.03)}
.poster{position:relative;aspect-ratio:16/9;background:#262c36}.poster img{width:100%;height:100%;object-fit:cover;display:block}
.star{position:absolute;top:.4rem;right:.5rem;color:#f0b429;text-shadow:0 0 4px #000}
.meta{padding:.5rem .7rem}.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.d{color:#8b949e;font-size:.85rem}
.empty{grid-column:1/-1;color:#8b949e;text-align:center;padding:3rem}.empty a{text-decoration:underline}
.watch{max-width:960px;margin:0 auto;padding:1rem}video{width:100%;max-height:75vh;background:#000;border-radius:8px}
#meta{display:grid;gap:.6rem;margin-top:1rem}textarea{min-height:5rem;resize:vertical}.row{display:flex;gap:.6rem;align-items:center}
button.danger{margin-left:auto;border-color:#f85149;color:#f85149}#msg{color:#8b949e}.src{white-space:pre-wrap;color:#c9d1d9}
.stats{max-width:1100px;margin:0 auto;padding:0 1rem 2rem}.stats h2{font-size:1rem;color:#8b949e;margin:1.5rem 0 .5rem}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.8rem;margin-top:1rem}.tile{background:#161b22;border-radius:8px;padding:.8rem}
.tile .l{display:block;color:#8b949e;font-size:.85rem}.tile b{font-size:1.8rem;font-weight:600}.bad{color:#f85149}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #262c36;vertical-align:top}th{color:#8b949e;font-weight:500}
.err{font-family:ui-monospace,monospace;font-size:.85rem}.snip{color:#c9d1d9}`;

const page = (t: string, body: string) =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><style>${CSS}</style><body>${body}`;

export function renderIndex(rows: BookmarkRow[], status: Status, q: LibraryQuery = {}): string {
  const link = (over: Partial<LibraryQuery>) => {
    const m = { ...q, ...over }, p = new URLSearchParams();
    if (m.q) p.set("q", m.q);
    if (m.fav) p.set("fav", "1");
    if (m.sort && m.sort !== "newest") p.set("sort", m.sort);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };
  // ponytail: multi-video posts show the first video only; the others are in R2 as <id>-n.mp4 (rclone gets them).
  const cards = rows.map((r) => `<a class="card" href="/watch/${esc(r.post_id)}">
  <div class="poster">${r.preview_url ? `<img loading="lazy" src="${url(r.preview_url)}" alt="">` : ""}${r.favorite ? '<span class="star">★</span>' : ""}</div>
  <div class="meta"><div class="t">${esc(title(r))}</div><div class="d">${esc(day(r))} · ${mb(r.bytes)}</div></div>
</a>`).join("\n");
  const sorts = (["newest", "oldest", "title"] as const).map((s) => `<option value="${s}"${(q.sort ?? "newest") === s ? " selected" : ""}>${s}</option>`).join("");
  return page("Library", `<header><form method="get" action="/">
  <a class="brand" href="/">x-downloader</a>
  <input type="search" name="q" placeholder="Search title, description, text" value="${esc(q.q ?? "")}">
  ${q.fav ? '<input type="hidden" name="fav" value="1">' : ""}
  <select name="sort" onchange="this.form.submit()">${sorts}</select>
  <a class="pill${q.fav ? " on" : ""}" href="${link({ fav: !q.fav })}">★ Favourites</a>
  <span class="count">${rows.length} videos · last run ${esc(status.lastRun ?? "never")} · <a href="/stats">Stats</a>${status.auth === "needs_reauth" ? ' · <a href="/oauth/start">re-authorize</a>' : ""}</span>
  <a class="pill" href="/cdn-cgi/access/logout">Log out</a>
</form></header>
<main class="grid">${cards || '<p class="empty">No videos match. <a href="/">Show all</a></p>'}</main>`);
}

export function renderWatch(r: BookmarkRow): string {
  return page(title(r), `<header><a class="brand" href="/">← Library</a><a class="pill out" href="/cdn-cgi/access/logout">Log out</a></header>
<main class="watch">
  <video controls autoplay playsinline src="/v/${esc(r.r2_key)}"${r.preview_url ? ` poster="${url(r.preview_url)}"` : ""}></video>
  <form id="meta">
    <input name="title" maxlength="200" placeholder="Title" value="${esc(r.title)}">
    <textarea name="description" maxlength="2000" placeholder="Description">${esc(r.description)}</textarea>
    <div class="row"><button type="submit">Save</button><button type="button" id="fav"${r.favorite ? ' class="on"' : ""}>★ Favourite</button><button type="button" id="del" class="danger">Delete</button><span id="msg"></span></div>
  </form>
  <p class="src">${esc(r.text)}</p>
  <p class="d"><a href="${url(r.post_url)}">original post</a> · <a href="/v/${esc(r.r2_key)}" download>download</a> · ${mb(r.bytes)} · ${esc(day(r))}</p>
</main>
<script>
const api="/api/videos/${esc(r.post_id)}",msg=document.getElementById("msg");let fav=${r.favorite ? "true" : "false"};
async function send(method,body){const res=await fetch(api,{method,headers:body?{"content-type":"application/json"}:{},body:body&&JSON.stringify(body)});if(!res.ok){alert(method+" failed: "+res.status);return false}return true}
document.getElementById("meta").onsubmit=async e=>{e.preventDefault();const f=e.target;if(await send("POST",{title:f.title.value,description:f.description.value}))msg.textContent="Saved"};
document.getElementById("fav").onclick=async()=>{if(await send("POST",{favorite:!fav})){fav=!fav;document.getElementById("fav").classList.toggle("on",fav)}};
document.getElementById("del").onclick=async()=>{if(confirm("Delete this video from storage? This cannot be undone.")&&await send("DELETE"))location.href="/"};
</script>`);
}

// Stat tiles + tables, no charts: there is no time series to plot, only current counts.
export function renderStats(stats: StatRow[], rows: BookmarkRow[], status: Status, pausedUntil: number): string {
  const live = stats.filter((r) => !r.deleted);
  const n = (st: string) => live.filter((r) => r.status === st).reduce((a, r) => a + r.n, 0);
  const tile = (key: string, label: string, value: string | number, cls = "") => `<div class="tile"><span class="l">${label}</span><b class="${cls}" data-stat="${key}">${value}</b></div>`;
  const reasons = live.filter((r) => r.status === "failed").sort((a, b) => b.n - a.n)
    .map((r) => `<tr><td class="err">${esc(r.error ?? "?")}</td><td>${r.n}</td></tr>`).join("");
  const snippet = (r: BookmarkRow) => (r.text ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || r.post_id;
  const table = (st: "pending" | "failed") => {
    const rs = rows.filter((r) => r.status === st);
    if (!rs.length) return `<p class="d">None.</p>`;
    return `<table><tr><th>Post</th><th>${st === "failed" ? "Error" : "Since"}</th><th>Updated</th>${st === "failed" ? "<th></th>" : ""}</tr>${rs.map((r) => `<tr>
  <td><a class="snip" href="${url(r.post_url)}">${esc(snippet(r))}</a></td>
  <td class="err">${esc(st === "failed" ? r.error : r.first_seen_at.slice(0, 10))}</td><td class="d">${esc(r.updated_at.slice(0, 16).replace("T", " "))}</td>
  ${st === "failed" ? `<td><button type="button" data-retry="${esc(r.post_id)}">Retry</button></td>` : ""}
</tr>`).join("")}</table>`;
  };
  const c = status.counts ?? {};
  const alerts = Object.entries(status.alerts ?? {}).map(([k, t]) => `${esc(k)} ${esc(t)}`).join(", ");
  return page("Stats", `<header><a class="brand" href="/">← Library</a> <a class="pill" href="/backfill?downloads=30">Run backfill now</a><a class="pill out" href="/cdn-cgi/access/logout">Log out</a></header>
<main class="stats">
  <div class="tiles">
    ${tile("downloaded", "Downloaded", n("downloaded"))}${tile("pending", "Pending", n("pending"))}${tile("failed", "Failed", n("failed"), n("failed") ? "bad" : "")}
    ${tile("no_video", "No video", n("no_video"))}${tile("deleted", "Deleted", stats.filter((r) => r.deleted).reduce((a, r) => a + r.n, 0))}
    ${tile("bytes", "Stored", bytes(live.filter((r) => r.status === "downloaded").reduce((a, r) => a + r.bytes, 0)))}
  </div>
  <h2>Health</h2>
  <table>
    <tr><th>Last run</th><td>${esc(status.lastRun ?? "never")}</td></tr>
    <tr><th>Auth</th><td>${status.auth === "needs_reauth" ? '<span class="bad">needs re-auth</span> · <a href="/oauth/start">re-authorize</a>' : esc(status.auth ?? "unknown")}</td></tr>
    <tr><th>Last error</th><td class="err">${status.lastError ? `<span class="bad">${esc(status.lastError)}</span>` : "none"}</td></tr>
    <tr><th>Paused</th><td>${pausedUntil > Date.now() ? `<span class="bad">until ${esc(new Date(pausedUntil).toISOString())}</span>` : "no"}</td></tr>
    <tr><th>Last run counts</th><td>${status.counts ? `seen ${c.seen ?? 0} · downloaded ${c.downloaded ?? 0} · failed ${c.failed ?? 0} · pages ${c.pages ?? 0}` : "—"}</td></tr>
    <tr><th>Active alerts</th><td>${alerts || "none"}</td></tr>
  </table>
  <h2>Failures by reason</h2>
  ${reasons ? `<table><tr><th>Error</th><th>Posts</th></tr>${reasons}</table>` : '<p class="d">None.</p>'}
  <h2>Pending</h2>
  <p class="d">Waiting for download budget (5 per cron tick; up to 30 per backfill).</p>
  ${table("pending")}
  <h2>Failed</h2>
  <p class="d">Retry resets a post to pending; it is re-attempted the next time a sync sees it (cron rescans the newest page, backfill scans everything). <code>too_large</code> fails again unless the size cap changes.</p>
  ${table("failed")}
</main>
<script>
document.querySelectorAll("[data-retry]").forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await fetch("/api/videos/"+b.dataset.retry+"/retry",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});if(r.ok)location.reload();else{alert("retry failed: "+r.status);b.disabled=false}});
</script>`);
}
