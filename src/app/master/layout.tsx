"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MasterAuthProvider,
  useMasterAuth,
} from "@/contexts/MasterAuthContext";
import { setupMasterApiInterceptor } from "@/lib/masterApiInterceptor";

function MasterLayoutContent({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, refreshToken } = useMasterAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set up global API interceptor for automatic 401 handling
    setupMasterApiInterceptor();

    // Listen for token refresh events to update admin state
    const handleTokenRefreshed = (_event: Event) => {
      // Admin state will be updated by the context when it detects the new token
      // This is just for notification purposes if needed
    };

    const handleTokenExpired = () => {
      // Token expired, will redirect via interceptor
      router.push("/master/login");
    };

    window.addEventListener("master_token_refreshed", handleTokenRefreshed);
    window.addEventListener("master_token_expired", handleTokenExpired);

    return () => {
      window.removeEventListener(
        "master_token_refreshed",
        handleTokenRefreshed
      );
      window.removeEventListener("master_token_expired", handleTokenExpired);
    };
  }, [router]);

  useEffect(() => {
    if (!mounted) return;

    // Don't redirect if already on login page
    if (pathname === "/master/login") {
      return;
    }

    if (!loading && !isAuthenticated) {
      router.push("/master/login");
    }
  }, [isAuthenticated, loading, router, pathname, mounted]);

  // Don't render anything until mounted (prevents SSR issues)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (pathname === "/master/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <MasterAuthProvider>
      <MasterLayoutContent>{children}</MasterLayoutContent>
    </MasterAuthProvider>
  );
}
