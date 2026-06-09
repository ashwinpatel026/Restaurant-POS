import { redirect } from "next/navigation";
import { DEFAULT_REPORT } from "@/lib/reports/config";

export default function ReportsIndexPage() {
  redirect(DEFAULT_REPORT.href);
}
