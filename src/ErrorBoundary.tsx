import { Component, type ReactNode } from "react";
import { ssGet, ssSet } from "./lib/storage";

/**
 * Last line of defence: a render error shows a friendly screen instead of a blank page.
 * A page chunk that fails to download (new deploy replaced the file, or bad signal) reloads once.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: unknown) {
    const msg = String((e as Error)?.message || e);
    if (/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg) && !ssGet("ronaq_chunk_reload", false)) {
      ssSet("ronaq_chunk_reload", true); location.reload();
    }
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="wrap empty" style={{ minHeight: "60vh", justifyContent: "center" }}>
        <h1 className="disp" style={{ margin: 0, fontSize: 28 }}>حدث خطأ · Une erreur est survenue</h1>
        <p className="muted" style={{ margin: 0 }}>أعيدي تحميل الصفحة · Rechargez la page</p>
        <button className="btn" type="button" onClick={() => { location.href = "/"; }}>↻</button>
      </div>
    );
  }
}
