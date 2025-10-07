# MySQL Migration Guide

This guide will help you migrate the Restaurant POS app from MongoDB to MySQL using Prisma ORM.

## Prerequisites

1. **MySQL Server** installed and running
2. **Node.js** and **npm** installed
3. **XAMPP** (if using local MySQL)

## Step 1: Install Dependencies

```bash
npm install prisma @prisma/client mysql2
npm install -D prisma
```

## Step 2: Set Up MySQL Database

### Option A: Using XAMPP (Local)

1. Start XAMPP Control Panel
2. Start MySQL service
3. Open phpMyAdmin (http://localhost/phpmyadmin)
4. Create a new database named `restaurant_pos`

### Option B: Using MySQL Command Line

```sql
CREATE DATABASE restaurant_pos;
CREATE USER 'restaurant_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON restaurant_pos.* TO 'restaurant_user'@'localhost';
FLUSH PRIVILEGES;
```

## Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```env
# Database Configuration
DATABASE_URL="mysql://restaurant_user:your_password@localhost:3306/restaurant_pos"

# NextAuth Configuration
NEXTAUTH_SECRET="put-any-random-32-character-string-here"
NEXTAUTH_URL="http://localhost:3000"

# JWT Configuration
JWT_SECRET="another-random-secret-key"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

## Step 4: Generate Prisma Client and Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Create and run database migrations
npx prisma db push

# (Alternative: Use migrations)
npx prisma migrate dev --name init
```

## Step 5: Seed the Database

```bash
# Run the MySQL seeding script
node scripts/seed-mysql.mjs
```

## Step 6: Update API Routes

Replace the MongoDB imports in your API routes:

### Before (MongoDB):

```typescript
import connectDB from "@/lib/mongodb";
import MenuItem from "@/models/MenuItem";
import Category from "@/models/Category";
```

### After (MySQL with Prisma):

```typescript
import { prisma } from "@/lib/database";
```

### Example API Route Update:

**Before:**

```typescript
await connectDB();
const menuItems = await MenuItem.find({ categoryId });
```

**After:**

```typescript
const menuItems = await prisma.menuItem.findMany({
  where: { categoryId },
});
```

## Step 7: Update Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "node scripts/seed-mysql.mjs",
    "db:studio": "prisma studio"
  }
}
```

## Step 8: Test the Migration

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Test the API endpoints:

   - GET `/api/menu/categories`
   - GET `/api/menu/items`
   - POST `/api/menu/items`

3. Login to the dashboard:
   - Email: `admin@restaurant.com`
   - Password: `admin123`

## Key Changes from MongoDB to MySQL

### 1. **ObjectId → Auto-incrementing IDs**

- MongoDB: `mongoose.Types.ObjectId`
- MySQL: `Int @id @default(autoincrement())`

### 2. **Embedded Documents → Separate Tables**

- MongoDB: `orderItems: [{ menuItemId, quantity, price }]`
- MySQL: Separate `OrderItem` table with foreign key

### 3. **Array Fields**

- MongoDB: `tags: [String]`
- MySQL: `tags: String[]` (JSON array in MySQL)

### 4. **JSON Fields**

- MongoDB: `nutritionInfo: Schema.Types.Mixed`
- MySQL: `nutritionInfo: Json`

## Troubleshooting

### Common Issues:

1. **Connection Refused**

   - Ensure MySQL service is running
   - Check connection string format
   - Verify database exists

2. **Permission Denied**

   - Check MySQL user permissions
   - Ensure user has access to the database

3. **Prisma Client Not Generated**

   ```bash
   npx prisma generate
   ```

4. **Migration Errors**
   ```bash
   npx prisma db push --force-reset
   ```

## Benefits of MySQL Migration

1. **ACID Compliance** - Better for financial transactions
2. **SQL Queries** - Easier reporting and analytics
3. **Performance** - Better for complex joins
4. **Hosting** - More hosting options available
5. **Cost** - Generally cheaper than MongoDB Atlas

## Database Schema Overview

The migration converts these MongoDB collections to MySQL tables:

- `users` → `users`
- `outlets` → `outlets`
- `categories` → `categories`
- `menuitems` → `menu_items`
- `orders` → `orders`
- `orderitems` → `order_items`
- `tables` → `tables`
- `inventories` → `inventories`
- `rawmaterials` → `raw_materials`
- `centralkitchens` → `central_kitchens`

## Next Steps

1. **Update all API routes** to use Prisma
2. **Test thoroughly** with different data scenarios
3. **Update documentation** and README files
4. **Deploy** to production environment

## Support

If you encounter issues during migration:

1. Check the Prisma documentation: https://www.prisma.io/docs/
2. Verify MySQL connection and permissions
3. Review the generated Prisma client types
4. Test with Prisma Studio: `npx prisma studio`
