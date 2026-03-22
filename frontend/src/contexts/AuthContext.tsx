import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type User, type UserRole, mockUsers } from "@/data/mock-data";
import { apiClient, isAPIError } from "@/lib/apiClient";

interface LoginResult {
  ok: boolean;
  message?: string;
  code?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Restore user from localStorage on page refresh
function restoreUser(): User | null {
  try {
    const stored = localStorage.getItem("noise_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreUser);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (
    email: string,
    password: string,
    role?: UserRole
  ): Promise<LoginResult> => {
    setLoading(true);
    try {
      // ── Try real backend first ──────────────────────────────────────────
      try {
        const response = await apiClient.login(email, password);

        if (response?.token && response?.user) {
          const u: User = {
            id: String(response.user.id),
            email: response.user.email,
            name: response.user.name || email,
            role: (response.user.role as UserRole) || role || "user",
          };
          setUser(u);
          localStorage.setItem("auth_token", response.token);
          localStorage.setItem("noise_user", JSON.stringify(u));
          return { ok: true };
        }
      } catch (apiErr: unknown) {
        if (isAPIError(apiErr) && (apiErr.status === 401 || apiErr.status === 403)) {
          return {
            ok: false,
            message: apiErr.message || "Invalid email or password",
            code: apiErr.status,
          };
        }
        const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        console.warn("API unreachable, falling back to demo mode:", errMsg);
      }

      // ── Demo / offline fallback ─────────────────────────────────────────
      const found =
        mockUsers.find((u) => u.email === email) ??
        (role ? mockUsers.find((u) => u.role === role) : null);

      const demoUser: User = found
        ? found
        : { ...mockUsers[0], email, role: role ?? "user" };

      setUser(demoUser);
      localStorage.setItem("noise_user", JSON.stringify(demoUser));
      localStorage.setItem("auth_token", "demo_" + Date.now());
      return { ok: true };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      return { ok: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("noise_user");
    localStorage.removeItem("auth_token");
    // Fire-and-forget server logout
    apiClient.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
