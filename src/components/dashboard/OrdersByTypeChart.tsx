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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
  Legend,
);

export interface OrdersByTypePoint {
  label: string;
  dineIn: number;
  orderToGo: number;
  delivery: number;
}

interface OrdersByTypeChartProps {
  data: OrdersByTypePoint[];
  isDark: boolean;
}

const ORDER_TYPE_COLORS = {
  dineIn: "#6366f1",
  delivery: "#f97316",
  orderToGo: "#22c55e",
} as const;

const ORDER_TYPE_DATASETS = [
  { key: "dineIn" as const, label: "Dine In" },
  { key: "delivery" as const, label: "Delivery" },
  { key: "orderToGo" as const, label: "Order To Go" },
];

export default function OrdersByTypeChart({
  data,
  isDark,
}: OrdersByTypeChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const chartData = useMemo(
    () => ({
      labels: data.map((row) => row.label),
      datasets: ORDER_TYPE_DATASETS.map(({ key, label }, index) => ({
        label,
        data: data.map((row) => row[key]),
        backgroundColor: ORDER_TYPE_COLORS[key],
        borderWidth: 0,
        borderRadius:
          index === ORDER_TYPE_DATASETS.length - 1
            ? { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
            : 0,
        borderSkipped: false,
      })),
    }),
    [data],
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
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 12 } },
          border: { display: false },
        },
        y: {
          stacked: true,
          grid: { color: gridColor },
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

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
