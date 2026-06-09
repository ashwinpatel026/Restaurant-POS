"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, User, ShoppingBag, ArrowRight } from "lucide-react";
import DashboardCard, { dash } from "./DashboardCard";
import clsx from "clsx";

type OrderTab = "Dine" | "Takeaway" | "Delivery";
type LiveOrderStatus = "New" | "Preparing" | "Ready";

interface LiveOrder {
  id: string;
  detail: string;
  time: string;
  status: LiveOrderStatus;
}

const TABS: OrderTab[] = ["Dine", "Takeaway", "Delivery"];

const LIVE_ORDERS: Record<OrderTab, LiveOrder[]> = {
  Dine: [
    { id: "#1058", detail: "Table 4", time: "09:44 AM", status: "New" },
    { id: "#1057", detail: "Table 9", time: "09:41 AM", status: "Preparing" },
    { id: "#1056", detail: "Table 2", time: "09:38 AM", status: "Ready" },
    { id: "#1055", detail: "Table 8", time: "09:35 AM", status: "New" },
    { id: "#1054", detail: "Table 1", time: "09:32 AM", status: "Preparing" },
  ],
  Takeaway: [
    { id: "#1053", detail: "John Smith", time: "09:30 AM", status: "New" },
    { id: "#1052", detail: "Sarah Lee", time: "09:28 AM", status: "Preparing" },
    { id: "#1051", detail: "Mike Chen", time: "09:25 AM", status: "Ready" },
    { id: "#1050", detail: "Emma Wilson", time: "09:22 AM", status: "Preparing" },
    { id: "#1049", detail: "Alex Brown", time: "09:18 AM", status: "New" },
  ],
  Delivery: [
    { id: "#1048", detail: "Uber Eats", time: "09:40 AM", status: "Preparing" },
    { id: "#1047", detail: "DoorDash", time: "09:36 AM", status: "New" },
    { id: "#1046", detail: "Grubhub", time: "09:33 AM", status: "Ready" },
    { id: "#1045", detail: "Zomato", time: "09:29 AM", status: "Preparing" },
    { id: "#1044", detail: "Swiggy", time: "09:26 AM", status: "New" },
  ],
};

const statusBorder: Record<LiveOrderStatus, string> = {
  New: "border-l-emerald-500",
  Preparing: "border-l-orange-500",
  Ready: "border-l-blue-500",
};

const statusBadge: Record<LiveOrderStatus, string> = {
  New: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/20",
  Preparing:
    "bg-orange-500/15 text-orange-600 border-orange-500/25 dark:text-orange-400 dark:border-orange-500/20",
  Ready: "bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-400 dark:border-blue-500/20",
};

const tabIcons: Record<OrderTab, typeof LayoutGrid> = {
  Dine: LayoutGrid,
  Takeaway: User,
  Delivery: ShoppingBag,
};

interface LiveOrdersCardProps {
  delay?: number;
}

export default function LiveOrdersCard({ delay = 0 }: LiveOrdersCardProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>("Dine");
  const orders = LIVE_ORDERS[activeTab];
  const DetailIcon = tabIcons[activeTab];

  return (
    <DashboardCard delay={delay} className="flex flex-col">
      <h3 className={clsx("mb-4", dash.title)}>Live Orders</h3>

      <div className={clsx("mb-4 flex gap-1 border-b", dash.divider)}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "relative px-3 pb-2.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-white/45 dark:hover:text-white/70",
            )}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className={clsx(
              "flex items-center gap-3 rounded-xl border border-l-[3px] px-3 py-2.5",
              "border-gray-100 bg-gray-50 dark:border-white/[0.04] dark:bg-white/[0.02]",
              statusBorder[order.status],
            )}
          >
            <div className="min-w-0 flex-1">
              <p className={clsx("text-sm font-semibold", dash.body)}>
                {order.id}
              </p>
              <div
                className={clsx(
                  "mt-0.5 flex items-center gap-1.5 text-xs",
                  dash.subtitle,
                )}
              >
                <DetailIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.detail}</span>
                <span className="text-gray-300 dark:text-white/30">·</span>
                <span>{order.time}</span>
              </div>
            </div>
            <span
              className={clsx(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                statusBadge[order.status],
              )}
            >
              {order.status}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/orders"
        className={clsx(
          "mt-4 flex items-center justify-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
        )}
      >
        View All Orders
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </DashboardCard>
  );
}
