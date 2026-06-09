"use client";

import { useSession } from "next-auth/react";
import { useStore } from "@/contexts/StoreContext";

export default function DayEndReportView() {
  const { data: session } = useSession();
  const { selectedStoreCode, stores } = useStore();
  const selectedStore = stores.find((s) => s.storeCode === selectedStoreCode);
  const storeName =
    selectedStore?.locationName ||
    selectedStore?.companyName ||
    selectedStoreCode ||
    "Store";
  const dateTime = "2026-06-06 05:16 AM";
  const userName = session?.user?.name || "User";

  const summaryData = [
    {
      label: "Net Sales",
      display: "$1,709.17",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Tax",
      display: "$55.80",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Discounts",
      display: "-$9.50",
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Total Tips",
      display: "$64.20",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Fees",
      display: "$0.00",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Gross Sales",
      display: "$1,764.97",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Refunds",
      display: "$0.00",
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Total Voids",
      display: "$0.00",
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Payments Received",
      display: "$1,829.19",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Transactions",
      display: "59",
      color: "text-gray-900 dark:text-white",
    },
  ];

  const departmentSales = [
    {
      department: "Baverages",
      qty: 9,
      amount: "25.46",
      disc: "0.00",
      subtotal: "25.46",
      tax: "1.53",
      total: "26.99",
    },
    {
      department: "Deli",
      qty: 37,
      amount: "936.21",
      disc: "0.00",
      subtotal: "936.21",
      tax: "9.39",
      total: "945.60",
    },
    {
      department: "Food",
      qty: 70,
      amount: "757.00",
      disc: "-9.50",
      subtotal: "747.50",
      tax: "44.88",
      total: "792.38",
    },
    {
      department: "Gift Card",
      qty: 0,
      amount: "0.00",
      disc: "0.00",
      subtotal: "0.00",
      tax: "0.00",
      total: "0.00",
    },
  ];

  const orderTypes = [
    { orderType: "DINEIN", count: 6, amount: "270.04", total: "275.44" },
    { orderType: "TOGO", count: 53, amount: "1,448.63", total: "1,489.53" },
  ];

  const taxSummary = [
    { taxName: "No Tax(0.00)", taxable: "779.82", tax: "0.00" },
    { taxName: "Sales Tax(6.00)", taxable: "929.35", tax: "55.80" },
  ];

  const discountSummary = [
    {
      discountName: "Custom Discount",
      checkNo: "27021",
      discountBefore: "18.99",
      discountAfter: "9.49",
      discountReason: "g",
      amount: "-9.50",
    },
  ];

  const tenderSummary = [
    {
      tender: "Cash",
      count: 19,
      sale: "200.50",
      returnTransaction: "0",
      void: "0.00",
      netAmount: "200.50",
    },
    {
      tender: "Credit Card",
      count: 40,
      sale: "1,628.69",
      returnTransaction: "0",
      void: "0.00",
      netAmount: "1628.69",
    },
  ];

  const tipsFees = [
    { description: "Total Gratuity", count: 0, amount: "0.00" },
    { description: "Non Cash Tips", count: 16, amount: "64.20" },
    { description: "Cash Tips", count: 0, amount: "0.00" },
    { description: "Non Cash Tips Withheld", count: 0, amount: "2.57" },
    { description: "Gratuity Withheld", count: 0, amount: "0.00" },
  ];

  const cashAudit = [
    {
      shift: "1",
      employee: "Deli D",
      open: "0.00",
      sales: "200.50",
      tip: "0.00",
      close: "0.00",
      totalCash: "200.50",
      gratuity: "0.00",
      nonCashTip: "64.20",
      cashTip: "0.00",
      nonCashTipWithheld: "0.00",
      gratuityWithheld: "0.00",
      owedToRest: "138.87",
      receivedEmployee: "61.63",
    },
  ];

  const cardPayments = [
    { card: "AMEX", count: 5, sale: "446.55", tip: "6.83", total: "453.38" },
    { card: "DISCOVER", count: 2, sale: "62.35", tip: "0.00", total: "62.35" },
    {
      card: "MASTERCARD",
      count: 4,
      sale: "90.57",
      tip: "2.06",
      total: "92.63",
    },
    {
      card: "VISA",
      count: 29,
      sale: "965.02",
      tip: "55.31",
      total: "1,020.33",
    },
  ];

  const deviceSummary = [
    { device: "Vp350", count: 40, amount: "1,628.69", status: "" },
  ];

  const voidItems = [
    {
      item: "Cole Slaw",
      qty: 3,
      reason: "DUPLICATE ORDER",
      emp: "Deli",
      time: "",
    },
    {
      item: "Pastrami Sandwich",
      qty: 1,
      reason: "ITEM NOT AVAILABLE",
      emp: "Deli",
      time: "",
    },
    {
      item: "Beef Barley Cup",
      qty: 2,
      reason: "TRAINING/TEST ORDER",
      emp: "Deli",
      time: "",
    },
  ];

  const roundingAdj = [
    { description: "# Cash Transactions", amount: "19" },
    { description: "+ve Rounding Adj. Amount", amount: "0.08" },
    { description: "-ve Rounding Adj. Amount", amount: "-0.06" },
  ];

  const employeeClock = [
    {
      employee: "Austen Brandt",
      clockIn: "09:56",
      clockOut: "20:13",
      break: "00:00",
      netHrs: "10:16",
    },
    {
      employee: "Deli D",
      clockIn: "07:04",
      clockOut: "20:12",
      break: "00:00",
      netHrs: "13:08",
    },
    {
      employee: "Nancy Cruz Larios",
      clockIn: "07:14",
      clockOut: "14:06",
      break: "00:00",
      netHrs: "06:52",
    },
  ];

  return (
    <div className="min-h-screen w-full p-1 text-gray-900 dark:text-white">
      <div className="rounded-xl border border-gray-200 dark:border-white/10  overflow-hidden">
        {/* HEADER */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-200 dark:border-white/10 text-center">
          <p className="text-2xl font-semibold tracking-wide text-gray-900 dark:text-white">
            {storeName}
          </p>
          <h1 className="mt-3 text-xs uppercase tracking-[0.4em] text-cyan-600 dark:text-cyan-400">
            Day End Report
          </h1>
          <div className="mt-6 flex flex-wrap justify-between items-center gap-4 px-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                Date Time :
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-zinc-100 tabular-nums">
                {dateTime}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                User Name :
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-zinc-100">
                {userName}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* SECTION 1 — SUMMARY OVERVIEW */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
              1. Summary Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {summaryData.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-200 dark:border-white/10 p-4 hover:border-cyan-500/40 dark:hover:border-cyan-400/30 transition-all"
                >
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                    {item.label}
                  </p>
                  <p
                    className={`text-2xl font-bold mt-2 tabular-nums ${item.color}`}
                  >
                    {item.display}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2 & 3 — side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* SECTION 2 — DEPARTMENT SALES SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10 backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                2. Department Sales Summary
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Department
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Qty
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Disc
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Subtotal
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Tax
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentSales.map((row) => (
                      <tr
                        key={row.department}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.department}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.qty}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.amount}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.disc}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.subtotal}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.tax}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        GRAND TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        116
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,718.67
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        -9.50
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,709.17
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        55.80
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,764.97
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3 — ORDER TYPE / SERVICE SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                3. Order Type / Service Summary
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Order Type
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderTypes.map((row) => (
                      <tr
                        key={row.orderType}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.orderType}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.amount}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        59
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,718.67
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,764.97
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 4 & 5 — side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* SECTION 4 — TAX SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                4. TAX SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Tax Name
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Taxable
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Tax
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxSummary.map((row) => (
                      <tr
                        key={row.taxName}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.taxName}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.taxable}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.tax}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,709.17
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        55.80
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5 — DISCOUNT SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                5. DISCOUNT SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Discount Name
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-center">
                        Check#
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Discount Before
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Discount After
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Discount Reason
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountSummary.map((row) => (
                      <tr
                        key={row.checkNo}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.discountName}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-center tabular-nums">
                          {row.checkNo}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.discountBefore}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.discountAfter}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.discountReason}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-red-700 text-right tabular-nums">
                          {row.amount}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"></td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        18.99
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        9.49
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"></td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        -9.50
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 6 & 7 — side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* SECTION 6 — TENDER / PAYMENT SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                6. TENDER / PAYMENT SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Tender
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Sale
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Return Transaction
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Void
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Net Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenderSummary.map((row) => (
                      <tr
                        key={row.tender}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.tender}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.sale}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.returnTransaction}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-red-700 text-right tabular-nums">
                          {row.void}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.netAmount}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        59
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,829.19
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        0
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        0.00
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1829.19
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 7 — TIPS & FEES SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                7. TIPS & FEES SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Description
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipsFees.map((row) => (
                      <tr
                        key={row.description}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.description}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.amount}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        16
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        66.77
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 8 — CASH AUDIT SUMMARY */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
              8. CASH AUDIT SUMMARY
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-center">
                      Shift
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Employee
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Open
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Sales
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Tip
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Close
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Total Cash
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Gratuity
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Non Cash Tip
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Cash Tip
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Non Cash Tip Withheld
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Gratuity Withheld
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Owed To Rest
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Received Employee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashAudit.map((row) => (
                    <tr
                      key={row.shift}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-center tabular-nums">
                        {row.shift}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        {row.employee}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.open}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.sales}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.tip}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.close}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.totalCash}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.gratuity}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.nonCashTip}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.cashTip}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.nonCashTipWithheld}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.gratuityWithheld}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.owedToRest}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        {row.receivedEmployee}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-center tabular-nums">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"></td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      200.50
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      200.50
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      64.20
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.00
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      138.87
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      61.63
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 9 & 10 — side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* SECTION 9 — CARD PAYMENT SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                9. CARD PAYMENT SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Card
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Sale
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Tip
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardPayments.map((row) => (
                      <tr
                        key={row.card}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.card}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.sale}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.tip}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        40
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,564.49
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        64.20
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,628.69
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 10 — DEVICE AMOUNT SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                10. DEVICE AMOUNT SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Device/Terminal
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceSummary.map((row) => (
                      <tr
                        key={row.device}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.device}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                          {row.amount}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-center tabular-nums">
                          {row.status}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        40
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        1,628.69
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 11 & 12 — side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* SECTION 11 — GIFT CARD PAYMENT SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                11. GIFT CARD PAYMENT SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        GiftCard Name
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        0
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-green-700 text-right tabular-nums">
                        0.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 12 — EXTERNAL PAYMENT SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                12. EXTERNAL PAYMENT SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Type
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"
                        colSpan={3}
                      ></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 13 & 14 — side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* SECTION 13 — GIFT CARD PURCHASE SUMMARY */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                13. GIFT CARD PURCHASE SUMMARY
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        GiftCard Name
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Count
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"
                        colSpan={3}
                      ></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 14 — VOID ITEMS */}
            <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
                14. VOID ITEMS
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Item
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                        Qty
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Reason
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Emp
                      </th>
                      <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {voidItems.map((row) => (
                      <tr
                        key={row.item}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.item}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                          {row.qty}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.reason}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.emp}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                          {row.time}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        TOTAL
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        6
                      </td>
                      <td
                        className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"
                        colSpan={3}
                      ></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 16 — ROUNDING ADJUSTMENT SUMMARY */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
              16. ROUNDING ADJUSTMENT SUMMARY
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Description
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roundingAdj.map((row) => (
                    <tr
                      key={row.description}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        {row.description}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        {row.amount}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-semibold text-cyan-900 dark:text-white [&_td]:text-cyan-900 dark:[&_td]:text-white">
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                      TOTAL ROUNDING ADJUSTMENT
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                      0.02
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 15 — RETURN / VOID TRANSACTION */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
              15. RETURN / VOID TRANSACTION
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-center">
                      Check #
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Type
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Tender
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Performed By
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Terminal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200"
                      colSpan={6}
                    ></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 17 — EMPLOYEE CLOCK IN / OUT */}
          <div className="rounded-xl border border-gray-200 dark:border-white/10  backdrop-blur-sm p-5">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-cyan-700 dark:text-cyan-300 mb-4">
              17. EMPLOYEE CLOCK IN / OUT
            </h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-left">
                      Employee
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Clock In
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Clock Out
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-center">
                      Break
                    </th>
                    <th className="px-4 py-3 font-semibold border-b border-gray-200 dark:border-white/10 text-right">
                      Net Hrs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeeClock.map((row) => (
                    <tr
                      key={row.employee}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors odd:bg-gray-50/60 dark:odd:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200">
                        {row.employee}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        {row.clockIn}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        {row.clockOut}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-center tabular-nums">
                        {row.break}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-200 text-right tabular-nums">
                        {row.netHrs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
