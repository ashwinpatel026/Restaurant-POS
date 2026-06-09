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

export type OrdersOverviewPeriod = "Daily" | "Weekly" | "Monthly";

export interface OrdersOverviewPoint {
  label: string;
  orders: number;
}

export interface OrdersOverviewData {
  points: OrdersOverviewPoint[];
  todayNew: number;
}

export const ORDERS_OVERVIEW_MOCK: Record<
  OrdersOverviewPeriod,
  OrdersOverviewData
> = {
  Daily: {
    points: [
      { label: "9 AM", orders: 18 },
      { label: "11 AM", orders: 24 },
      { label: "1 PM", orders: 31 },
      { label: "3 PM", orders: 28 },
      { label: "5 PM", orders: 36 },
      { label: "7 PM", orders: 32 },
      { label: "9 PM", orders: 22 },
    ],
    todayNew: 33,
  },
  Weekly: {
    points: [
      { label: "Sun", orders: 37 },
      { label: "Mon", orders: 43 },
      { label: "Tue", orders: 54 },
      { label: "Wed", orders: 48 },
      { label: "Thu", orders: 52 },
      { label: "Fri", orders: 58 },
      { label: "Sat", orders: 46 },
    ],
    todayNew: 33,
  },
  Monthly: {
    points: [
      { label: "Week 1", orders: 420 },
      { label: "Week 2", orders: 458 },
      { label: "Week 3", orders: 492 },
      { label: "Week 4", orders: 516 },
    ],
    todayNew: 33,
  },
};

interface OrdersOverviewChartProps {
  data: OrdersOverviewData;
  isDark: boolean;
}

const barEndLabelsPlugin = {
  id: "barEndLabels",
  afterDatasetsDraw(chart: ChartJS) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    const tickColor =
      chart.options.scales?.x?.ticks?.color ?? "rgba(107,114,128,0.8)";

    ctx.save();
    ctx.fillStyle = String(tickColor);
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    meta.data.forEach((bar, index) => {
      const value = chart.data.datasets[0]?.data[index];
      if (typeof value !== "number" || !("x" in bar && "y" in bar)) return;
      const x = (bar as { x: number; y: number }).x + 6;
      const y = (bar as { x: number; y: number }).y;
      ctx.fillText(`${value}+`, x, y);
    });

    ctx.restore();
  },
};

ChartJS.register(barEndLabelsPlugin);

export default function OrdersOverviewChart({
  data,
  isDark,
}: OrdersOverviewChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const barColor = isDark ? "rgba(148, 163, 184, 0.85)" : "rgba(119, 136, 153, 0.9)";

  const maxValue = useMemo(
    () => Math.max(...data.points.map((point) => point.orders), 10),
    [data.points],
  );

  const chartData = useMemo(
    () => ({
      labels: data.points.map((point) => point.label),
      datasets: [
        {
          label: "New Orders",
          data: data.points.map((point) => point.orders),
          backgroundColor: barColor,
          borderColor: barColor,
          borderWidth: 0,
          borderRadius: { topRight: 6, bottomRight: 6 },
          borderSkipped: false,
        },
      ],
    }),
    [data.points, barColor],
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { right: 36 },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? "rgba(18,24,38,0.95)" : "#ffffff",
          titleColor: isDark ? "#fff" : "#111827",
          bodyColor: isDark ? "rgba(255,255,255,0.85)" : "#374151",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label(context: { parsed: { x: number | null } }) {
              const value = context.parsed.x ?? 0;
              return ` ${value}+ new orders`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: Math.ceil(maxValue / 10) * 10 + 10,
          grid: {
            color: gridColor,
            drawTicks: false,
          },
          ticks: {
            color: tickColor,
            font: { size: 11 },
            stepSize: 10,
          },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11 } },
          border: { display: false },
        },
      },
      animation: {
        duration: 1200,
        easing: "easeOutQuart" as const,
      },
    }),
    [isDark, tickColor, gridColor, maxValue],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-white/50">
        Yeah! You have received{" "}
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          +{data.todayNew}
        </span>{" "}
        new orders today
      </p>
      <div className="min-h-0 flex-1">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
