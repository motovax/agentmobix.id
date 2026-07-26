import { useEffect, useState } from "react";
import {
  isAndroidDevice,
  isIosDevice,
  isStandaloneMode,
} from "../lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const HIDDEN_KEY = "agenmobix-install-prompt-hidden";

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(HIDDEN_KEY) === "true",
  );
  const [hidePermanently, setHidePermanently] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const ios = isIosDevice(navigator.userAgent, navigator.platform);
    const android = isAndroidDevice(navigator.userAgent);
    if (ios) setShowIosHelp(true);
    if (android) setShowAndroidHelp(true);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIosHelp(false);
      setShowAndroidHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (
    dismissed ||
    (!installEvent && !showIosHelp && !showAndroidHelp) ||
    isStandaloneMode()
  ) {
    return null;
  }

  const dismiss = () => {
    if (hidePermanently) {
      localStorage.setItem(HIDDEN_KEY, "true");
    }
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) {
      setShowManualSteps(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  };

  return (
    <aside
      aria-label="Pasang aplikasi Agen Mobix"
      className="fixed bottom-[calc(112px+env(safe-area-inset-bottom))] left-1/2 z-[10000] w-[calc(100%-20px)] max-w-[396px] -translate-x-1/2 rounded-[22px] border border-teal/30 bg-ink px-5 py-[18px] text-white shadow-[0_20px_60px_rgba(14,27,30,0.48)] ring-1 ring-black/5"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup ajakan instalasi"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-base leading-none text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
      >
        ×
      </button>
      <div className="flex gap-3.5 pr-5">
        <img
          src="/mobix-logo.png"
          alt=""
          className="h-14 w-14 flex-shrink-0 rounded-2xl bg-white object-contain shadow-[0_8px_22px_rgba(0,0,0,0.24)]"
        />
        <div className="min-w-0">
          <div className="text-[16px] font-extrabold tracking-[-0.01em]">
            Pasang Agen Mobix
          </div>
          <p className="m-0 mt-1 text-[12px] leading-[1.55] text-white/70">
            Akses katalog lebih cepat langsung dari layar utama smartphone.
          </p>
          {(installEvent || showIosHelp || showAndroidHelp) && (
            <button
              type="button"
              onClick={install}
              className="mt-3 w-full rounded-[13px] bg-teal px-4 py-3 text-[12.5px] font-extrabold text-ink shadow-[0_8px_24px_rgba(54,215,210,0.28)] transition-transform active:scale-[0.98]"
            >
              Tambahkan ke layar utama
            </button>
          )}
          {showManualSteps && (
            <div
              role="status"
              className="mt-2 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] leading-[1.55] text-white/85"
            >
              {showIosHelp ? (
                <>
                  Ketuk ikon <strong>Bagikan</strong> di Safari, lalu pilih{" "}
                  <strong>Tambahkan ke Layar Utama</strong>.
                </>
              ) : (
                <>
                  Buka menu browser <strong>⋮</strong>, lalu pilih{" "}
                  <strong>Instal aplikasi</strong> atau{" "}
                  <strong>Tambahkan ke layar utama</strong>.
                </>
              )}
            </div>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[10.5px] text-white/55">
            <input
              type="checkbox"
              checked={hidePermanently}
              onChange={(event) => setHidePermanently(event.target.checked)}
              className="h-3.5 w-3.5 accent-teal"
            />
            Jangan tampilkan lagi
          </label>
        </div>
      </div>
    </aside>
  );
}
