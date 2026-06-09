"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useReportFilters } from "@/contexts/ReportFilterContext";
import ReportToggleButton from "@/components/reports/ReportToggleButton";
import { reportTheme } from "@/lib/reports/theme";

export default function StationFilterButtons() {
  const {
    stations,
    stationsLoading,
    selectedStationIds,
    isAllStationsSelected,
    selectAllStations,
    toggleStation,
  } = useReportFilters();

  const extraSelected =
    !isAllStationsSelected &&
    selectedStationIds.length === 1 &&
    stations.find((s) => s.id === selectedStationIds[0]);

  return (
    <div
      className={`${reportTheme.card} ${reportTheme.cardPadding} flex-1 min-w-0`}
    >
      <label className={reportTheme.label}>Station</label>
      {stationsLoading ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-16 rounded-md bg-gray-200 dark:bg-zinc-800 animate-pulse"
            />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <p className={reportTheme.muted}>No stations found for this store.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <ReportToggleButton
            active={isAllStationsSelected}
            onClick={selectAllStations}
          >
            All
          </ReportToggleButton>
          {stations.map((station) => {
            const active =
              !isAllStationsSelected &&
              selectedStationIds.includes(station.id);
            return (
              <ReportToggleButton
                key={station.id}
                active={active}
                onClick={() => toggleStation(station.id)}
                title={station.code}
              >
                {station.name}
              </ReportToggleButton>
            );
          })}
          {extraSelected && (
            <div className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-amber-400 bg-amber-50 dark:bg-zinc-900 text-amber-600 dark:text-amber-400 text-sm font-medium">
              <span>✓ {extraSelected.name}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
