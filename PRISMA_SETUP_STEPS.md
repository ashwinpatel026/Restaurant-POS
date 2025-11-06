# 🚀 Prisma Database Setup Steps

After setting up your Prisma database on Vercel and adding environment variables, follow these steps:

## ✅ Step 1: Verify Environment Variables

Your `.env` file should have:

- ✅ `DATABASE_URL` - Main database connection string
- ✅ `PRISMA_DATABASE_URL` - Prisma Accelerate connection (optional, for better performance)
- ✅ `NEXTAUTH_SECRET` - Authentication secret
- ✅ `NEXTAUTH_URL` - Application URL
- ✅ `JWT_SECRET` - JWT token secret

## 🔧 Step 2: Generate Prisma Client

**Important:** Close any running dev servers or processes first!

```bash
npm run db:generate
```

**If you get permission errors:**

1. Close all terminal windows and VS Code
2. Run PowerShell/Command Prompt as Administrator
3. Navigate to your project: `cd C:\xampp\htdocs\restaurants_pos`
4. Run: `npm run db:generate`

## 📤 Step 3: Push Schema to Database

This will create all tables in your Prisma database:

```bash
npm run db:push
```

**What this does:**

- Creates all tables defined in `prisma/schema.prisma`
- Syncs your schema with the database
- **Note:** This is for development. For production, use migrations.

## 🔄 Alternative: Use Migrations (Recommended for Production)

If you want to use migrations instead:

```bash
npm run db:migrate
```

This will:

- Create a migration file
- Apply it to your database
- Track schema changes

## 🌱 Step 4: Seed the Database (Optional)

Populate your database with initial data:

```bash
npm run seed:sequential
```

**This creates:**

- Admin user (email: `admin@restaurant.com`, password: `admin123`)
- Sample menu data
- Prep zones
- Categories
- And more...

## ✅ Step 5: Verify Connection

Test your database connection:

```bash
npm run db:studio
```

This opens Prisma Studio in your browser where you can:

- View all tables
- Browse data
- Edit records
- Verify everything is working

## 🚀 Step 6: Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

Login with:

- **Email:** admin@restaurant.com
- **Password:** admin123

---

## 🔍 Troubleshooting

### Permission Errors (EPERM)

- Close all running processes (dev server, VS Code, etc.)
- Run terminal as Administrator
- Try again

### Connection Errors

- Verify `DATABASE_URL` in `.env` is correct
- Check if database is accessible from your IP
- Ensure SSL mode is set correctly (`sslmode=require`)

### Schema Sync Issues

- Make sure you're using the correct database URL
- Check Prisma schema syntax: `npx prisma validate`
- Try resetting: `npx prisma db push --force-reset` (⚠️ deletes all data!)

### Prisma Client Not Found

- Run `npm run db:generate` again
- Check `node_modules/.prisma/client` exists
- Restart your dev server

---

## 📝 Quick Command Reference

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Create and apply migration
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run seed:sequential

# Start dev server
npm run dev
```

---

## 🎯 Next Steps After Setup

1. ✅ Generate Prisma Client
2. ✅ Push schema to database
3. ✅ Seed database (optional)
4. ✅ Start dev server
5. ✅ Login and test the application

Your database is now ready! 🎉
