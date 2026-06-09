"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import DashboardCard, { dash } from "./DashboardCard";
import clsx from "clsx";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  delay?: number;
  dropdownOptions?: string[];
  selectedOption?: string;
  onOptionChange?: (option: string) => void;
  action?: ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  children,
  delay = 0,
  dropdownOptions,
  selectedOption,
  onOptionChange,
  action,
  className,
}: ChartCardProps) {
  return (
    <DashboardCard delay={delay} className={clsx("flex flex-col", className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className={dash.title}>{title}</h3>
        <div className="flex items-center gap-2">
          {action}
          {dropdownOptions && onOptionChange && (
            <div className="relative">
              <select
                value={selectedOption}
                onChange={(e) => onOptionChange(e.target.value)}
                className={dash.select}
              >
                {dropdownOptions.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                    className="bg-white dark:bg-[#121826]"
                  >
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </DashboardCard>
  );
}
