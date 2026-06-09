"use client";

import { ReactNode } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ReportFilterProvider } from "@/contexts/ReportFilterContext";

interface ReportsShellProps {
  children: ReactNode;
}

export default function ReportsShell({ children }: ReportsShellProps) {
  return (
    <ReportFilterProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </ReportFilterProvider>
  );
}
