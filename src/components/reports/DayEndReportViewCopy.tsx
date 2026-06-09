"use client";

import { useState } from "react";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChartBarIcon,
  ReceiptPercentIcon,
  EyeIcon,
  PrinterIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useReportFilters } from "@/contexts/ReportFilterContext";
import { reportTheme } from "@/lib/reports/theme";
import { format } from "date-fns";

const SALES_OVER_TIME = [
  { hour: "00:00", sales: 45 },
  { hour: "04:00", sales: 30 },
  { hour: "08:00", sales: 120 },
  { hour: "12:00", sales: 280 },
  { hour: "16:00", sales: 210 },
  { hour: "20:00", sales: 380 },
  { hour: "24:00", sales: 160 },
];

const PAYMENT_METHODS = [
  {
    name: "Cash",
    summaryLabel: "Cash Collected",
    value: 340.5,
    pct: 27.3,
    color: "#34d399",
    iconBg: "bg-emerald-500",
    pctColor: "text-emerald-400",
    icon: CheckIcon,
  },
  {
    name: "Card",
    summaryLabel: "Card Payments",
    value: 560.25,
    pct: 45.0,
    color: "#60a5fa",
    iconBg: "bg-blue-500",
    pctColor: "text-blue-400",
    icon: CheckIcon,
  },
  {
    name: "UPI",
    summaryLabel: "UPI Payments",
    value: 245.0,
    pct: 19.7,
    color: "#a78bfa",
    iconBg: "bg-violet-500",
    pctColor: "text-violet-400",
    icon: DevicePhoneMobileIcon,
  },
  {
    name: "Other",
    summaryLabel: "Other Payments",
    value: 100.0,
    pct: 8.0,
    color: "#fb923c",
    iconBg: "bg-orange-500",
    pctColor: "text-orange-400",
    icon: BuildingStorefrontIcon,
  },
];

const STATION_SALES = [
  { station: "TS1", sales: 452.2, color: "#34d399" },
  { station: "B2", sales: 295.8, color: "#60a5fa" },
  { station: "N1", sales: 210.75, color: "#a78bfa" },
  { station: "T1", sales: 162.5, color: "#fb923c" },
  { station: "Terminal", sales: 124.5, color: "#fbbf24" },
];

const PEAK_HOURS = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  hours: ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"],
  values: [
    [0.1, 0.15, 0.2, 0.35, 0.5, 0.7, 0.85],
    [0.05, 0.1, 0.15, 0.25, 0.4, 0.55, 0.65],
    [0.2, 0.25, 0.45, 0.7, 0.85, 0.95, 1.0],
    [0.15, 0.2, 0.35, 0.6, 0.75, 0.9, 0.8],
    [0.1, 0.15, 0.3, 0.55, 0.7, 0.85, 0.75],
    [0.08, 0.12, 0.25, 0.45, 0.6, 0.7, 0.65],
  ],
};

const DEMO_SHIFTS = [
  {
    id: "SH-2847",
    shiftTime: "08:00 AM - 02:00 PM",
    station: "TS1",
    stationColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    duration: "6h 00m",
    sales: "$452.20",
    tips: "$18.50",
    totalSales: "$470.70",
    cashIn: "$200.00",
    cashOut: "$452.20",
    difference: "$252.20",
    orders: 18,
  },
  {
    id: "SH-2846",
    shiftTime: "02:00 PM - 08:00 PM",
    station: "N1",
    stationColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    duration: "6h 00m",
    sales: "$295.80",
    tips: "$12.00",
    totalSales: "$307.80",
    cashIn: "$150.00",
    cashOut: "$295.80",
    difference: "$145.80",
    orders: 14,
  },
  {
    id: "SH-2845",
    shiftTime: "06:00 PM - 12:00 AM",
    station: "T1",
    stationColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    duration: "6h 00m",
    sales: "$210.75",
    tips: "$8.25",
    totalSales: "$219.00",
    cashIn: "$100.00",
    cashOut: "$210.75",
    difference: "$110.75",
    orders: 10,
  },
  {
    id: "SH-2844",
    shiftTime: "10:00 AM - 04:00 PM",
    station: "B2",
    stationColor: "bg-violet-500/20 text-violet-400 border-violet-500/40",
    duration: "6h 00m",
    sales: "$162.50",
    tips: "$6.50",
    totalSales: "$169.00",
    cashIn: "$175.00",
    cashOut: "$162.50",
    difference: "-$12.50",
    orders: 8,
  },
  {
    id: "SH-2843",
    shiftTime: "09:00 AM - 03:00 PM",
    station: "TS1",
    stationColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    duration: "6h 00m",
    sales: "$124.50",
    tips: "$4.50",
    totalSales: "$129.00",
    cashIn: "$200.00",
    cashOut: "$124.50",
    difference: "-$75.50",
    orders: 4,
  },
];

const INSIGHTS = [
  {
    text: "Sales increased by 12.5% compared to yesterday",
    icon: ArrowTrendingUpIcon,
    color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  },
  {
    text: "Peak sales between 07:00 PM - 09:00 PM",
    icon: SparklesIcon,
    color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  },
  {
    text: "Refunds increased by 12% compared to yesterday",
    icon: ExclamationTriangleIcon,
    color: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  },
];

const CHART_TICK = { fill: "rgba(161,161,170,0.8)", fontSize: 11 };
const CHART_TOOLTIP = {
  background: "rgba(24,24,27,0.95)",
  border: "1px solid rgba(63,63,70,0.8)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};
const CHART_AREA_HEIGHT = "h-[212px]";
const CHART_MARGIN = { top: 2, right: 0, left: -18, bottom: -4 };
const CHART_MARGIN_BAR = { top: 2, right: 0, left: -10, bottom: -4 };

const KPI_THEMES = {
  sales: {
    iconBg: "bg-red-500/30 text-red-400 border border-red-500/20",
    glow: "rgba(239,68,68,0.45)",
    spark: "#ef4444",
    gradientId: "kpiSalesGrad",
  },
  orders: {
    iconBg: "bg-violet-500/30 text-violet-400 border border-violet-500/20",
    glow: "rgba(168,85,247,0.45)",
  },
  cash: {
    iconBg: "bg-emerald-500/30 text-emerald-400 border border-emerald-500/20",
    glow: "rgba(34,197,94,0.45)",
  },
  tips: {
    iconBg: "bg-blue-500/30 text-blue-400 border border-blue-500/20",
    glow: "rgba(59,130,246,0.45)",
  },
  profit: {
    iconBg: "bg-emerald-500/30 text-emerald-400 border border-emerald-500/20",
    glow: "rgba(34,197,94,0.45)",
    spark: "#22c55e",
    gradientId: "kpiProfitGrad",
  },
  taxes: {
    iconBg: "bg-amber-500/30 text-amber-400 border border-amber-500/20",
    glow: "rgba(245,158,11,0.45)",
  },
} as const;

function KpiIcon({
  icon: Icon,
  theme,
}: {
  icon: React.ComponentType<{ className?: string }>;
  theme: { iconBg: string; glow: string };
}) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${theme.iconBg}`}
      style={{ boxShadow: `0 0 18px ${theme.glow}` }}
    >
      <Icon className="h-7 w-7 text-inherit" />
    </div>
  );
}

function KpiSparkline({
  data,
  color,
  gradientId,
}: {
  data: number[];
  color: string;
  gradientId: string;
}) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="h-14 w-full mt-3 -mb-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiListRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-700/60 last:border-0">
      <span className="text-xs text-zinc-400">{label}</span>
      <span
        className={`text-xs font-medium tabular-nums ${
          highlight ? "text-emerald-400" : "text-zinc-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function KpiTrendCard({
  label,
  value,
  icon,
  theme,
  trend,
  compareLabel,
  sparkline,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: (typeof KPI_THEMES)[keyof typeof KPI_THEMES];
  trend: string;
  compareLabel: string;
  sparkline: number[];
}) {
  const sparkColor = "spark" in theme ? theme.spark : "#22c55e";
  const gradientId = "gradientId" in theme ? theme.gradientId : "kpiGrad";

  return (
    <div
      className={`${reportTheme.card} p-4 flex flex-col h-full min-h-[168px]`}
    >
      <div className="flex items-start gap-3">
        <KpiIcon icon={icon} theme={theme} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-400">{label}</p>
          <p className="text-xl font-bold text-white tabular-nums tracking-tight">
            {value}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold text-emerald-400">{trend}</span>
      </div>
      <p className="text-[11px] text-zinc-500 mt-0.5">{compareLabel}</p>
      <KpiSparkline
        data={sparkline}
        color={sparkColor}
        gradientId={gradientId}
      />
    </div>
  );
}

function KpiListCard({
  label,
  value,
  icon,
  theme,
  rows,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: (typeof KPI_THEMES)[keyof typeof KPI_THEMES];
  rows: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <div
      className={`${reportTheme.card} p-4 flex flex-col h-full min-h-[168px]`}
    >
      <div className="flex items-start gap-3">
        <KpiIcon icon={icon} theme={theme} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-400">{label}</p>
          <p className="text-xl font-bold text-white tabular-nums tracking-tight">
            {value}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-1 border-t border-zinc-700/60 flex-1">
        {rows.map((row) => (
          <KpiListRow key={row.label} {...row} />
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`${reportTheme.card} p-2 flex flex-col`}>
      <div className="flex items-center justify-between gap-2 mb-1.5 shrink-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function heatmapColor(intensity: number): string {
  if (intensity >= 0.85) return "bg-amber-500/90";
  if (intensity >= 0.65) return "bg-amber-500/60";
  if (intensity >= 0.45) return "bg-amber-500/35";
  if (intensity >= 0.25) return "bg-amber-500/20";
  return "bg-zinc-800";
}

function PaymentSummaryRow({
  label,
  value,
  pct,
  iconBg,
  pctColor,
  icon: Icon,
}: {
  label: string;
  value: number;
  pct: number;
  iconBg: string;
  pctColor: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-700/60 last:border-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      <span className="flex-1 min-w-0 text-sm text-white">{label}</span>
      <span className="text-sm font-medium text-white tabular-nums">
        ${value.toFixed(2)}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums w-14 text-right ${pctColor}`}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function DayEndReportView() {
  const { applied, getActiveDateLabel } = useReportFilters();
  const [selectedShiftId, setSelectedShiftId] = useState(DEMO_SHIFTS[0].id);

  if (!applied) {
    return (
      <div
        className={`${reportTheme.card} ${reportTheme.cardPadding} text-center py-16`}
      >
        <p className="text-zinc-300 font-medium">
          Select a date and click Load Report to view day end summary
        </p>
        <p className={`${reportTheme.muted} mt-2`}>
          KPIs, charts, and shift breakdown will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className={reportTheme.muted}>
        Date: {getActiveDateLabel()} · Generated{" "}
        {applied.generatedAt
          ? format(applied.generatedAt, "MMM dd, yyyy h:mm a")
          : ""}
      </p>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        <KpiTrendCard
          label="Total Sales"
          value="$1,245.75"
          icon={CurrencyDollarIcon}
          theme={KPI_THEMES.sales}
          trend="12.5%"
          compareLabel="vs Mar 15, 2026"
          sparkline={[72, 88, 95, 102, 115, 124]}
        />

        <KpiListCard
          label="Total Orders"
          value="54"
          icon={ShoppingBagIcon}
          theme={KPI_THEMES.orders}
          rows={[
            { label: "Completed", value: "49" },
            { label: "Cancelled", value: "3" },
            { label: "Refunded", value: "2" },
          ]}
        />

        <KpiListCard
          label="Cash In Drawer"
          value="$100.00"
          icon={BanknotesIcon}
          theme={KPI_THEMES.cash}
          rows={[
            { label: "Opening Cash", value: "$0.00" },
            { label: "Closing Cash", value: "$100.00" },
            { label: "Difference", value: "$100.00", highlight: true },
          ]}
        />

        <KpiListCard
          label="Total Tips"
          value="$25.75"
          icon={CreditCardIcon}
          theme={KPI_THEMES.tips}
          rows={[
            { label: "Cash Tips", value: "$20.00" },
            { label: "Card Tips", value: "$5.75" },
          ]}
        />

        <KpiTrendCard
          label="Net Profit"
          value="$366.25"
          icon={ChartBarIcon}
          theme={KPI_THEMES.profit}
          trend="14.3%"
          compareLabel="vs Mar 15, 2026"
          sparkline={[58, 62, 68, 74, 82, 91]}
        />

        <KpiListCard
          label="Taxes Collected"
          value="$67.25"
          icon={ReceiptPercentIcon}
          theme={KPI_THEMES.taxes}
          rows={[
            { label: "GST (5%)", value: "$45.00" },
            { label: "VAT (2.5%)", value: "$22.25" },
          ]}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <ChartCard
          title="Sales Over Time"
          action={
            <select className="rounded-md border border-zinc-600 bg-zinc-800 text-zinc-200 px-2 py-1 text-xs">
              <option>By Hour</option>
            </select>
          }
        >
          <div className={CHART_AREA_HEIGHT}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SALES_OVER_TIME} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient
                    id="dayEndSalesGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(63,63,70,0.5)"
                />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_TICK}
                />
                <YAxis
                  width={36}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_TICK}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#dayEndSalesGrad)"
                  dot={{ r: 3, fill: "#fbbf24", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Sales by Payment Method">
          <div
            className={`${CHART_AREA_HEIGHT} flex flex-col justify-between gap-0.5 pt-0.5`}
          >
            <div className="relative mx-auto h-[138px] w-[138px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={PAYMENT_METHODS}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="100%"
                    dataKey="value"
                    stroke="none"
                  >
                    {PAYMENT_METHODS.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-zinc-400">Total</p>
                <p className="text-sm font-bold text-white">$1,245.75</p>
              </div>
            </div>
            <div className="w-full space-y-1">
              {PAYMENT_METHODS.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="text-zinc-400">{m.name}</span>
                  </div>
                  <span className="text-zinc-200">
                    ${m.value.toFixed(2)}{" "}
                    <span className="text-zinc-500">({m.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Sales by Station"
          action={
            <select className="rounded-md border border-zinc-600 bg-zinc-800 text-zinc-200 px-2 py-1 text-xs">
              <option>By Sales</option>
            </select>
          }
        >
          <div className={CHART_AREA_HEIGHT}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STATION_SALES} margin={CHART_MARGIN_BAR}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(63,63,70,0.5)"
                />
                <XAxis
                  dataKey="station"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_TICK}
                />
                <YAxis
                  width={36}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_TICK}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {STATION_SALES.map((entry) => (
                    <Cell key={entry.station} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Peak Hours (By Sales)">
          <div
            className={`${CHART_AREA_HEIGHT} flex items-center overflow-x-auto`}
          >
            <div className="w-full min-w-0">
              <div className="grid grid-cols-8 gap-0.5 mb-0.5">
                <div />
                {PEAK_HOURS.days.map((day) => (
                  <div
                    key={day}
                    className="text-[10px] text-zinc-500 text-center"
                  >
                    {day}
                  </div>
                ))}
              </div>
              {PEAK_HOURS.hours.map((hour, rowIdx) => (
                <div key={hour} className="grid grid-cols-8 gap-0.5 mb-0.5">
                  <div className="text-[10px] text-zinc-500 pr-0.5 flex items-center">
                    {hour}
                  </div>
                  {PEAK_HOURS.values[rowIdx].map((val, colIdx) => (
                    <div
                      key={`${hour}-${PEAK_HOURS.days[colIdx]}`}
                      className={`h-[26px] rounded-sm ${heatmapColor(val)}`}
                      title={`${PEAK_HOURS.days[colIdx]} ${hour}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className={`${reportTheme.card} xl:col-span-2 overflow-hidden`}>
          <div
            className={`${reportTheme.cardPadding} border-b border-zinc-700 flex items-center gap-2`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-amber-400" />
            <h2 className={reportTheme.subheading}>Shift / Station Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-3 py-3 font-medium">Shift Time</th>
                  <th className="px-3 py-3 font-medium">Station</th>
                  <th className="px-3 py-3 font-medium">Shift ID</th>
                  <th className="px-3 py-3 font-medium">Duration</th>
                  <th className="px-3 py-3 font-medium">Sales</th>
                  <th className="px-3 py-3 font-medium">Tips</th>
                  <th className="px-3 py-3 font-medium">Total Sales</th>
                  <th className="px-3 py-3 font-medium">Cash In</th>
                  <th className="px-3 py-3 font-medium">Cash Out</th>
                  <th className="px-3 py-3 font-medium">Difference</th>
                  <th className="px-3 py-3 font-medium">Orders</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {DEMO_SHIFTS.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedShiftId(row.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedShiftId === row.id
                        ? "bg-amber-400/5"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <td className="px-3 py-3 text-zinc-200 whitespace-nowrap text-xs">
                      {row.shiftTime}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${row.stationColor}`}
                      >
                        {row.station}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">
                      {row.id}
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">
                      {row.duration}
                    </td>
                    <td className="px-3 py-3 text-white font-medium text-xs">
                      {row.sales}
                    </td>
                    <td className={`px-3 py-3 text-xs ${reportTheme.positive}`}>
                      {row.tips}
                    </td>
                    <td className="px-3 py-3 text-white font-medium text-xs">
                      {row.totalSales}
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">
                      {row.cashIn}
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">
                      {row.cashOut}
                    </td>
                    <td
                      className={`px-3 py-3 text-xs font-medium ${
                        row.difference.startsWith("-")
                          ? "text-red-400"
                          : reportTheme.positive
                      }`}
                    >
                      {row.difference}
                    </td>
                    <td className="px-3 py-3 text-zinc-300 text-xs">
                      {row.orders}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={reportTheme.btnGhost}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShiftId(row.id);
                          }}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={reportTheme.btnGhost}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className={`${reportTheme.cardPadding} border-t border-zinc-700 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400`}
          >
            <span>Showing 1 to 5 of 5 entries</span>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select className="rounded-md border border-zinc-600 bg-zinc-800 text-zinc-200 px-2 py-1 text-xs">
                <option>10</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`${reportTheme.card} ${reportTheme.cardPadding}`}>
            <h3 className={`${reportTheme.subheading} mb-3`}>
              Payment Summary
            </h3>
            <div>
              {PAYMENT_METHODS.map((m) => (
                <PaymentSummaryRow
                  key={m.name}
                  label={m.summaryLabel}
                  value={m.value}
                  pct={m.pct}
                  iconBg={m.iconBg}
                  pctColor={m.pctColor}
                  icon={m.icon}
                />
              ))}
            </div>
            <div className="mt-2 pt-4 border-t border-zinc-700 flex items-center justify-between">
              <span className="text-base font-bold text-white">Total</span>
              <span className="text-lg font-bold text-white tabular-nums">
                $1,245.75
              </span>
            </div>
          </div>

          <div className={`${reportTheme.card} ${reportTheme.cardPadding}`}>
            <h3 className={`${reportTheme.subheading} mb-4`}>Insights</h3>
            <div className="space-y-3">
              {INSIGHTS.map((insight) => (
                <div key={insight.text} className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${insight.color}`}
                  >
                    <insight.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-zinc-300 leading-snug pt-1">
                    {insight.text}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${reportTheme.btnSecondary} w-full mt-4`}
            >
              View Detailed Insights
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
