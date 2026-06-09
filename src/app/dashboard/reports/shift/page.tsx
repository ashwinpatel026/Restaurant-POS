"use client";

import ReportPageLayout from "@/components/reports/ReportPageLayout";
import ShiftReportView from "@/components/reports/ShiftReportView";

export default function ShiftReportPage() {
  return (
    <ReportPageLayout title="Shift Report">
      <ShiftReportView />
    </ReportPageLayout>
  );
}
