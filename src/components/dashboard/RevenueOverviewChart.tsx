"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

export interface RevenueChartPoint {
  label: string;
  transactions: number;
  sales: number;
}

interface RevenueOverviewChartProps {
  data: RevenueChartPoint[];
  isDark: boolean;
}

export default function RevenueOverviewChart({
  data,
  isDark,
}: RevenueOverviewChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const salesColor = isDark ? "#86efac" : "#4ade80";
  const salesFillColor = isDark
    ? "rgba(134, 239, 172, 0.15)"
    : "rgba(74, 222, 128, 0.2)";

  const totals = useMemo(
    () => ({
      transactions: data.reduce((sum, row) => sum + row.transactions, 0),
      sales: data.reduce((sum, row) => sum + row.sales, 0),
    }),
    [data],
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((row) => row.label),
      datasets: [
        {
          type: "bar" as const,
          label: "Transactions",
          data: data.map((row) => row.transactions),
          backgroundColor: isDark
            ? "rgba(99, 102, 241, 0.55)"
            : "rgba(99, 102, 241, 0.65)",
          borderColor: "#6366f1",
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: "y",
          order: 2,
        },
        {
          type: "line" as const,
          label: "Sales ($)",
          data: data.map((row) => row.sales),
          borderColor: salesColor,
          backgroundColor: salesFillColor,
          borderWidth: 2.5,
          pointBackgroundColor: salesColor,
          pointBorderColor: salesColor,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.35,
          yAxisID: "y1",
          order: 1,
        },
      ],
    }),
    [data, isDark, salesColor, salesFillColor],
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
            color: (context: { text?: string }) =>
              context.text === "Sales ($)" ? salesColor : tickColor,
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
            }) {
              const value = context.parsed.y ?? 0;
              if (context.dataset.label === "Sales ($)") {
                return ` Sales: $${value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              }
              return ` Transactions: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 12 } },
          border: { display: false },
        },
        y: {
          type: "linear" as const,
          position: "left" as const,
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { size: 12 },
            stepSize: 1,
            precision: 0,
          },
          border: { display: false },
          title: {
            display: true,
            text: "Transactions",
            color: tickColor,
            font: { size: 11 },
          },
        },
        y1: {
          type: "linear" as const,
          position: "right" as const,
          grid: { drawOnChartArea: false },
          ticks: {
            color: tickColor,
            font: { size: 12 },
            callback(value: string | number) {
              const num = Number(value);
              return num >= 1000 ? `$${(num / 1000).toFixed(0)}k` : `$${num}`;
            },
          },
          border: { display: false },
          title: {
            display: true,
            text: "Sales ($)",
            color: salesColor,
            font: { size: 11 },
          },
        },
      },
      animation: {
        duration: 1200,
        easing: "easeOutQuart" as const,
      },
    }),
    [isDark, tickColor, gridColor, salesColor],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-white/45">
            Total Transaction
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            : {totals.transactions.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-white/45">Total Sales</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            : $
            {totals.sales.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}
