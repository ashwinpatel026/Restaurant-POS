"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTheme, Theme } from "@/contexts/ThemeContext";

const DEFAULT_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // System palette of exactly six colors used across app
  const [allowedColors, setAllowedColors] = useState<string[]>(DEFAULT_PALETTE);
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [uiTheme, setUiTheme] = useState<Theme>(theme);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/system", {
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load settings");
        }

        const data = await response.json();
        if (!isMounted) return;

        if (
          Array.isArray(data.allowedColors) &&
          data.allowedColors.length === 6
        ) {
          setAllowedColors(data.allowedColors);
        }

        if (data.primaryColor) {
          setPrimaryColor(data.primaryColor);
        }

        if (data.theme && ["light", "dark"].includes(data.theme)) {
          setUiTheme(data.theme as Theme);
        }

        // Cache locally for quick access elsewhere if needed
        localStorage.setItem(
          "allowedColors",
          JSON.stringify(data.allowedColors ?? DEFAULT_PALETTE)
        );
        localStorage.setItem(
          "primaryColor",
          data.primaryColor ?? DEFAULT_PALETTE[0]
        );
        if (data.theme) {
          localStorage.setItem("theme", data.theme);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load system settings"
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setUiTheme(theme);
  }, [theme]);

  useEffect(() => {
    setTheme(uiTheme);
    localStorage.setItem("theme", uiTheme);
  }, [uiTheme, setTheme]);

  const handleColorChange = (index: number, value: string) => {
    const next = [...allowedColors];
    next[index] = value;
    setAllowedColors(next);
    if (!next.includes(primaryColor)) setPrimaryColor(next[0]);
  };

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/system", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowedColors,
          primaryColor,
          theme: uiTheme,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save settings");
      }

      if (payload?.allowedColors && Array.isArray(payload.allowedColors)) {
        setAllowedColors(payload.allowedColors);
        localStorage.setItem(
          "allowedColors",
          JSON.stringify(payload.allowedColors)
        );
      }

      if (payload?.primaryColor) {
        setPrimaryColor(payload.primaryColor);
        localStorage.setItem("primaryColor", payload.primaryColor);
      }

      if (payload?.theme && ["light", "dark"].includes(payload.theme)) {
        setUiTheme(payload.theme as Theme);
      }

      toast.success("System settings saved");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
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
            <button
              type="button"
              onClick={() =>
                setUiTheme((prev) => (prev === "light" ? "dark" : "light"))
              }
              className="btn"
            >
              {uiTheme === "light" ? "Enable Dark Mode" : "Enable Light Mode"}
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
                disabled={saving || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : loading
                  ? "Loading settings..."
                  : "Save System Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
