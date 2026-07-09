"use client";

import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  formatReportRangeLabel,
  getPresetRange,
} from "@/lib/reports/dateRanges";
import { reportTheme } from "@/lib/reports/theme";
import "react-datepicker/dist/react-datepicker.css";

const INPUT_CLASS =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent";

interface DateRangePickerProps {
  preset: DateRangePreset;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onApply: (
    preset: DateRangePreset,
    start: Date | null,
    end: Date | null,
  ) => void;
  onFocus?: () => void;
  variant?: "default" | "report";
}

export default function DateRangePicker({
  preset,
  rangeStart,
  rangeEnd,
  onApply,
  onFocus,
  variant = "default",
}: DateRangePickerProps) {
  const isReport = variant === "report";
  const inputClass = isReport ? reportTheme.input : INPUT_CLASS;
  const [open, setOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState<DateRangePreset>(preset);
  const [draftStart, setDraftStart] = useState<Date | null>(rangeStart);
  const [draftEnd, setDraftEnd] = useState<Date | null>(rangeEnd);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftPreset(preset);
    setDraftStart(rangeStart);
    setDraftEnd(rangeEnd);
  }, [open, preset, rangeEnd, rangeStart]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const appliedRange = getPresetRange(preset, rangeStart, rangeEnd);
  const displayLabel =
    rangeStart && rangeEnd
      ? formatReportRangeLabel(appliedRange.start, appliedRange.end)
      : "Start Date - End Date";

  const handleApply = () => {
    onApply(draftPreset, draftStart, draftEnd);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraftPreset(preset);
    setDraftStart(rangeStart);
    setDraftEnd(rangeEnd);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          onFocus?.();
          setOpen((v) => !v);
        }}
        className={clsx(
          inputClass,
          "flex items-center gap-2 text-left",
          open &&
            (isReport
              ? "ring-2 ring-amber-400/50 border-amber-400"
              : "ring-2 ring-primary-500 border-transparent"),
        )}
      >
        <CalendarDaysIcon
          className={clsx(
            "w-5 h-5 shrink-0",
            isReport ? "text-zinc-400" : "text-gray-400",
          )}
        />
        <span
          className={clsx(
            "truncate",
            rangeStart && rangeEnd
              ? isReport
                ? "text-white"
                : "text-gray-900 dark:text-white"
              : isReport
                ? "text-zinc-500"
                : "text-gray-500 dark:text-gray-400",
          )}
        >
          {displayLabel}
        </span>
      </button>

      {open && (
        <div
          className={clsx(
            "absolute left-0 right-0 z-50 mt-1 min-w-[220px] rounded-lg border shadow-lg overflow-hidden",
            isReport
              ? "border-zinc-600 bg-zinc-900"
              : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800",
          )}
        >
          <ul className="py-1 max-h-64 overflow-y-auto">
            {DATE_RANGE_PRESETS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setDraftPreset(item.id)}
                  className={clsx(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors",
                    draftPreset === item.id
                      ? isReport
                        ? "bg-amber-400 text-zinc-950 font-medium"
                        : "bg-gray-800 dark:bg-gray-900 text-white"
                      : isReport
                        ? "text-zinc-300 hover:bg-zinc-800"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {draftPreset === "custom" && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
              <div>
                <label
                  className={isReport ? reportTheme.label : "label text-xs"}
                >
                  Start Date
                </label>
                <DatePicker
                  selected={draftStart}
                  onChange={(date: Date | null) => setDraftStart(date)}
                  dateFormat="MMM-dd-yyyy"
                  placeholderText="Start date"
                  className={inputClass}
                  wrapperClassName="w-full"
                  maxDate={draftEnd ?? undefined}
                />
              </div>
              <div>
                <label className={isReport ? reportTheme.label : "label text-xs"}>
                  End Date
                </label>
                <DatePicker
                  selected={draftEnd}
                  onChange={(date: Date | null) => setDraftEnd(date)}
                  dateFormat="MMM-dd-yyyy"
                  placeholderText="End date"
                  className={inputClass}
                  wrapperClassName="w-full"
                  minDate={draftStart ?? undefined}
                />
              </div>
            </div>
          )}

          <div className="flex border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={handleApply}
              disabled={
                draftPreset === "custom" && (!draftStart || !draftEnd)
              }
              className={clsx(
                "flex-1 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                isReport
                  ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white",
              )}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={clsx(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                isReport
                  ? "bg-zinc-700 text-white hover:bg-zinc-600"
                  : "bg-gray-700 hover:bg-gray-800 text-white",
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
