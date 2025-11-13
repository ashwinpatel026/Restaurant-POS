# Pricing Form Component - Visual Example

## Form State Structure

```typescript
interface PricingFormData {
  priceStrategy: 1 | 2 | 3; // 1=Base Price, 2=Size Price, 3=Open Price

  // Base Price fields
  cardPrice: number;
  casePrice: number;

  // Size Price fields
  sizePrices: Array<{
    id?: number | null;
    sizeName: string;
    sizePrefix: string;
    price: number;
    displayOrder: number;
  }>;
}
```

---

## Component Structure Example

```tsx
{
  /* Pricing Section */
}
<div className="p-6 border-b border-gray-200 dark:border-gray-700">
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Pricing
    </h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Set pricing strategy and prices
    </p>
  </div>

  <div className="space-y-6">
    {/* Price Strategy Selection - Always Visible */}
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Price Strategy *
      </label>
      <select
        value={formData.priceStrategy}
        onChange={(e) => {
          const strategy = parseInt(e.target.value);
          setFormData({
            ...formData,
            priceStrategy: strategy,
            // Reset prices when strategy changes
            cardPrice: strategy === 3 ? 0 : formData.cardPrice,
            casePrice: strategy === 3 ? 0 : formData.casePrice,
            sizePrices: strategy === 2 ? formData.sizePrices : [],
          });
        }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value={1}>Base Price</option>
        <option value={2}>Size Price</option>
        <option value={3}>Open Price</option>
      </select>
    </div>

    {/* Conditional Rendering Based on Strategy */}

    {/* BASE PRICE STRATEGY */}
    {formData.priceStrategy === 1 && (
      <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Base Price Configuration
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cardPrice || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cardPrice: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Case Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.casePrice || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  casePrice: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          * At least one price (Card or Case) must be provided
        </p>
      </div>
    )}

    {/* SIZE PRICE STRATEGY */}
    {formData.priceStrategy === 2 && (
      <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Size Price Configuration
          </h4>
          <button
            type="button"
            onClick={() => {
              setFormData({
                ...formData,
                sizePrices: [
                  ...formData.sizePrices,
                  {
                    id: null,
                    sizeName: "",
                    sizePrefix: "",
                    price: 0,
                    displayOrder: formData.sizePrices.length + 1,
                  },
                ],
              });
            }}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
          >
            + Add Size
          </button>
        </div>

        {formData.sizePrices.length === 0 ? (
          <div className="text-center py-6 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400">
              No sizes added yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Click "Add Size" to create size-based pricing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.sizePrices.map((size, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Size Name *
                  </label>
                  <input
                    type="text"
                    value={size.sizeName}
                    onChange={(e) => {
                      const updated = [...formData.sizePrices];
                      updated[index].sizeName = e.target.value;
                      setFormData({ ...formData, sizePrices: updated });
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Small, Medium, Large"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prefix
                  </label>
                  <input
                    type="text"
                    value={size.sizePrefix}
                    onChange={(e) => {
                      const updated = [...formData.sizePrices];
                      updated[index].sizePrefix = e.target.value;
                      setFormData({ ...formData, sizePrices: updated });
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="S, M, L"
                    maxLength={10}
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={size.price || ""}
                    onChange={(e) => {
                      const updated = [...formData.sizePrices];
                      updated[index].price = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, sizePrices: updated });
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = formData.sizePrices.filter(
                        (_, i) => i !== index
                      );
                      setFormData({ ...formData, sizePrices: updated });
                    }}
                    className="w-full px-2 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded border border-red-200 dark:border-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          * At least one size with name and price must be added
        </p>
      </div>
    )}

    {/* OPEN PRICE STRATEGY */}
    {formData.priceStrategy === 3 && (
      <div className="space-y-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Open Price Strategy
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This item uses open pricing. Prices will be set at the point of
              sale. Card Price and Case Price are set to 0.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Price (Read-only)
            </label>
            <input
              type="number"
              value="0.00"
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Case Price (Read-only)
            </label>
            <input
              type="number"
              value="0.00"
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    )}
  </div>
</div>;
```

---

## Validation Function Example

```typescript
const validatePricing = (): boolean => {
  if (formData.priceStrategy === 1) {
    // Base Price: At least one price required
    if (!formData.cardPrice && !formData.casePrice) {
      toast.error("Please provide at least Card Price or Case Price");
      return false;
    }
    if (formData.cardPrice < 0 || formData.casePrice < 0) {
      toast.error("Prices cannot be negative");
      return false;
    }
  } else if (formData.priceStrategy === 2) {
    // Size Price: At least one size required
    if (formData.sizePrices.length === 0) {
      toast.error("Please add at least one size");
      return false;
    }
    // Validate each size
    for (const size of formData.sizePrices) {
      if (!size.sizeName.trim()) {
        toast.error("All sizes must have a name");
        return false;
      }
      if (size.price <= 0) {
        toast.error(`Size "${size.sizeName}" must have a price greater than 0`);
        return false;
      }
    }
    // Check for duplicate size names
    const sizeNames = formData.sizePrices.map((s) => s.sizeName.toLowerCase());
    const duplicates = sizeNames.filter(
      (name, index) => sizeNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      toast.error("Size names must be unique");
      return false;
    }
  }
  // Open Price: No validation needed
  return true;
};
```

---

## Submit Handler Example

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate pricing
  if (!validatePricing()) {
    return;
  }

  setLoading(true);
  try {
    const submitData = {
      ...formData,
      // Base Price data
      basePriceData:
        formData.priceStrategy === 1
          ? {
              cardPrice: formData.cardPrice || null,
              casePrice: formData.casePrice || null,
            }
          : null,
      // Size Price data
      sizePriceData: formData.priceStrategy === 2 ? formData.sizePrices : [],
      // Open Price: prices are already 0
      cardPrice: formData.priceStrategy === 3 ? 0 : formData.cardPrice,
      casePrice: formData.priceStrategy === 3 ? 0 : formData.casePrice,
    };

    await onSave(submitData);
  } catch (error) {
    console.error("Error:", error);
    toast.error("Failed to save menu item");
  } finally {
    setLoading(false);
  }
};
```

---

## Loading Existing Data Example

```typescript
useEffect(() => {
  if (menuItem) {
    // Load base price if strategy is 1
    if (menuItem.priceStrategy === 1 && menuItem.basePrice) {
      setFormData((prev) => ({
        ...prev,
        cardPrice: menuItem.basePrice?.cardPrice || 0,
        casePrice: menuItem.basePrice?.casePrice || 0,
      }));
    }

    // Load size prices if strategy is 2
    if (menuItem.priceStrategy === 2 && menuItem.sizePrices) {
      setFormData((prev) => ({
        ...prev,
        sizePrices: menuItem.sizePrices.map((sp: any) => ({
          id: sp.id,
          sizeName: sp.sizeName,
          sizePrefix: sp.sizePrefix || "",
          price: parseFloat(sp.price) || 0,
          displayOrder: sp.displayOrder || 0,
        })),
      }));
    }

    // Open Price: prices are already 0
    if (menuItem.priceStrategy === 3) {
      setFormData((prev) => ({
        ...prev,
        cardPrice: 0,
        casePrice: 0,
        sizePrices: [],
      }));
    }
  }
}, [menuItem]);
```

---

This structure provides:

- ✅ Clear visual distinction between strategies
- ✅ Conditional rendering based on selection
- ✅ Proper validation
- ✅ User-friendly interface
- ✅ Easy to maintain and extend
