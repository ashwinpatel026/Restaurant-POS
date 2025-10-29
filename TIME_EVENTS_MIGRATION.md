# Time Events Migration Summary

## Overview

Successfully migrated from the Availability/Availability Schedule system to the new Time Events system.

---

## ✅ Changes Completed

### 1. Database Schema Updates

- ❌ **Removed:** `Availability` model and `tbl_availability` table
- ❌ **Removed:** `AvailabilitySchedule` model and `tbl_availability_schedule` table
- ❌ **Removed:** `DayName` enum (no longer needed)
- ✅ **Added:** `TimeEvent` model with table `tbl_Time_Events`

### 2. API Routes

#### Deleted:

- `src/app/api/availability/` (entire folder)
- `src/app/api/menu/availability/` (entire folder)

#### Created:

- `src/app/api/events/route.ts` - GET all events, POST create event
- `src/app/api/events/[id]/route.ts` - GET, PUT, DELETE single event

### 3. Dashboard Pages

#### Deleted:

- `src/app/dashboard/availability/` (entire folder with all subpages)
- `AVAILABILITY_SCHEDULE_GUIDE.md` (documentation file)

#### Created:

- `src/app/dashboard/events/page.tsx` - Complete Time Events management page

### 4. Navigation

- Updated `DashboardLayout.tsx`
- Changed "Event Schedule" → "Time Events"
- Updated route: `/dashboard/availability` → `/dashboard/events`

---

## 🗂️ New TimeEvent Model Structure

```prisma
model TimeEvent {
  id                     BigInt    @id @default(autoincrement())
  eventCode              String    @unique
  eventName              String

  // Global Price Adjustments
  globalPriceAmountAdd   Decimal?  // Fixed amount to add
  globalPriceAmountDisc  Decimal?  // Fixed amount to discount
  globalPricePerAdd      Decimal?  // Percentage to add
  globalPricePerDisc     Decimal?  // Percentage to discount

  // Weekly Schedule (for each day)
  monday                 String?
  monStartTime           DateTime? @db.Time
  monEndTime             DateTime? @db.Time

  tuesday                String?
  tueStartTime           DateTime? @db.Time
  tueEndTime             DateTime? @db.Time

  // ... (similar for Wed, Thu, Fri, Sat, Sun)

  // Event Date Range
  eventStartDate         DateTime? @db.Date
  eventEndDate           DateTime? @db.Date

  // Status & Metadata
  isActive               Int?
  createdDate            DateTime?
  createdBy              Int?
  storeCode              String?
  isSyncToWeb            Int?
  isSyncToLocal          Int?

  @@map("tbl_Time_Events")
}
```

---

## 📋 Features of Time Events System

### 1. **Flexible Pricing**

- Add fixed amount (e.g., +$5.00)
- Discount fixed amount (e.g., -$3.00)
- Add percentage (e.g., +10%)
- Discount percentage (e.g., -20% for Happy Hour)

### 2. **Weekly Schedule**

- Configure different time slots for each day of the week
- Each day can have:
  - Active/Inactive status
  - Start time
  - End time

### 3. **Event Date Range**

- Set start and end dates for seasonal events
- Example: "Summer Special" from June 1 to August 31

### 4. **Easy Management**

- Create, edit, and delete events through the dashboard
- Toggle active/inactive status
- View all events in a single table
- Quick search and filtering

---

## 🚀 API Endpoints

### GET `/api/events`

Fetch all time events

```json
Response: [
  {
    "id": "1",
    "eventCode": "HAPPY_HOUR",
    "eventName": "Happy Hour",
    "globalPricePerDisc": 20,
    "isActive": 1,
    ...
  }
]
```

### POST `/api/events`

Create new time event

```json
Request: {
  "eventCode": "HAPPY_HOUR",
  "eventName": "Happy Hour",
  "globalPricePerDisc": 20,
  "monday": "active",
  "monStartTime": "17:00",
  "monEndTime": "19:00",
  "isActive": 1
}
```

### GET `/api/events/[id]`

Get single event by ID

### PUT `/api/events/[id]`

Update event

### DELETE `/api/events/[id]`

Delete event

---

## 🎯 How to Use

### Access Time Events

1. Login to the dashboard
2. Navigate to **"Time Events"** in the sidebar
3. Click **"Add Event"** to create a new event

### Create an Event

1. Enter **Event Code** (unique identifier)
2. Enter **Event Name** (display name)
3. Set **Price Adjustments** (optional):
   - Amount to add/discount
   - Percentage to add/discount
4. Configure **Weekly Schedule**:
   - Enable specific days
   - Set time ranges
5. Set **Event Dates** (optional):
   - Start date
   - End date
6. Set **Active** status
7. Click **"Create Event"**

### Example Use Cases

#### 1. Happy Hour (Daily 5-7 PM, 20% off)

```
Event Code: HAPPY_HOUR
Event Name: Happy Hour Special
Global Price % Discount: 20
Monday-Friday: 17:00 - 19:00
Active: Yes
```

#### 2. Weekend Brunch Surcharge (+$5)

```
Event Code: BRUNCH_SURCHARGE
Event Name: Weekend Brunch
Global Price Amount Add: 5.00
Saturday-Sunday: 10:00 - 14:00
Active: Yes
```

#### 3. Holiday Season (December 15-31, +15%)

```
Event Code: HOLIDAY_SPECIAL
Event Name: Holiday Season Pricing
Global Price % Add: 15
Event Start Date: 2024-12-15
Event End Date: 2024-12-31
All Days: 00:00 - 23:59
Active: Yes
```

---

## 🔧 Database Migration

The database schema has been automatically updated:

- ✅ Old tables (`tbl_availability`, `tbl_availability_schedule`) have been **dropped**
- ✅ New table (`tbl_Time_Events`) has been **created**
- ✅ Prisma Client regenerated
- ✅ No manual SQL required

---

## 📝 Notes

1. **BigInt ID**: The ID field uses `BigInt` to support very large numbers of events
2. **Time Storage**: Time fields use PostgreSQL's `TIME` type (HH:MM:SS)
3. **Date Storage**: Date fields use PostgreSQL's `DATE` type
4. **Decimal Precision**: Price fields use `Decimal(18,2)` for accurate currency calculations
5. **Nullable Fields**: Most fields are optional to provide flexibility

---

## 🐛 Troubleshooting

### Event not showing?

- Check if `isActive` is set to 1
- Verify date range includes today's date
- Ensure at least one day is configured

### Price adjustments not working?

- Verify the price adjustment fields are populated
- Check that the event is active
- Ensure the current time falls within the event's schedule

### Can't create event?

- Event Code must be unique
- Event Code and Event Name are required
- Check console for validation errors

---

## 🎉 Benefits of New System

1. **Simpler Structure**: One table instead of two related tables
2. **More Flexible**: Support for both amount and percentage pricing
3. **Easier to Manage**: All event configuration in one place
4. **Better Performance**: Fewer database joins required
5. **Enhanced Features**: Support for seasonal events with date ranges

---

## 📚 Related Files

### Schema

- `prisma/schema.prisma` - Database schema

### API

- `src/app/api/events/route.ts`
- `src/app/api/events/[id]/route.ts`

### Frontend

- `src/app/dashboard/events/page.tsx`
- `src/components/layouts/DashboardLayout.tsx`

---

## ✅ Migration Complete!

Your application is now using the new Time Events system. The development server has been restarted and all changes are live.

To test:

1. Navigate to http://localhost:3000/dashboard/events
2. Create your first time event
3. Configure pricing and schedule
4. Save and activate

Enjoy your new Time Events system! 🎊
