"use client";

import { LucideIcon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import DashboardCard from "./DashboardCard";
import clsx from "clsx";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: LucideIcon;
  gradient: string;
  textColor: string;
  sparklineData: number[];
  delay?: number;
}

export default function AnalyticsCard({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  textColor,
  sparklineData,
  delay = 0,
}: AnalyticsCardProps) {
  const chartData = sparklineData.map((v, i) => ({ v, i }));

  return (
    <DashboardCard delay={delay} className="overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                gradient,
              )}
            >
              <Icon className={`h-6 w-6 ${textColor}`} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p
                className={`text-3xl font-bold tracking-tight ${textColor} tabular-nums`}
              >
                {value}
              </p>
              <p className={`mt-1 text-sm font-medium ${textColor}`}>{title}</p>
              {change && (
                <p className="mt-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {change}{" "}
                  <span className="font-normal text-gray-400 dark:text-white/40">
                    vs yesterday
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={clsx("h-16 w-24 shrink-0 opacity-80", textColor)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="currentColor"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={1200}
                animationBegin={delay + 200}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardCard>
  );
}
