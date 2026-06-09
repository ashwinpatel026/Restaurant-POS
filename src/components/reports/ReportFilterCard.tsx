"use client";

import DatePicker from "react-datepicker";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useReportFilters } from "@/contexts/ReportFilterContext";
import StationFilterButtons from "@/components/reports/StationFilterButtons";
import ReportToggleButton from "@/components/reports/ReportToggleButton";
import { DATE_QUICK_PRESETS, reportTheme } from "@/lib/reports/theme";
import "react-datepicker/dist/react-datepicker.css";

interface ReportFilterCardProps {
  showStationFilter?: boolean;
}

export default function ReportFilterCard({
  showStationFilter = true,
}: ReportFilterCardProps) {
  const {
    dateQuickPreset,
    singleDate,
    setSingleDate,
    setDateMode,
    applyQuickPreset,
    generateReport,
    clearFilters,
  } = useReportFilters();

  const handleLoadReport = () => {
    generateReport();
    toast.success("Report loaded");
  };

  const handleClear = () => {
    clearFilters();
    toast.success("Filters cleared");
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700/80 bg-white dark:bg-gray-800 p-4 md:p-5 space-y-5 shadow-sm dark:shadow-none">
      <div className="flex flex-col lg:flex-row gap-4 min-w-0">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
            Report Date
          </label>
          <DatePicker
            selected={singleDate}
            onChange={(date: Date | null) => date && setSingleDate(date)}
            onCalendarOpen={() => setDateMode("single")}
            dateFormat="MM/dd/yyyy"
            placeholderText="MM/dd/yyyy"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-sm focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none"
            wrapperClassName="w-full"
            maxDate={new Date()}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {DATE_QUICK_PRESETS.map((preset) => (
              <ReportToggleButton
                key={preset.id}
                active={dateQuickPreset === preset.id}
                onClick={() => applyQuickPreset(preset.id)}
              >
                {preset.label}
              </ReportToggleButton>
            ))}
          </div>
        </div>

        {showStationFilter && <StationFilterButtons />}
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={handleLoadReport}
          className={reportTheme.btnPrimary}
        >
          <ArrowPathIcon className="w-5 h-5" />
          Load Report
        </button>
        <button
          type="button"
          onClick={handleClear}
          className={reportTheme.btnSecondary}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
