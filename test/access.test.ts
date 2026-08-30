import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyAccessJwt } from "#src/access";
import { fakeFetch, makeSigner } from "./fakes.ts";

const TEAM = "https://team.cloudflareaccess.com", AUD = "aud-tag";

test("valid token passes; certs fetched once and cached", async () => {
  const s = await makeSigner();
  const f = fakeFetch(() => ({ status: 200, body: { keys: [s.jwk] } }));
  const now = 1_000_000_000_000;
  const tok = await s.sign({ aud: [AUD], iss: TEAM, exp: now / 1000 + 60, email: "o@example.com" });
  assert.deepEqual(await verifyAccessJwt(f, tok, TEAM, AUD, now), { email: "o@example.com" });
  await verifyAccessJwt(f, tok, TEAM, AUD, now);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], `${TEAM}/cdn-cgi/access/certs`);
});

test("rejects wrong aud, wrong issuer, expiry, bad signature, malformed", async () => {
  const s = await makeSigner("kid2");
  const f = fakeFetch(() => ({ status: 200, body: { keys: [s.jwk] } }));
  const now = 1_000_000_000_000;
  const base = { aud: [AUD], iss: TEAM, exp: now / 1000 + 60 };
  await assert.rejects(verifyAccessJwt(f, await s.sign({ ...base, aud: ["other"] }), TEAM, AUD, now), /aud/);
  await assert.rejects(verifyAccessJwt(f, await s.sign({ ...base, iss: "https://x" }), TEAM, AUD, now), /iss/);
  await assert.rejects(verifyAccessJwt(f, await s.sign({ ...base, exp: now / 1000 - 1 }), TEAM, AUD, now), /exp/);
  const good = await s.sign(base);
  const [h, , sig] = good.split(".");
  const tampered = `${h}.${Buffer.from(JSON.stringify({ ...base, email: "evil" })).toString("base64url")}.${sig}`;
  await assert.rejects(verifyAccessJwt(f, tampered, TEAM, AUD, now), /signature/);
  await assert.rejects(verifyAccessJwt(f, "nope", TEAM, AUD, now), /malformed/);
});
