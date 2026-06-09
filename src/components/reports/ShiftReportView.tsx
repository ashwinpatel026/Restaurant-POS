"use client";

import { useState } from "react";
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  CreditCardIcon,
  EyeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useReportFilters } from "@/contexts/ReportFilterContext";
import { reportTheme } from "@/lib/reports/theme";
import { format } from "date-fns";

const DEMO_SHIFTS = [
  {
    id: "SH-2847",
    dateTime: "2026-03-15 08:00 AM",
    station: "TS1",
    stationColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    cashIn: "$200.00",
    cashOut: "$1,245.75",
    sales: "$1,245.75",
    tips: "$45.50",
  },
  {
    id: "SH-2846",
    dateTime: "2026-03-15 02:00 PM",
    station: "N1",
    stationColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    cashIn: "$150.00",
    cashOut: "$892.30",
    sales: "$892.30",
    tips: "$32.00",
  },
  {
    id: "SH-2845",
    dateTime: "2026-03-14 06:00 PM",
    station: "T1",
    stationColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    cashIn: "$100.00",
    cashOut: "$567.80",
    sales: "$567.80",
    tips: "$28.75",
  },
  {
    id: "SH-2844",
    dateTime: "2026-03-14 10:00 AM",
    station: "B2",
    stationColor: "bg-violet-500/20 text-violet-400 border-violet-500/40",
    cashIn: "$175.00",
    cashOut: "$423.15",
    sales: "$423.15",
    tips: "$18.25",
  },
  {
    id: "SH-2843",
    dateTime: "2026-03-13 09:00 AM",
    station: "TS1",
    stationColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    cashIn: "$200.00",
    cashOut: "$312.40",
    sales: "$312.40",
    tips: "$12.00",
  },
];

const SUMMARY_CARDS = [
  {
    label: "Shift Summary",
    value: "5 Shifts Found",
    icon: ClipboardDocumentListIcon,
  },
  { label: "Total Shifts", value: "5", icon: UserGroupIcon },
  { label: "Total Sales", value: "$1,245.75", icon: CurrencyDollarIcon },
  {
    label: "Cash Tips",
    value: "$89.50",
    icon: BanknotesIcon,
    highlight: true,
  },
  { label: "Card Tips", value: "$67.25", icon: CreditCardIcon },
];

export default function ShiftReportView() {
  const { applied, getSelectedStationsLabel, getActiveDateLabel } =
    useReportFilters();
  const [selectedShiftId, setSelectedShiftId] = useState(DEMO_SHIFTS[0].id);

  if (!applied) {
    return (
      <div
        className={`${reportTheme.card} ${reportTheme.cardPadding} text-center py-16`}
      >
        <p className="text-zinc-300 font-medium">
          Select filters and click Load Report to view shift data
        </p>
        <p className={`${reportTheme.muted} mt-2`}>
          Date, station, and summary will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className={reportTheme.muted}>
        {getSelectedStationsLabel()} · Date: {getActiveDateLabel()} · Generated{" "}
        {applied.generatedAt
          ? format(applied.generatedAt, "MMM dd, yyyy h:mm a")
          : ""}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.label}
            className={`${reportTheme.card} ${reportTheme.cardPadding} flex items-center gap-3`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700">
              <card.icon className="h-7 w-7 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 truncate">{card.label}</p>
              <p
                className={`text-md font-semibold truncate ${
                  card.highlight ? reportTheme.positive : "text-white"
                }`}
              >
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className={`${reportTheme.card} overflow-hidden`}>
        <div
          className={`${reportTheme.cardPadding} border-b border-zinc-700 flex items-center gap-2`}
        >
          <ClipboardDocumentListIcon className="h-5 w-5 text-amber-400" />
          <h2 className={reportTheme.subheading}>Shift History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Shift Date & Time</th>
                <th className="px-4 py-3 font-medium">Station</th>
                <th className="px-4 py-3 font-medium">Shift ID</th>
                <th className="px-4 py-3 font-medium">Cash In</th>
                <th className="px-4 py-3 font-medium">Cash Out</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Tips</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {DEMO_SHIFTS.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedShiftId(row.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedShiftId === row.id
                      ? "bg-amber-400/5"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <td className="px-4 py-3 text-zinc-200 whitespace-nowrap">
                    {row.dateTime}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.stationColor}`}
                    >
                      {row.station}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{row.id}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.cashIn}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.cashOut}</td>
                  <td className="px-4 py-3 text-white font-medium">
                    {row.sales}
                  </td>
                  <td className={`px-4 py-3 ${reportTheme.positive}`}>
                    {row.tips}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={reportTheme.btnGhost}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShiftId(row.id);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className={`${reportTheme.cardPadding} border-t border-zinc-700 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400`}
        >
          <span>Showing 1 to 5 of 5 entries</span>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select className="rounded-md border border-zinc-600 bg-zinc-800 text-zinc-200 px-2 py-1 text-xs">
              <option>10</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" className={reportTheme.btnPrimary}>
          Shift Summary
        </button>
        <button type="button" className={reportTheme.btnSecondary}>
          <DocumentTextIcon className="h-4 w-4" />
          Payment Details
        </button>
        <button type="button" className={reportTheme.btnSecondary}>
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
        <button type="button" className={reportTheme.btnSecondary}>
          <PrinterIcon className="h-4 w-4" />
          Print All Receipts
        </button>
      </div>
    </div>
  );
}
