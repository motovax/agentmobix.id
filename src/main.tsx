import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth";
import { isAgentUserAgent } from "./lib/runtime-mode";

// User-Agent ditentukan secara sinkron sebelum React di-mount. Karena #root
// masih kosong pada titik ini, konten publik tidak sempat tampil pada WebView
// AgenMobix sebelum gerbang autentikasi dipilih.
const requiresAgentLogin = isAgentUserAgent(navigator.userAgent);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App requiresAgentLogin={requiresAgentLogin} />
    </AuthProvider>
  </StrictMode>,
);
