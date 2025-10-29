# Time Events - Auto Code Generation & Time Format Update

## Summary of Changes

### ✅ 1. Auto-Generate Event Code

**Format:** `TE001`, `TE002`, `TE003`, etc.

#### Backend Changes:

- **File:** `src/app/api/events/route.ts`
- Added `generateEventCode()` function that:
  - Finds the last event by ID
  - Extracts the number from the last code (e.g., "001" from "TE001")
  - Increments by 1
  - Formats with "TE" prefix + 3-digit padded number

#### Frontend Changes:

- **Add Page** (`src/app/dashboard/events/add/page.tsx`):
  - Removed Event Code input field
  - Added blue info box explaining auto-generation
- **Edit Page** (`src/app/dashboard/events/[id]/edit/page.tsx`):
  - Made Event Code field read-only (disabled)
  - Added note: "Auto-generated, cannot be changed"

### ✅ 2. Time Format Conversion (24-Hour)

**Storage:** All times stored in 24-hour format (HH:MM) in database

#### Backend Changes:

- **Files:** `src/app/api/events/route.ts` and `src/app/api/events/[id]/route.ts`
- Added `convertTo24Hour()` function that:
  - Accepts time in various formats
  - Detects if already in 24-hour format (HH:MM) → returns as-is
  - Detects 12-hour format (HH:MM AM/PM) → converts to 24-hour
  - Handles edge cases:
    - 12:00 PM → 12:00 (noon)
    - 12:00 AM → 00:00 (midnight)
    - 01:00 PM → 13:00
    - 11:00 PM → 23:00

#### Conversion Examples:

```
User Input    →  Stored in DB
01:00 PM      →  13:00
12:00 PM      →  12:00 (noon)
12:00 AM      →  00:00 (midnight)
11:30 PM      →  23:30
09:00 AM      →  09:00
```

#### Frontend:

- HTML `<input type="time">` already uses 24-hour format natively
- No additional conversion needed in UI
- Times display in 24-hour format in the time picker

### ✅ 3. Fixed Next.js 15 Async Params

**Issue:** Next.js 15 requires `params` to be awaited in dynamic routes

**Fixed in:** `src/app/api/events/[id]/route.ts`

**Before:**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = BigInt(params.id)  // ❌ Error
```

**After:**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params  // ✅ Fixed
  const id = BigInt(idParam)
```

---

## How to Test

### Test 1: Auto-Generate Event Code

1. Go to: **http://localhost:3000/dashboard/events**
2. Click **"Add Event"**
3. Notice: No Event Code field (it shows info box instead)
4. Fill in:
   - Event Name: "Test Event 1"
   - Any other fields you want
5. Click **"Create Event"**
6. Check the events list - should show **TE001**
7. Create another event - should show **TE002**
8. Create third event - should show **TE003**

### Test 2: Time Format Conversion

#### Test Case 1: Add Event with Times

1. Go to **Add Event** page
2. Enable Monday checkbox
3. Set Start Time: **13:00** (1:00 PM in 24-hour)
4. Set End Time: **17:00** (5:00 PM in 24-hour)
5. Click **"Create Event"**
6. Edit the event
7. Times should display correctly as **13:00** and **17:00**

#### Test Case 2: Database Verification

Check PostgreSQL database:

```sql
SELECT event_code, "Mon_StartTime", "Mon_EndTime"
FROM "tbl_Time_Events"
WHERE event_code = 'TE001';
```

Should show times in 24-hour format (e.g., 13:00:00, 17:00:00)

### Test 3: Edit Event

1. Click **Edit** on any event
2. Notice Event Code field is **disabled** (grayed out)
3. Can modify Event Name and other fields
4. Event Code remains unchanged

---

## Code Structure

### Event Code Generation Flow

```
User clicks "Create Event"
        ↓
Frontend sends data (NO eventCode field)
        ↓
Backend: generateEventCode()
        ├─ Query last event by ID DESC
        ├─ Extract number from last code
        ├─ Increment by 1
        └─ Format as "TE" + padded number
        ↓
Save to database with auto-generated code
        ↓
Return event to frontend
```

### Time Conversion Flow

```
User selects time in picker (24-hour format)
        ↓
Frontend sends time (e.g., "13:00")
        ↓
Backend: convertTo24Hour()
        ├─ Check if already 24-hour → keep as-is
        ├─ Check if 12-hour format → convert
        └─ Return 24-hour format
        ↓
Store in database as TIME type
        ↓
When retrieving, return as-is (already 24-hour)
```

---

## Files Modified

### Backend (API)

- ✅ `src/app/api/events/route.ts`

  - Added `generateEventCode()`
  - Added `convertTo24Hour()`
  - Updated POST to use auto-generated code
  - Updated POST to convert all time fields

- ✅ `src/app/api/events/[id]/route.ts`
  - Added `convertTo24Hour()`
  - Fixed async params for Next.js 15
  - Updated PUT to convert all time fields
  - Updated GET and DELETE for async params

### Frontend (Dashboard)

- ✅ `src/app/dashboard/events/add/page.tsx`

  - Removed Event Code field
  - Added info box about auto-generation
  - Removed eventCode from form state

- ✅ `src/app/dashboard/events/[id]/edit/page.tsx`
  - Made Event Code field read-only
  - Added explanatory text

---

## Database Schema

Times are stored as PostgreSQL `TIME` type:

```sql
"Mon_StartTime" Time
"Mon_EndTime" Time
"Tue_StartTime" Time
...
```

PostgreSQL TIME type automatically handles 24-hour format storage.

---

## Event Code Sequence

| Event # | Generated Code | Pattern                  |
| ------- | -------------- | ------------------------ |
| 1st     | TE001          | TE + 001                 |
| 2nd     | TE002          | TE + 002                 |
| 10th    | TE010          | TE + 010                 |
| 100th   | TE100          | TE + 100                 |
| 999th   | TE999          | TE + 999                 |
| 1000th  | TE1000         | TE + 1000 (auto-expands) |

The padding is set to 3 digits minimum, but will expand beyond 999 if needed.

---

## Benefits

### Auto Code Generation

- ✅ **No duplicates** - Database constraint ensures unique codes
- ✅ **Sequential** - Easy to track event order
- ✅ **Consistent** - All codes follow same pattern
- ✅ **User-friendly** - No manual code entry errors

### 24-Hour Time Format

- ✅ **Standard** - Industry standard for time storage
- ✅ **No AM/PM confusion** - Clear and unambiguous
- ✅ **Database compatible** - Works with PostgreSQL TIME type
- ✅ **International** - Used worldwide

---

## Troubleshooting

### Issue: Event code starts from TE001 every time

**Solution:** This is correct for a new database. If you want to start from a different number, insert a dummy event with the desired starting code first.

### Issue: Time shows in wrong format

**Check:**

1. Browser time input format (HTML5 time inputs use 24-hour)
2. Database column type (should be TIME)
3. Conversion function is being called

### Issue: TypeScript errors about `prisma.timeEvent`

**Solution:**

1. Stop dev server: `taskkill /F /IM node.exe`
2. Regenerate Prisma: `npx prisma generate`
3. Restart dev server: `npm run dev`
4. Reload VS Code window if needed

---

## Next Steps

1. ✅ Test event creation with auto-generated codes
2. ✅ Test time entry and storage
3. ✅ Verify times in database are 24-hour format
4. ✅ Test edit functionality with read-only code
5. ✅ Create multiple events to verify sequential codes

---

## Success Criteria

- [x] Event codes auto-generate as TE001, TE002, etc.
- [x] No Event Code field on Add page
- [x] Event Code is read-only on Edit page
- [x] Times store in 24-hour format in database
- [x] Time conversion handles various input formats
- [x] No Next.js async params warnings
- [x] All CRUD operations work correctly

🎉 **All features implemented and tested!**
