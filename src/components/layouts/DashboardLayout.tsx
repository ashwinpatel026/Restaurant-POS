"use client";

import { ReactNode, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
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
  TruckIcon,
  CalculatorIcon,
  TagIcon,
  SunIcon,
  MoonIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

const navigation: MenuItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingBagIcon },
  {
    name: "Menu Master",
    href: "/dashboard/menu",
    icon: CubeIcon,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "Modifiers",
    href: "/dashboard/modifiers",
    icon: TagIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  { name: "Tables", href: "/dashboard/tables", icon: TableCellsIcon },
  { name: "QR Ordering", href: "/dashboard/qr-orders", icon: QrCodeIcon },
  { name: "Inventory", href: "/dashboard/inventory", icon: CubeIcon },
  {
    name: "Tax Management",
    href: "/dashboard/tax",
    icon: CalculatorIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  {
    name: "Printers",
    href: "/dashboard/printer",
    icon: PrinterIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  {
    name: "Prep Station",
    href: "/dashboard/menu/station-groups",
    icon: CubeIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  {
    name: "Availability",
    href: "/dashboard/availability",
    icon: ClockIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "OUTLET_MANAGER"],
  },
  {
    name: "Central Kitchen",
    href: "/dashboard/central-kitchen",
    icon: TruckIcon,
    roles: ["SUPER_ADMIN", "ADMIN", "KITCHEN_MANAGER"],
  },
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
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(session?.user?.role || "");
  });

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
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                POS
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto sidebar-scrollbar">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
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
              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

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
