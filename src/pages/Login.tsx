import { useState, type FormEvent } from "react";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../lib/auth";
import { MOTOVAX_SALES_AGENT_APP_URL } from "../lib/salesAgent";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Masukkan username dan kata sandi.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login gagal. Silakan coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell bg="bg-surface">
      <main className="flex min-h-screen flex-col justify-between px-6 pb-8 pt-12 sm:min-h-[824px]">
        <div>
          <div className="mb-12 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
            mobi<span className="text-teal-deep">x</span>
            <span className="ml-2 text-[12px] font-bold tracking-normal text-muted">
              Agen
            </span>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.16em] text-teal-deep">
              Portal AgenMobix
            </p>
            <h1 className="m-0 text-[30px] font-extrabold leading-tight tracking-[-0.035em] text-ink">
              Selamat datang kembali
            </h1>
            <p className="mb-0 mt-3 text-[14px] leading-6 text-muted">
              Masuk menggunakan akun MotoVax untuk mengakses katalog dan alat bantu penjualan.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-ink">Username</span>
              <input
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-12 w-full rounded-2xl border border-line bg-field px-4 text-[14px] font-semibold text-ink outline-none transition focus:border-teal-deep focus:ring-2 focus:ring-teal/20"
                placeholder="Masukkan username"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-ink">Kata sandi</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-line bg-field px-4 text-[14px] font-semibold text-ink outline-none transition focus:border-teal-deep focus:ring-2 focus:ring-teal/20"
                placeholder="Masukkan kata sandi"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="m-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl bg-ink text-[14px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(14,27,30,0.65)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memeriksa akun…" : "Masuk"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-placeholder">
              atau
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="rounded-2xl border border-teal-tint-border bg-teal-pale p-4 text-center">
            <p className="m-0 text-[13px] font-bold leading-5 text-ink">
              Minta link login atau ingin masuk sebagai Sales Agent?
            </p>
            <p className="mb-4 mt-1 text-[12px] leading-5 text-muted">
              Gunakan aplikasi MotoVax untuk mengakses akun Sales Agent.
            </p>
            <a
              href={MOTOVAX_SALES_AGENT_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-teal-deep px-4 text-[13px] font-extrabold text-white no-underline transition active:scale-[0.99]"
            >
              Buka aplikasi MotoVax
            </a>
            <p className="mb-0 mt-2 text-[11px] font-semibold text-teal-deep">
              mobix.motovax.com
            </p>
          </div>
        </div>

        <p className="mb-0 mt-10 text-center text-[11px] leading-5 text-muted">
          Akun dan sesi dikelola dengan aman melalui sistem MotoVax.
        </p>
      </main>
    </AppShell>
  );
}
