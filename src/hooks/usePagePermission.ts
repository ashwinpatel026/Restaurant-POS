"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

interface UsePagePermissionOptions {
  requiredPermissions?: string[];
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * Hook to check if user has required permissions for a page
 * Redirects to access denied page if user doesn't have permissions
 * 
 * @param options - Permission check options
 * @returns { hasPermission: boolean, loading: boolean }
 */
export function usePagePermission(options: UsePagePermissionOptions = {}) {
  const {
    requiredPermissions = [],
    redirectTo = "/dashboard/access-denied",
    showAccessDenied = true,
  } = options;

  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const checkPermission = async () => {
      // If no permissions required, allow access
      if (!requiredPermissions || requiredPermissions.length === 0) {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // If no session, wait for it
      if (!session?.user?.role) {
        setLoading(true);
        return;
      }

      const userRole = session.user.role as string;

      // SUPER_ADMIN always has all permissions
      if (userRole === "SUPER_ADMIN") {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch user permissions from location database
        const res = await fetch("/api/dashboard/user-permissions");
        if (!res.ok) {
          console.error("Failed to fetch user permissions");
          setHasPermission(false);
          setLoading(false);
          if (showAccessDenied) {
            router.push(redirectTo);
          }
          return;
        }

        const data = await res.json();
        const permissions = Array.isArray(data.permissions) ? data.permissions : [];
        setUserPermissions(permissions);

        // Check if user has at least one of the required permissions
        const hasAnyPermission = requiredPermissions.some((permission) =>
          permissions.includes(permission)
        );

        setHasPermission(hasAnyPermission);
        setLoading(false);

        // Redirect to access denied if no permission
        if (!hasAnyPermission && showAccessDenied) {
          router.push(redirectTo);
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        setHasPermission(false);
        setLoading(false);
        if (showAccessDenied) {
          router.push(redirectTo);
        }
      }
    };

    checkPermission();
  }, [
    session?.user?.role,
    requiredPermissions.join(","),
    redirectTo,
    showAccessDenied,
    router,
  ]);

  return { hasPermission, loading, userPermissions };
}

