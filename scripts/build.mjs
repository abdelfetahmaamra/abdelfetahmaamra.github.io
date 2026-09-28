// Build the site for production: minified JS/CSS in dist/ and a fresh service-worker version.
//   npm run build   → upload the dist/ folder to Cloudflare Pages / Netlify
import { transform } from "esbuild";
import { createHash } from "node:crypto";
import { cp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const SRC = "web", OUT = "dist";
await rm(OUT, { recursive: true, force: true });
await cp(SRC, OUT, { recursive: true });

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}
const hash = createHash("sha1");
let before = 0, after = 0;
for (const f of await walk(OUT)) {
  const ext = extname(f);
  if (ext !== ".js" && ext !== ".css") continue;
  if (f.endsWith("config.js")) continue; // keep readable: it's the file you edit
  const src = await readFile(f, "utf8");
  const r = await transform(src, { loader: ext === ".css" ? "css" : "js", minify: true, target: ["es2017", "chrome70", "safari12"], legalComments: "none", charset: "utf8" });
  await writeFile(f, r.code);
  before += src.length; after += r.code.length; hash.update(r.code);
}
const sw = join(OUT, "sw.js");
await writeFile(sw, (await readFile(sw, "utf8")).replace(/ronaq-v\d+/, "ronaq-" + hash.digest("hex").slice(0, 10)));
console.log(`JS+CSS: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB. Upload the "${OUT}/" folder.`);
