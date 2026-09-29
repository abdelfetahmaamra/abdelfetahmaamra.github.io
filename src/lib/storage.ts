/* Browser storage that never throws (private mode, blocked site data, full quota). */
export function lsGet<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }
export function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
export function ssGet<T>(k: string, d: T): T { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }
export function ssSet(k: string, v: unknown) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
export function ssDel(k: string) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } }
