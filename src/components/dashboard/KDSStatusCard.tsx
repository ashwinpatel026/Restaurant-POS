"use client";

import Link from "next/link";
import { ChefHat, CookingPot, CircleCheck, ArrowRight } from "lucide-react";
import DashboardCard, { dash } from "./DashboardCard";
import clsx from "clsx";

interface KDSStatusCardProps {
  delay?: number;
  activeOrders?: number;
  preparing?: number;
  ready?: number;
}

export default function KDSStatusCard({
  delay = 0,
  activeOrders = 24,
  preparing = 16,
  ready = 8,
}: KDSStatusCardProps) {
  return (
    <DashboardCard delay={delay} className="flex flex-col">
      <h3 className={clsx("mb-4", dash.title)}>
        KDS (Kitchen Display Status)
      </h3>

      <div className="flex flex-1 flex-col gap-3">
        <div className={clsx("flex items-center gap-4 p-4", dash.inner)}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
            <ChefHat className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <p className={dash.subtitle}>Active Orders</p>
            <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {activeOrders}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={clsx("flex flex-col items-center p-4", dash.inner)}>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
              <CookingPot className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            </div>
            <p className={dash.subtitle}>Preparing</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {preparing}
            </p>
          </div>
          <div className={clsx("flex flex-col items-center p-4", dash.inner)}>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <CircleCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            </div>
            <p className={dash.subtitle}>Ready</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {ready}
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/dashboard/orders"
        className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        View KDS
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </DashboardCard>
  );
}
