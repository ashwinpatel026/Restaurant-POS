import ReportsShell from "@/components/reports/ReportsShell";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReportsShell>{children}</ReportsShell>;
}
