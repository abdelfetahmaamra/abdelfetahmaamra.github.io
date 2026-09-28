// @vitest-environment node
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { test } from "vitest";
import { makeFunctionReference } from "convex/server";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
const WEB = join(__dirname, "../web");
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

test.skipIf(!process.env.E2E_MS)("serve web + in-memory convex for browser e2e", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.maintenance.seed, {});
  await t.action(internal.authNode.createOwner, { email: "owner@ronaq.dz", name: "Isla", password: "a-very-long-pass" });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://x");
    const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString();
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      if (url.pathname === "/__rpc") {
        const { kind, name, args } = JSON.parse(body);
        const ref: any = makeFunctionReference(name);
        try {
          const r = kind === "query" ? await t.query(ref, args) : kind === "mutation" ? await t.mutation(ref, args) : await t.action(ref, args);
          res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true, r: r === undefined ? null : r }));
        } catch (e: any) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: false, message: e.message, data: e.data })); }
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        const r = await t.fetch(url.pathname + url.search, { method: req.method, body: req.method === "GET" || req.method === "OPTIONS" ? undefined : body });
        res.statusCode = r.status; r.headers.forEach((v, k) => res.setHeader(k, v)); res.end(Buffer.from(await r.arrayBuffer())); return;
      }
      if (url.pathname === "/__shim.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(`window.convex={ConvexClient:function(){var call=function(kind,name,args){return fetch("/__rpc",{method:"POST",body:JSON.stringify({kind:kind,name:name,args:args})}).then(function(r){return r.json()}).then(function(j){if(!j.ok){var e=new Error(j.message);e.data=j.data;throw e}return j.r})};
          this.query=function(n,a){return call("query",n,a)};this.mutation=function(n,a){return call("mutation",n,a)};this.action=function(n,a){return call("action",n,a)};
          this.onUpdate=function(n,a,cb,err){var last=null,stop=false;function tick(){if(stop)return;call("query",n,a).then(function(r){var s=JSON.stringify(r);if(s!==last){last=s;cb(r)}},function(e){err&&err(e)}).finally(function(){if(!stop)setTimeout(tick,600)})}tick();return function(){stop=true}};}};`);
        return;
      }
      let p = url.pathname === "/" ? "/index.html" : url.pathname;
      if (p === "/assets/config.js") { res.setHeader("Content-Type", "text/javascript"); res.end('window.RONAQ={convexUrl:"shim",convexSite:"http://localhost:8790",defaultLang:"ar"};'); return; }
      const f = await readFile(join(WEB, p));
      res.setHeader("Content-Type", TYPES[extname(p)] || "application/octet-stream"); res.end(f);
    } catch (e: any) { res.statusCode = 404; res.end("nf"); }
  });
  await new Promise<void>((r) => server.listen(8790, r));
  const ms = Number(process.env.E2E_MS || 5000);
  await new Promise((r) => setTimeout(r, ms));
  server.close();
}, 600000);
