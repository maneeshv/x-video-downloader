import { verifyAccessJwt } from "#src/access";
import { renderIndex } from "#src/html";
import { VIDEO_KEY_RE } from "#src/limits";
import { Store } from "#src/store";
import { sync, type Deps } from "#src/sync";
import { authorizeUrl, exchangeCode, fetchMe, pkceChallenge, randomToken, type Fetch } from "#src/x";

export type AppEnv = {
  X_CLIENT_ID: string; X_CLIENT_SECRET: string; TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string;
  TEAM_DOMAIN: string; POLICY_AUD: string; PUBLIC_ORIGIN: string;
  VIDEOS: R2Bucket; KV: KVNamespace; DB: D1Database;
};

function deps(env: AppEnv, f: Fetch): Deps {
  return {
    store: new Store(env.KV, env.DB, env.VIDEOS), fetch: f,
    cfg: {
      clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET, redirectUri: `${env.PUBLIC_ORIGIN}/oauth/callback`, publicOrigin: env.PUBLIC_ORIGIN,
      telegram: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID ? { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID } : undefined,
    },
  };
}

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

async function video(store: Store, key: string, req: Request): Promise<Response> {
  if (!VIDEO_KEY_RE.test(key)) return new Response("not found", { status: 404 });
  const obj = await store.getVideo(key, req.headers);
  if (!obj) return new Response("not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", "bytes");
  if (!("body" in obj)) return new Response(null, { status: 412, headers });
  const r = obj.range;
  // R2Range is a 3-way union ({offset,length?} | {offset?,length} | {suffix}); narrowing on
  // "offset" in r alone still leaves r.offset possibly undefined (2nd variant) — check both.
  if (r && "offset" in r && r.offset !== undefined && r.length !== undefined) {
    headers.set("content-range", `bytes ${r.offset}-${r.offset + r.length - 1}/${obj.size}`);
    headers.set("content-length", String(r.length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}

export async function handle(req: Request, env: AppEnv, f: Fetch = fetch): Promise<Response> {
  const url = new URL(req.url);
  // Every route, including the OAuth callback, sits behind Access (spec §4); the JWT check defends a misconfigured policy.
  const jwt = req.headers.get("cf-access-jwt-assertion");
  try { if (!jwt) throw new Error("missing"); await verifyAccessJwt(f, jwt, env.TEAM_DOMAIN, env.POLICY_AUD); }
  catch { return new Response("forbidden", { status: 403 }); }

  const d = deps(env, f);
  const { store } = d;
  if (req.method !== "GET") return new Response("method not allowed", { status: 405 });

  if (url.pathname === "/") return new Response(renderIndex(await store.listDownloaded(), await store.getStatus()), { headers: { "content-type": "text/html; charset=utf-8" } });
  if (url.pathname.startsWith("/v/")) return video(store, decodeURIComponent(url.pathname.slice(3)), req);
  if (url.pathname === "/status") return json({ ...(await store.getStatus()), pausedUntil: await store.getPausedUntil(), userId: await store.getUserId() });
  if (url.pathname === "/oauth/start") {
    const state = randomToken(16), verifier = randomToken(64);
    await store.putPkce(state, verifier);
    return Response.redirect(authorizeUrl(d.cfg, state, await pkceChallenge(verifier)), 302);
  }
  if (url.pathname === "/oauth/callback") {
    const code = url.searchParams.get("code"), state = url.searchParams.get("state");
    const verifier = state && (await store.takePkce(state));
    if (!code || !verifier) return new Response("bad state", { status: 400 });
    const tokens = await exchangeCode(f, d.cfg, code, verifier);
    await store.putTokens(tokens);
    await store.putUserId(await fetchMe(f, tokens.access));
    await store.clearPause();
    await store.patchStatus({ auth: "ok", lastError: null });
    return Response.redirect(`${env.PUBLIC_ORIGIN}/`, 302);
  }
  if (url.pathname === "/backfill") return json(await sync(d, { backfill: true }));
  return new Response("not found", { status: 404 });
}

export default {
  fetch: (req: Request, env: AppEnv) => handle(req, env),
  async scheduled(_c: ScheduledController, env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil(sync(deps(env, fetch)));
  },
} satisfies ExportedHandler<AppEnv>;
