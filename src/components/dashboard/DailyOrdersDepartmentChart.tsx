"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  MatrixController,
  MatrixElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
);

export type DepartmentOrdersPeriod = "Daily" | "Weekly" | "Monthly";

export interface DepartmentOrdersData {
  departments: string[];
  days: string[];
  matrix: number[][];
  todayTotal: number;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DEPARTMENT_ORDERS_MOCK: Record<
  DepartmentOrdersPeriod,
  DepartmentOrdersData
> = {
  Daily: {
    departments: ["Beverages", "Deli", "Food", "Hot Drinks", "Snacks"],
    days: ["9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "7 PM", "9 PM"],
    matrix: [
      [8, 14, 18, 16, 22, 19, 12],
      [6, 10, 14, 12, 16, 14, 9],
      [18, 28, 34, 30, 38, 32, 24],
      [5, 9, 12, 10, 14, 11, 7],
      [7, 12, 15, 13, 18, 15, 10],
    ],
    todayTotal: 248,
  },
  Weekly: {
    departments: ["Beverages", "Deli", "Food", "Hot Drinks", "Snacks"],
    days: WEEK_DAYS,
    matrix: [
      [42, 58, 64, 71, 55, 82, 48],
      [35, 48, 52, 58, 44, 68, 40],
      [88, 102, 118, 125, 96, 142, 92],
      [28, 36, 42, 48, 34, 52, 30],
      [32, 44, 50, 56, 40, 62, 38],
    ],
    todayTotal: 910,
  },
  Monthly: {
    departments: ["Beverages", "Deli", "Food", "Hot Drinks", "Snacks"],
    days: ["Week 1", "Week 2", "Week 3", "Week 4"],
    matrix: [
      [320, 348, 362, 390],
      [265, 288, 302, 318],
      [620, 658, 702, 740],
      [210, 228, 242, 258],
      [240, 262, 278, 296],
    ],
    todayTotal: 2840,
  },
};

interface DailyOrdersDepartmentChartProps {
  data: DepartmentOrdersData;
  isDark: boolean;
}

function interpolatePurple(value: number, min: number, max: number, isDark: boolean) {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);

  if (isDark) {
    const r = Math.round(88 + ratio * 79);
    const g = Math.round(28 + ratio * 102);
    const b = Math.round(135 + ratio * 115);
    const alpha = 0.35 + ratio * 0.55;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const r = Math.round(237 - ratio * 118);
  const g = Math.round(233 - ratio * 148);
  const b = Math.round(254 - ratio * 46);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function DailyOrdersDepartmentChart({
  data,
  isDark,
}: DailyOrdersDepartmentChartProps) {
  const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(107,114,128,0.8)";

  const { matrixPoints, minValue, maxValue } = useMemo(() => {
    const flat = data.matrix.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);

    const points = data.departments.flatMap((department, yIndex) =>
      data.days.map((day, xIndex) => ({
        x: day,
        y: department,
        v: data.matrix[yIndex]?.[xIndex] ?? 0,
      })),
    );

    return { matrixPoints: points, minValue: min, maxValue: max };
  }, [data]);

  const chartData = useMemo(
    () => ({
      datasets: [
        {
          label: "Orders",
          data: matrixPoints,
          backgroundColor(context: {
            dataset: { data: { v: number }[] };
            dataIndex: number;
          }) {
            const value = context.dataset.data[context.dataIndex]?.v ?? 0;
            return interpolatePurple(value, minValue, maxValue, isDark);
          },
          borderColor: isDark ? "rgba(18,24,38,0.85)" : "#ffffff",
          borderWidth: 2,
          borderRadius: 4,
          width: ({ chart }: { chart: ChartJS }) => {
            const area = chart.chartArea;
            if (!area) return 20;
            return area.width / data.days.length - 6;
          },
          height: ({ chart }: { chart: ChartJS }) => {
            const area = chart.chartArea;
            if (!area) return 20;
            return area.height / data.departments.length - 6;
          },
        },
      ],
    }),
    [matrixPoints, minValue, maxValue, isDark, data.days.length, data.departments.length],
  );

  const options = useMemo(
    () => ({
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
            title(items: { raw: { x: string; y: string } }[]) {
              const raw = items[0]?.raw;
              return raw ? `${raw.y} · ${raw.x}` : "";
            },
            label(context: { raw: { v: number } }) {
              return ` ${context.raw.v} orders`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "category" as const,
          labels: data.days,
          offset: true,
          position: "bottom" as const,
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11 } },
          border: { display: false },
        },
        y: {
          type: "category" as const,
          labels: data.departments,
          offset: true,
          reverse: true,
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
    [data.days, data.departments, isDark, tickColor],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-white/50">
        Yeah! You have received{" "}
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {data.todayTotal.toLocaleString()}
        </span>{" "}
        orders today
      </p>
      <div className="min-h-0 flex-1">
        <Chart
          type="matrix"
          data={chartData as ChartData<"matrix">}
          options={options as ChartOptions<"matrix">}
        />
      </div>
    </div>
  );
}
