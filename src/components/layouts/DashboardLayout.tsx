"use client";

import { ReactNode, useState, useEffect } from "react";
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
} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";

interface MenuItem {
  name: string;
  href?: string;
  icon: any;
  iconImage?: string; // For custom image icons
  roles?: string[];
  children?: MenuItem[];
}

const navigation: MenuItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingBagIcon },
  {
    name: "Menu Master",
    icon: CubeIcon,
    roles: ["SUPER_ADMIN", "ADMIN"],
    children: [
      {
        name: "Menu Master",
        href: "/dashboard/menu/masters",
        icon: BuildingStorefrontIcon,
        iconImage: "/assets/icon/menu_10154074.png",
      },
      {
        name: "Menu Category",
        href: "/dashboard/menu/categories",
        icon: FolderIcon,
      },
      {
        name: "Menu Items",
        href: "/dashboard/menu/items",
        icon: DocumentTextIcon,
      },
      {
        name: "Modifiers",
        href: "/dashboard/modifiers",
        icon: TagIcon,
      },
      {
        name: "Prep-Zone",
        href: "/dashboard/prep-zone",
        icon: CubeIcon,
      },
      {
        name: "Time Events",
        href: "/dashboard/events",
        icon: ClockIcon,
      },
      {
        name: "Printer",
        href: "/dashboard/printer",
        icon: PrinterIcon,
      },
    ],
  },
  {
    name: "Tax Management",
    href: "/dashboard/tax",
    icon: CalculatorIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  {
    name: "Station",
    href: "/dashboard/station",
    icon: CubeIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  { name: "Tables", href: "/dashboard/tables", icon: TableCellsIcon },
  { name: "QR Ordering", href: "/dashboard/qr-orders", icon: QrCodeIcon },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: ChartBarIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: UserGroupIcon,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(session?.user?.role || "");
  });

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((name) => name !== menuName)
        : [...prev, menuName]
    );
  };

  const isMenuActive = (item: MenuItem): boolean => {
    if (
      item.href &&
      (pathname === item.href || pathname.startsWith(item.href + "/"))
    )
      return true;
    if (item.children) {
      return item.children.some(
        (child) =>
          !!child.href &&
          (pathname === child.href || pathname.startsWith(child.href + "/"))
      );
    }
    return false;
  };

  const isChildActive = (children?: MenuItem[]): boolean => {
    if (!children) return false;
    return children.some(
      (child) =>
        !!child.href &&
        (pathname === child.href || pathname.startsWith(child.href + "/"))
    );
  };

  // Auto-expand menu if any child is active (including nested add/edit pages)
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) =>
            !!child.href &&
            (pathname === child.href || pathname.startsWith(child.href + "/"))
        );
        if (hasActiveChild && !expandedMenus.includes(item.name)) {
          setExpandedMenus((prev) => [...prev, item.name]);
        }
      }
    });
  }, [pathname, expandedMenus]);

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
                          isActive || isChildActiveState
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
                          const isChildActive =
                            !!child.href &&
                            (pathname === child.href ||
                              pathname.startsWith(child.href + "/"));
                          return (
                            <Link
                              key={child.name}
                              href={child.href || "#"}
                              className={`
                                flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                                ${
                                  isChildActive
                                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }
                              `}
                            >
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

          {/* User info */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 dark:text-primary-400 font-medium">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session?.user?.role?.replace("_", " ")}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
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
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
