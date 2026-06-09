"use client";

import { ReactNode } from "react";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import ReportFilterCard from "@/components/reports/ReportFilterCard";
import { reportTheme } from "@/lib/reports/theme";

interface ReportPageLayoutProps {
  title: string;
  children: ReactNode;
  showStationFilter?: boolean;
}

export default function ReportPageLayout({
  title,
  children,
  showStationFilter = true,
}: ReportPageLayoutProps) {
  return (
    <div className={reportTheme.page}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100 dark:bg-green-400/15 border border-green-200 dark:border-green-400/30">
          <ClipboardDocumentListIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h1 className={reportTheme.heading}>{title}</h1>
      </div>

      <ReportFilterCard showStationFilter={showStationFilter} />
      {children}
    </div>
  );
}
