"use client";

import React from "react";

interface SkeletonLoaderProps {
  className?: string;
  children?: React.ReactNode;
}

// Base skeleton component
export function Skeleton({ className = "", children }: SkeletonLoaderProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    >
      {children}
    </div>
  );
}

// Card skeleton for menu items, modifiers, etc.
export function CardSkeleton() {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
      {/* Image placeholder */}
      <Skeleton className="w-full h-32 mb-4" />

      {/* Title and status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Skeleton className="w-4 h-4 rounded-full mr-3" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Details */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 mt-4">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    </div>
  );
}

// Table skeleton for data tables
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-600 rounded-lg">
      {/* Table header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-600">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Form skeleton for add/edit pages
export function FormSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="space-y-8">
        {/* Section 1 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        {/* Section 3 */}
        <div className="p-6">
          <div className="mb-6">
            <Skeleton className="h-6 w-36 mb-2" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Form actions */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

// Stats cards skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <div className="ml-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Full page skeleton for loading states
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton />
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Spinner component for simple loading states
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400 ${sizeClasses[size]}`}
    ></div>
  );
}

// Loading overlay for modals and forms
export function LoadingOverlay({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  );
}
