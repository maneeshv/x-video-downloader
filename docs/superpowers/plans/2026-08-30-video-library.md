# Video library (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare v1 video list with an Emby-style library: poster grid with search / favourites / sort, a watch page that edits title + description, toggles favourite, and deletes the video (freeing R2), all inside the existing Worker.

**Architecture:** Four new columns on the existing D1 `bookmarks` table (migration `0002`); four new `Store` methods; two new page routes (`GET /` with query params, `GET /watch/:id`) and two JSON mutation routes (`POST`/`DELETE /api/videos/:id`) in the one Access-gated router; server-rendered HTML with ~40 lines of inline vanilla JS for the mutations. Delete removes the R2 objects and writes a `deleted_at` tombstone that `sync()` honours so the cron never re-downloads (ADR-0011: tombstone beats ledger).

**Tech Stack:** TypeScript on Cloudflare Workers (`wrangler` 4.x), `node --test` with `node:sqlite` as the D1 double, no runtime dependencies (ADR-0006). No web framework, no build step for the HTML.

**Spec:** `docs/superpowers/specs/2026-08-30-video-library-design.md` (APPROVED 2026-08-30). Decisions: ADR-0011 (written in Task 6). Facts: `docs/GOTCHAS.md` (read it — especially the `wrangler` sandbox line).

## Global Constraints

- Absolute imports only: `import … from "#src/<file>"` (`package.json` `imports`). No relative imports between `src/` files. Test files import fakes as `./fakes.ts`.
- No new dependency, runtime or dev (ADR-0006; hard rule 3).
- Every interpolated value in HTML goes through `esc()`; URLs emitted into `src`/`href` must start with `https://` (spec §7).
- Mutations: `POST` requires `content-type: application/json` → else 415 (CSRF defence, spec §6). `title` ≤ 200 chars, `description` ≤ 2000 → else 413.
- Delete order is R2 first, tombstone second (spec §5). Never write `deleted_at` for a video still in R2.
- `:postId` in routes matches `/^\d{5,25}$/` (same digit range as `VIDEO_KEY_RE`) or 404.
- `sort` ∈ `newest` (default) | `oldest` | `title`; unknown → `newest`.
- Absolute dates everywhere (`2026-08-30`), `// ponytail:` for deliberate ceilings, no `TODO`.
- Run tests with `npm test`, types with `npm run typecheck`. Commit after every task; the docs tasks at the end satisfy `scripts/check-session.sh` (it diffs the working tree vs HEAD, so per-task commits without JOURNAL/STATUS are fine until the final `npm run check`).
- **Never run `wrangler` inside the sandbox** (GOTCHAS "Tooling"): use `dangerouslyDisableSandbox: true` for every wrangler call.
- Branch: `library-ui` (created 2026-08-30 from `backfill-downloads`, so it carries the deployed backfill code). Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File structure

| File | Change | Responsibility |
|---|---|---|
| `migrations/0002_library.sql` | create | `title`, `description`, `favorite`, `deleted_at` columns |
| `src/store.ts` | modify | `BookmarkRow` gains the 4 fields; `listDownloaded` → `listLibrary(query)`; `updateMeta`, `markDeleted`, `deleteVideos` |
| `src/limits.ts` | modify | `POST_ID_RE`, `TITLE_MAX`, `DESCRIPTION_MAX`; `VERSION = "v2"` |
| `src/sync.ts` | modify (1 line) | tombstone skip in `processItem()` |
| `src/index.ts` | modify | `/` query params, `/watch/:id`, `/api/videos/:id` POST + DELETE, `parseMetaPatch()` |
| `src/html.ts` | rewrite | `renderIndex(rows, status, query)` grid, `renderWatch(row)` page, shared `page()` + CSS |
| `test/fakes.ts` | modify | `SCHEMA` loads every migration; `FakeR2.delete`; `FakeD1.run` returns `meta.changes` |
| `test/store.test.ts`, `test/sync.test.ts`, `test/index.test.ts` | modify | new tests per task; existing assertions adjusted for the new grid markup |
| `docs/decisions/0011-tombstone-beats-ledger-library-metadata-in-d1.md` | create | ADR |
| `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/runbooks/deploy.md`, `docs/STATUS.md`, `docs/JOURNAL.md` | modify | as-built docs |

---

### Task 1: Migration 0002 + row type + fakes load every migration

**Files:**
- Create: `migrations/0002_library.sql`
- Modify: `src/store.ts:3-9` (types), `test/fakes.ts:30-33` (`SCHEMA`), `test/fakes.ts` `FakeD1.run`, `test/index.test.ts:117-122` (row literal)
- Test: `test/store.test.ts`

**Interfaces:**
- Produces: `BookmarkRow` now has `title: string | null; description: string | null; favorite: 0 | 1; deleted_at: string | null`. `BookmarkUpsert` is unchanged in shape (the four new fields are omitted from it, so `sync.ts` callers do not change). `FakeD1.prepare(...).run()` returns `{ success: true, meta: { changes: number } }`.

- [ ] **Step 1: Write the failing test** — append to `test/store.test.ts`:

```ts
test("migration 0002: library columns exist and default to unset", async () => {
  const { s } = mk();
  await s.upsertBookmark(row());
  const b = (await s.getBookmark("1"))!;
  assert.deepEqual([b.title, b.description, b.favorite, b.deleted_at], [null, null, 0, null]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test 2>&1 | grep -A3 "migration 0002"`
Expected: FAIL — `b.favorite` is `undefined` (column does not exist yet).

- [ ] **Step 3: Create the migration**

`migrations/0002_library.sql`:
```sql
-- Video library (spec docs/superpowers/specs/2026-08-30-video-library-design.md §3, ADR-0011).
-- Additive only (docs/runbooks/deploy.md): D1 has no down-migrations in this repo.
ALTER TABLE bookmarks ADD COLUMN title TEXT;
ALTER TABLE bookmarks ADD COLUMN description TEXT;
ALTER TABLE bookmarks ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookmarks ADD COLUMN deleted_at TEXT;
```

- [ ] **Step 4: Make `FakeD1` load every migration and report `changes`** — in `test/fakes.ts` replace the `SCHEMA` block (lines 28-33) with:

```ts
// Same fileURLToPath+join pattern as fixture() — the Workers `URL` type clashes with Node's
// `readFileSync(URL)` overload under tsconfig.test.json. Every migration, in file-name order,
// so FakeD1 has the same columns as production (wrangler applies them the same way).
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
export const SCHEMA = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf8")).join("\n");
```
and change the first import line to `import { readFileSync, readdirSync } from "node:fs";`.

In `FakeD1.prepare`, replace the `run()` method with:
```ts
      async run() {
        // Real D1 reports meta.changes (developers.cloudflare.com/d1/worker-api/return-object/#d1result); node:sqlite does too.
        const r = db.prepare(sql).run(...(args as never[]));
        return { success: true, meta: { changes: Number(r.changes) } };
      },
```

- [ ] **Step 5: Extend the row types** — in `src/store.ts` replace the `BookmarkRow`/`BookmarkUpsert` definitions with:

```ts
export type BookmarkRow = {
  post_id: string; first_seen_at: string; posted_at: string | null; text: string | null; post_url: string;
  has_video: 0 | 1; status: BookmarkStatus; error: string | null; r2_key: string | null; bytes: number | null;
  preview_url: string | null; updated_at: string;
  // Library metadata (migration 0002, ADR-0011). Owner-set; sync never writes them.
  title: string | null; description: string | null; favorite: 0 | 1; deleted_at: string | null;
};
export type BookmarkUpsert = Omit<BookmarkRow, "first_seen_at" | "updated_at" | "title" | "description" | "favorite" | "deleted_at"> & { now: string };
```

- [ ] **Step 6: Fix the one `BookmarkRow` literal in tests** — `test/index.test.ts` "html escapes text": add `title: null, description: null, favorite: 0, deleted_at: null` to the object literal (after `updated_at: ""`).

- [ ] **Step 7: Run tests + typecheck**

Run: `npm test && npm run typecheck`
Expected: all pass (44 tests: 43 existing + 1 new).

- [ ] **Step 8: Commit**

```bash
git add migrations/0002_library.sql src/store.ts test/fakes.ts test/store.test.ts test/index.test.ts
git commit -m "library: migration 0002 (title, description, favorite, deleted_at); fakes load every migration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Store methods — `listLibrary`, `updateMeta`, `markDeleted`, `deleteVideos`

**Files:**
- Modify: `src/store.ts` (replace `listDownloaded`, add three methods), `test/fakes.ts` (`FakeR2.delete`), `test/sync.test.ts:62,154` and `test/store.test.ts:44,47-53` (`listDownloaded` → `listLibrary`)
- Test: `test/store.test.ts`

**Interfaces:**
- Produces (all on `Store`):
  - `type LibraryQuery = { q?: string; fav?: boolean; sort?: "newest" | "oldest" | "title" }`
  - `type MetaPatch = { title?: string; description?: string; favorite?: boolean }` — a key present means "set it"; `""` stores `NULL`.
  - `listLibrary(query?: LibraryQuery, limit = 500): Promise<BookmarkRow[]>` — replaces `listDownloaded()`; excludes tombstoned rows.
  - `updateMeta(postId: string, patch: MetaPatch, now: string): Promise<boolean>` — `true` iff a live `downloaded` row matched. Caller guarantees ≥1 key in `patch`.
  - `markDeleted(postId: string, now: string): Promise<boolean>` — idempotent, keeps the first timestamp; `true` iff the row is `downloaded` (deleted or not).
  - `deleteVideos(postId: string): Promise<void>` — removes `<id>.mp4`, `<id>-1.mp4` … `<id>-4.mp4`.
- `FakeR2.delete(keys: string | string[])`.

- [ ] **Step 1: Write the failing tests** — append to `test/store.test.ts`:

```ts
const dl = (s: Store, post_id: string, over: Partial<Parameters<Store["upsertBookmark"]>[0]> = {}) =>
  s.upsertBookmark(row({ post_id, status: "downloaded", r2_key: `${post_id}.mp4`, ...over }));

test("listLibrary filters by q and fav, sorts, and hides deleted rows", async () => {
  const { s } = mk();
  await dl(s, "1", { text: "cats on mars", posted_at: "2026-08-01T00:00:00Z" });
  await dl(s, "2", { text: "dogs", posted_at: "2026-08-02T00:00:00Z" });
  await dl(s, "3", { text: "zebra", posted_at: "2026-08-03T00:00:00Z" });
  await s.upsertBookmark(row({ post_id: "4", status: "pending", text: "cats pending" }));
  await s.updateMeta("2", { title: "Alpha", favorite: true }, "2026-08-30T00:00:00Z");
  await s.updateMeta("3", { description: "about CATS" }, "2026-08-30T00:00:00Z");
  const ids = async (q: Parameters<Store["listLibrary"]>[0] = {}) => (await s.listLibrary(q)).map((r) => r.post_id);
  assert.deepEqual(await ids(), ["3", "2", "1"], "newest first by posted_at");
  assert.deepEqual(await ids({ sort: "oldest" }), ["1", "2", "3"]);
  assert.deepEqual(await ids({ sort: "title" }), ["2", "1", "3"], "title falls back to text; case-insensitive");
  assert.deepEqual(await ids({ q: "cats" }), ["3", "1"], "matches text or description, not pending rows");
  assert.deepEqual(await ids({ fav: true }), ["2"]);
  assert.deepEqual(await ids({ q: "alpha", fav: true }), ["2"]);
  assert.ok(await s.markDeleted("3", "2026-08-30T01:00:00Z"));
  assert.deepEqual(await ids(), ["2", "1"], "deleted rows are hidden");
  assert.deepEqual(await ids({ q: "cats" }), ["1"]);
});

test("updateMeta is partial, stores empty strings as NULL, and touches only live downloaded rows", async () => {
  const { s } = mk();
  await dl(s, "1");
  await s.upsertBookmark(row({ post_id: "2", status: "pending" }));
  assert.ok(await s.updateMeta("1", { title: "T", description: "D" }, "2026-08-30T00:00:00Z"));
  assert.ok(await s.updateMeta("1", { favorite: true }, "2026-08-30T00:00:01Z"));
  let b = (await s.getBookmark("1"))!;
  assert.deepEqual([b.title, b.description, b.favorite, b.updated_at], ["T", "D", 1, "2026-08-30T00:00:01Z"]);
  assert.ok(await s.updateMeta("1", { title: "" }, "2026-08-30T00:00:02Z"));
  b = (await s.getBookmark("1"))!;
  assert.deepEqual([b.title, b.description, b.favorite], [null, "D", 1], "only the given field changes; '' → NULL");
  assert.equal(await s.updateMeta("2", { title: "x" }, "2026-08-30T00:00:03Z"), false, "pending rows are not editable");
  assert.equal(await s.updateMeta("9", { title: "x" }, "2026-08-30T00:00:03Z"), false, "unknown id");
  await s.markDeleted("1", "2026-08-30T00:00:04Z");
  assert.equal(await s.updateMeta("1", { title: "x" }, "2026-08-30T00:00:05Z"), false, "deleted rows are not editable");
});

test("markDeleted is idempotent and keeps the first timestamp; deleteVideos removes every sibling key", async () => {
  const { s, r2 } = mk();
  await dl(s, "1", { r2_key: "1-1.mp4" });
  for (const k of ["1-1.mp4", "1-2.mp4", "10.mp4"]) await r2.put(k, new Uint8Array([1]));
  assert.ok(await s.markDeleted("1", "2026-08-30T00:00:00Z"));
  assert.ok(await s.markDeleted("1", "2026-08-31T00:00:00Z"), "a repeat delete still reports a match");
  assert.equal((await s.getBookmark("1"))!.deleted_at, "2026-08-30T00:00:00Z");
  assert.equal(await s.markDeleted("2", "2026-08-30T00:00:00Z"), false, "unknown id");
  await s.deleteVideos("1");
  assert.deepEqual([...r2.objects.keys()], ["10.mp4"], "another post whose id shares the prefix survives");
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | grep -E "^not ok|listLibrary|updateMeta|markDeleted"`
Expected: 3 new tests FAIL (`s.listLibrary is not a function`, etc.). Typecheck also fails — expected until Step 3.

- [ ] **Step 3: Implement** — in `src/store.ts`:

Add after the `VideoMeta` type:
```ts
export type LibraryQuery = { q?: string; fav?: boolean; sort?: "newest" | "oldest" | "title" };
// A key present means "set it"; "" stores NULL. Callers validate types/lengths (src/index.ts).
export type MetaPatch = { title?: string; description?: string; favorite?: boolean };
const LIBRARY_ORDER: Record<NonNullable<LibraryQuery["sort"]>, string> = {
  newest: "posted_at DESC, post_id DESC",
  oldest: "posted_at ASC, post_id ASC",
  title: "COALESCE(title, text) COLLATE NOCASE ASC, post_id DESC",
};
```

Replace the whole `listDownloaded` method with:
```ts
  // ponytail: LIKE over ≤800 rows (X's bookmark ceiling, ADR-0007); FTS5 if it ever gets slow.
  async listLibrary({ q, fav, sort = "newest" }: LibraryQuery = {}, limit = 500): Promise<BookmarkRow[]> {
    const where = ["status = 'downloaded'", "deleted_at IS NULL"], args: unknown[] = [];
    if (fav) where.push("favorite = 1");
    if (q) { where.push("(title LIKE ? OR description LIKE ? OR text LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const { results } = await this.db
      .prepare(`SELECT * FROM bookmarks WHERE ${where.join(" AND ")} ORDER BY ${LIBRARY_ORDER[sort]} LIMIT ?`)
      .bind(...args, limit).all<BookmarkRow>();
    return results;
  }
  async updateMeta(postId: string, p: MetaPatch, now: string): Promise<boolean> {
    const sets: string[] = [], args: unknown[] = [];
    if (p.title !== undefined) { sets.push("title = ?"); args.push(p.title || null); }
    if (p.description !== undefined) { sets.push("description = ?"); args.push(p.description || null); }
    if (p.favorite !== undefined) { sets.push("favorite = ?"); args.push(p.favorite ? 1 : 0); }
    sets.push("updated_at = ?"); args.push(now);
    const r = await this.db
      .prepare(`UPDATE bookmarks SET ${sets.join(", ")} WHERE post_id = ? AND status = 'downloaded' AND deleted_at IS NULL`)
      .bind(...args, postId).run();
    return r.meta.changes > 0;
  }
  // Tombstone (ADR-0011): sync() skips the row forever, even though its key is gone from R2.
  async markDeleted(postId: string, now: string): Promise<boolean> {
    const r = await this.db
      .prepare("UPDATE bookmarks SET deleted_at = COALESCE(deleted_at, ?), updated_at = ? WHERE post_id = ? AND status = 'downloaded'")
      .bind(now, now, postId).run();
    return r.meta.changes > 0;
  }
  // ponytail: X allows ≤4 media per post (key scheme in src/x.ts) and R2 ignores missing keys,
  // so name the sibling keys instead of paying a list() call.
  deleteVideos(postId: string): Promise<void> {
    return this.r2.delete([`${postId}.mp4`, ...[1, 2, 3, 4].map((n) => `${postId}-${n}.mp4`)]);
  }
```

In `test/fakes.ts` `FakeR2`, add after `put`:
```ts
  async delete(keys: string | string[]) {
    for (const k of [keys].flat()) this.objects.delete(k);
  }
```

- [ ] **Step 4: Rename the three existing `listDownloaded` callers in tests**
  - `test/store.test.ts:44` → `(await s.listLibrary()).length`
  - `test/store.test.ts:47` test name → `"listLibrary is newest-first and only downloaded"`, line 52 → `(await s.listLibrary())`
  - `test/sync.test.ts:62` and `:154` → `w.store.listLibrary()`
  - `src/index.ts:81` still calls `store.listDownloaded()` — change it to `store.listLibrary()` for now (Task 5 replaces the whole line).

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test && npm run typecheck`
Expected: 47 pass.

- [ ] **Step 6: Commit**

```bash
git add src/store.ts src/index.ts test/fakes.ts test/store.test.ts test/sync.test.ts
git commit -m "library: Store.listLibrary/updateMeta/markDeleted/deleteVideos

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Sync honours the tombstone

**Files:**
- Modify: `src/sync.ts:91` (`processItem`)
- Test: `test/sync.test.ts`

**Interfaces:**
- Consumes: `Store.deleteVideos`, `Store.markDeleted` (Task 2), `BookmarkRow.deleted_at` (Task 1).

- [ ] **Step 1: Write the failing test** — append to `test/sync.test.ts`:

```ts
test("a deleted post is never re-downloaded even though its key is gone from R2 (ADR-0011)", async () => {
  const w = world(routes(fx())); await authed(w.store);
  await sync(w.d);
  const id = "1000000000000000001";
  await w.store.deleteVideos(id);
  await w.store.markDeleted(id, "2026-08-30T00:00:00Z");
  const before = w.f.calls.filter(([u]) => u.includes("video.twimg")).length;
  const r = await sync(w.d);
  assert.equal(r.downloaded, 0);
  assert.equal(w.f.calls.filter(([u]) => u.includes("video.twimg")).length, before, "no download attempted");
  assert.equal(w.r2.objects.has(`${id}.mp4`), false);
  const b = (await w.store.getBookmark(id))!;
  assert.equal(b.deleted_at, "2026-08-30T00:00:00Z");
  assert.equal(b.status, "downloaded", "row untouched by the rerun");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test 2>&1 | grep -B2 -A6 "never re-downloaded"`
Expected: FAIL — `r.downloaded` is 1 (the cron re-downloaded it).

- [ ] **Step 3: Implement** — in `src/sync.ts` `processItem`, directly after `const prev = await d.store.getBookmark(it.postId);` insert:

```ts
  // Owner deleted it (ADR-0011): the tombstone overrides the R2 ledger — never re-download.
  if (prev?.deleted_at) return;
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 48 pass.

- [ ] **Step 5: Commit**

```bash
git add src/sync.ts test/sync.test.ts
git commit -m "sync: skip tombstoned posts (ADR-0011: tombstone beats ledger)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Mutation API — `POST` / `DELETE /api/videos/:id`

**Files:**
- Modify: `src/limits.ts` (3 constants), `src/index.ts` (routes + `parseMetaPatch`)
- Test: `test/index.test.ts`

**Interfaces:**
- Consumes: `Store.updateMeta`, `markDeleted`, `deleteVideos`, `getBookmark`, `MetaPatch` (Task 2).
- Produces: `POST_ID_RE`, `TITLE_MAX = 200`, `DESCRIPTION_MAX = 2000` in `src/limits.ts`; `app()` in `test/index.test.ts` gains `send(path, init)`; `seeded()` helper; `dlRow()` helper (Task 5 reuses all three).

- [ ] **Step 1: Extend the test harness** — in `test/index.test.ts` `app()`, after the `get` definition add:

```ts
  const send = (path: string, init: RequestInit & { headers?: Record<string, string> } = {}) =>
    handle(new Request(ORIGIN + path, { ...init, headers: { "cf-access-jwt-assertion": jwt, ...(init.headers ?? {}) } }), env, strict as typeof f);
```
and return it: `return { env, f, get, send, store: …, kv, r2 };`.

After `app()` add:
```ts
const dlRow = (post_id: string, over: Partial<Parameters<Store["upsertBookmark"]>[0]> = {}) => ({
  post_id, posted_at: "2026-08-01T00:00:00Z", text: "hello world", post_url: `https://x.com/i/status/${post_id}`, has_video: 1 as const,
  status: "downloaded" as const, error: null, r2_key: `${post_id}.mp4`, bytes: 5, preview_url: "https://pbs.twimg.com/p.jpg", now: "2026-08-02T00:00:00Z", ...over,
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
```

- [ ] **Step 2: Write the failing tests** — append to `test/index.test.ts`, and add `"/watch/12345", "/api/videos/12345"` to the path list in the existing "every route is 403 without a valid Access JWT" test, plus this line inside that test after the loop:

```ts
  assert.equal((await handle(new Request(ORIGIN + "/api/videos/12345", { method: "DELETE" }), env, f)).status, 403, "DELETE without JWT");
```

New tests:
```ts
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
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test 2>&1 | grep -E "^not ok|api/videos"`
Expected: both new tests FAIL (405 where 415/204 expected — the router rejects non-GET). The 403 test still passes (JWT is checked first).

- [ ] **Step 4: Add the constants** — `src/limits.ts`, after `VIDEO_KEY_RE`:

```ts
export const POST_ID_RE = /^\d{5,25}$/;              // route :postId — same digit range as VIDEO_KEY_RE
export const TITLE_MAX = 200;                        // library metadata caps (spec 2026-08-30 §6)
export const DESCRIPTION_MAX = 2000;
```
and change `VERSION = "v1"` to `VERSION = "v2"`.

- [ ] **Step 5: Implement the routes** — in `src/index.ts`:

Change the limits import to `import { BACKFILL_MAX_DOWNLOADS, DESCRIPTION_MAX, MAX_DOWNLOADS_PER_RUN, POST_ID_RE, TITLE_MAX, VIDEO_KEY_RE } from "#src/limits";` and the store import to `import { Store, type MetaPatch } from "#src/store";`.

Add above `handle()`:
```ts
// Body → MetaPatch, or null when it is not an object, has a wrongly-typed field, or names no field.
function parseMetaPatch(b: unknown): MetaPatch | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>, p: MetaPatch = {};
  if ("title" in o) { if (typeof o.title !== "string") return null; p.title = o.title; }
  if ("description" in o) { if (typeof o.description !== "string") return null; p.description = o.description; }
  if ("favorite" in o) { if (typeof o.favorite !== "boolean") return null; p.favorite = o.favorite; }
  return Object.keys(p).length ? p : null;
}
```

In `handle()`, replace the line `if (req.method !== "GET") return new Response("method not allowed", { status: 405 });` with:
```ts
  const api = /^\/api\/videos\/([^/]+)$/.exec(url.pathname);
  if (api) {
    const id = api[1]!;
    if (!POST_ID_RE.test(id)) return new Response("not found", { status: 404 });
    if (req.method === "DELETE") {
      // R2 first, tombstone second (spec §5): a tombstone must never exist for a video still in R2.
      // A repeat delete is a 204: the row is still `downloaded`, and R2 delete ignores missing keys.
      if ((await store.getBookmark(id))?.status !== "downloaded") return new Response("not found", { status: 404 });
      await store.deleteVideos(id);
      await store.markDeleted(id, new Date().toISOString());
      return new Response(null, { status: 204 });
    }
    if (req.method === "POST") {
      // JSON-only bodies: a cross-site <form> cannot set this content-type, so no CSRF token is needed.
      if (!req.headers.get("content-type")?.startsWith("application/json")) return new Response("json only", { status: 415 });
      const patch = parseMetaPatch(await req.json().catch(() => null));
      if (!patch) return new Response("bad request", { status: 400 });
      if ((patch.title?.length ?? 0) > TITLE_MAX || (patch.description?.length ?? 0) > DESCRIPTION_MAX) return new Response("too long", { status: 413 });
      if (!(await store.updateMeta(id, patch, new Date().toISOString()))) return new Response("not found", { status: 404 });
      return new Response(null, { status: 204 });
    }
    return new Response("method not allowed", { status: 405 });
  }
  if (req.method !== "GET") return new Response("method not allowed", { status: 405 });
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test && npm run typecheck`
Expected: 50 pass.

- [ ] **Step 7: Commit**

```bash
git add src/limits.ts src/index.ts test/index.test.ts
git commit -m "library: POST/DELETE /api/videos/:id (JSON-only, R2-then-tombstone delete)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Grid + watch pages

**Files:**
- Rewrite: `src/html.ts`
- Modify: `src/index.ts` (`/` and `/watch/:id` routes)
- Test: `test/index.test.ts`

**Interfaces:**
- Consumes: `Store.listLibrary`, `LibraryQuery`, `getBookmark` (Task 2); `POST_ID_RE` (Task 4); test helpers `seeded`, `dlRow`, `send`, `jsonPost` (Task 4).
- Produces: `renderIndex(rows: BookmarkRow[], status: Status, query?: LibraryQuery): string`, `renderWatch(row: BookmarkRow): string`.

- [ ] **Step 1: Write the failing tests** — append to `test/index.test.ts`:

```ts
test("/ renders the grid and honours q, fav, sort; deleted videos leave it", async () => {
  const a = await seeded();
  await a.store.upsertBookmark(dlRow("12346", { text: "zebra crossing", posted_at: "2026-08-05T00:00:00Z" }));
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
  h = await html("/?q=zebra");
  assert.match(h, /\/watch\/12346"/); assert.doesNotMatch(h, /\/watch\/12345"/);
  assert.match(h, /value="zebra"/, "search box keeps the query");
  h = await html("/?fav=1");
  assert.match(h, /\/watch\/12346"/); assert.doesNotMatch(h, /\/watch\/12345"/);
  h = await html("/?q=nothing-matches");
  assert.match(h, /No videos match/);
  await a.send("/api/videos/12346", { method: "DELETE" });
  assert.doesNotMatch(await html("/"), /\/watch\/12346"/, "deleted videos leave the grid");
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
```

Also update the existing "oauth start → callback…" test: replace `assert.match(html, /\/v\/1000000000000000001\.mp4/);` with `assert.match(html, /\/watch\/1000000000000000001"/);` (cards link to the watch page now; `two videos` and the `photo only` assertions stay).

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | grep -E "^not ok"`
Expected: the two new tests and the oauth test FAIL (old markup).

- [ ] **Step 3: Rewrite `src/html.ts`**

```ts
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
header form{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}.brand{font-weight:700;margin-right:.5rem}
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
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><style>${CSS}</style><body>${body}`;

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
</form></header>
<main class="grid">${cards || '<p class="empty">No videos match. <a href="/">Show all</a></p>'}</main>`);
}

export function renderWatch(r: BookmarkRow): string {
  return page(title(r), `<header><a class="brand" href="/">← Library</a></header>
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
```
(`r.post_id` inside the `<script>` is safe: the route only reaches `renderWatch` for ids matching `POST_ID_RE`, and `esc()` runs anyway.)

- [ ] **Step 4: Wire the routes** — in `src/index.ts`:

Change the html import to `import { renderIndex, renderWatch } from "#src/html";` and the store import to `import { Store, type LibraryQuery, type MetaPatch } from "#src/store";`.

Add next to `json`:
```ts
const html = (s: string) => new Response(s, { headers: { "content-type": "text/html; charset=utf-8" } });
```

Replace the `if (url.pathname === "/") …` line with:
```ts
  if (url.pathname === "/") {
    const sort = url.searchParams.get("sort");
    const q: LibraryQuery = { q: url.searchParams.get("q")?.trim() || undefined, fav: url.searchParams.get("fav") === "1", sort: sort === "oldest" || sort === "title" ? sort : "newest" };
    return html(renderIndex(await store.listLibrary(q), await store.getStatus(), q));
  }
  const watch = /^\/watch\/([^/]+)$/.exec(url.pathname);
  if (watch) {
    if (!POST_ID_RE.test(watch[1]!)) return new Response("not found", { status: 404 });
    const b = await store.getBookmark(watch[1]!);
    if (!b || b.status !== "downloaded" || b.deleted_at || !b.r2_key) return new Response("not found", { status: 404 });
    return html(renderWatch(b));
  }
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test && npm run typecheck`
Expected: 52 pass.

- [ ] **Step 6: Eyeball it locally** (optional but cheap): `npm run dev` is Access-gated and needs real vars, so instead render to a file and open it:

```bash
node --no-warnings --input-type=module -e '
import { renderIndex, renderWatch } from "#src/html";
import { writeFileSync } from "node:fs";
const row = (i) => ({ post_id: String(1e18 + i), first_seen_at: "2026-08-29T00:00:00Z", posted_at: `2026-08-${String(i).padStart(2,"0")}T00:00:00Z`, text: `Sample post number ${i} with some longer text that gets clipped`, post_url: "https://x.com/i/status/1", has_video: 1, status: "downloaded", error: null, r2_key: "1.mp4", bytes: 1e8 * i, preview_url: null, updated_at: "", title: i % 3 ? null : `Titled ${i}`, description: null, favorite: i % 4 ? 0 : 1, deleted_at: null });
writeFileSync(process.env.TMPDIR + "/grid.html", renderIndex(Array.from({ length: 12 }, (_, i) => row(i + 1)), { lastRun: "2026-08-30T10:31:54Z" }, {}));
writeFileSync(process.env.TMPDIR + "/watch.html", renderWatch(row(4)));
' && open "$TMPDIR/grid.html" "$TMPDIR/watch.html"
```
Expected: dark poster grid with grey placeholders, ★ on every 4th card; watch page with form. (Videos will not play — no Worker.)

- [ ] **Step 7: Commit**

```bash
git add src/html.ts src/index.ts test/index.test.ts
git commit -m "library: poster grid with search/favourites/sort, watch page with edit/favourite/delete

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Docs, ADR-0011, deploy, verify

**Files:**
- Create: `docs/decisions/0011-tombstone-beats-ledger-library-metadata-in-d1.md`
- Modify: `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/runbooks/deploy.md`, `docs/STATUS.md`, `docs/JOURNAL.md`

- [ ] **Step 1: Write ADR-0011**

```markdown
# 0011. Library metadata lives in D1; a delete tombstone overrides the R2 ledger
Date: 2026-08-30 | Status: DECIDED (owner chose "delete frees the space") | Supersedes: — (amends ADR-0003/0007: R2 remains the download ledger except for tombstoned rows) | Evidence: docs/superpowers/specs/2026-08-30-video-library-design.md §3–§5

## Context
The owner wants to title, describe, favourite, search and delete downloaded videos. ADR-0003 makes "key exists in R2" the download truth, so removing an object from R2 makes the cron re-download it on the next run. Storage is the binding constraint (10 GB free tier ≈ 70 real-account videos), so "delete" must actually free R2. Candidates: hide-only (keeps paying for storage), a separate `videos`/`meta` table (a second row per post for no reason), or columns on the existing one-row-per-post `bookmarks` table.

## Decision
Add `title`, `description`, `favorite`, `deleted_at` to `bookmarks` (migration 0002); sync never writes them. `DELETE /api/videos/:id` removes every R2 key of the post first, then sets `deleted_at`; `processItem()` returns before touching R2 when `deleted_at` is set. So: R2 is the ledger for everything the owner has not deleted; the D1 tombstone wins for everything they have. Search is `LIKE` over title/description/text; no FTS. Metadata is owner-only data and is not mirrored into R2 `customMetadata`.

## Consequences
- easier: one table, one row per post; delete really frees space; the cron cannot resurrect a deleted video; the row keeps `text`/`post_url` so the owner can see what was deleted.
- harder: not undoable (the object is gone); a `deleted_at` row is a permanent skip — un-deleting means clearing the column by hand (`wrangler d1 execute`) and letting the cron re-download; a bookmark re-added on X after deletion stays skipped.
- revisit when: the owner asks for undo (add a "hidden" state before purge), the library outgrows `LIKE` (FTS5), or metadata must survive a D1 wipe (mirror into R2 `customMetadata`).
```

- [ ] **Step 2: Update `docs/ARCHITECTURE.md`**
  - Header paragraph: mention the library UI (2026-08-30) and ADR-0011.
  - Routes: replace the `GET /` line with `GET /?q=&fav=1&sort=newest|oldest|title` → `renderIndex()` over `store.listLibrary(q)`; add `GET /watch/:postId` (404 unless downloaded, not deleted), `POST /api/videos/:postId` (JSON-only → 415; 400/413/404/204), `DELETE /api/videos/:postId` (R2 delete of `<id>.mp4` + `<id>-1..4.mp4`, then `deleted_at`; 404/204; idempotent). Change "Any other path or non-GET method → 404 / 405" to reflect that `/api/videos/:id` accepts POST/DELETE.
  - `sync()` flow step 3: add "A row with `deleted_at` set is skipped before any R2 call (ADR-0011)".
  - D1 schema: add migration `0002_library.sql` columns `title`, `description`, `favorite`, `deleted_at`.
  - `listDownloaded()` mentions → `listLibrary()`.
  - Related ADRs: add 0011.
  - Update the `Updated:` date line.

- [ ] **Step 3: Update `docs/PRODUCT.md`** — replace the non-goal line `- **v1 only:** search/filter UI and tagging. …` with `- Tagging, bulk actions, undo, un-bookmarking on X. (Search/filter/favourite/title/description/delete shipped 2026-08-30 — spec \`2026-08-30-video-library-design.md\`, ADR-0011.)` and add a scope bullet describing the library page + watch page. Bump the `Updated:` line.

- [ ] **Step 4: Update `docs/runbooks/deploy.md` §2** — make it clear the step applies to every deploy that adds a migration: "`wrangler d1 migrations apply x-downloader --remote` applies every pending file in `migrations/` (as of 2026-08-30: `0001_bookmarks.sql`, `0002_library.sql`). Run it **before** `wrangler deploy` whenever `migrations/` changed — the new code reads the new columns immediately."

- [ ] **Step 5: JOURNAL + STATUS** — prepend a JOURNAL entry (template in `docs/STANDARDS.md`): Did (tasks 1–6, test count), Decided (ADR-0011), Learned / gotcha (whatever surfaced — if nothing, "none"), Left undone (PR merge, owner confirms CI). Rewrite STATUS: Now = library live (or deployed pending owner check), Next = owner merges PR #2 then this PR; remove item "4. v2 (owner intent): list/search/filter UI" from Next.

- [ ] **Step 6: Full check**

Run: `npm run check`
Expected: typecheck ok, 52 tests pass, `check-session: ok`.

- [ ] **Step 7: Commit docs**

```bash
git add docs/
git commit -m "docs: ADR-0011 tombstone beats ledger; architecture/product/runbook for the video library

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Migrate + deploy** (outside the sandbox — GOTCHAS "Tooling"; `dangerouslyDisableSandbox: true` on both commands):

```bash
npx wrangler d1 migrations apply x-downloader --remote
npx wrangler deploy
```
Expected: migration reports `0002_library.sql` applied; deploy prints the new version id.

- [ ] **Step 9: Verify in production**
  - `npx wrangler d1 execute x-downloader --remote --command "SELECT COUNT(*) AS n, SUM(favorite) AS fav, COUNT(deleted_at) AS del FROM bookmarks WHERE status='downloaded'"` — columns exist, `fav`/`del` are 0.
  - Open `https://x-downloader.x-downloader.workers.dev/` in the Paseo browser tab (Access login with the account that owns the Worker, as in the 2026-08-30 playback fix): grid renders with posters; search for a word from a known post; open a card; set a title; ★; reload → persisted. Do **not** delete a real video during verification unless the owner says so — use `?q=` on a pending-free post instead, or stop at the confirm dialog.
  - Record the outcome in the JOURNAL entry (amend the docs commit or add a line) — "verified in-browser: grid, search, save, favourite; delete exercised only in tests".

- [ ] **Step 10: Push and hand off**

```bash
git push -u origin library-ui
```
Tell the owner: PR `library-ui` → `main` (after PR #2 `backfill-downloads` merges, or set its base to `backfill-downloads`); CI `check` must be green; migration already applied.
