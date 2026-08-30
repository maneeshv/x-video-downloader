import type { BookmarkRow, LibraryQuery, Status } from "#src/store";

const esc = (s: string | null) => (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mb = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : "");
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
button.danger{margin-left:auto;border-color:#f85149;color:#f85149}#msg{color:#8b949e}.src{white-space:pre-wrap;color:#c9d1d9}`;

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
  <span class="count">${rows.length} videos · last run ${esc(status.lastRun ?? "never")}${status.auth === "needs_reauth" ? ' · <a href="/oauth/start">re-authorize</a>' : ""}</span>
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
