"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTheme } from "@/contexts/ThemeContext";
import ColorCodeField from "@/components/ui/ColorCodeField";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  // System palette of exactly six colors used across app
  const defaultPalette = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#14B8A6",
  ];
  const [allowedColors, setAllowedColors] = useState<string[]>(defaultPalette);
  const [primaryColor, setPrimaryColor] = useState<string>(defaultPalette[0]);

  useEffect(() => {
    try {
      const storedPalette = JSON.parse(
        localStorage.getItem("allowedColors") || "null"
      );
      const storedPrimary = localStorage.getItem("primaryColor");
      if (Array.isArray(storedPalette) && storedPalette.length === 6) {
        setAllowedColors(storedPalette);
        if (storedPrimary && storedPalette.includes(storedPrimary)) {
          setPrimaryColor(storedPrimary);
        }
      }
    } catch {}
  }, []);

  const handleColorChange = (index: number, value: string) => {
    const next = [...allowedColors];
    next[index] = value;
    setAllowedColors(next);
    if (!next.includes(primaryColor)) setPrimaryColor(next[0]);
  };

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem("allowedColors", JSON.stringify(allowedColors));
      localStorage.setItem("primaryColor", primaryColor);
      toast.success("System settings saved");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Appearance */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Theme</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Switch between light and dark mode
              </p>
            </div>
            <button onClick={toggleTheme} className="btn">
              {theme === "light" ? "Enable Dark Mode" : "Enable Light Mode"}
            </button>
          </div>
        </div>

        {/* System Settings */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            System Settings
          </h2>
          <div className="space-y-6">
            {/* Allowed Color Palette (6 colors) */}
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-2">
                Allowed Colors (6)
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                These six colors will be the only options for all color pickers
                across the app.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allowedColors.map((color, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {`Color ${idx + 1}`}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => handleColorChange(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Color (choose from allowed) */}
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-2">
                Primary Color
              </p>
              <div className="flex flex-wrap gap-2">
                {allowedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    className={`w-12 h-12 rounded-full border-2 ${
                      primaryColor === color
                        ? "border-gray-900"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                    type="button"
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                This color will be used as the primary accent across UI
                elements.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSystemSettings}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save System Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
