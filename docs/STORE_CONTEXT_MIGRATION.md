# Store Context Migration Guide

## Overview

The store selection system has been migrated from URL query parameters to React Context. This hides the `storeCode` from the URL while maintaining all functionality.

## Benefits

- ✅ Clean URLs without `?storeCode=LOC003`
- ✅ Store selection persists across navigation via localStorage
- ✅ Centralized store state management
- ✅ Easy to use across all components
- ✅ No changes needed to API routes (they still receive storeCode as query param)

## Architecture

### StoreContext (`src/contexts/StoreContext.tsx`)
- Provides `selectedStoreCode` and `stores` array to all components
- Manages store selection state
- Persists to localStorage automatically
- Initializes from localStorage > user default > first accessible store

### StoreProvider (`src/components/Providers.tsx`)
- Wraps the entire app
- Already added to Providers component

### useStore Hook
- Access store context: `const { selectedStoreCode, stores, setSelectedStoreCode } = useStore()`

### useApiWithStore Hook (`src/hooks/useApiWithStore.ts`)
- Helper hook for API calls that automatically includes storeCode
- `buildApiUrl(url)` - adds storeCode query param automatically
- `fetchWithStore(url, options)` - fetch with automatic storeCode

## Migration Steps

### Before (Using URL Params):
```tsx
import { useSearchParams } from "next/navigation";

export default function MyPage() {
  const searchParams = useSearchParams();
  const storeCode = searchParams.get("storeCode");
  
  useEffect(() => {
    fetchData();
  }, [storeCode]);

  const fetchData = async () => {
    const url = storeCode 
      ? `/api/dashboard/resource?storeCode=${encodeURIComponent(storeCode)}`
      : "/api/dashboard/resource";
    
    const response = await fetch(url);
    // ...
  };
}
```

### After (Using Context):
```tsx
import { useApiWithStore } from "@/hooks/useApiWithStore";
// OR
import { useStore } from "@/contexts/StoreContext";

export default function MyPage() {
  // Option 1: Using helper hook (recommended)
  const { selectedStoreCode, buildApiUrl, fetchWithStore } = useApiWithStore();
  
  // Option 2: Using context directly
  // const { selectedStoreCode } = useStore();
  
  useEffect(() => {
    fetchData();
  }, [selectedStoreCode]); // Re-run when store changes

  const fetchData = async () => {
    // Option 1: Using helper hook
    const response = await fetchWithStore("/api/dashboard/resource");
    
    // OR Option 2: Manual URL building
    // const url = buildApiUrl("/api/dashboard/resource");
    // const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      // ...
    }
  };
}
```

## Complete Example Migration

### Example: Tax Page Migration

**Before:**
```tsx
const searchParams = useSearchParams();
const storeCode = searchParams.get("storeCode");

const fetchData = async () => {
  const url = storeCode 
    ? `/api/dashboard/tax?storeCode=${encodeURIComponent(storeCode)}`
    : "/api/dashboard/tax";
  const response = await fetch(url);
};

const handleSave = async (formData: any) => {
  let url = editingTax ? `/api/dashboard/tax/${id}` : "/api/dashboard/tax";
  if (storeCode) {
    url += `?storeCode=${encodeURIComponent(storeCode)}`;
  }
  // ...
};
```

**After:**
```tsx
import { useApiWithStore } from "@/hooks/useApiWithStore";

const { selectedStoreCode, buildApiUrl } = useApiWithStore();

const fetchData = async () => {
  const url = buildApiUrl("/api/dashboard/tax");
  const response = await fetch(url);
  // ...
};

const handleSave = async (formData: any) => {
  const baseUrl = editingTax 
    ? `/api/dashboard/tax/${id}` 
    : "/api/dashboard/tax";
  const url = buildApiUrl(baseUrl);
  const response = await fetch(url, { method: editingTax ? "PUT" : "POST", ... });
  // ...
};
```

## API Routes

**No changes needed!** API routes still receive `storeCode` as a query parameter:
- `GET /api/dashboard/tax?storeCode=LOC003`
- `POST /api/dashboard/tax?storeCode=LOC003`

The context system automatically appends it, so URLs still contain the parameter for API calls, but users don't see it in their browser URL bar.

## Store Selector Component

The StoreSelector component has been updated to use context automatically. No changes needed!

## Files to Update

For each module that uses storeCode:

1. ✅ Remove `useSearchParams` import
2. ✅ Remove `const storeCode = searchParams.get("storeCode")`
3. ✅ Add `import { useApiWithStore } from "@/hooks/useApiWithStore"`
4. ✅ Use `const { selectedStoreCode, buildApiUrl, fetchWithStore } = useApiWithStore()`
5. ✅ Update `useEffect` dependency to use `selectedStoreCode` instead of `storeCode`
6. ✅ Update all API calls to use `buildApiUrl()` or `fetchWithStore()`

## Modules Already Updated

- ✅ StoreContext created
- ✅ StoreProvider added to Providers
- ✅ StoreSelector updated
- ⏳ Tax module (example in this doc)
- ⏳ Station module
- ⏳ Printer module

## Notes

- Store selection persists in localStorage automatically
- Context initializes on app load from localStorage
- No URL manipulation needed anymore
- All API routes continue to work as-is

