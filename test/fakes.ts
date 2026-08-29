import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Scripted = { status: number; body?: unknown; headers?: Record<string, string>; bodyBytes?: Uint8Array };
export type FakeFetch = typeof fetch & { calls: [string, RequestInit][] };

export function fakeFetch(script: Scripted[] | ((url: string, init: RequestInit) => Scripted)): FakeFetch {
  const calls: [string, RequestInit][] = [];
  const f = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push([url, init]);
    const s = typeof script === "function" ? script(url, init) : script.shift();
    if (!s) throw new Error(`fakeFetch: no scripted response for ${url}`);
    const headers = new Headers(s.headers ?? {});
    if (s.bodyBytes) return new Response(s.bodyBytes, { status: s.status, headers });
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new Response(s.body === undefined ? null : JSON.stringify(s.body), { status: s.status, headers });
  }) as unknown as FakeFetch;
  f.calls = calls;
  return f;
}

export const fixture = (name: string): any =>
  JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", name), "utf8"));
