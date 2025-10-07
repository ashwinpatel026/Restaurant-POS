"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  topSellingItems: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  salesByDate: {
    date: string;
    sales: number;
    orders: number;
  }[];
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      let url = `/api/reports?range=${dateRange}`;
      if (dateRange === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    toast.success("Report exported successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive insights into your restaurant operations
            </p>
          </div>
          <button onClick={handleExport} className="btn btn-primary">
            Export Report
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="card">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Date Range</label>
              <select
                className="input"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    className="input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={fetchReportData} className="btn btn-primary">
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : reportData ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Sales
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(reportData.totalSales)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Orders
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {reportData.totalOrders}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Customers
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {reportData.totalCustomers}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <UserGroupIcon className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Avg Order Value
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(reportData.averageOrderValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <ChartBarIcon className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Top Selling Items
              </h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topSellingItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{item.name}</td>
                        <td>{item.quantity}</td>
                        <td className="font-semibold text-primary-600">
                          {formatCurrency(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Trend */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Sales Trend
              </h2>
              <div className="space-y-2">
                {reportData.salesByDate.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700">
                      {formatDate(item.date)}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {item.orders} orders
                      </span>
                      <span className="font-semibold text-primary-600">
                        {formatCurrency(item.sales)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-600">
              No data available for selected period
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
