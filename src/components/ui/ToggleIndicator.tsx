"use client";

interface ToggleIndicatorProps {
  value: boolean | number;
  activeColor?: "green" | "blue" | "red" | "yellow" | "purple";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorClasses = {
  green: "bg-green-600 dark:bg-green-500",
  blue: "bg-blue-600 dark:bg-blue-500",
  red: "bg-red-600 dark:bg-red-500",
  yellow: "bg-yellow-600 dark:bg-yellow-500",
  purple: "bg-purple-600 dark:bg-purple-500",
};

const sizeClasses = {
  sm: {
    container: "h-4 w-7",
    thumb: "h-3 w-3",
    translate: {
      active: "translate-x-3",
      inactive: "translate-x-0.5",
    },
  },
  md: {
    container: "h-5 w-9",
    thumb: "h-4 w-4",
    translate: {
      active: "translate-x-4",
      inactive: "translate-x-0.5",
    },
  },
  lg: {
    container: "h-6 w-11",
    thumb: "h-5 w-5",
    translate: {
      active: "translate-x-5",
      inactive: "translate-x-1",
    },
  },
};

export default function ToggleIndicator({
  value,
  activeColor = "green",
  size = "md",
  className = "",
}: ToggleIndicatorProps) {
  const isActive = value === true || value === 1;
  const sizeConfig = sizeClasses[size];
  const activeColorClass = colorClasses[activeColor];

  return (
    <div
      role="status"
      aria-checked={isActive}
      className={`relative inline-flex items-center rounded-full ${
        isActive
          ? activeColorClass
          : "bg-gray-300 dark:bg-gray-600"
      } ${sizeConfig.container} ${className}`}
    >
      <span
        className={`inline-block transform rounded-full bg-white shadow ${
          sizeConfig.thumb
        } ${
          isActive
            ? sizeConfig.translate.active
            : sizeConfig.translate.inactive
        }`}
      />
    </div>
  );
}

