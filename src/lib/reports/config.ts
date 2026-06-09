export type ReportDefinition = {
  id: string;
  name: string;
  href: string;
  /** When false, the report appears in the menu but is not yet implemented */
  available: boolean;
};

export const REPORTS: ReportDefinition[] = [
  {
    id: "shift",
    name: "Shift Report",
    href: "/dashboard/reports/shift",
    available: true,
  },
  {
    id: "day-end",
    name: "Day End Report",
    href: "/dashboard/reports/day-end",
    available: true,
  },
  {
    id: "credit-card",
    name: "CreditCard Report",
    href: "/dashboard/reports/credit-card",
    available: false,
  },
  {
    id: "employee-clock",
    name: "Employee Clock Report",
    href: "/dashboard/reports/employee-clock",
    available: false,
  },
  {
    id: "monthly-sales-tax",
    name: "Monthly Sales Tax",
    href: "/dashboard/reports/monthly-sales-tax",
    available: false,
  },
  {
    id: "tax-summary",
    name: "Tax Summary",
    href: "/dashboard/reports/tax-summary",
    available: false,
  },
];

export const DEFAULT_REPORT = REPORTS[0];
