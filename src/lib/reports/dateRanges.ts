import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last3"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export const DATE_RANGE_PRESETS: {
  id: DateRangePreset;
  label: string;
}[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

export function getPresetRange(
  preset: DateRangePreset,
  customStart?: Date | null,
  customEnd?: Date | null,
): { start: Date; end: Date } {
  const today = startOfDay(new Date());

  switch (preset) {
    case "today":
      return { start: today, end: endOfDay(today) };
    case "yesterday": {
      const day = subDays(today, 1);
      return { start: day, end: endOfDay(day) };
    }
    case "last3":
      return { start: subDays(today, 2), end: endOfDay(today) };
    case "last7":
      return { start: subDays(today, 6), end: endOfDay(today) };
    case "last30":
      return { start: subDays(today, 29), end: endOfDay(today) };
    case "thisMonth": {
      const start = startOfMonth(today);
      return { start, end: endOfDay(today) };
    }
    case "lastMonth": {
      const prev = subMonths(today, 1);
      return {
        start: startOfMonth(prev),
        end: endOfMonth(prev),
      };
    }
    case "custom": {
      const start = customStart ? startOfDay(customStart) : today;
      const end = customEnd ? endOfDay(customEnd) : endOfDay(today);
      return start <= end ? { start, end } : { start: end, end: start };
    }
    default:
      return { start: today, end: endOfDay(today) };
  }
}

export function formatReportSingleDate(date: Date): string {
  return format(date, "MMM-dd-yyyy");
}

export function formatReportMonthYear(date: Date): string {
  return format(date, "MMM-yyyy");
}

export function formatReportRangeLabel(start: Date, end: Date): string {
  return `${format(start, "MMM-dd-yyyy")} - ${format(end, "MMM-dd-yyyy")}`;
}
