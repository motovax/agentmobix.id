import { useEffect } from "react";
import { Route, Switch, useLocation, useParams, useSearch } from "wouter";
import { Beranda } from "./pages/Beranda";
import { Katalog } from "./pages/Katalog";
import { UnitDetail } from "./pages/UnitDetail";
import { DaftarAgen } from "./pages/DaftarAgen";
import { AiMobix } from "./pages/AiMobix";
import { HotDeals } from "./pages/HotDeals";
import { Lokasi } from "./pages/Lokasi";
import { PromoList } from "./pages/PromoList";
import { PromoDetail } from "./pages/PromoDetail";
import { JualMobil } from "./pages/JualMobil";
import { JualMobilHasil } from "./pages/JualMobilHasil";
import { Login } from "./pages/Login";
import { ShareSheet } from "./pages/ShareSheet";
import { useAuth } from "./lib/auth";
import { InstallAppPrompt } from "./components/InstallAppPrompt";

function ScrollToTopOnRouteChange() {
  const [location] = useLocation();
  const search = useSearch();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const root = document.scrollingElement;
    if (root) root.scrollTop = 0;
  }, [location, search]);

  return null;
}

function ShareUnitDetail() {
  const search = useSearch();
  const slug = new URLSearchParams(search).get("u") ?? "";
  return <ShareSheet unitSlug={slug} params={search} />;
}

function FullUnitDetail() {
  const { slug } = useParams<{ slug: string }>();
  return <UnitDetail unitSlug={slug} />;
}

export default function App({
  requiresAgentLogin,
}: {
  requiresAgentLogin: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (requiresAgentLogin && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-teal-tint-border border-t-teal-deep" />
      </div>
    );
  }

  if (requiresAgentLogin && !user) {
    return <Login />;
  }

  return (
    <>
      <ScrollToTopOnRouteChange />
      <Switch>
        <Route path="/" component={Beranda} />
        <Route path="/katalog" component={Katalog} />
        <Route path="/unit/:slug" component={FullUnitDetail} />
        <Route path="/share" component={ShareUnitDetail} />
        <Route path="/daftar" component={DaftarAgen} />
        <Route path="/ai" component={AiMobix} />
        <Route path="/hot-deals" component={HotDeals} />
        <Route path="/promo" component={PromoList} />
        <Route path="/promo/:slug" component={PromoDetail} />
        <Route path="/lokasi" component={Lokasi} />
        <Route path="/jual-mobil/hasil" component={JualMobilHasil} />
        <Route path="/jual-mobil" component={JualMobil} />
        <Route component={Beranda} />
      </Switch>
      <InstallAppPrompt />
    </>
  );
}
