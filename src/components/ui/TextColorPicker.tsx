"use client";

import { CheckIcon } from "@heroicons/react/24/solid";

interface TextColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  showLabel?: boolean;
}

// Three predefined text color options
const textColorOptions = [
  { value: "#FFFFFF", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#333333", label: "Dark Gray" },
];

export default function TextColorPicker({
  label = "Text Color",
  value,
  onChange,
  showLabel = true,
}: TextColorPickerProps) {
  return (
    <div>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Select Text Color
        </p>
        <div className="flex flex-wrap gap-2">
          {textColorOptions.map((option) => {
            const isSelected = value === option.value;
            // Use dark check icon for white background, white for others
            const checkIconColor =
              option.value === "#FFFFFF" ? "text-gray-900" : "text-white";

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-gray-900 dark:border-white ring-2 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800 ring-blue-500"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                style={{ backgroundColor: option.value }}
                title={option.value}
              >
                {isSelected && (
                  <CheckIcon
                    className={`w-5 h-5 ${checkIconColor} absolute inset-0 m-auto drop-shadow-lg`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
