"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  ShoppingBagIcon,
  CubeIcon,
  TableCellsIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  QrCodeIcon,
  CalculatorIcon,
  TagIcon,
  SunIcon,
  MoonIcon,
  PrinterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  BuildingOfficeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import StoreSelector from "@/components/store/StoreSelector";
import { REPORTS } from "@/lib/reports/config";

interface MenuItem {
  name: string;
  href?: string;
  icon: any;
  iconImage?: string; // For custom image icons
  roles?: string[];
  // Optional permission codes required to see this item.
  // If provided, user must have at least one of these permissions
  // from the location database (synced permissions).
  permissions?: string[];
  children?: MenuItem[];
}

const navigation: MenuItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingBagIcon,
    permissions: [
      "orders.view",
      "orders.create",
      "orders.update",
      "orders.delete",
    ],
  },
  {
    name: "Menu Master",
    icon: CubeIcon,
    permissions: [
      "menu.view",
      "menu.create",
      "menu.update",
      "menu.delete",
      "menu.masters.view",
      "menu.categories.view",
      "menu.items.view",
    ],
    children: [
      {
        name: "Menu Master",
        href: "/dashboard/menu/masters",
        icon: DocumentTextIcon,
        //iconImage: "/assets/icon/menu_10154074.png",
        permissions: ["menu.masters.view", "menu.view"], // Allow both granular and general permission
      },
      {
        name: "Menu Category",
        href: "/dashboard/menu/categories",
        icon: FolderIcon,
        permissions: ["menu.categories.view", "menu.view"], // Allow both granular and general permission
      },
      {
        name: "Menu Items",
        href: "/dashboard/menu/items",
        icon: DocumentTextIcon,
        permissions: ["menu.items.view", "menu.view"], // Allow both granular and general permission
      },
    ],
  },
  {
    name: "Modifiers",
    href: "/dashboard/modifiers",
    icon: TagIcon,
    permissions: ["modifiers.view"],
  },
  {
    name: "Prep-Zone",
    href: "/dashboard/prep-zone",
    icon: CubeIcon,
    permissions: ["prepzone.view"], // Separate prep-zone permission
  },
  {
    name: "Time Events",
    href: "/dashboard/events",
    icon: ClockIcon,
    permissions: ["events.view"],
  },
  {
    name: "Printer",
    href: "/dashboard/printer",
    icon: PrinterIcon,
    permissions: ["printers.view"],
  },
  {
    name: "Tax Management",
    href: "/dashboard/tax",
    icon: CalculatorIcon,
    permissions: ["tax.view", "tax.create", "tax.update", "tax.delete"],
  },
  {
    name: "Discount",
    href: "/dashboard/discount",
    icon: TagIcon,
    permissions: [
      "discount.view",
      "discount.create",
      "discount.update",
      "discount.delete",
    ],
  },
  {
    name: "Fee Management",
    href: "/dashboard/fee",
    icon: CalculatorIcon,
    permissions: ["fee.view", "fee.create", "fee.update", "fee.delete"],
  },
  {
    name: "Gift Card Management",
    href: "/dashboard/gift-cards",
    icon: CalculatorIcon,
    permissions: [
      "giftcards.view",
      "giftcards.create",
      "giftcards.update",
      "giftcards.delete",
    ],
  },
  {
    name: "Reason/Request Master",
    href: "/dashboard/suggestion",
    icon: DocumentTextIcon,
    permissions: [
      "suggestion.view",
      "suggestion.create",
      "suggestion.update",
      "suggestion.delete",
    ],
  },
  {
    name: "Department",
    icon: BuildingOfficeIcon,
    permissions: [
      "departments.view",
      "departments.create",
      "departments.update",
      "departments.delete",
    ],
    children: [
      {
        name: "Department",
        href: "/dashboard/department",
        icon: BuildingOfficeIcon,
        permissions: ["departments.view"],
      },
      {
        name: "Department Type",
        href: "/dashboard/department/type",
        icon: FolderIcon,
        permissions: ["departments.view"],
      },
    ],
  },
  {
    name: "Employee",
    icon: UserIcon,
    permissions: [
      "employees.view",
      "employees.create",
      "employees.update",
      "employees.delete",
    ],
    children: [
      {
        name: "Employee",
        href: "/dashboard/employee",
        icon: UserIcon,
        permissions: ["employees.view"],
      },
      {
        name: "Employee Type",
        href: "/dashboard/employee/type",
        icon: FolderIcon,
        permissions: ["employee_types.view"],
      },
    ],
  },
  {
    name: "Station",
    href: "/dashboard/station",
    icon: CubeIcon,
    permissions: [
      "stations.view",
      "stations.create",
      "stations.update",
      "stations.delete",
    ],
  },
  {
    name: "Tables",
    href: "/dashboard/tables",
    icon: TableCellsIcon,
    permissions: [
      "tables.view",
      "tables.create",
      "tables.update",
      "tables.delete",
    ],
  },
  {
    name: "QR Ordering",
    href: "/dashboard/qr-orders",
    icon: QrCodeIcon,
    permissions: ["orders.view", "orders.create"],
  },
  {
    name: "Reports",
    icon: ChartBarIcon,
    permissions: ["reports.view"],
    children: REPORTS.map((report) => ({
      name: report.name,
      href: report.available ? report.href : undefined,
      icon: DocumentTextIcon,
      permissions: ["reports.view"],
    })),
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: UserGroupIcon,
    permissions: ["users.view", "users.create", "users.update", "users.delete"],
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Cog6ToothIcon,
    permissions: ["settings.view", "settings.manage"],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Load permissions for the current user from location database (via API)
  useEffect(() => {
    const loadPermissions = async (forceRefresh = false) => {
      try {
        if (!session?.user?.role) return;
        setLoadingPermissions(true);
        // Add cache-busting to ensure fresh permissions
        const url = forceRefresh
          ? "/api/dashboard/user-permissions?refresh=true"
          : "/api/dashboard/user-permissions";
        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) {
          // If permission API fails, don't show any items that require permissions
          console.error("Failed to fetch user permissions");
          setUserPermissions([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.permissions)) {
          // Debug logging (commented out - uncomment if needed for debugging)
          // console.log(
          //   `[DashboardLayout] Loaded ${data.permissions.length} permissions for role: ${session?.user?.role}`
          // );
          // console.log(`[DashboardLayout] Permissions:`, data.permissions);
          setUserPermissions(data.permissions);
        } else {
          // console.warn(`[DashboardLayout] Invalid permissions format:`, data);
          setUserPermissions([]);
        }
      } catch (err) {
        console.error("Error fetching user permissions", err);
        setUserPermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    };

    loadPermissions();
  }, [session?.user?.role]);

  const hasAnyPermission = (required?: string[]): boolean => {
    if (!required || required.length === 0) return true;
    // If permissions are still loading, don't show menu items (prevents flash)
    if (loadingPermissions) return false;
    // If userPermissions is null or empty, don't show items that require permissions
    if (!userPermissions || userPermissions.length === 0) {
      // For SUPER_ADMIN, allow all (they have all permissions)
      if (userRole === "SUPER_ADMIN") return true;
      // Otherwise, don't show items that require permissions
      return false;
    }
    // Check if user has at least one of the required permissions
    return required.some((code) => userPermissions.includes(code));
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const userRole = session?.user?.role || "";

  const filterMenuItem = (item: MenuItem): MenuItem | null => {
    // SUPER_ADMIN always sees everything (they have all permissions)
    if (userRole === "SUPER_ADMIN") {
      // Still filter children recursively for consistency
      let children: MenuItem[] | undefined = undefined;
      if (item.children && item.children.length > 0) {
        children = item.children
          .map((child) => filterMenuItem(child))
          .filter((child): child is MenuItem => child !== null);
        // If no visible children and no direct href, hide parent
        if ((!children || children.length === 0) && !item.href) {
          return null;
        }
      }
      return { ...item, children };
    }

    // Check role restriction if present (legacy support)
    if (item.roles && !item.roles.includes(userRole)) {
      return null;
    }

    // Check permission requirement if present
    if (!hasAnyPermission(item.permissions)) {
      // If this item has children, we still allow it if at least one child is visible
      // after filtering by permissions/roles
      if (!item.children || item.children.length === 0) {
        return null;
      }
    }

    // Filter children recursively
    let children: MenuItem[] | undefined = undefined;
    if (item.children && item.children.length > 0) {
      children = item.children
        .map((child) => filterMenuItem(child))
        .filter((child): child is MenuItem => child !== null);
      // If no visible children and no direct href, hide parent
      if ((!children || children.length === 0) && !item.href) {
        return null;
      }
    }

    return { ...item, children };
  };

  const filteredNavigation = navigation
    .map((item) => filterMenuItem(item))
    .filter((item): item is MenuItem => item !== null);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((name) => name !== menuName)
        : [...prev, menuName],
    );
  };

  const isChildItemActive = (
    child: MenuItem,
    siblings?: MenuItem[],
  ): boolean => {
    if (!child.href) return false;

    const childHref = child.href;

    // Exact match
    if (pathname === childHref) {
      // Even on exact match, check if a longer sibling also matches exactly
      // This prevents shorter paths from being active when a longer path matches exactly
      if (siblings && siblings.length > 0) {
        const longerMatchingSibling = siblings.find(
          (sibling) =>
            sibling.href &&
            sibling.href.length > childHref.length &&
            pathname === sibling.href,
        );
        // If a longer sibling matches exactly, this child should not be active
        if (longerMatchingSibling) return false;
      }
      return true;
    }

    // Check if pathname starts with child href + "/"
    if (pathname.startsWith(childHref + "/")) {
      // If there are siblings, check if any sibling has a longer matching path
      // This prevents shorter paths from being active when a longer path matches
      if (siblings && siblings.length > 0) {
        const longerMatchingSibling = siblings.find(
          (sibling) =>
            sibling.href &&
            sibling.href.length > childHref.length &&
            (pathname === sibling.href ||
              pathname.startsWith(sibling.href + "/")),
        );
        // If a longer sibling matches, this child should not be active
        if (longerMatchingSibling) return false;
      }
      return true;
    }

    return false;
  };

  const isMenuActive = (item: MenuItem): boolean => {
    // Only mark as active if the item itself has an href that matches
    // Don't mark parent items as active just because their children are active
    if (
      item.href &&
      (pathname === item.href || pathname.startsWith(item.href + "/"))
    )
      return true;
    // For items with children but no href, don't mark as active
    // They should only be expanded, not highlighted
    return false;
  };

  const isChildActive = (children?: MenuItem[]): boolean => {
    if (!children) return false;
    return children.some((child) => isChildItemActive(child, children));
  };

  // Auto-expand menu if any child is active (including nested add/edit pages)
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          isChildItemActive(child, item.children),
        );
        if (hasActiveChild && !expandedMenus.includes(item.name)) {
          setExpandedMenus((prev) => [...prev, item.name]);
        }
      }
    });
  }, [pathname, expandedMenus]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (event: Event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [profileMenuOpen]);

  const userImage = (session?.user as { image?: string | null })?.image;

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [userImage]);

  const displayName = session?.user?.name || "User";
  const roleLabel = (session?.user?.role || "")
    .replace(/_/g, " ")
    .toUpperCase();
  const userInitials = (() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
    }
    const single = parts[0] || "?";
    return single.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Link href="/dashboard" className="flex items-center flex-1">
                <div className="relative">
                  {/* <Image
                    src={
                      theme === "dark"
                        ? "/assets/image/logo-light.png"
                        : "/assets/image/logo.png"
                    }
                    alt="Acutepos Logo"
                    width={180}
                    height={40}
                    className="object-contain"
                    priority
                  /> */}
                  <img
                    src={
                      theme === "dark"
                        ? "/assets/image/logo-light.png"
                        : "/assets/image/logo.png"
                    }
                    alt="Acute-RPOS Logo"
                    width={280}
                    height={280}
                    className="object-contain"
                  />
                </div>
              </Link>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto sidebar-scrollbar">
            {filteredNavigation.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus.includes(item.name);
              const isActive = isMenuActive(item);
              const isChildActiveState = isChildActive(item.children);

              if (hasChildren) {
                return (
                  <div key={item.name} className="relative">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group
                        ${
                          isActive
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                      `}
                      title={undefined}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm truncate">{item.name}</span>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    {/* Inline nested list */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                        {item.children?.map((child) => {
                          const isChildActiveState = isChildItemActive(
                            child,
                            item.children,
                          );
                          const childClassName = `
                                flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                ${
                                  isChildActiveState
                                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                                    : child.href
                                      ? "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                      : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                }
                              `;
                          const childContent = (
                            <>
                              {child.iconImage ? (
                                <Image
                                  src={child.iconImage}
                                  alt={child.name}
                                  width={16}
                                  height={16}
                                  className="w-4 h-4 flex-shrink-0 object-contain"
                                />
                              ) : (
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="truncate">{child.name}</span>
                            </>
                          );

                          if (!child.href) {
                            return (
                              <span
                                key={child.name}
                                title="Coming soon"
                                className={childClassName}
                              >
                                {childContent}
                              </span>
                            );
                          }

                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={childClassName}
                            >
                              {childContent}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href || "#"}
                  className={`
                    flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  `}
                  title={undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Bars3Icon className="w-8 h-8" />
            </button>
          </div>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center space-x-4">
            {/* Store Selector */}
            <StoreSelector />

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <MoonIcon className="w-6 h-6" />
              ) : (
                <SunIcon className="w-6 h-6" />
              )}
            </button>

            {/* Notification Button */}
            <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User profile menu */}
            <div className="relative flex-shrink-0" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-primary-700 ring-offset-2 transition hover:ring-2 hover:ring-primary-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-primary-300 dark:ring-offset-gray-800 overflow-hidden"
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                {userImage && !avatarImageFailed ? (
                  <Image
                    src={userImage}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    unoptimized
                    onError={() => setAvatarImageFailed(true)}
                  />
                ) : (
                  <span className="leading-none">{userInitials}</span>
                )}
              </button>

              <div
                className={`absolute right-0 z-50 mt-2 w-[min(100vw-2rem,16rem)] origin-top-right rounded-[12px] border border-gray-200 bg-white shadow-lg transition-[opacity,transform,visibility] duration-200 ease-out dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40 sm:w-56 ${
                  profileMenuOpen
                    ? "visible translate-y-0 scale-100 opacity-100"
                    : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
                role="menu"
                aria-hidden={!profileMenuOpen}
              >
                <div className="px-4 py-3">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {roleLabel}
                  </p>
                </div>
                <div className="mx-4 border-t border-gray-200 dark:border-gray-700" />
                <div className="p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/80"
                  >
                    <ArrowRightOnRectangleIcon
                      className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400"
                      aria-hidden
                    />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
