"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface MasterAdmin {
  adminId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  name: string;
}

interface MasterAuthContextType {
  admin: MasterAdmin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const MasterAuthContext = createContext<MasterAuthContextType | undefined>(
  undefined
);

export function MasterAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<MasterAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    // Listen for token refresh events from the interceptor
    const handleTokenRefreshed = async (event: Event) => {
      // Re-check auth to update admin state with refreshed token
      await checkAuth();
    };

    const handleTokenExpired = () => {
      // Token expired, clear admin state
      setAdmin(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("master_admin_token");
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "master_token_refreshed",
        handleTokenRefreshed as unknown as EventListener
      );
      window.addEventListener("master_token_expired", handleTokenExpired);

      return () => {
        window.removeEventListener(
          "master_token_refreshed",
          handleTokenRefreshed as unknown as EventListener
        );
        window.removeEventListener("master_token_expired", handleTokenExpired);
      };
    }
  }, []);

  const refreshToken = async (): Promise<boolean> => {
    // Only run on client side
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const token = localStorage.getItem("master_admin_token");
      if (!token) {
        return false;
      }

      const response = await fetch("/api/master/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("master_admin_token", data.token);
        setAdmin(data.admin);
        return true;
      } else {
        // Refresh failed, clear token
        localStorage.removeItem("master_admin_token");
        setAdmin(null);
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("master_admin_token");
      }
      setAdmin(null);
      return false;
    }
  };

  const checkAuth = async () => {
    // Only run on client side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("master_admin_token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/master/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data);
      } else if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshToken();
        if (!refreshed) {
          // Refresh failed, will redirect via masterApiFetch or layout
          setAdmin(null);
        }
      } else {
        // Other error, clear token
        if (typeof window !== "undefined") {
          localStorage.removeItem("master_admin_token");
        }
        setAdmin(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("master_admin_token");
      }
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // Only run on client side
    if (typeof window === "undefined") {
      return false;
    }

    try {
      console.log("Calling master auth login API...");
      const response = await fetch("/api/master/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      console.log("Master auth response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("master_admin_token", data.token);
        }
        setAdmin(data.admin);
        toast.success("Login successful");
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || "Invalid credentials");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      return false;
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("master_admin_token");
    }
    setAdmin(null);
    router.push("/master/login");
    toast.success("Logged out successfully");
  };

  return (
    <MasterAuthContext.Provider
      value={{
        admin,
        loading,
        login,
        logout,
        refreshToken,
        isAuthenticated: !!admin,
      }}
    >
      {children}
    </MasterAuthContext.Provider>
  );
}

export function useMasterAuth() {
  const context = useContext(MasterAuthContext);
  if (context === undefined) {
    throw new Error("useMasterAuth must be used within MasterAuthProvider");
  }
  return context;
}
