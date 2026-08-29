import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBookmarks, selectVariant, type BookmarksResponse } from "#src/x";
import { fixture } from "./fakes.ts";

const bm = fixture("bookmarks.json") as BookmarksResponse;

test("selectVariant picks highest bit_rate mp4, ignores m3u8", () => {
  const v = selectVariant(bm.includes!.media![0].variants);
  assert.equal(v?.url, "https://video.twimg.com/1_high.mp4?tag=12");
  assert.equal(selectVariant(undefined), null);
  assert.equal(selectVariant([{ content_type: "application/x-mpegURL", url: "x" }]), null);
});

test("parseBookmarks classifies every returned post", () => {
  const items = parseBookmarks(bm);
  assert.equal(items.length, 6, "never drops a bookmark");
  const by = Object.fromEntries(items.map((i) => [i.postId, i]));
  assert.deepEqual(by["1000000000000000001"].videos, [{ key: "1000000000000000001.mp4", url: "https://video.twimg.com/1_high.mp4?tag=12", bitRate: 2176000 }]);
  assert.equal(by["1000000000000000001"].previewUrl, "https://pbs.twimg.com/1.jpg");
  assert.equal(by["1000000000000000001"].postUrl, "https://x.com/i/status/1000000000000000001");
  assert.equal(by["1000000000000000002"].videos[0].key, "1000000000000000002.mp4", "animated_gif treated as video");
  assert.equal(by["1000000000000000003"].hasVideoMedia, false);
  assert.deepEqual(by["1000000000000000004"].videos.map((v) => v.key), ["1000000000000000004-1.mp4", "1000000000000000004-2.mp4"]);
  assert.equal(by["1000000000000000005"].hasVideoMedia, true);
  assert.equal(by["1000000000000000005"].videos.length, 0, "no variants → hasVideoMedia but no downloadable video");
  assert.equal(by["1000000000000000006"].hasVideoMedia, false);
  assert.equal(by["1000000000000000006"].postedAt, null);
});

test("parseBookmarks tolerates empty/missing sections", () => {
  assert.deepEqual(parseBookmarks({}), []);
  assert.deepEqual(parseBookmarks({ data: [{ id: "1", text: "t", attachments: { media_keys: ["missing"] } }] })[0].videos, []);
});
