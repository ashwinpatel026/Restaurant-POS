"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  Banknote,
  Wallet,
  Ticket,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import DashboardCard, { dash } from "./DashboardCard";
import clsx from "clsx";
import { useTheme } from "@/contexts/ThemeContext";

const TABS = [
  "Payments",
  "Cash Summary",
  "Staff Performance",
  "Reports",
  "Alerts",
] as const;

type TabId = (typeof TABS)[number];

const PAYMENT_SUMMARY = {
  total: {
    label: "Total Payments",
    value: 2453.65,
    change: "+18.6%",
    sublabel: null as string | null,
    icon: CreditCard,
    iconBg: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    valueColor: "text-blue-400 dark:text-blue-400",
  },
  card: {
    label: "Card Payments",
    value: 1103.45,
    change: null,
    sublabel: "45.0%",
    icon: CreditCard,
    iconBg: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    valueColor: "text-orange-400 dark:text-orange-400",
  },
  cash: {
    label: "Cash Payments",
    value: 987.25,
    change: null,
    sublabel: "40.2%",
    icon: Banknote,
    iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    valueColor: "text-emerald-400 dark:text-emerald-400",
  },
  other: {
    label: "Other Payments",
    value: 362.95,
    change: null,
    sublabel: "14.8%",
    icon: Ticket,
    iconBg: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    valueColor: "text-purple-400 dark:text-purple-400",
  },
};

const PAYMENT_TREND = {
  Today: [
    { label: "12 AM", value: 120 },
    { label: "4 AM", value: 85 },
    { label: "8 AM", value: 210 },
    { label: "12 PM", value: 680 },
    { label: "4 PM", value: 520 },
    { label: "8 PM", value: 890 },
    { label: "12 AM", value: 340 },
  ],
  Yesterday: [
    { label: "12 AM", value: 95 },
    { label: "4 AM", value: 70 },
    { label: "8 AM", value: 180 },
    { label: "12 PM", value: 590 },
    { label: "4 PM", value: 480 },
    { label: "8 PM", value: 720 },
    { label: "12 AM", value: 280 },
  ],
  "This Week": [
    { label: "Mon", value: 2100 },
    { label: "Tue", value: 1850 },
    { label: "Wed", value: 2340 },
    { label: "Thu", value: 1980 },
    { label: "Fri", value: 2680 },
    { label: "Sat", value: 3120 },
    { label: "Sun", value: 2450 },
  ],
};

function PaymentMetricCard({
  label,
  value,
  change,
  sublabel,
  icon: Icon,
  iconBg,
  valueColor,
}: {
  label: string;
  value: number;
  change: string | null;
  sublabel: string | null;
  icon: LucideIcon;
  iconBg: string;
  valueColor: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-4",
        dash.inner,
        "dark:hover:bg-white/[0.04]",
      )}
    >
      <div
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
          iconBg,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx("text-xl font-bold tabular-nums", valueColor)}>
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className={clsx("mt-0.5 text-sm", dash.muted)}>{label}</p>
        {change && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            {change}
            <span className="font-normal text-gray-400 dark:text-white/40">
              vs Yesterday
            </span>
          </p>
        )}
        {sublabel && (
          <p className={clsx("mt-1 text-sm font-semibold", valueColor)}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

interface PaymentsAnalyticsRowProps {
  delay?: number;
  dateMultiplier?: number;
}

export default function PaymentsAnalyticsRow({
  delay = 820,
  dateMultiplier = 1,
}: PaymentsAnalyticsRowProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<TabId>("Payments");
  const [trendPeriod, setTrendPeriod] =
    useState<keyof typeof PAYMENT_TREND>("Today");

  const chartTickColor = isDark
    ? "rgba(255,255,255,0.35)"
    : "rgba(107,114,128,0.8)";
  const chartTooltipStyle = isDark
    ? {
        background: "rgba(18,24,38,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        color: "#fff",
        fontSize: "13px",
      }
    : {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        color: "#111827",
        fontSize: "13px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      };

  const trendData = useMemo(
    () =>
      PAYMENT_TREND[trendPeriod].map((row) => ({
        ...row,
        value: Math.round(row.value * dateMultiplier),
      })),
    [trendPeriod, dateMultiplier],
  );

  const summary = useMemo(
    () => ({
      total: {
        ...PAYMENT_SUMMARY.total,
        value:
          Math.round(PAYMENT_SUMMARY.total.value * dateMultiplier * 100) / 100,
      },
      card: {
        ...PAYMENT_SUMMARY.card,
        value:
          Math.round(PAYMENT_SUMMARY.card.value * dateMultiplier * 100) / 100,
      },
      cash: {
        ...PAYMENT_SUMMARY.cash,
        value:
          Math.round(PAYMENT_SUMMARY.cash.value * dateMultiplier * 100) / 100,
      },
      other: {
        ...PAYMENT_SUMMARY.other,
        value:
          Math.round(PAYMENT_SUMMARY.other.value * dateMultiplier * 100) / 100,
      },
    }),
    [dateMultiplier],
  );

  return (
    <DashboardCard delay={delay} className="!p-0 overflow-hidden">
      {/* Tabs */}
      <div
        className={clsx(
          "flex gap-1 overflow-x-auto border-b px-4 sm:px-6",
          dash.divider,
        )}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "relative shrink-0 px-4 py-3.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-primary-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-600 dark:bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {activeTab === "Payments" ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
              <PaymentMetricCard {...summary.total} />
              <PaymentMetricCard {...summary.card} />
              <PaymentMetricCard {...summary.cash} />
              <PaymentMetricCard {...summary.other} />
            </div>

            <div className="flex flex-col xl:col-span-7">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className={dash.title}>Payment Trend ({trendPeriod})</h3>
                <select
                  value={trendPeriod}
                  onChange={(e) =>
                    setTrendPeriod(e.target.value as keyof typeof PAYMENT_TREND)
                  }
                  className={dash.select}
                >
                  {Object.keys(PAYMENT_TREND).map((opt) => (
                    <option
                      key={opt}
                      value={opt}
                      className="bg-white dark:bg-[#121826]"
                    >
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="h-64 w-full flex-1 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="paymentTrendGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b82f6"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTickColor, fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTickColor, fontSize: 12 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [
                        `$${Number(value ?? 0).toLocaleString()}`,
                        "Payments",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#paymentTrendGradient)"
                      dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-white/[0.08]">
            <Wallet className="mb-3 h-10 w-10 text-gray-300 dark:text-white/20" />
            <p className={dash.body}>{activeTab}</p>
            <p className={clsx("mt-1 text-center", dash.caption)}>
              Static demo — switch to Payments for analytics preview
            </p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
