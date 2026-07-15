import { useEffect } from "react";
import { Route, Switch, useLocation, useSearch } from "wouter";
import { Beranda } from "./pages/Beranda";
import { Katalog } from "./pages/Katalog";
import { UnitDetail } from "./pages/UnitDetail";
import { DaftarAgen } from "./pages/DaftarAgen";
import { AiMobix } from "./pages/AiMobix";
import { HotDeals } from "./pages/HotDeals";
import { Lokasi } from "./pages/Lokasi";
import { ShareSheet } from "./pages/ShareSheet";
import { PromoList } from "./pages/PromoList";
import { PromoDetail } from "./pages/PromoDetail";
import { JualMobil } from "./pages/JualMobil";
import { JualMobilHasil } from "./pages/JualMobilHasil";

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

export default function App() {
  return (
    <>
      <ScrollToTopOnRouteChange />
    <Switch>
      <Route path="/" component={Beranda} />
      <Route path="/katalog" component={Katalog} />
      <Route path="/unit/:slug" component={UnitDetail} />
      <Route path="/daftar" component={DaftarAgen} />
      <Route path="/ai" component={AiMobix} />
      <Route path="/hot-deals" component={HotDeals} />
      <Route path="/promo" component={PromoList} />
      <Route path="/promo/:slug" component={PromoDetail} />
      <Route path="/lokasi" component={Lokasi} />
      <Route path="/share" component={ShareSheet} />
      <Route path="/jual-mobil/hasil" component={JualMobilHasil} />
      <Route path="/jual-mobil" component={JualMobil} />
      <Route component={Beranda} />
    </Switch>
    </>
  );
}
