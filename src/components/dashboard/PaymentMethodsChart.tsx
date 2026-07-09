"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import clsx from "clsx";

ChartJS.register(ArcElement, DoughnutController, Tooltip, Legend);

export interface PaymentMethod {
  name: string;
  value: number;
  color: string;
}

interface PaymentMethodsChartProps {
  data: PaymentMethod[];
  isDark: boolean;
}

export default function PaymentMethodsChart({
  data,
  isDark,
}: PaymentMethodsChartProps) {
  const chartRef = useRef<ChartJS<"doughnut">>(null);
  const [hidden, setHidden] = useState<boolean[]>(() => data.map(() => false));

  const labelColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(107,114,128,0.9)";
  const segmentBorderColor = isDark ? "rgba(18, 24, 38, 0.95)" : "#ffffff";

  useEffect(() => {
    setHidden(data.map(() => false));
  }, [data]);

  const syncHiddenState = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    setHidden(data.map((_, index) => !chart.getDataVisibility(index)));
  }, [data]);

  const toggleSegment = useCallback(
    (index: number) => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.toggleDataVisibility(index);
      chart.update();
      syncHiddenState();
    },
    [syncHiddenState],
  );

  const chartData = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: data.map((item) => item.name),
      datasets: [
        {
          data: data.map((item) => item.value),
          backgroundColor: data.map((item) => item.color),
          borderColor: segmentBorderColor,
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    }),
    [data, segmentBorderColor],
  );

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
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
          filter(tooltipItem) {
            const index = tooltipItem.dataIndex;
            return index !== undefined && !hidden[index];
          },
          callbacks: {
            label(context) {
              const value = typeof context.parsed === "number" ? context.parsed : 0;
              return ` ${context.label}: ${value}%`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1200,
        easing: "easeOutQuart",
      },
    }),
    [isDark, hidden],
  );

  return (
    <div className="flex h-full min-h-[280px] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-1">
        {data.map((method, index) => {
          const isHidden = hidden[index];

          return (
            <button
              key={method.name}
              type="button"
              onClick={() => toggleSegment(index)}
              className={clsx(
                "flex items-center gap-2 rounded-md px-1 py-0.5 transition-opacity",
                "cursor-pointer hover:opacity-80",
                isHidden && "opacity-45",
              )}
              aria-pressed={!isHidden}
              aria-label={`${isHidden ? "Show" : "Hide"} ${method.name}`}
            >
              <span
                className={clsx(
                  "inline-block h-2.5 w-5 shrink-0 rounded-sm transition-colors",
                  isHidden && "bg-gray-400 dark:bg-white/25",
                )}
                style={
                  isHidden ? undefined : { backgroundColor: method.color }
                }
              />
              <span
                className={clsx(
                  "text-xs font-medium",
                  isHidden && "line-through",
                )}
                style={{ color: labelColor }}
              >
                {method.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1">
        <Doughnut ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
