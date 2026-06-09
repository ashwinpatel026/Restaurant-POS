"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export type ComparisonPeriod =
  | "Today vs Yesterday"
  | "This Week vs Last Week"
  | "This Month vs Last Month"
  | "This Year vs Last Year";

export interface ComparisonMetric {
  metric: string;
  current: number;
  previous: number;
}

export const COMPARISON_PERIOD_OPTIONS: ComparisonPeriod[] = [
  "Today vs Yesterday",
  "This Week vs Last Week",
  "This Month vs Last Month",
  "This Year vs Last Year",
];

export const COMPARISON_PERIOD_LABELS: Record<
  ComparisonPeriod,
  { current: string; previous: string }
> = {
  "Today vs Yesterday": { current: "Today", previous: "Yesterday" },
  "This Week vs Last Week": { current: "This Week", previous: "Last Week" },
  "This Month vs Last Month": { current: "This Month", previous: "Last Month" },
  "This Year vs Last Year": { current: "This Year", previous: "Last Year" },
};

export const COMPARISON_MOCK_DATA: Record<
  ComparisonPeriod,
  ComparisonMetric[]
> = {
  "Today vs Yesterday": [
    { metric: "Orders", current: 128, previous: 114 },
    { metric: "Sales ($)", current: 8420, previous: 7680 },
    { metric: "AOV ($)", current: 65.8, previous: 67.4 },
    { metric: "Covers", current: 96, previous: 88 },
  ],
  "This Week vs Last Week": [
    { metric: "Orders", current: 856, previous: 792 },
    { metric: "Sales ($)", current: 56200, previous: 52100 },
    { metric: "AOV ($)", current: 65.7, previous: 65.8 },
    { metric: "Covers", current: 642, previous: 598 },
  ],
  "This Month vs Last Month": [
    { metric: "Orders", current: 3420, previous: 3180 },
    { metric: "Sales ($)", current: 224500, previous: 208900 },
    { metric: "AOV ($)", current: 65.6, previous: 65.7 },
    { metric: "Covers", current: 2580, previous: 2410 },
  ],
  "This Year vs Last Year": [
    { metric: "Orders", current: 41200, previous: 38500 },
    { metric: "Sales ($)", current: 2680000, previous: 2490000 },
    { metric: "AOV ($)", current: 65.0, previous: 64.6 },
    { metric: "Covers", current: 30800, previous: 28900 },
  ],
};

interface PeriodComparisonChartProps {
  data: ComparisonMetric[];
  currentLabel: string;
  previousLabel: string;
  isDark: boolean;
}

function formatMetricValue(metric: string, value: number): string {
  if (metric.includes("Sales")) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  if (metric.includes("AOV")) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return value.toLocaleString();
}

export default function PeriodComparisonChart({
  data,
  currentLabel,
  previousLabel,
  isDark,
}: PeriodComparisonChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const previousBarColor = isDark
    ? "rgba(255,255,255,0.2)"
    : "rgba(209, 213, 219, 0.95)";

  const chartData = useMemo(
    () => ({
      labels: data.map((row) => row.metric),
      datasets: [
        {
          label: currentLabel,
          data: data.map((row) => row.current),
          backgroundColor: "rgba(167, 139, 250, 0.9)",
          borderColor: "#a78bfa",
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: previousLabel,
          data: data.map((row) => row.previous),
          backgroundColor: previousBarColor,
          borderColor: isDark ? "rgba(255,255,255,0.25)" : "#d1d5db",
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    }),
    [data, currentLabel, previousLabel, previousBarColor, isDark],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top" as const,
          align: "end" as const,
          labels: {
            color: tickColor,
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 12 },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: isDark ? "rgba(18,24,38,0.95)" : "#ffffff",
          titleColor: isDark ? "#fff" : "#111827",
          bodyColor: isDark ? "rgba(255,255,255,0.85)" : "#374151",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label(context: {
              dataset: { label?: string };
              parsed: { y: number | null };
              dataIndex: number;
            }) {
              const metric = data[context.dataIndex]?.metric ?? "";
              const value = context.parsed.y ?? 0;
              const label = context.dataset.label ?? "";
              return ` ${label}: ${formatMetricValue(metric, value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11 } },
          border: { display: false },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 12 } },
          border: { display: false },
        },
      },
      animation: {
        duration: 1000,
        easing: "easeOutQuart" as const,
      },
    }),
    [data, isDark, tickColor, gridColor],
  );

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
