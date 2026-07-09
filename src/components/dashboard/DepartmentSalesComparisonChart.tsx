"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { ComparisonPeriod } from "@/components/dashboard/PeriodComparisonChart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
  Legend,
);

export interface DepartmentSalesPoint {
  department: string;
  current: number;
  previous: number;
}

export const DEPARTMENT_SALES_MOCK: Record<
  ComparisonPeriod,
  DepartmentSalesPoint[]
> = {
  "Today vs Yesterday": [
    { department: "Beverages", current: 2140, previous: 1980 },
    { department: "Deli", current: 1680, previous: 1520 },
    { department: "Food", current: 4820, previous: 4380 },
    { department: "Gift Card", current: 480, previous: 400 },
  ],
  "This Week vs Last Week": [
    { department: "Beverages", current: 14850, previous: 13920 },
    { department: "Deli", current: 11240, previous: 10480 },
    { department: "Food", current: 32400, previous: 30100 },
    { department: "Gift Card", current: 2530, previous: 2100 },
  ],
  "This Month vs Last Month": [
    { department: "Beverages", current: 58400, previous: 55200 },
    { department: "Deli", current: 44200, previous: 41800 },
    { department: "Food", current: 128600, previous: 119400 },
    { department: "Gift Card", current: 12900, previous: 11200 },
  ],
  "This Year vs Last Year": [
    { department: "Beverages", current: 698000, previous: 651000 },
    { department: "Deli", current: 524000, previous: 498000 },
    { department: "Food", current: 1542000, previous: 1428000 },
    { department: "Gift Card", current: 127000, previous: 112000 },
  ],
};

interface DepartmentSalesComparisonChartProps {
  data: DepartmentSalesPoint[];
  currentLabel: string;
  previousLabel: string;
  isDark: boolean;
}

function formatSales(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function DepartmentSalesComparisonChart({
  data,
  currentLabel,
  previousLabel,
  isDark,
}: DepartmentSalesComparisonChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const previousBarColor = isDark
    ? "rgba(255,255,255,0.2)"
    : "rgba(209, 213, 219, 0.95)";

  const totals = useMemo(
    () => ({
      current: data.reduce((sum, row) => sum + row.current, 0),
      previous: data.reduce((sum, row) => sum + row.previous, 0),
    }),
    [data],
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((row) => row.department),
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
      indexAxis: "y" as const,
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
              parsed: { x: number | null };
            }) {
              const value = context.parsed.x ?? 0;
              return ` ${context.dataset.label}: ${formatSales(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { size: 11 },
            callback(value: string | number) {
              const num = Number(value);
              return num >= 1000 ? `$${(num / 1000).toFixed(0)}k` : `$${num}`;
            },
          },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 12 } },
          border: { display: false },
        },
      },
      animation: {
        duration: 1200,
        easing: "easeOutQuart" as const,
      },
    }),
    [isDark, tickColor, gridColor],
  );

  const changePct =
    totals.previous > 0
      ? (((totals.current - totals.previous) / totals.previous) * 100).toFixed(1)
      : "0.0";
  const isUp = totals.current >= totals.previous;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-white/45">
            Total ({currentLabel})
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            : {formatSales(totals.current)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-white/45">
            Total ({previousLabel})
          </span>
          <span className="font-semibold text-gray-500 dark:text-white/60">
            : {formatSales(totals.previous)}
          </span>
        </div>
        <div
          className={
            isUp
              ? "font-semibold text-emerald-600 dark:text-emerald-400"
              : "font-semibold text-red-500 dark:text-red-400"
          }
        >
          {isUp ? "+" : ""}
          {changePct}%
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
