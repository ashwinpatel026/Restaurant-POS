"use client";

import { useState, useEffect } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

interface SystemColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  showLabel?: boolean;
  showHexInput?: boolean;
}

const defaultColors = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
];

// Load system colors from localStorage or use defaults
const getSystemColors = (): string[] => {
  try {
    const storedPalette = JSON.parse(
      localStorage.getItem("allowedColors") || "null"
    );
    if (Array.isArray(storedPalette) && storedPalette.length === 6) {
      return storedPalette;
    }
  } catch (error) {
    console.error("Error loading system colors:", error);
  }
  return defaultColors;
};

// Get primary color from localStorage
const getPrimaryColor = (): string => {
  try {
    const storedPrimary = localStorage.getItem("primaryColor");
    const systemColors = getSystemColors();
    if (storedPrimary && systemColors.includes(storedPrimary)) {
      return storedPrimary;
    }
    return systemColors[0];
  } catch (error) {
    return defaultColors[0];
  }
};

export default function SystemColorPicker({
  label = "Color Options",
  value,
  onChange,
  showLabel = true,
  showHexInput = true,
}: SystemColorPickerProps) {
  // Initialize with default colors to avoid hydration mismatch
  const [allowedColors, setAllowedColors] = useState<string[]>(defaultColors);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only access localStorage after component mounts (client-side only)
    setMounted(true);
    const systemColors = getSystemColors();
    setAllowedColors(systemColors);

    // If current value is not in system colors, set to primary color
    if (!systemColors.includes(value)) {
      onChange(getPrimaryColor());
    }
  }, [value, onChange]);

  return (
    <div>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {allowedColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
              value === color
                ? "border-gray-900 dark:border-white ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800 ring-blue-500"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          >
            {value === color && (
              <CheckIcon className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-lg" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Export helper functions for use in other components
export { getSystemColors, getPrimaryColor, defaultColors };
