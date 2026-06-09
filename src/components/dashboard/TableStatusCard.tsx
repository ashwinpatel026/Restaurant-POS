"use client";

import DashboardCard, { dash } from "./DashboardCard";
import clsx from "clsx";

type TableStatus = "available" | "occupied" | "reserved";

interface TableItem {
  number: number;
  seats: number;
  status: TableStatus;
}

const TABLES: TableItem[] = [
  { number: 1, seats: 2, status: "available" },
  { number: 2, seats: 4, status: "occupied" },
  { number: 3, seats: 4, status: "available" },
  { number: 4, seats: 2, status: "available" },
  { number: 5, seats: 6, status: "occupied" },
  { number: 6, seats: 4, status: "reserved" },
  { number: 7, seats: 2, status: "occupied" },
  { number: 8, seats: 4, status: "available" },
  { number: 9, seats: 4, status: "available" },
  { number: 10, seats: 6, status: "reserved" },
  { number: 11, seats: 2, status: "available" },
  { number: 12, seats: 4, status: "available" },
];

const statusDot: Record<Exclude<TableStatus, "available">, string> = {
  occupied: "bg-red-500",
  reserved: "bg-amber-500",
};

const LEGEND: { label: string; status: TableStatus }[] = [
  { label: "Available", status: "available" },
  { label: "Occupied", status: "occupied" },
  { label: "Reserved", status: "reserved" },
];

function TableStatusIndicator({ table }: { table: TableItem }) {
  if (table.status === "available") {
    return (
      <span className="text-base font-bold leading-none text-emerald-500">
        {table.number}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "h-2.5 w-2.5 shrink-0 rounded-full",
        statusDot[table.status],
      )}
    />
  );
}

interface TableStatusCardProps {
  delay?: number;
}

export default function TableStatusCard({ delay = 0 }: TableStatusCardProps) {
  return (
    <DashboardCard
      delay={delay}
      className="flex h-full min-w-0 w-full flex-col hover:translate-y-0 hover:scale-100"
    >
      <h3 className={clsx("mb-5 shrink-0", dash.title)}>
        Table Status Overview
      </h3>

      <div
        className="w-full min-w-0 grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        {TABLES.map((table) => (
          <div
            key={table.number}
            className={clsx(
              "flex items-center justify-between gap-2 rounded-lg border px-3 py-3.5",
              "border-gray-100 bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.03]",
            )}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <TableStatusIndicator table={table} />
            </div>
            <span className="truncate text-xs font-medium text-gray-500 dark:text-white/55">
              {table.seats} Seats
            </span>
          </div>
        ))}
      </div>

      <div className={clsx("mt-5 shrink-0 border-t pt-4", dash.divider)}>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              {item.status === "available" ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              ) : (
                <span
                  className={clsx(
                    "h-2 w-2 shrink-0 rounded-full",
                    statusDot[item.status],
                  )}
                />
              )}
              <span className={dash.caption}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
