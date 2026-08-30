import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "#src/limits";

test("caps match ADR-0005 / spec §5", () => {
  assert.equal(L.MAX_API_REQUESTS_PER_RUN, 3);
  assert.equal(L.MAX_DOWNLOADS_PER_RUN, 5);
  assert.equal(L.MAX_FILE_BYTES, 200 * 1024 * 1024);
  assert.equal(L.STORAGE_ALERT_BYTES, 9 * 1024 ** 3);
  assert.equal(L.BACKFILL_PAGE_SIZE, 90);
  assert.equal(L.BACKFILL_MAX_ITEMS, 800);
});

test("bookmarks query never expands author", () => {
  assert.match(L.BOOKMARK_QUERY, /expansions=attachments\.media_keys/);
  assert.doesNotMatch(L.BOOKMARK_QUERY, /author_id|user\.fields/);
});

test("video key regex accepts <id>.mp4 and <id>-n.mp4 only", () => {
  assert.ok(L.VIDEO_KEY_RE.test("1234567890123456789.mp4"));
  assert.ok(L.VIDEO_KEY_RE.test("1234567890123456789-2.mp4"));
  assert.ok(!L.VIDEO_KEY_RE.test("../x.mp4"));
  assert.ok(!L.VIDEO_KEY_RE.test("abc.mp4"));
});
