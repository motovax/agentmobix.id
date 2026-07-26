import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AUTH_API_BASE =
  import.meta.env.VITE_MOTOVAX_AUTH_API_BASE ||
  import.meta.env.VITE_MOBIX_API_BASE ||
  "https://mobix.motovax.com";
const SESSION_STORAGE_KEY = "agenmobix_session";

export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  role: string;
  permissions: string[];
  is_sales_agent: boolean;
  is_marketing_rep: boolean;
}

interface LoginResponse {
  token: string;
  expires_at: string;
}

interface StoredSession {
  token: string;
  expiresAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (
      typeof parsed.token !== "string" ||
      !parsed.token ||
      typeof parsed.expiresAt !== "string" ||
      !parsed.expiresAt
    ) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
      detail?: string;
    };
    return payload.message || payload.error || payload.detail;
  } catch {
    return undefined;
  }
}

async function requestCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${AUTH_API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await readErrorMessage(response)) || "Sesi tidak valid");
  }
  return response.json() as Promise<AuthUser>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(
        response.status === 401
          ? "Username atau kata sandi salah"
          : message || "Login gagal. Silakan coba lagi.",
      );
    }

    const session = (await response.json()) as LoginResponse;
    const currentUser = await requestCurrentUser(session.token);
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: session.token, expiresAt: session.expires_at }),
    );
    setUser(currentUser);
  }, []);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    let active = true;
    requestCurrentUser(session.token)
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [logout]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [isLoading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
