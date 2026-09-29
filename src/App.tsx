import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { CartPage } from "./store/CartPage";
import { Home } from "./store/Home";
import { ContactPage, DeliveryPage, FaqPage, InfoPageView } from "./store/InfoPages";
import { Layout } from "./store/Layout";
import { ProductPage } from "./store/ProductPage";
import { StoreProvider } from "./store/StoreContext";
import { Thanks } from "./store/Thanks";

// The admin panel (and the Convex client it needs) is a separate download, never loaded by shoppers.
const Admin = lazy(() => import("./admin/Admin"));

const TITLES: Record<string, string> = {
  "/": "رونق الحياة · بارافارماسي للمرأة — الدفع عند الاستلام",
  "/cart": "السلة · رونق الحياة",
  "/merci": "شكراً · رونق الحياة",
};

function Titled({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => { if (TITLES[pathname]) document.title = TITLES[pathname]; }, [pathname]);
  return <>{children}</>;
}

function Skeleton() {
  return (
    <div className="wrap" aria-busy="true" style={{ padding: "32px 0" }}>
      <div className="sk" style={{ height: 44, width: "60%", marginBottom: 18 }}></div>
      <div className="grid">{[0, 1, 2, 3].map((i) => <div className="sk" key={i} style={{ aspectRatio: "1/1.35" }}></div>)}</div>
    </div>
  );
}

function Store() {
  return (
    <StoreProvider
      loading={<Skeleton />}
      failed={(t) => <div className="wrap empty"><p>{t.loadErr}</p><button className="btn" type="button" onClick={() => location.reload()}>↻</button></div>}>
      <StoreRoutes />
    </StoreProvider>
  );
}

function StoreRoutes() {
  return (
    <Layout>
      <Titled>
        <Routes>
          <Route index element={<Home />} />
          <Route path="product" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="merci" element={<Thanks />} />
          <Route path="about" element={<InfoPageView slug="about" />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="returns" element={<InfoPageView slug="returns" />} />
          <Route path="privacy" element={<InfoPageView slug="privacy" />} />
          <Route path="terms" element={<InfoPageView slug="terms" />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Titled>
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={<p style={{ padding: 40, textAlign: "center" }}>…</p>}><Admin /></Suspense>} />
      <Route path="/*" element={<Store />} />
    </Routes>
  );
}
