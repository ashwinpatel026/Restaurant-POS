"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { startOfDay as startOfDayFns } from "date-fns";
import {
  type DateRangePreset,
  formatReportMonthYear,
  formatReportRangeLabel,
  formatReportSingleDate,
  getPresetRange,
} from "@/lib/reports/dateRanges";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import type { DateQuickPreset } from "@/lib/reports/theme";

export interface ReportStation {
  id: string;
  name: string;
  code: string;
}

export type ReportDateMode = "single" | "monthYear" | "range";

export interface AppliedReportFilters {
  dateMode: ReportDateMode;
  singleDate: Date;
  monthYear: Date;
  rangePreset: DateRangePreset;
  rangeStart: Date;
  rangeEnd: Date;
  selectedStationIds: string[];
  generatedAt: Date | null;
}

interface ReportFilterContextValue {
  dateMode: ReportDateMode;
  singleDate: Date;
  monthYear: Date;
  rangePreset: DateRangePreset;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  applied: AppliedReportFilters | null;
  stations: ReportStation[];
  stationsLoading: boolean;
  selectedStationIds: string[];
  isAllStationsSelected: boolean;
  selectAllStations: () => void;
  toggleStation: (stationId: string) => void;
  getSelectedStationsLabel: () => string;
  setDateMode: (mode: ReportDateMode) => void;
  setSingleDate: (date: Date) => void;
  setMonthYear: (date: Date) => void;
  setRangePreset: (preset: DateRangePreset) => void;
  setRangeStart: (date: Date | null) => void;
  setRangeEnd: (date: Date | null) => void;
  applyRange: (
    preset: DateRangePreset,
    start: Date | null,
    end: Date | null,
  ) => void;
  getActiveDateLabel: () => string;
  dateQuickPreset: DateQuickPreset | null;
  applyQuickPreset: (preset: DateQuickPreset) => void;
  generateReport: () => void;
  clearFilters: () => void;
}

function getDefaultDateFilters() {
  const todayRange = getPresetRange("today");
  return {
    dateMode: "single" as ReportDateMode,
    singleDate: startOfDayFns(new Date()),
    monthYear: startOfCurrentMonth(),
    rangePreset: "today" as DateRangePreset,
    rangeStart: todayRange.start,
    rangeEnd: todayRange.end,
  };
}

const ReportFilterContext = createContext<ReportFilterContextValue | null>(
  null,
);

function startOfCurrentMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mapApiStation(raw: {
  tblStationId: string;
  stationname: string | null;
  stationCode: string;
}): ReportStation {
  return {
    id: raw.tblStationId,
    name: raw.stationname?.trim() || raw.stationCode,
    code: raw.stationCode,
  };
}

export function ReportFilterProvider({ children }: { children: ReactNode }) {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();
  const defaults = getDefaultDateFilters();
  const [dateMode, setDateMode] = useState<ReportDateMode>(defaults.dateMode);
  const [singleDate, setSingleDateState] = useState(defaults.singleDate);
  const [monthYear, setMonthYearState] = useState(defaults.monthYear);
  const [rangePreset, setRangePreset] = useState<DateRangePreset>(
    defaults.rangePreset,
  );
  const [rangeStart, setRangeStart] = useState<Date | null>(
    defaults.rangeStart,
  );
  const [rangeEnd, setRangeEnd] = useState<Date | null>(defaults.rangeEnd);
  const [dateQuickPreset, setDateQuickPreset] =
    useState<DateQuickPreset | null>("today");
  const [applied, setApplied] = useState<AppliedReportFilters | null>(null);
  const [stations, setStations] = useState<ReportStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);

  useEffect(() => {
    const loadStations = async () => {
      if (!selectedStoreCode) {
        setStations([]);
        setSelectedStationIds([]);
        setStationsLoading(false);
        return;
      }

      setStationsLoading(true);
      try {
        const response = await fetch(buildApiUrl("/api/dashboard/station"), {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          const mapped: ReportStation[] = (Array.isArray(data) ? data : []).map(
            (row: {
              tblStationId: string;
              stationname: string | null;
              stationCode: string;
            }) => mapApiStation(row),
          );
          setStations(mapped);
          setSelectedStationIds(mapped.map((s) => s.id));
        } else {
          setStations([]);
          setSelectedStationIds([]);
        }
      } catch {
        setStations([]);
        setSelectedStationIds([]);
      } finally {
        setStationsLoading(false);
      }
    };

    loadStations();
  }, [selectedStoreCode, buildApiUrl]);

  const isAllStationsSelected =
    stations.length > 0 && selectedStationIds.length === stations.length;

  const selectAllStations = useCallback(() => {
    setSelectedStationIds(stations.map((s) => s.id));
  }, [stations]);

  const toggleStation = useCallback(
    (stationId: string) => {
      setSelectedStationIds((prev) => {
        if (prev.includes(stationId)) {
          if (prev.length <= 1) return prev;
          return prev.filter((id) => id !== stationId);
        }
        return [...prev, stationId];
      });
    },
    [],
  );

  const getSelectedStationsLabel = useCallback(() => {
    if (stations.length === 0) return "No stations";
    if (isAllStationsSelected) return "All Stations";
    const names = stations
      .filter((s) => selectedStationIds.includes(s.id))
      .map((s) => s.name);
    return names.join(", ");
  }, [isAllStationsSelected, selectedStationIds, stations]);

  const setSingleDate = useCallback((date: Date) => {
    setSingleDateState(startOfDayFns(date));
    setDateMode("single");
    setDateQuickPreset(null);
  }, []);

  const applyQuickPreset = useCallback((preset: DateQuickPreset) => {
    setDateQuickPreset(preset);
    const today = startOfDayFns(new Date());

    if (preset === "today") {
      setDateMode("single");
      setSingleDateState(today);
      const range = getPresetRange("today");
      setRangePreset("today");
      setRangeStart(range.start);
      setRangeEnd(range.end);
      return;
    }

    if (preset === "yesterday") {
      const day = getPresetRange("yesterday").start;
      setDateMode("single");
      setSingleDateState(day);
      setRangePreset("yesterday");
      setRangeStart(day);
      setRangeEnd(getPresetRange("yesterday").end);
      return;
    }

    const rangeKey = preset === "last3" ? "last3" : "last7";
    const range = getPresetRange(rangeKey);
    setDateMode("range");
    setRangePreset(rangeKey);
    setRangeStart(range.start);
    setRangeEnd(range.end);
    setSingleDateState(range.end);
  }, []);

  const setMonthYear = useCallback((date: Date) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setMonthYearState(d);
    setDateMode("monthYear");
  }, []);

  const applyRange = useCallback(
    (preset: DateRangePreset, start: Date | null, end: Date | null) => {
      const { start: rangeStartDate, end: rangeEndDate } = getPresetRange(
        preset,
        start,
        end,
      );
      setRangePreset(preset);
      setRangeStart(rangeStartDate);
      setRangeEnd(rangeEndDate);
      setDateMode("range");
    },
    [],
  );

  const getActiveDateLabel = useCallback(() => {
    if (dateMode === "monthYear") {
      return formatReportMonthYear(monthYear);
    }
    if (dateMode === "range" && rangeStart && rangeEnd) {
      return formatReportRangeLabel(rangeStart, rangeEnd);
    }
    return formatReportSingleDate(singleDate);
  }, [dateMode, monthYear, rangeEnd, rangeStart, singleDate]);

  const generateReport = useCallback(() => {
    const range = getPresetRange(rangePreset, rangeStart, rangeEnd);

    setApplied({
      dateMode,
      singleDate,
      monthYear,
      rangePreset,
      rangeStart: range.start,
      rangeEnd: range.end,
      selectedStationIds: [...selectedStationIds],
      generatedAt: new Date(),
    });
  }, [
    dateMode,
    monthYear,
    rangeEnd,
    rangePreset,
    rangeStart,
    selectedStationIds,
    singleDate,
  ]);

  const clearFilters = useCallback(() => {
    const next = getDefaultDateFilters();
    setDateMode(next.dateMode);
    setSingleDateState(next.singleDate);
    setMonthYearState(next.monthYear);
    setRangePreset(next.rangePreset);
    setRangeStart(next.rangeStart);
    setRangeEnd(next.rangeEnd);
    setDateQuickPreset("today");
    setSelectedStationIds(stations.map((s) => s.id));
    setApplied(null);
  }, [stations]);

  const value = useMemo(
    () => ({
      dateMode,
      singleDate,
      monthYear,
      rangePreset,
      rangeStart,
      rangeEnd,
      applied,
      stations,
      stationsLoading,
      selectedStationIds,
      isAllStationsSelected,
      selectAllStations,
      toggleStation,
      getSelectedStationsLabel,
      setDateMode,
      setSingleDate,
      setMonthYear,
      setRangePreset,
      setRangeStart,
      setRangeEnd,
      applyRange,
      getActiveDateLabel,
      dateQuickPreset,
      applyQuickPreset,
      generateReport,
      clearFilters,
    }),
    [
      applied,
      applyQuickPreset,
      applyRange,
      clearFilters,
      dateQuickPreset,
      dateMode,
      generateReport,
      getActiveDateLabel,
      getSelectedStationsLabel,
      isAllStationsSelected,
      monthYear,
      rangeEnd,
      rangePreset,
      rangeStart,
      selectAllStations,
      selectedStationIds,
      singleDate,
      stations,
      stationsLoading,
      toggleStation,
    ],
  );

  return (
    <ReportFilterContext.Provider value={value}>
      {children}
    </ReportFilterContext.Provider>
  );
}

export function useReportFilters(): ReportFilterContextValue {
  const ctx = useContext(ReportFilterContext);
  if (!ctx) {
    throw new Error("useReportFilters must be used within ReportFilterProvider");
  }
  return ctx;
}
