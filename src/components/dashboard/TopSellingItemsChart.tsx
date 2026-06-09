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

export interface TopSellingItem {
  name: string;
  sold: number;
  amount: number;
}

interface TopSellingItemsChartProps {
  data: TopSellingItem[];
  isDark: boolean;
}

function truncateName(name: string, maxLength = 14): string {
  return name.length > maxLength ? `${name.slice(0, 12)}…` : name;
}

export default function TopSellingItemsChart({
  data,
  isDark,
}: TopSellingItemsChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const barColor = isDark
    ? "rgba(167, 139, 250, 0.85)"
    : "rgba(167, 139, 250, 0.9)";

  const chartData = useMemo(
    () => ({
      labels: data.map((item) => truncateName(item.name)),
      datasets: [
        {
          label: "Sold",
          data: data.map((item) => item.sold),
          backgroundColor: barColor,
          borderColor: "#a78bfa",
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }),
    [data, barColor],
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
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
            title(tooltipItems: { dataIndex: number }[]) {
              const index = tooltipItems[0]?.dataIndex ?? 0;
              return data[index]?.name ?? "";
            },
            label(context: { parsed: { x: number | null }; dataIndex: number }) {
              const sold = context.parsed.x ?? 0;
              const amount = data[context.dataIndex]?.amount ?? 0;
              return `${sold} sold · $${amount.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 11 } },
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
    [data, isDark, tickColor, gridColor],
  );

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
