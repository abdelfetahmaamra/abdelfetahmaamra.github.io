import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * Convex URLs come from the environment, never from committed code you edit by hand:
 *   dev   → .env.local (written by `convex dev`)
 *   build → .env.production, or CONVEX_URL / CONVEX_SITE_URL set in Vercel.
 * Only these two values reach the browser bundle (a deploy key in the same env stays server-side).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), serviceWorker()],
    define: {
      __CONVEX_URL__: JSON.stringify(env.CONVEX_URL || ""),
      __CONVEX_SITE__: JSON.stringify(env.CONVEX_SITE_URL || ""),
    },
    server: { port: 5173 },
    build: { target: ["es2020", "chrome80", "safari14"] },
  };
});

/** Emit sw.js with a version derived from the build so every deploy refreshes phone caches. */
function serviceWorker(): Plugin {
  return {
    name: "ronaq-sw",
    apply: "build",
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle);
      const shell = files.filter((f) => /^assets\/index-.*\.(js|css)$/.test(f)).map((f) => "/" + f);
      const version = "ronaq-" + createHash("sha1").update(files.sort().join("|")).digest("hex").slice(0, 10);
      const src = readFileSync("src/sw.js", "utf8")
        .replace('"__VERSION__"', JSON.stringify(version))
        .replace(/\[\s*"__SHELL__"\s*\]/, JSON.stringify(["/", ...shell]));
      this.emitFile({ type: "asset", fileName: "sw.js", source: src });
    },
  };
}
