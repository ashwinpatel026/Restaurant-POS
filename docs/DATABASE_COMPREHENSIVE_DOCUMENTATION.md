# Database Comprehensive Documentation

Complete database documentation with detailed table specifications, ER diagrams, and relationship documentation.

## Table of Contents

1. [Overview](#overview)
2. [Master Database Tables](#master-database-tables)
3. [Location Database Tables](#location-database-tables)
4. [Table Field Details](#table-field-details)
5. [Constraints and Indexes](#constraints-and-indexes)
6. [ER Diagrams](#er-diagrams)

## Overview

This documentation provides comprehensive details about the database structure for the Restaurant POS System. The system uses a **two-database architecture**:

- **Master Database**: Central repository for tenant management and master data templates
- **Location Database**: Operational database for all stores (multi-tenant via `store_code`)

For visual ER diagrams and relationship diagrams, see [DATABASE_ER_DIAGRAMS.md](./DATABASE_ER_DIAGRAMS.md).

## ER Diagrams

For complete ER diagrams showing all relationships, see:
- **[DATABASE_ER_DIAGRAMS.md](./DATABASE_ER_DIAGRAMS.md)** - Complete ER diagrams for both databases

---

## Master Database Tables

### Tenant Management

#### tbl_company
**Purpose**: Stores company information (top-level tenant)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| company_id | BigInt | NO | auto_increment | Primary key |
| company_code | VarChar(100) | NO | - | Unique company identifier |
| company_name | VarChar(500) | NO | - | Company name |
| address_line1 | VarChar(500) | YES | NULL | Address line 1 |
| address_line2 | VarChar(500) | YES | NULL | Address line 2 |
| city | VarChar(100) | YES | NULL | City |
| state | VarChar(100) | YES | NULL | State |
| country | VarChar(100) | YES | NULL | Country |
| zipcode | VarChar(20) | YES | NULL | ZIP code |
| phone | VarChar(50) | YES | NULL | Phone number |
| email | VarChar(255) | YES | NULL | Email address |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| created_on | DateTime | NO | NOW() | Creation timestamp |
| updated_on | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `company_id`
- UNIQUE: `company_code`

**Relationships**:
- One-to-Many: `tbl_dealer` (company_id)
- One-to-Many: `tbl_location` (company_id)
- One-to-Many: `tbl_user` (company_id)

---

#### tbl_dealer
**Purpose**: Stores dealer information (regional level)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| dealer_id | BigInt | NO | auto_increment | Primary key |
| dealer_code | VarChar(100) | NO | - | Unique dealer identifier |
| dealer_name | VarChar(500) | NO | - | Dealer name |
| company_id | BigInt | NO | - | Foreign key to tbl_company |
| address_line1 | VarChar(500) | YES | NULL | Address line 1 |
| address_line2 | VarChar(500) | YES | NULL | Address line 2 |
| city | VarChar(100) | YES | NULL | City |
| state | VarChar(100) | YES | NULL | State |
| country | VarChar(100) | YES | NULL | Country |
| zipcode | VarChar(20) | YES | NULL | ZIP code |
| phone | VarChar(50) | YES | NULL | Phone number |
| email | VarChar(255) | YES | NULL | Email address |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| created_on | DateTime | NO | NOW() | Creation timestamp |
| updated_on | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `dealer_id`
- UNIQUE: `dealer_code`
- INDEX: `company_id`

**Relationships**:
- Many-to-One: `tbl_company` (company_id)
- One-to-Many: `tbl_location` (dealer_id)
- One-to-Many: `tbl_user` (dealer_id)

---

#### tbl_location
**Purpose**: Stores location/store information (operational level)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| location_id | BigInt | NO | auto_increment | Primary key |
| location_code | VarChar(100) | NO | - | Unique location identifier |
| location_name | VarChar(500) | NO | - | Location name |
| company_id | BigInt | NO | - | Foreign key to tbl_company |
| dealer_id | BigInt | YES | NULL | Foreign key to tbl_dealer |
| store_code | VarChar(100) | NO | - | Unique store code (for filtering) |
| api_key | VarChar(255) | NO | - | API key for POS authentication |
| address_line1 | VarChar(500) | YES | NULL | Address line 1 |
| address_line2 | VarChar(500) | YES | NULL | Address line 2 |
| city | VarChar(100) | YES | NULL | City |
| state | VarChar(100) | YES | NULL | State |
| country | VarChar(100) | YES | NULL | Country |
| zipcode | VarChar(20) | YES | NULL | ZIP code |
| phone | VarChar(50) | YES | NULL | Phone number |
| email | VarChar(255) | YES | NULL | Email address |
| federal_tax_id | VarChar(20) | YES | NULL | Federal tax ID |
| social_security_number | VarChar(15) | YES | NULL | SSN |
| entity_type | Json | YES | NULL | Entity type information |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| sync_enabled | Int | NO | 1 | Sync enabled (1=enabled, 0=disabled) |
| last_sync_at | DateTime | YES | NULL | Last sync timestamp |
| created_on | DateTime | NO | NOW() | Creation timestamp |
| updated_on | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `location_id`
- UNIQUE: `location_code`
- UNIQUE: `store_code`
- UNIQUE: `api_key`
- INDEX: `company_id`
- INDEX: `dealer_id`

**Relationships**:
- Many-to-One: `tbl_company` (company_id)
- Many-to-One: `tbl_dealer` (dealer_id)
- One-to-Many: `tbl_user` (location_id)
- One-to-Many: `tbl_user_store_access` (location_id)

---

### Master User Tables

#### tbl_admin
**Purpose**: Stores master admin users for master dashboard

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| admin_id | BigInt | NO | auto_increment | Primary key |
| email | VarChar(255) | NO | - | Unique email address |
| username | VarChar(100) | NO | - | Unique username |
| password | Text | NO | - | Hashed password |
| first_name | VarChar(100) | NO | - | First name |
| last_name | VarChar(100) | NO | - | Last name |
| role | AdminRole | NO | - | Admin role (SUPER_ADMIN, COMPANY_ADMIN, DEALER_ADMIN) |
| is_active | Boolean | NO | true | Active status |
| last_login_at | DateTime | YES | NULL | Last login timestamp |
| created_on | DateTime | NO | NOW() | Creation timestamp |
| updated_on | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `admin_id`
- UNIQUE: `email`
- UNIQUE: `username`

**Enums**:
- `AdminRole`: SUPER_ADMIN, COMPANY_ADMIN, DEALER_ADMIN

---

#### tbl_user (Master)
**Purpose**: Stores users with access to locations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | BigInt | NO | auto_increment | Primary key |
| email | VarChar(255) | NO | - | Unique email address |
| username | VarChar(100) | NO | - | Unique username |
| password | Text | NO | - | Hashed password |
| first_name | VarChar(100) | NO | - | First name |
| last_name | VarChar(100) | NO | - | Last name |
| company_id | BigInt | YES | NULL | Foreign key to tbl_company |
| dealer_id | BigInt | YES | NULL | Foreign key to tbl_dealer |
| location_id | BigInt | YES | NULL | Foreign key to tbl_location |
| role | VarChar(100) | NO | - | User role |
| access_level | AccessLevel | NO | - | Access level enum |
| default_store_code | VarChar(100) | YES | NULL | Default store code |
| is_active | Boolean | NO | true | Active status |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |
| created_on | DateTime | NO | NOW() | Creation timestamp |
| updated_on | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `user_id`
- UNIQUE: `email`
- UNIQUE: `username`
- UNIQUE: `sync_id`
- INDEX: `company_id`
- INDEX: `dealer_id`
- INDEX: `location_id`

**Relationships**:
- Many-to-One: `tbl_company` (company_id)
- Many-to-One: `tbl_dealer` (dealer_id)
- Many-to-One: `tbl_location` (location_id)
- One-to-Many: `tbl_user_store_access` (user_id)

**Enums**:
- `AccessLevel`: SUPER_ADMIN, COMPANY, DEALER, LOCATION

---

#### tbl_user_store_access (Master)
**Purpose**: Maps users to store access

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BigInt | NO | auto_increment | Primary key |
| user_id | BigInt | NO | - | Foreign key to tbl_user |
| location_id | BigInt | NO | - | Foreign key to tbl_location |
| store_code | VarChar(100) | NO | - | Store code |
| is_default | Boolean | NO | false | Is default store |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |
| created_on | DateTime | NO | NOW() | Creation timestamp |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE: `(user_id, store_code)`
- INDEX: `user_id`
- INDEX: `location_id`
- INDEX: `store_code`
- INDEX: `sync_id`

**Relationships**:
- Many-to-One: `tbl_user` (user_id)
- Many-to-One: `tbl_location` (location_id)

---

### Master Template Tables

#### tbl_master_menu_master
**Purpose**: Master menu master templates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| menu_master_id | BigInt | NO | auto_increment | Primary key |
| menu_master_code | VarChar(100) | NO | - | Unique menu master code |
| name | VarChar(500) | YES | NULL | Menu master name |
| label_name | VarChar(500) | YES | NULL | Label name |
| color_code | VarChar(100) | YES | NULL | Color code |
| prep_zone_code | Json | YES | NULL | Prep zone codes (array) |
| station_code | Json | YES | NULL | Station codes (array) |
| is_event_menu | Int | YES | NULL | Is event menu (1=yes, 0=no) |
| dept_code | VarChar(100) | YES | NULL | Department code |
| forcolor_code | VarChar(100) | YES | NULL | For color code |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| createdby | Int | YES | NULL | Created by user ID |
| createdon | DateTime | NO | NOW() | Creation timestamp |
| updatedby | Int | YES | NULL | Updated by user ID |
| updatedon | DateTime | YES | NULL | Last update timestamp |
| global_code | VarChar(30) | YES | NULL | Global code |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |

**Indexes**:
- PRIMARY KEY: `menu_master_id`
- UNIQUE: `menu_master_code`
- INDEX: `sync_id`

**Relationships**:
- One-to-Many: `tbl_master_menu_category` (menu_master_code)
- One-to-Many: `tbl_master_menu_master_event` (menu_master_code)

---

#### tbl_master_menu_category
**Purpose**: Master menu category templates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| menu_category_id | BigInt | NO | auto_increment | Primary key |
| menu_master_code | VarChar(100) | NO | - | Foreign key to tbl_master_menu_master |
| menu_category_code | VarChar(100) | NO | - | Unique category code |
| name | VarChar(200) | YES | NULL | Category name |
| color_code | VarChar(100) | YES | NULL | Color code |
| dept_code | VarChar(100) | YES | NULL | Department code |
| forcolor_code | VarChar(100) | YES | NULL | For color code |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| createdby | Int | YES | NULL | Created by user ID |
| createdon | DateTime | NO | NOW() | Creation timestamp |
| updatedby | Int | YES | NULL | Updated by user ID |
| updatedon | DateTime | YES | NULL | Last update timestamp |
| global_code | VarChar(30) | YES | NULL | Global code |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |

**Indexes**:
- PRIMARY KEY: `menu_category_id`
- UNIQUE: `menu_category_code`
- INDEX: `menu_master_code`
- INDEX: `sync_id`

**Relationships**:
- Many-to-One: `tbl_master_menu_master` (menu_master_code)
- One-to-Many: `tbl_master_menu_item` (menu_category_code)
- One-to-Many: `tbl_master_menu_category_modifier` (menu_category_code)

---

#### tbl_master_menu_item
**Purpose**: Master menu item templates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| menu_item_id | BigInt | NO | auto_increment | Primary key |
| menu_item_code | VarChar(100) | NO | - | Unique menu item code |
| menu_master_code | VarChar(100) | YES | NULL | Foreign key to tbl_master_menu_master |
| menu_category_code | Json | YES | NULL | Category codes (array) |
| name | VarChar(500) | YES | NULL | Item name |
| kitchen_name | VarChar(150) | YES | NULL | Kitchen display name |
| label_name | VarChar(500) | YES | NULL | Label name |
| color_code | VarChar(100) | YES | NULL | Color code |
| dept_code | VarChar(100) | YES | NULL | Department code |
| forcolor_code | VarChar(100) | YES | NULL | For color code |
| calories | VarChar(100) | YES | NULL | Calories |
| description | Text | YES | NULL | Description |
| item_size | VarChar(50) | YES | NULL | Item size |
| sku_plu | BigInt | YES | NULL | SKU/PLU |
| barcode | VarChar(100) | YES | NULL | Barcode |
| is_alcohol | Int | NO | 0 | Is alcohol (0=no, 1=yes) |
| menu_img | Text | YES | NULL | Image URL |
| price_strategy | Int | YES | NULL | Price strategy (1=Base Price, 3=Open Price) |
| base_price | Decimal(10,2) | YES | NULL | Base price |
| card_price | Decimal(10,2) | YES | NULL | Card price |
| cash_price | Decimal(10,2) | YES | NULL | Cash price |
| is_price | Int | NO | 1 | Is priced (1=yes, 0=no) |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| stockinhand | Decimal(18,2) | YES | NULL | Stock in hand |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |
| createdby | Int | YES | NULL | Created by user ID |
| createdon | DateTime | NO | NOW() | Creation timestamp |
| updatedby | Int | YES | NULL | Updated by user ID |
| updatedon | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `menu_item_id`
- UNIQUE: `menu_item_code`
- INDEX: `sync_id`

**Relationships**:
- Many-to-One: `tbl_master_menu_master` (menu_master_code)
- Many-to-One: `tbl_master_menu_category` (menu_category_code)
- One-to-Many: `tbl_master_menu_item_modifier_group` (menu_item_code)
- One-to-Many: `tbl_master_menuitem_timeevent` (menu_item_code)

---

#### tbl_master_time_events
**Purpose**: Master time event templates

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BigInt | NO | auto_increment | Primary key |
| Event_code | VarChar(100) | NO | - | Unique event code |
| EventName | VarChar(100) | NO | - | Event name |
| dept_code | Json | YES | NULL | Department codes (array) |
| GlobalPrice_Amount_Add | Decimal(18,2) | YES | NULL | Amount to add |
| GlobalPrice_Amount_Disc | Decimal(18,2) | YES | NULL | Amount discount |
| GlobalPrice_Per_Add | Decimal(18,2) | YES | NULL | Percentage add |
| GlobalPrice_Per_Disc | Decimal(18,2) | YES | NULL | Percentage discount |
| Monday | VarChar(50) | YES | NULL | Monday day name |
| Mon_StartTime | VarChar(10) | YES | NULL | Monday start time |
| Mon_EndTime | VarChar(10) | YES | NULL | Monday end time |
| Tuesday | VarChar(50) | YES | NULL | Tuesday day name |
| Tue_StartTime | VarChar(10) | YES | NULL | Tuesday start time |
| Tue_EndTime | VarChar(10) | YES | NULL | Tuesday end time |
| Wednesday | VarChar(50) | YES | NULL | Wednesday day name |
| Wed_StartTime | VarChar(10) | YES | NULL | Wednesday start time |
| Wed_EndTime | VarChar(10) | YES | NULL | Wednesday end time |
| Thursday | VarChar(50) | YES | NULL | Thursday day name |
| Thu_StartTime | VarChar(10) | YES | NULL | Thursday start time |
| Thu_EndTime | VarChar(10) | YES | NULL | Thursday end time |
| FriDay | VarChar(50) | YES | NULL | Friday day name |
| Fri_StartTime | VarChar(10) | YES | NULL | Friday start time |
| Fri_EndTime | VarChar(10) | YES | NULL | Friday end time |
| Saturday | VarChar(50) | YES | NULL | Saturday day name |
| Sat_StartTime | VarChar(10) | YES | NULL | Saturday start time |
| Sat_EndTime | VarChar(10) | YES | NULL | Saturday end time |
| SunDay | VarChar(50) | YES | NULL | Sunday day name |
| Sun_StartTime | VarChar(10) | YES | NULL | Sunday start time |
| Sun_EndTime | VarChar(10) | YES | NULL | Sunday end time |
| Event_Start_Date | Date | YES | NULL | Event start date |
| Event_End_Date | Date | YES | NULL | Event end date |
| by_fixed_value | Boolean | NO | false | Fixed value mode |
| override_all_events | Boolean | NO | false | Override all events |
| is_delete | Boolean | NO | false | Deleted flag |
| is_active | Int | YES | NULL | Active status (1=active, 0=inactive) |
| created_by | BigInt | YES | NULL | Created by user ID |
| created_date | DateTime | NO | NOW() | Creation timestamp |
| updated_by | BigInt | YES | NULL | Updated by user ID |
| updated_on | DateTime | YES | NULL | Last update timestamp |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE: `Event_code`
- INDEX: `sync_id`

**Relationships**:
- One-to-Many: `tbl_master_menu_master_event` (event_code)
- One-to-Many: `tbl_master_menuitem_timeevent` (time_event_code)

---

#### tbl_master_menuitem_timeevent
**Purpose**: Menu item time event mappings

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| menuItemTimeEventId | BigInt | NO | auto_increment | Primary key |
| menuItemTimeEventCode | VarChar(100) | YES | NULL | Unique code |
| menuItemCode | VarChar(100) | NO | - | Foreign key to tbl_master_menu_item |
| timeEventCode | VarChar(100) | NO | - | Foreign key to tbl_master_time_events |
| isFixedValue | Boolean | YES | false | Fixed value mode |
| isDelete | Boolean | YES | false | Deleted flag |
| isOverride | Boolean | YES | false | Override flag |
| formulaValue | Decimal(10,2) | YES | NULL | Calculated price |
| isActive | Boolean | NO | true | Active status |
| syncId | UUID | YES | uuid() | Sync identifier |
| syncSource | VarChar(20) | YES | 'server' | Sync source |
| createdBy | BigInt | YES | NULL | Created by user ID |
| createdOn | DateTime | NO | NOW() | Creation timestamp |
| updatedBy | BigInt | YES | NULL | Updated by user ID |
| updatedOn | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `menuItemTimeEventId`
- INDEX: `menuItemCode`
- INDEX: `timeEventCode`
- INDEX: `syncId`

**Relationships**:
- Many-to-One: `tbl_master_menu_item` (menuItemCode)
- Many-to-One: `tbl_master_time_events` (timeEventCode)

---

### Sync System Tables

#### sync_log
**Purpose**: Tracks changes for synchronization

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BigInt | NO | auto_increment | Primary key |
| table_name | Text | NO | - | Table name |
| record_id | UUID | NO | - | Record identifier |
| operation | Text | NO | - | Operation (INSERT/UPDATE/DELETE) |
| source | Text | NO | - | Source (server/terminal/website) |
| data | JsonB | YES | NULL | Full row data |
| change_time | DateTime | NO | NOW() | Change timestamp |
| sync_status | Int | NO | 0 | Sync status (0=pending, 1=processed, 2=failed) |
| location_code | VarChar(100) | YES | NULL | Location code |
| error_message | Text | YES | NULL | Error message |
| retry_count | Int | NO | 0 | Retry count |
| last_retry_at | DateTime | YES | NULL | Last retry timestamp |
| synced_at | DateTime | YES | NULL | Sync completion timestamp |
| synced_by | Int | YES | NULL | User who synced |

**Indexes**:
- PRIMARY KEY: `id`
- INDEX: `(sync_status, change_time)`
- INDEX: `(table_name, record_id)`
- INDEX: `location_code`
- INDEX: `(sync_status, location_code, table_name)`

---

#### sync_status
**Purpose**: Tracks sync status per location/table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BigInt | NO | auto_increment | Primary key |
| location_code | VarChar(100) | NO | - | Location code |
| table_name | Text | NO | - | Table name |
| last_sync_time | DateTime | YES | NULL | Last sync timestamp |
| last_sync_status | Int | YES | NULL | Last sync status (0=success, 1=failed) |
| total_records_synced | BigInt | NO | 0 | Total records synced |
| last_error_message | Text | YES | NULL | Last error message |
| created_at | DateTime | NO | NOW() | Creation timestamp |
| updated_at | DateTime | NO | NOW() | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE: `(location_code, table_name)`
- INDEX: `location_code`
- INDEX: `table_name`

---

## Location Database Tables

### User Tables

#### users
**Purpose**: Location users (synced from master)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | Int | NO | auto_increment | Primary key |
| email | String | NO | - | Unique email |
| username | String | NO | - | Unique username |
| password | String | NO | - | Hashed password |
| firstName | String | NO | - | First name |
| lastName | String | NO | - | Last name |
| phone | String | YES | NULL | Phone number |
| role | VarChar(100) | NO | - | User role |
| accessLevel | AccessLevel | YES | NULL | Access level enum |
| companyId | BigInt | YES | NULL | Company ID |
| dealerId | BigInt | YES | NULL | Dealer ID |
| locationId | BigInt | YES | NULL | Location ID |
| defaultStoreCode | VarChar(100) | YES | NULL | Default store code |
| isActive | Boolean | NO | true | Active status |
| syncId | UUID | YES | uuid() | Sync identifier |
| syncSource | VarChar(20) | YES | 'server' | Sync source |
| createdAt | DateTime | NO | NOW() | Creation timestamp |
| updatedAt | DateTime | NO | NOW() | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE: `email`
- UNIQUE: `username`
- UNIQUE: `syncId`
- INDEX: `companyId`
- INDEX: `dealerId`
- INDEX: `locationId`

**Relationships**:
- One-to-Many: `tbl_user_login_activity` (userId)
- One-to-Many: `tbl_user_store_access` (userId)

---

### Menu Tables

#### tbl_menu_master
**Purpose**: Menu masters (store-specific)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| menu_master_id | BigInt | NO | auto_increment | Primary key |
| menu_master_code | VarChar(100) | NO | - | Unique menu master code |
| name | VarChar(500) | YES | NULL | Menu master name |
| label_name | VarChar(500) | YES | NULL | Label name |
| color_code | VarChar(100) | YES | NULL | Color code |
| prep_zone_code | Json | YES | NULL | Prep zone codes (array) |
| station_code | Json | YES | NULL | Station codes (array) |
| is_event_menu | Int | YES | NULL | Is event menu (1=yes, 0=no) |
| dept_code | VarChar(100) | YES | NULL | Department code |
| forcolor_code | VarChar(100) | YES | NULL | For color code |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| store_code | VarChar(100) | YES | NULL | Store code |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |
| createdby | Int | YES | NULL | Created by user ID |
| createdon | DateTime | NO | NOW() | Creation timestamp |
| updatedby | Int | YES | NULL | Updated by user ID |
| updatedon | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `menu_master_id`
- UNIQUE: `menu_master_code`
- INDEX: `store_code`
- INDEX: `sync_id`

**Relationships**:
- One-to-Many: `tbl_menu_category` (menu_master_code)
- One-to-Many: `tbl_menu_master_event` (menu_master_code)

---

#### tbl_menu_item
**Purpose**: Menu items (store-specific)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| menu_item_id | BigInt | NO | auto_increment | Primary key |
| menu_item_code | VarChar(100) | YES | NULL | Menu item code |
| menu_master_code | VarChar(100) | YES | NULL | Foreign key to tbl_menu_master |
| menu_category_code | Json | YES | NULL | Category codes (array) |
| name | VarChar(500) | YES | NULL | Item name |
| kitchen_name | VarChar(150) | YES | NULL | Kitchen display name |
| label_name | VarChar(500) | YES | NULL | Label name |
| color_code | VarChar(100) | YES | NULL | Color code |
| dept_code | VarChar(100) | YES | NULL | Department code |
| forcolor_code | VarChar(100) | YES | NULL | For color code |
| calories | VarChar(100) | YES | NULL | Calories |
| description | Text | YES | NULL | Description |
| item_size | VarChar(50) | YES | NULL | Item size |
| sku_plu | BigInt | YES | NULL | SKU/PLU |
| barcode | VarChar(100) | YES | NULL | Barcode |
| is_alcohol | Int | NO | 0 | Is alcohol (0=no, 1=yes) |
| menu_img | Text | YES | NULL | Image URL |
| price_strategy | Int | YES | NULL | Price strategy (1=Base Price, 3=Open Price) |
| base_price | Decimal(10,2) | YES | NULL | Base price |
| card_price | Decimal(10,2) | YES | NULL | Card price |
| cash_price | Decimal(10,2) | YES | NULL | Cash price |
| is_price | Int | NO | 1 | Is priced (1=yes, 0=no) |
| is_active | Int | NO | 1 | Active status (1=active, 0=inactive) |
| stockinhand | Decimal(18,2) | YES | NULL | Stock in hand |
| is_out_stock | Int | YES | NULL | Is out of stock |
| item_contain_alcohol | Int | YES | NULL | Item contains alcohol |
| is_pos_visible | Int | YES | NULL | Is POS visible |
| is_kiosk_order_pay | Int | YES | NULL | Is kiosk order pay |
| is_online_order_by_app | Int | YES | NULL | Is online order by app |
| is_online_ordering | Int | YES | NULL | Is online ordering |
| is_customer_invoice | Int | YES | NULL | Is customer invoice |
| tax_code | VarChar(50) | YES | NULL | Tax code |
| inherit_tax_inclusion | Boolean | NO | true | Inherit tax inclusion |
| is_tax_included | Boolean | NO | false | Is tax included |
| inherit_dining_tax | Boolean | NO | true | Inherit dining tax |
| dining_tax_effect | VarChar(50) | YES | 'No Effect' | Dining tax effect |
| disqualify_dining_tax_exemption | Boolean | NO | false | Disqualify dining tax exemption |
| inherit_modifier_group | Boolean | NO | true | Inherit modifier group |
| prep_zone_code | Json | YES | NULL | Prep zone codes (array) |
| store_code | VarChar(100) | YES | NULL | Store code |
| sync_id | UUID | YES | uuid() | Sync identifier |
| sync_source | VarChar(20) | YES | 'server' | Sync source |
| createdby | Int | YES | NULL | Created by user ID |
| createdon | DateTime | NO | NOW() | Creation timestamp |
| updatedby | Int | YES | NULL | Updated by user ID |
| updatedon | DateTime | YES | NULL | Last update timestamp |

**Indexes**:
- PRIMARY KEY: `menu_item_id`
- INDEX: `store_code`
- INDEX: `sync_id`

**Relationships**:
- Many-to-One: `tbl_menu_master` (menu_master_code)
- Many-to-One: `tbl_menu_category` (menu_category_code)
- One-to-Many: `tbl_menu_item_modifier_group` (menu_item_code)
- One-to-Many: `tbl_menuitem_timeevent` (menu_item_code)
- One-to-Many: `tbl_order_item` (menu_item_code)
- One-to-Many: `tbl_menu_item_prep_time` (menu_item_code)

---

### Order Tables

#### tbl_order
**Purpose**: Orders (store-specific)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| order_id | BigInt | NO | auto_increment | Primary key |
| order_number | VarChar(100) | NO | - | Unique order number |
| table_id | Int | YES | NULL | Foreign key to tbl_table |
| order_type | VarChar(50) | NO | - | Order type (DINE_IN, TAKEAWAY, DELIVERY, QR_ORDER) |
| status | VarChar(50) | NO | 'PENDING' | Order status |
| customer_name | VarChar(200) | YES | NULL | Customer name |
| customer_phone | VarChar(20) | YES | NULL | Customer phone |
| subtotal | Decimal(10,2) | NO | 0.00 | Subtotal |
| tax | Decimal(10,2) | NO | 0.00 | Tax amount |
| discount | Decimal(10,2) | NO | 0.00 | Discount amount |
| total | Decimal(10,2) | NO | 0.00 | Total amount |
| notes | Text | YES | NULL | Order notes |
| created_by | Int | YES | NULL | Created by user ID |
| created_at | DateTime | NO | NOW() | Creation timestamp |
| updated_at | DateTime | NO | NOW() | Last update timestamp |
| completed_at | DateTime | YES | NULL | Completion timestamp |
| store_code | VarChar(100) | YES | NULL | Store code |
| is_sync_to_web | Int | NO | 0 | Sync to web flag |
| is_sync_to_local | Int | NO | 0 | Sync to local flag |

**Indexes**:
- PRIMARY KEY: `order_id`
- UNIQUE: `order_number`
- INDEX: `table_id`
- INDEX: `store_code`

**Relationships**:
- Many-to-One: `tbl_table` (table_id)
- One-to-Many: `tbl_order_item` (order_id)

---

#### tbl_order_item
**Purpose**: Order items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| order_item_id | BigInt | NO | auto_increment | Primary key |
| order_id | BigInt | NO | - | Foreign key to tbl_order |
| menu_item_id | BigInt | YES | NULL | Menu item ID |
| menu_item_code | VarChar(100) | YES | NULL | Menu item code |
| name | VarChar(500) | NO | - | Item name |
| quantity | Int | NO | 1 | Quantity |
| price | Decimal(10,2) | NO | - | Unit price |
| subtotal | Decimal(10,2) | NO | - | Subtotal |
| notes | Text | YES | NULL | Item notes |
| status | VarChar(50) | NO | 'PENDING' | Item status |
| created_at | DateTime | NO | NOW() | Creation timestamp |
| store_code | VarChar(100) | YES | NULL | Store code |
| is_sync_to_web | Int | NO | 0 | Sync to web flag |
| is_sync_to_local | Int | NO | 0 | Sync to local flag |

**Indexes**:
- PRIMARY KEY: `order_item_id`
- INDEX: `order_id`
- INDEX: `menu_item_code`
- INDEX: `store_code`

**Relationships**:
- Many-to-One: `tbl_order` (order_id) - CASCADE DELETE
- Many-to-One: `tbl_menu_item` (menu_item_code)

---

## Constraints and Indexes

### Common Index Patterns

1. **Primary Keys**: All tables have auto-incrementing BigInt/Int primary keys
2. **Unique Constraints**: Code columns (menu_item_code, event_code, etc.)
3. **Foreign Keys**: Relationship columns (menu_master_code, dept_code, etc.)
4. **Sync Columns**: `sync_id` indexed for sync operations
5. **Store Code**: `store_code` indexed for multi-tenant filtering
6. **Status Columns**: `is_active`, `is_delete` indexed for filtering

### Composite Indexes

- `sync_log`: `(sync_status, change_time)`, `(sync_status, location_code, table_name)`
- `sync_status`: `(location_code, table_name)` - UNIQUE
- `tbl_user_store_access`: `(user_id, store_code)` - UNIQUE
- `tbl_menuitem_timeevent`: `(sync_id, store_code)` - UNIQUE

---

## Data Types and Enums

### Enums

#### AdminRole
- `SUPER_ADMIN`: Full system access
- `COMPANY_ADMIN`: Company-level access
- `DEALER_ADMIN`: Dealer-level access

#### AccessLevel
- `SUPER_ADMIN`: Full access to all companies, dealers, and locations
- `COMPANY`: Access all locations in company
- `DEALER`: Access all locations in dealer
- `LOCATION`: Access only specific location

### Common Data Types

- **BigInt**: Primary keys, foreign keys, large numbers
- **VarChar(n)**: Variable-length strings with max length
- **Text**: Unlimited length text
- **Decimal(p,s)**: Fixed-point decimal numbers (precision, scale)
- **DateTime**: Date and time values
- **Date**: Date values only
- **Boolean**: True/false values
- **Json/JsonB**: JSON data (JsonB is binary, faster)
- **UUID**: Universally unique identifier

---

## Related Documentation

- [DATABASE_ER_DIAGRAMS.md](./DATABASE_ER_DIAGRAMS.md) - Complete ER diagrams and relationship diagrams
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database schema overview
- [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md) - Sync system details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
