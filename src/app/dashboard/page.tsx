"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import AnalyticsCard from "@/components/dashboard/AnalyticsCard";
import ChartCard from "@/components/dashboard/ChartCard";
import RevenueOverviewChart from "@/components/dashboard/RevenueOverviewChart";
import TopSellingItemsChart from "@/components/dashboard/TopSellingItemsChart";
import OrdersByTypeChart from "@/components/dashboard/OrdersByTypeChart";
import PeriodComparisonChart, {
  COMPARISON_MOCK_DATA,
  COMPARISON_PERIOD_LABELS,
  COMPARISON_PERIOD_OPTIONS,
  type ComparisonPeriod,
} from "@/components/dashboard/PeriodComparisonChart";
import PaymentMethodsChart from "@/components/dashboard/PaymentMethodsChart";
import DepartmentSalesComparisonChart, {
  DEPARTMENT_SALES_MOCK,
} from "@/components/dashboard/DepartmentSalesComparisonChart";
import CustomerMapChart, {
  CUSTOMER_MAP_MOCK,
  type CustomerMapPeriod,
} from "@/components/dashboard/CustomerMapChart";
import DailyOrdersDepartmentChart, {
  DEPARTMENT_ORDERS_MOCK,
  type DepartmentOrdersPeriod,
} from "@/components/dashboard/DailyOrdersDepartmentChart";
import OrdersOverviewChart, {
  ORDERS_OVERVIEW_MOCK,
  type OrdersOverviewPeriod,
} from "@/components/dashboard/OrdersOverviewChart";
import PaymentsAnalyticsRow from "@/components/dashboard/PaymentsAnalyticsRow";
import {
  ShoppingBag,
  DollarSign,
  Activity,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "@/contexts/ThemeContext";
import { dash } from "@/components/dashboard/DashboardCard";
import clsx from "clsx";

interface DashboardStats {
  todayOrders: number;
  todaySales: number;
  activeOrders: number;
}

const REVENUE_DATA = {
  Daily: [
    { label: "9 AM", transactions: 8, sales: 2500 },
    { label: "11 AM", transactions: 15, sales: 5200 },
    { label: "1 PM", transactions: 14, sales: 4900 },
    { label: "3 PM", transactions: 18, sales: 6400 },
    { label: "5 PM", transactions: 22, sales: 8000 },
    { label: "7 PM", transactions: 19, sales: 6900 },
    { label: "9 PM", transactions: 21, sales: 7500 },
  ],
  Weekly: [
    { label: "Mon", transactions: 112, sales: 42000 },
    { label: "Tue", transactions: 98, sales: 38500 },
    { label: "Wed", transactions: 118, sales: 45200 },
    { label: "Thu", transactions: 105, sales: 41800 },
    { label: "Fri", transactions: 134, sales: 52400 },
    { label: "Sat", transactions: 156, sales: 61200 },
    { label: "Sun", transactions: 127, sales: 48900 },
  ],
  Monthly: [
    { label: "Week 1", transactions: 480, sales: 185000 },
    { label: "Week 2", transactions: 502, sales: 192400 },
    { label: "Week 3", transactions: 465, sales: 178600 },
    { label: "Week 4", transactions: 528, sales: 204800 },
  ],
};

const TOP_SELLING_ITEMS = [
  { name: "Margherita Pizza", sold: 45, amount: 675 },
  { name: "Veg Burger", sold: 38, amount: 532 },
  { name: "Paneer Tikka", sold: 32, amount: 448 },
  { name: "Pasta Alfredo", sold: 28, amount: 392 },
  { name: "Cold Coffee", sold: 26, amount: 286 },
];

const PAYMENT_METHODS = [
  { name: "Cash", value: 38, color: "#6366f1" },
  { name: "Card", value: 32, color: "#3b82f6" },
  { name: "External Payment", value: 18, color: "#22c55e" },
  { name: "Gift Card", value: 12, color: "#a855f7" },
];

const SPARKLINES = {
  orders: [12, 18, 15, 22, 28, 24, 30],
  sales: [800, 1200, 950, 1400, 1800, 1600, 2100],
  active: [4, 6, 5, 8, 7, 9, 6],
  avg: [18, 22, 20, 25, 28, 24, 27],
};

/** Static multiplier so date picker visibly adjusts mock analytics */
function staticDateMultiplier(dateStr: string): number {
  const today = format(new Date(), "yyyy-MM-dd");
  if (dateStr === today) return 1;
  const seed = dateStr
    .split("-")
    .reduce((acc, part) => acc + parseInt(part, 10), 0);
  return 0.82 + (seed % 17) / 100;
}

const ORDERS_BY_TYPE = [
  { label: "Mon", dineIn: 42, orderToGo: 26, delivery: 12 },
  { label: "Tue", dineIn: 38, orderToGo: 28, delivery: 10 },
  { label: "Wed", dineIn: 45, orderToGo: 29, delivery: 14 },
  { label: "Thu", dineIn: 40, orderToGo: 26, delivery: 11 },
  { label: "Fri", dineIn: 52, orderToGo: 40, delivery: 16 },
  { label: "Sat", dineIn: 61, orderToGo: 46, delivery: 18 },
  { label: "Sun", dineIn: 48, orderToGo: 34, delivery: 13 },
];

function useAnimatedNumber(target: number, duration = 800, enabled = true) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled]);

  return display;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 w-72 rounded-2xl bg-gray-200 dark:bg-white/5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-[20px] bg-gray-200 dark:bg-white/5"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-5">
        <div className="xl:col-span-7 h-80 rounded-[20px] bg-gray-200 dark:bg-white/5" />
        <div className="xl:col-span-3 h-80 rounded-[20px] bg-gray-200 dark:bg-white/5" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="h-72 rounded-[20px] bg-gray-200 dark:bg-white/5" />
        <div className="h-72 rounded-[20px] bg-gray-200 dark:bg-white/5 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`ops-${i}`}
            className="h-80 rounded-[20px] bg-gray-200 dark:bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todaySales: 0,
    activeOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [revenuePeriod, setRevenuePeriod] = useState<
    "Daily" | "Weekly" | "Monthly"
  >("Daily");
  const [comparisonPeriod, setComparisonPeriod] =
    useState<ComparisonPeriod>("Today vs Yesterday");
  const [departmentSalesPeriod, setDepartmentSalesPeriod] =
    useState<ComparisonPeriod>("Today vs Yesterday");
  const [departmentOrdersPeriod, setDepartmentOrdersPeriod] =
    useState<DepartmentOrdersPeriod>("Weekly");
  const [ordersOverviewPeriod, setOrdersOverviewPeriod] =
    useState<OrdersOverviewPeriod>("Weekly");
  const [customerMapPeriod, setCustomerMapPeriod] =
    useState<CustomerMapPeriod>("Weekly");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const avgOrderValue =
    stats.todayOrders > 0
      ? Math.round((stats.todaySales / stats.todayOrders) * 100) / 100
      : 0;

  const animatedOrders = useAnimatedNumber(stats.todayOrders, 900, !loading);
  const animatedSales = useAnimatedNumber(stats.todaySales, 900, !loading);
  const animatedActive = useAnimatedNumber(stats.activeOrders, 900, !loading);
  const animatedAvg = useAnimatedNumber(avgOrderValue, 900, !loading);

  const dateMultiplier = useMemo(
    () => staticDateMultiplier(selectedDate),
    [selectedDate],
  );

  const revenueData = useMemo(
    () =>
      REVENUE_DATA[revenuePeriod].map((row) => ({
        label: row.label,
        transactions: Math.round(row.transactions * dateMultiplier),
        sales: Math.round(row.sales * dateMultiplier * 100) / 100,
      })),
    [revenuePeriod, dateMultiplier],
  );

  const topSellingChartData = useMemo(
    () =>
      TOP_SELLING_ITEMS.map((item) => ({
        name: item.name,
        sold: Math.round(item.sold * dateMultiplier),
        amount: Math.round(item.amount * dateMultiplier),
      })),
    [dateMultiplier],
  );

  const ordersByTypeData = useMemo(
    () =>
      ORDERS_BY_TYPE.map((row) => ({
        label: row.label,
        dineIn: Math.round(row.dineIn * dateMultiplier),
        orderToGo: Math.round(row.orderToGo * dateMultiplier),
        delivery: Math.round(row.delivery * dateMultiplier),
      })),
    [dateMultiplier],
  );

  const comparisonChartData = useMemo(() => {
    const labels = COMPARISON_PERIOD_LABELS[comparisonPeriod];
    const rows = COMPARISON_MOCK_DATA[comparisonPeriod];

    return {
      labels,
      data: rows.map((row) => ({
        metric: row.metric,
        current:
          row.metric.includes("AOV") || row.metric.includes("Sales")
            ? Math.round(row.current * dateMultiplier * 100) / 100
            : Math.round(row.current * dateMultiplier),
        previous: row.previous,
      })),
    };
  }, [comparisonPeriod, dateMultiplier]);

  const departmentSalesChartData = useMemo(() => {
    const labels = COMPARISON_PERIOD_LABELS[departmentSalesPeriod];
    const rows = DEPARTMENT_SALES_MOCK[departmentSalesPeriod];

    return {
      labels,
      data: rows.map((row) => ({
        department: row.department,
        current: Math.round(row.current * dateMultiplier),
        previous: row.previous,
      })),
    };
  }, [departmentSalesPeriod, dateMultiplier]);

  const departmentOrdersChartData = useMemo(() => {
    const source = DEPARTMENT_ORDERS_MOCK[departmentOrdersPeriod];

    return {
      departments: source.departments,
      days: source.days,
      matrix: source.matrix.map((row) =>
        row.map((value) => Math.round(value * dateMultiplier)),
      ),
      todayTotal: Math.round(source.todayTotal * dateMultiplier),
    };
  }, [departmentOrdersPeriod, dateMultiplier]);

  const ordersOverviewChartData = useMemo(() => {
    const source = ORDERS_OVERVIEW_MOCK[ordersOverviewPeriod];

    return {
      points: source.points.map((point) => ({
        label: point.label,
        orders: Math.round(point.orders * dateMultiplier),
      })),
      todayNew: Math.round(source.todayNew * dateMultiplier),
    };
  }, [ordersOverviewPeriod, dateMultiplier]);

  const customerMapChartData = useMemo(() => {
    const source = CUSTOMER_MAP_MOCK[customerMapPeriod];

    return {
      points: source.points.map((point) => ({
        label: point.label,
        newClients: Math.round(point.newClients * dateMultiplier),
        retainedClients: Math.round(point.retainedClients * dateMultiplier),
      })),
      totalNew: Math.round(source.totalNew * dateMultiplier),
      totalRetained: Math.round(source.totalRetained * dateMultiplier),
    };
  }, [customerMapPeriod, dateMultiplier]);

  const selectedDateLabel = useMemo(() => {
    try {
      return format(new Date(selectedDate + "T12:00:00"), "MMM d, yyyy");
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  console.log(session);
  const userName = session?.user?.name || "John Doe";

  return (
    <DashboardLayout>
      <div className="-m-6 min-h-[calc(100vh-4rem)] relative overflow-hidden p-6">
        {/* Background glow effects (dark mode only) */}
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden dark:block">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px] animate-dashboard-glow" />
          <div
            className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px] animate-dashboard-glow"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/8 blur-[100px] animate-dashboard-glow"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-dashboard-fade-in opacity-0"
            style={{ animationFillMode: "forwards" }}
          >
            <div>
              <h1 className={dash.heading}>Welcome back, {userName}!</h1>
              <p className={clsx("mt-1", dash.subtitle)}>
                Analytics for {selectedDateLabel}
                {selectedDate !== format(new Date(), "yyyy-MM-dd") && (
                  <span className="text-gray-400 dark:text-white/35">
                    {" "}
                    (static demo data)
                  </span>
                )}
              </p>
            </div>
            <div className="relative shrink-0">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 pl-10 text-sm text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-primary-500/50 dark:border-white/[0.08] dark:bg-[rgba(18,24,38,0.75)] dark:text-white/80 dark:backdrop-blur-xl dark:hover:border-white/[0.15] dark:focus:border-purple-500/50 [color-scheme:light] dark:[color-scheme:dark]"
              />
              <CalendarCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            </div>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* Section 1: KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <AnalyticsCard
                  title="Today's Orders"
                  value={animatedOrders}
                  change="+12%"
                  icon={ShoppingBag}
                  gradient="bg-blue-500/15 text-blue-400 border-blue-500/20"
                  textColor="text-blue-400"
                  sparklineData={SPARKLINES.orders}
                  delay={100}
                />
                <AnalyticsCard
                  title="Today's Sales"
                  value={`$${animatedSales.toLocaleString()}`}
                  change="+8%"
                  icon={DollarSign}
                  gradient="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                  textColor="text-emerald-400"
                  sparklineData={SPARKLINES.sales}
                  delay={200}
                />
                <AnalyticsCard
                  title="Active Orders"
                  value={animatedActive}
                  change="+5%"
                  icon={Activity}
                  gradient="bg-orange-500/15 text-orange-400 border-orange-500/20"
                  textColor="text-orange-400"
                  sparklineData={SPARKLINES.active}
                  delay={300}
                />
                <AnalyticsCard
                  title="Average Order Value"
                  value={`$${animatedAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  change="+3%"
                  icon={TrendingUp}
                  gradient="bg-purple-500/15 text-purple-400 border-purple-500/20"
                  textColor="text-purple-400"
                  sparklineData={SPARKLINES.avg}
                  delay={400}
                />
              </div>

              {/* Section 2: Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-10 gap-5">
                {/* Revenue Overview */}
                <div className="xl:col-span-7">
                  <ChartCard
                    title="Revenue Overview"
                    dropdownOptions={["Daily", "Weekly", "Monthly"]}
                    selectedOption={revenuePeriod}
                    onOptionChange={(v) =>
                      setRevenuePeriod(v as "Daily" | "Weekly" | "Monthly")
                    }
                    delay={500}
                  >
                    <div className="h-80 w-full">
                      <RevenueOverviewChart
                        data={revenueData}
                        isDark={isDark}
                      />
                    </div>
                  </ChartCard>
                </div>

                {/* Top Selling Items — horizontal bar chart */}
                <div className="xl:col-span-3">
                  <ChartCard
                    title="Top Selling Items"
                    delay={550}
                    action={
                      <Link
                        href="/dashboard/menu/items"
                        className={clsx(
                          "flex items-center gap-1 text-xs font-medium",
                          dash.link,
                        )}
                      >
                        View All
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    }
                  >
                    <div className="h-72 w-full">
                      <TopSellingItemsChart
                        data={topSellingChartData}
                        isDark={isDark}
                      />
                    </div>
                  </ChartCard>
                </div>
              </div>

              {/* Section 2b: Order mix & today vs yesterday */}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* Orders by Type */}
                <ChartCard title="Orders by Type" delay={575}>
                  <div className="h-72 w-full">
                    <OrdersByTypeChart
                      data={ordersByTypeData}
                      isDark={isDark}
                    />
                  </div>
                </ChartCard>

                {/* Performance Comparison */}
                <ChartCard
                  title="Performance Comparison"
                  dropdownOptions={[...COMPARISON_PERIOD_OPTIONS]}
                  selectedOption={comparisonPeriod}
                  onOptionChange={(v) =>
                    setComparisonPeriod(v as ComparisonPeriod)
                  }
                  delay={590}
                >
                  <div className="h-72 w-full">
                    <PeriodComparisonChart
                      data={comparisonChartData.data}
                      currentLabel={comparisonChartData.labels.current}
                      previousLabel={comparisonChartData.labels.previous}
                      isDark={isDark}
                    />
                  </div>
                </ChartCard>
              </div>

              {/* Section 3: Payment Methods & Department Sales */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <ChartCard
                  title="Payment Methods"
                  delay={600}
                  className="min-h-[340px]"
                >
                  <div className="h-72 w-full">
                    <PaymentMethodsChart
                      data={PAYMENT_METHODS}
                      isDark={isDark}
                    />
                  </div>
                </ChartCard>

                <div className="lg:col-span-2">
                  <ChartCard
                    title="Department Sales Comparison"
                    dropdownOptions={[...COMPARISON_PERIOD_OPTIONS]}
                    selectedOption={departmentSalesPeriod}
                    onOptionChange={(v) =>
                      setDepartmentSalesPeriod(v as ComparisonPeriod)
                    }
                    delay={650}
                  >
                    <div className="h-72 w-full">
                      <DepartmentSalesComparisonChart
                        data={departmentSalesChartData.data}
                        currentLabel={departmentSalesChartData.labels.current}
                        previousLabel={departmentSalesChartData.labels.previous}
                        isDark={isDark}
                      />
                    </div>
                  </ChartCard>
                </div>
              </div>

              {/* Section 4: Customer & order charts */}
              <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 [&>*]:min-w-0">
                <ChartCard
                  title="Customer Map"
                  dropdownOptions={["Daily", "Weekly", "Monthly"]}
                  selectedOption={customerMapPeriod}
                  onOptionChange={(v) =>
                    setCustomerMapPeriod(v as CustomerMapPeriod)
                  }
                  delay={720}
                  className="min-h-[480px]"
                >
                  <div className="h-96 w-full">
                    <CustomerMapChart
                      data={customerMapChartData}
                      isDark={isDark}
                    />
                  </div>
                </ChartCard>
                <ChartCard
                  title="Daily Orders Department Wise"
                  dropdownOptions={["Daily", "Weekly", "Monthly"]}
                  selectedOption={departmentOrdersPeriod}
                  onOptionChange={(v) =>
                    setDepartmentOrdersPeriod(v as DepartmentOrdersPeriod)
                  }
                  delay={760}
                  className="min-h-[480px]"
                >
                  <div className="h-96 w-full">
                    <DailyOrdersDepartmentChart
                      data={departmentOrdersChartData}
                      isDark={isDark}
                    />
                  </div>
                </ChartCard>
                <ChartCard
                  title="Orders Overview"
                  dropdownOptions={["Daily", "Weekly", "Monthly"]}
                  selectedOption={ordersOverviewPeriod}
                  onOptionChange={(v) =>
                    setOrdersOverviewPeriod(v as OrdersOverviewPeriod)
                  }
                  delay={800}
                  className="min-h-[480px]"
                >
                  <div className="h-96 w-full">
                    <OrdersOverviewChart
                      data={ordersOverviewChartData}
                      isDark={isDark}
                    />
                  </div>
                </ChartCard>
              </div>

              {/* Section 5: Payments & analytics tabs */}
              <PaymentsAnalyticsRow
                delay={820}
                dateMultiplier={dateMultiplier}
              />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
