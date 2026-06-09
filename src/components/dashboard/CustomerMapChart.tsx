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

export type CustomerMapPeriod = "Daily" | "Weekly" | "Monthly";

export interface CustomerMapPoint {
  label: string;
  newClients: number;
  retainedClients: number;
}

export interface CustomerMapData {
  points: CustomerMapPoint[];
  totalNew: number;
  totalRetained: number;
}

export const CUSTOMER_MAP_MOCK: Record<CustomerMapPeriod, CustomerMapData> = {
  Daily: {
    points: [
      { label: "9 AM", newClients: 8, retainedClients: 12 },
      { label: "11 AM", newClients: 14, retainedClients: 18 },
      { label: "1 PM", newClients: 22, retainedClients: 16 },
      { label: "3 PM", newClients: 18, retainedClients: 20 },
      { label: "5 PM", newClients: 26, retainedClients: 24 },
      { label: "7 PM", newClients: 20, retainedClients: 22 },
      { label: "9 PM", newClients: 12, retainedClients: 14 },
    ],
    totalNew: 120,
    totalRetained: 126,
  },
  Weekly: {
    points: [
      { label: "Sun", newClients: 20, retainedClients: 28 },
      { label: "Mon", newClients: 40, retainedClients: 32 },
      { label: "Tue", newClients: 60, retainedClients: 12 },
      { label: "Wed", newClients: 35, retainedClients: 5 },
      { label: "Thu", newClients: 50, retainedClients: 35 },
      { label: "Fri", newClients: 70, retainedClients: 10 },
      { label: "Sat", newClients: 30, retainedClients: 30 },
    ],
    totalNew: 305,
    totalRetained: 152,
  },
  Monthly: {
    points: [
      { label: "Week 1", newClients: 180, retainedClients: 210 },
      { label: "Week 2", newClients: 220, retainedClients: 195 },
      { label: "Week 3", newClients: 260, retainedClients: 240 },
      { label: "Week 4", newClients: 245, retainedClients: 255 },
    ],
    totalNew: 905,
    totalRetained: 900,
  },
};

interface CustomerMapChartProps {
  data: CustomerMapData;
  isDark: boolean;
}

export default function CustomerMapChart({
  data,
  isDark,
}: CustomerMapChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const newClientColor = isDark ? "#f472b6" : "#E1336E";
  const retainedColor = isDark ? "rgba(148, 163, 184, 0.9)" : "#3E4852";

  const { yMin, yMax } = useMemo(() => {
    const newValues = data.points.map((point) => point.newClients);
    const retainedValues = data.points.map((point) => point.retainedClients);
    const maxNew = Math.max(...newValues, 10);
    const maxRetained = Math.max(...retainedValues, 10);
    const step = 30;
    return {
      yMin: -Math.ceil(maxRetained / step) * step,
      yMax: Math.ceil(maxNew / step) * step,
    };
  }, [data.points]);

  const chartData = useMemo(
    () => ({
      labels: data.points.map((point) => point.label),
      datasets: [
        {
          label: "New Clients",
          data: data.points.map((point) => point.newClients),
          backgroundColor: newClientColor,
          borderColor: newClientColor,
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: "Retained Clients",
          data: data.points.map((point) => -point.retainedClients),
          backgroundColor: retainedColor,
          borderColor: retainedColor,
          borderWidth: 0,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    }),
    [data.points, newClientColor, retainedColor],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      datasets: {
        bar: {
          grouped: false,
          categoryPercentage: 0.55,
          barPercentage: 0.85,
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
          align: "end" as const,
          labels: {
            color: tickColor,
            boxWidth: 10,
            boxHeight: 10,
            font: { size: 11 },
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
            label(context: { dataset: { label?: string }; parsed: { y: number | null } }) {
              const value = Math.abs(context.parsed.y ?? 0);
              return ` ${context.dataset.label}: ${value}`;
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
          min: yMin,
          max: yMax,
          grid: {
            color: gridColor,
            drawTicks: false,
          },
          ticks: {
            color: tickColor,
            font: { size: 11 },
            stepSize: 30,
            callback(value: string | number) {
              return String(value);
            },
          },
          border: { display: false },
        },
      },
      animation: {
        duration: 1200,
        easing: "easeOutQuart" as const,
      },
    }),
    [isDark, tickColor, gridColor, yMin, yMax],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-xs text-gray-400 dark:text-white/40">
          New client vs Retained Clients
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
          <span className="font-semibold text-pink-600 dark:text-pink-400">
            {data.totalNew.toLocaleString()}
          </span>{" "}
          new ·{" "}
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {data.totalRetained.toLocaleString()}
          </span>{" "}
          retained
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
