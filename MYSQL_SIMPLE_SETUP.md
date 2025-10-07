# MySQL Simple Setup Guide

This guide helps you set up MySQL for the Restaurant POS app with just **Users** and **Outlets** (no menu items).

## ✅ Prerequisites Met

- Prisma and MySQL2 are already installed
- Prisma client generated successfully

## Step 1: Set Up MySQL Database

### Using XAMPP (Recommended)

1. Start XAMPP Control Panel
2. Start MySQL service
3. Open phpMyAdmin (http://localhost/phpmyadmin)
4. Create a new database named `restaurant_pos`

### Using MySQL Command Line

```sql
CREATE DATABASE restaurant_pos;
```

## Step 2: Configure Environment Variables

Create a `.env` file in your project root:

```env
# Database Configuration
DATABASE_URL="mysql://root:@localhost:3306/restaurant_pos"

# NextAuth Configuration
NEXTAUTH_SECRET="put-any-random-32-character-string-here"
NEXTAUTH_URL="http://localhost:3000"

# JWT Configuration
JWT_SECRET="another-random-secret-key"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

**Note:** If you have a MySQL password, use: `mysql://root:yourpassword@localhost:3306/restaurant_pos`

## Step 3: Create Database Tables

```bash
# Push the schema to create tables
npx prisma db push
```

## Step 4: Seed the Database

```bash
# Seed with simple data (Users + Outlets only)
npm run seed:simple
```

## Step 5: Test the Setup

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Test API endpoints:**

   - GET `/api/users` - List all users
   - GET `/api/outlets` - List all outlets

3. **Login to dashboard:**
   - Email: `admin@restaurant.com`
   - Password: `admin123`

## Step 6: Verify Database

### Option 1: Prisma Studio

```bash
npx prisma studio
```

This opens a web interface to view your data at http://localhost:5555

### Option 2: phpMyAdmin

1. Go to http://localhost/phpmyadmin
2. Select `restaurant_pos` database
3. View `users` and `outlets` tables

## Database Schema

### Users Table

- `id` - Auto-incrementing primary key
- `email` - Unique email address
- `username` - Unique username
- `password` - Hashed password
- `firstName` - User's first name
- `lastName` - User's last name
- `phone` - Phone number (optional)
- `role` - User role (SUPER_ADMIN, OUTLET_MANAGER, CAPTAIN, CASHIER, KITCHEN_STAFF)
- `isActive` - Whether user is active
- `outletId` - Foreign key to outlets table (optional)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Outlets Table

- `id` - Auto-incrementing primary key
- `name` - Outlet name
- `code` - Unique outlet code
- `address` - Full address
- `city` - City name
- `state` - State name
- `zipCode` - ZIP/postal code
- `phone` - Phone number
- `email` - Email address
- `isActive` - Whether outlet is active
- `openingTime` - Opening time (HH:MM format)
- `closingTime` - Closing time (HH:MM format)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Sample Data Created

### Users:

- **Admin User** (admin@restaurant.com)

  - Role: SUPER_ADMIN
  - No outlet assigned

- **Manager** (manager@restaurant.com)

  - Role: OUTLET_MANAGER
  - Assigned to Main Branch

- **Captain** (captain@restaurant.com)

  - Role: CAPTAIN
  - Assigned to Main Branch

- **Cashier** (cashier@restaurant.com)
  - Role: CASHIER
  - Assigned to Airport Branch

### Outlets:

- **Main Branch** (MB001)

  - Address: 123 Restaurant Street, Downtown, Mumbai
  - Hours: 09:00 - 23:00

- **Airport Branch** (AB002)
  - Address: 789 Airport Road, Terminal 2, Mumbai
  - Hours: 06:00 - 01:00

## Next Steps

Once this basic setup is working:

1. **Add Menu System** - You can add back menu items, categories, etc. later
2. **Add Order System** - Implement orders and order items
3. **Add Inventory** - Add inventory management
4. **Customize** - Modify the schema based on your specific needs

## Troubleshooting

### Connection Issues

```bash
# Check if MySQL is running
net start mysql

# Test connection
npx prisma db pull
```

### Permission Issues

```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON restaurant_pos.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Reset Database

```bash
# Drop and recreate database
npx prisma db push --force-reset
npm run seed:simple
```

## Success Indicators

✅ **Setup is successful when:**

- `npx prisma db push` completes without errors
- `npm run seed:simple` creates 4 users and 2 outlets
- `npm run dev` starts without errors
- You can login with admin@restaurant.com
- API endpoints return data

🎉 **You're ready to build your restaurant POS system!**
