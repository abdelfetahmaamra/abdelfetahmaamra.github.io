import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { SITE } from "./lib/config";
import { captureSource } from "./store/pixels";
import "./styles/styles.css";

/* Slow network / low-end phone: turn off decorative animations (see .lite in styles.css). */
const conn: any = (navigator as any).connection || {};
if (conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || "") || ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2)) document.documentElement.classList.add("lite");
if (SITE) { const pc = document.createElement("link"); pc.rel = "preconnect"; pc.href = SITE; pc.crossOrigin = ""; document.head.appendChild(pc); }
if ("serviceWorker" in navigator && import.meta.env.PROD && location.protocol === "https:") {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* ignore */ }
captureSource();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
