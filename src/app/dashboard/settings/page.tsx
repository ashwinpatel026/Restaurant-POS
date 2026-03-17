"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { formatDecimal } from "@/utils/formatDecimal";

const DEFAULT_PALETTE = [
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

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { selectedStoreCode, fetchWithStore } = useApiWithStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storeSaving, setStoreSaving] = useState(false);

  // Store settings
  const [currency, setCurrency] = useState<string>("USD");
  const [defaultPriceSource, setDefaultPriceSource] = useState<"card" | "cash">(
    "card",
  );
  const [allowMultipleDiscount, setAllowMultipleDiscount] =
    useState<boolean>(false);
  const [enableAlternateId, setEnableAlternateId] = useState<boolean>(false);
  const [cashRoundingAdjustmentNearest, setCashRoundingAdjustmentNearest] =
    useState<string>("0.05");

  // Receipt settings
  const [tipPer1, setTipPer1] = useState<string>("25.00");
  const [tipPer2, setTipPer2] = useState<string>("20.00");
  const [tipPer3, setTipPer3] = useState<string>("18.00");
  const [gratuityTipPer1, setGratuityTipPer1] = useState<string>("0.00");
  const [gratuityTipPer2, setGratuityTipPer2] = useState<string>("0.00");
  const [gratuityTipPer3, setGratuityTipPer3] = useState<string>("0.00");
  const [showDualPriceOnReceipt, setShowDualPriceOnReceipt] =
    useState<boolean>(false);

  // System palette of exactly six colors used across app
  const [allowedColors, setAllowedColors] = useState<string[]>(DEFAULT_PALETTE);
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PALETTE[0]);
  const [uiTheme, setUiTheme] = useState<Theme>(theme);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await fetchWithStore(
          "/api/dashboard/settings/system",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load settings");
        }

        const data = await response.json();
        if (!isMounted) return;

        if (
          Array.isArray(data.allowedColors) &&
          data.allowedColors.length === 9
        ) {
          setAllowedColors(data.allowedColors);
        }

        if (data.primaryColor) {
          setPrimaryColor(data.primaryColor);
        }

        if (data.theme && ["light", "dark"].includes(data.theme)) {
          setUiTheme(data.theme as Theme);
        }

        // Receipt settings
        if (data.tipPer1 != null) setTipPer1(String(data.tipPer1));
        if (data.tipPer2 != null) setTipPer2(String(data.tipPer2));
        if (data.tipPer3 != null) setTipPer3(String(data.tipPer3));
        if (data.gratuityTipPer1 != null)
          setGratuityTipPer1(String(data.gratuityTipPer1));
        if (data.gratuityTipPer2 != null)
          setGratuityTipPer2(String(data.gratuityTipPer2));
        if (data.gratuityTipPer3 != null)
          setGratuityTipPer3(String(data.gratuityTipPer3));
        if (typeof data.showDualPriceOnReceipt === "boolean") {
          setShowDualPriceOnReceipt(data.showDualPriceOnReceipt);
        }

        // Cache locally for quick access elsewhere if needed
        localStorage.setItem(
          "allowedColors",
          JSON.stringify(data.allowedColors ?? DEFAULT_PALETTE),
        );
        localStorage.setItem(
          "primaryColor",
          data.primaryColor ?? DEFAULT_PALETTE[0],
        );
        if (data.theme) {
          localStorage.setItem("theme", data.theme);
        }
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load system settings",
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
  }, [selectedStoreCode]);

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

  const handleSaveStoreSettings = async () => {
    setStoreSaving(true);
    try {
      const response = await fetchWithStore("/api/dashboard/settings/system", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowedColors,
          primaryColor,
          theme: uiTheme,
          storeCurrency: currency,
          operationDefaultPrice: defaultPriceSource,
          allowMultipleDiscount,
          isAlternate: enableAlternateId,
          roundingOffCashAmtNearest: cashRoundingAdjustmentNearest,
          tipPer1,
          tipPer2,
          tipPer3,
          gratuityTipPer1,
          gratuityTipPer2,
          gratuityTipPer3,
          showDualPriceOnReceipt,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save store settings");
      }

      toast.success("Store settings saved");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save store settings",
      );
    } finally {
      setStoreSaving(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      const response = await fetchWithStore("/api/dashboard/settings/system", {
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
          JSON.stringify(payload.allowedColors),
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
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
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

        {/* Theme Colors Settings */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Theme Colors Settings
          </h2>
          <div className="space-y-6">
            {/* Allowed Color Palette (9 colors) */}
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-2">
                Allowed Colors (9)
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                These nine colors will be the only options for all color pickers
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

        {/* Store Settings */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Store Settings
          </h2>

          <div className="space-y-6">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-1/4 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="USD">$ (USD)</option>
                <option value="EUR">€ (EUR)</option>
                <option value="GBP">£ (GBP)</option>
                <option value="JPY">¥ (JPY)</option>
                <option value="CNY">¥ (CNY)</option>
                <option value="INR">₹ (INR)</option>
                <option value="CAD">$ (CAD)</option>
                <option value="AUD">$ (AUD)</option>
                <option value="HKD">$ (HKD)</option>
                <option value="TWD">$ (TWD)</option>
              </select>
            </div>

            {/* Default Price Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Price Source
              </label>
              <select
                value={defaultPriceSource}
                onChange={(e) =>
                  setDefaultPriceSource(e.target.value as "card" | "cash")
                }
                className="mt-1 block w-1/4 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="card">card</option>
                <option value="cash">cash</option>
              </select>
            </div>

            {/* Checkboxes row */}
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={allowMultipleDiscount}
                  onChange={(e) => setAllowMultipleDiscount(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                <span>Allow Multiple Discount</span>
              </label>
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={enableAlternateId}
                  onChange={(e) => setEnableAlternateId(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                <span>Enable Alternate-ID for User</span>
              </label>
            </div>

            {/* Cash Rounding Adjustment Nearest */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cash Rounding Adjustment Nearest
              </label>
              <input
                type="text"
                value={cashRoundingAdjustmentNearest}
                onChange={(e) =>
                  setCashRoundingAdjustmentNearest(e.target.value)
                }
                className="mt-1 block w-1/4 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="0.05"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveStoreSettings}
                disabled={storeSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {storeSaving ? "Saving..." : "Save Store Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Receipt Settings
          </h2>
          <div className="space-y-4">
            <p className="font-medium text-gray-900 dark:text-white">
              Suggested Tip
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tip1 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tip1 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tipPer1}
                  onChange={(e) => setTipPer1(e.target.value)}
                  onBlur={(e) => setTipPer1(formatDecimal(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  With Gratuity Tip1 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gratuityTipPer1}
                  onChange={(e) => setGratuityTipPer1(e.target.value)}
                  onBlur={(e) =>
                    setGratuityTipPer1(formatDecimal(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tip2 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tip2 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tipPer2}
                  onChange={(e) => setTipPer2(e.target.value)}
                  onBlur={(e) => setTipPer2(formatDecimal(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  With Gratuity Tip2 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gratuityTipPer2}
                  onChange={(e) => setGratuityTipPer2(e.target.value)}
                  onBlur={(e) =>
                    setGratuityTipPer2(formatDecimal(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tip3 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tip3 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tipPer3}
                  onChange={(e) => setTipPer3(e.target.value)}
                  onBlur={(e) => setTipPer3(formatDecimal(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  With Gratuity Tip3 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gratuityTipPer3}
                  onChange={(e) => setGratuityTipPer3(e.target.value)}
                  onBlur={(e) =>
                    setGratuityTipPer3(formatDecimal(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <label className="inline-flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 pt-2">
              <input
                type="checkbox"
                checked={showDualPriceOnReceipt}
                onChange={(e) => setShowDualPriceOnReceipt(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
              />
              <span>Show Dual Price On Receipt</span>
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveStoreSettings}
                disabled={storeSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {storeSaving ? "Saving..." : "Save Receipt Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
