import { test } from "node:test";
import assert from "node:assert/strict";
import { VERSION } from "#src/limits";

test("alias #src resolves and TS runs natively", () => {
  assert.equal(VERSION, "v2");
});
