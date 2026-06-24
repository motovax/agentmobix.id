import { Route, Switch } from "wouter";
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

export default function App() {
  return (
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
      <Route component={Beranda} />
    </Switch>
  );
}
