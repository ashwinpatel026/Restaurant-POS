# Store Context System - Summary

## ✅ What Was Created

### 1. **StoreContext** (`src/contexts/StoreContext.tsx`)
- React Context for managing selected store
- Automatically initializes from localStorage
- Provides `selectedStoreCode`, `stores`, and update function

### 2. **StoreProvider** (added to `src/components/Providers.tsx`)
- Wraps entire app
- Already integrated into Providers component

### 3. **Updated StoreSelector** (`src/components/store/StoreSelector.tsx`)
- Now uses context instead of URL params
- No URL manipulation
- Cleaner code

### 4. **useApiWithStore Hook** (`src/hooks/useApiWithStore.ts`)
- Helper hook for API calls
- Automatically adds storeCode to URLs
- `buildApiUrl(url)` - builds URL with storeCode
- `fetchWithStore(url, options)` - fetch with storeCode

### 5. **Documentation**
- `STORE_CONTEXT_MIGRATION.md` - Complete migration guide
- `STORE_CONTEXT_SUMMARY.md` - This file

## 🎯 How It Works

### Before:
```
URL: /dashboard/tax?storeCode=LOC003
↓
Page reads from URL
↓
API call with storeCode from URL
```

### After:
```
URL: /dashboard/tax (clean!)
↓
Context provides storeCode from localStorage/context
↓
API call with storeCode from context (still as query param)
```

## 🚀 Usage Examples

### In Any Component:

```tsx
import { useApiWithStore } from "@/hooks/useApiWithStore";

export default function MyPage() {
  const { selectedStoreCode, buildApiUrl, fetchWithStore } = useApiWithStore();
  
  useEffect(() => {
    fetchData();
  }, [selectedStoreCode]);

  const fetchData = async () => {
    // Automatic storeCode inclusion
    const response = await fetchWithStore("/api/dashboard/resource");
    // OR
    // const url = buildApiUrl("/api/dashboard/resource");
    // const response = await fetch(url);
  };
}
```

### Access Store Directly:

```tsx
import { useStore } from "@/contexts/StoreContext";

export default function MyComponent() {
  const { selectedStoreCode, stores, setSelectedStoreCode } = useStore();
  
  // Use selectedStoreCode
  // Change store: setSelectedStoreCode("LOC003")
}
```

## ✨ Benefits

1. **Clean URLs** - No `?storeCode=LOC003` in browser URL
2. **Persistence** - Store selection saved in localStorage
3. **Centralized** - Single source of truth for store selection
4. **Easy Migration** - Simple changes to existing pages
5. **No API Changes** - API routes still receive storeCode as query param

## 📝 Next Steps

To migrate existing pages:

1. Remove `useSearchParams` import
2. Add `import { useApiWithStore } from "@/hooks/useApiWithStore"`
3. Replace `const storeCode = searchParams.get("storeCode")` with `const { selectedStoreCode, buildApiUrl } = useApiWithStore()`
4. Update API calls to use `buildApiUrl()` or `fetchWithStore()`
5. Update `useEffect` dependencies to use `selectedStoreCode`

See `STORE_CONTEXT_MIGRATION.md` for detailed examples.

## 🔧 Files Modified

- ✅ `src/contexts/StoreContext.tsx` (new)
- ✅ `src/components/Providers.tsx` (added StoreProvider)
- ✅ `src/components/store/StoreSelector.tsx` (uses context now)
- ✅ `src/hooks/useApiWithStore.ts` (new)

## 📚 Documentation

- **Migration Guide**: `STORE_CONTEXT_MIGRATION.md`
- **Summary**: `STORE_CONTEXT_SUMMARY.md` (this file)

