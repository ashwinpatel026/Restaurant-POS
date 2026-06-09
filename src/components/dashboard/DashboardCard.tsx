"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}

export default function DashboardCard({
  children,
  className,
  delay = 0,
  noPadding = false,
}: DashboardCardProps) {
  return (
    <div
      className={clsx(
        "rounded-[20px] border shadow-sm",
        "bg-white border-gray-200",
        "dark:border-white/[0.08] dark:bg-[rgba(18,24,38,0.75)] dark:shadow-none dark:backdrop-blur-xl",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-[4px] hover:scale-[1.01] hover:border-gray-300",
        "dark:hover:border-white/[0.12]",
        "animate-dashboard-fade-in opacity-0",
        noPadding ? "" : "p-6",
        className,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {children}
    </div>
  );
}

/** Shared typography / surfaces for dashboard widgets */
export const dash = {
  title: "text-lg font-semibold text-gray-900 dark:text-white",
  heading: "text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl",
  subtitle: "text-sm text-gray-500 dark:text-white/50",
  body: "text-sm font-medium text-gray-900 dark:text-white",
  muted: "text-sm text-gray-500 dark:text-white/60",
  caption: "text-xs text-gray-500 dark:text-white/40",
  link: "text-primary-600 hover:text-primary-700 dark:text-purple-400 dark:hover:text-purple-300",
  inner:
    "rounded-xl border border-gray-100 bg-gray-50 dark:border-white/[0.04] dark:bg-white/[0.02]",
  innerHover:
    "transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.04]",
  divider: "border-gray-200 dark:border-white/[0.06]",
  select:
    "appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-primary-500/50 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white/80 dark:hover:border-white/[0.15] dark:focus:border-purple-500/50",
  iconBox:
    "rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5",
  iconMuted: "text-gray-400 dark:text-white/50",
} as const;
