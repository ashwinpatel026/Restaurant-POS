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
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

// Load system colors from localStorage or use defaults
const getSystemColors = (): string[] => {
  try {
    const storedPalette = JSON.parse(
      localStorage.getItem("allowedColors") || "null"
    );
    if (Array.isArray(storedPalette) && storedPalette.length === 9) {
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
  const [customColor, setCustomColor] = useState<string>("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    // Only access localStorage after component mounts (client-side only)
    setMounted(true);
    const systemColors = getSystemColors();
    setAllowedColors(systemColors);

    // Check if current value is a custom color (not in system colors)
    if (value && !systemColors.includes(value)) {
      setCustomColor(value);
      setShowColorPicker(true);
    }
  }, [value]);

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const handleSystemColorClick = (color: string) => {
    setShowColorPicker(false);
    setCustomColor("");
    onChange(color);
  };

  const isCustomColor = value && !allowedColors.includes(value);

  return (
    <div>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="space-y-3">
        {/* System Colors */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            System Colors
          </p>
          <div className="flex flex-wrap gap-2">
            {allowedColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleSystemColorClick(color)}
                className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                  value === color && !isCustomColor
                    ? "border-gray-900 dark:border-white ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800 ring-blue-500"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              >
                {value === color && !isCustomColor && (
                  <CheckIcon className="w-5 h-5 text-white absolute inset-0 m-auto drop-shadow-lg" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Custom Color
            </p>
            {isCustomColor && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                (Custom)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={customColor || value || "#3B82F6"}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                title="Pick a custom color"
              />
              {isCustomColor && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <CheckIcon className="w-5 h-5 text-white drop-shadow-lg" />
                </div>
              )}
            </div>
            {showHexInput && (
              <input
                type="text"
                value={customColor || value || ""}
                onChange={(e) => {
                  const hexValue = e.target.value;
                  // Validate hex color format
                  if (/^#[0-9A-Fa-f]{6}$/.test(hexValue) || hexValue === "") {
                    handleCustomColorChange(hexValue);
                  }
                }}
                placeholder="#3B82F6"
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={7}
              />
            )}
            {isCustomColor && (
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(false);
                  setCustomColor("");
                  onChange(getPrimaryColor());
                }}
                className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Reset to system color"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export helper functions for use in other components
export { getSystemColors, getPrimaryColor, defaultColors };
