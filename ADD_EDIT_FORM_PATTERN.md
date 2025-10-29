# Add/Edit Form Pattern

This document outlines the standard pattern for creating Add/Edit pages in the Dashboard.

## Structure Overview

### File Structure

```
src/app/dashboard/{module}/
├── page.tsx                    # Main list page
├── add/
│   └── page.tsx               # Add new item page
└── [id]/
    └── edit/
        └── page.tsx           # Edit existing item page
```

### Pattern Example

The pattern is used in:

- Menu Masters (`/dashboard/menu/masters`)
- Menu Categories (`/dashboard/menu/categories`)

---

## Add Page Structure

### Location: `src/app/dashboard/{module}/add/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function Add{Module}Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Initialize form fields
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch required dropdown data
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/{module}", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("{Module} created successfully!");
        router.push("/dashboard/{module}");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create {module}");
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating {module}");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Add {Module}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create a new {module} for your restaurant
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form fields */}
                </div>
              </div>

              {/* Additional Sections */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Additional Configuration
                </h3>
                {/* Additional fields */}
              </div>

              {/* Status Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Status
                </h3>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isActive: e.target.checked ? 1 : 0,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create {Module}"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

---

## Edit Page Structure

### Location: `src/app/dashboard/{module}/[id]/edit/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function Edit{Module}Page() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [item, setItem] = useState<{Module}Type | null>(null);
  const [formData, setFormData] = useState({
    // Initialize form fields
  });

  useEffect(() => {
    fetchData();
  }, [itemId]);

  const fetchData = async () => {
    try {
      const itemRes = await fetch(`/api/{module}/${itemId}`);

      if (itemRes.ok) {
        const itemData = await itemRes.json();
        setItem(itemData);
        setFormData({
          // Map fetched data to formData
        });
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/{module}/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("{Module} updated successfully!");
        router.push("/dashboard/{module}");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update {module}");
      }
    } catch (error: any) {
      toast.error(error.message || "Error updating {module}");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit {Module}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Update {module} information
            </p>
          </div>
        </div>

        {/* Form - Same as Add Page */}
        {/* ... */}
      </div>
    </DashboardLayout>
  );
}
```

---

## Key Components

### 1. Header Section

- **Back button**: Uses `ArrowLeftIcon` with `router.back()`
- **Title**: Dynamic based on add/edit mode
- **Description**: Contextual subtitle

### 2. Form Structure

- **Sections**: Organized into logical groups (Basic Information, Status, etc.)
- **Section Headers**: `text-lg font-medium` styling
- **Grid Layout**: `grid grid-cols-1 md:grid-cols-2 gap-4` for responsive 2-column layout

### 3. Form Fields

#### Text Input

```typescript
<input
  type="text"
  required
  value={formData.fieldName}
  onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Enter field value"
/>
```

#### Color Picker with Text Input

```typescript
<div className="flex items-center space-x-2">
  <input
    type="color"
    value={formData.colorCode}
    onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
    className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
  />
  <input
    type="text"
    value={formData.colorCode}
    onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="#3B82F6"
  />
</div>
```

#### Select Dropdown

```typescript
<select
  required
  value={formData.fieldName}
  onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
>
  <option value="">Select Option</option>
  {options.map((option) => (
    <option key={option.id} value={option.id}>
      {option.name}
    </option>
  ))}
</select>
```

#### Checkbox

```typescript
<label className="flex items-center">
  <input
    type="checkbox"
    checked={formData.isActive === 1}
    onChange={(e) =>
      setFormData({
        ...formData,
        isActive: e.target.checked ? 1 : 0,
      })
    }
    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
  />
  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
</label>
```

### 4. Footer Actions

```typescript
<div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 rounded-b-lg flex justify-end space-x-3">
  <button
    type="button"
    onClick={() => router.back()}
    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={loading}
    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {loading ? "Saving..." : "Save"}
  </button>
</div>
```

---

## List Page Integration

### Navigation Handlers

```typescript
// Navigation handlers in list page
const handleAdd = () => {
  router.push("/dashboard/{module}/add");
};

const handleEdit = (itemId: number) => {
  router.push(`/dashboard/{module}/${itemId}/edit`);
};
```

### Button in List Cards

```typescript
<button
  onClick={() => handleEdit(item.id)}
  className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
  title="Edit"
>
  <PencilIcon className="w-4 h-4" />
</button>
```

---

## Design Principles

1. **Consistency**: All add/edit forms follow the same structure and styling
2. **Dark Mode**: Full support with consistent color schemes
3. **Responsive**: Mobile-first approach with responsive grid layouts
4. **Accessibility**: Proper labels, focus states, and keyboard navigation
5. **Loading States**: Disabled buttons and loading text during operations
6. **Error Handling**: Toast notifications for success/error feedback

---

## Usage

Replace `{module}`, `{Module}` with your actual module name (e.g., `menu-items`, `Menu Items`).

### Example: Menu Items

- Add Page: `src/app/dashboard/menu/items/add/page.tsx`
- Edit Page: `src/app/dashboard/menu/items/[id]/edit/page.tsx`
- List Page: `src/app/dashboard/menu/items/page.tsx`

This pattern ensures consistency across all dashboard modules.
