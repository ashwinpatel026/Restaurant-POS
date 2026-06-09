"use client";

import ReportPageLayout from "@/components/reports/ReportPageLayout";
import DayEndReportView from "@/components/reports/DayEndReportView";

export default function DayEndReportPage() {
  return (
    <ReportPageLayout title="Day End Report" showStationFilter={false}>
      <DayEndReportView />
    </ReportPageLayout>
  );
}
