# Restaurant POS System - MongoDB Setup Guide

This guide will walk you through setting up the Restaurant POS system with MongoDB step by step.

## 📋 Prerequisites

Before starting, make sure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (local or cloud via MongoDB Atlas)
- **Git** - [Download](https://git-scm.com/)
- A code editor (VS Code recommended)

## 🚀 Step-by-Step Setup

### Step 1: Navigate to Project

```bash
cd C:\xampp\htdocs\restaurants_pos
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:

- Next.js, React, TypeScript
- Mongoose (MongoDB ODM)
- Tailwind CSS (styling)
- NextAuth (authentication)
- And many more...

### Step 3: Set Up MongoDB

You have two options:

#### ⭐ Option A: MongoDB Atlas (Recommended - FREE & EASY!)

**No installation needed! Works in the cloud.**

1. **Sign up for free** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a free cluster:**

   - Click "Build a Database"
   - Choose "M0 FREE" (512MB storage, perfect for development)
   - Select a cloud provider and region (closest to you)
   - Click "Create Cluster"

3. **Create database user:**

   - Go to "Database Access" (left sidebar)
   - Click "Add New Database User"
   - Authentication Method: Password
   - Username: `restaurant_admin`
   - Password: Click "Autogenerate Secure Password" (copy it!)
   - Database User Privileges: "Atlas admin"
   - Click "Add User"

4. **Whitelist IP address:**

   - Go to "Network Access" (left sidebar)
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
   - **Note:** For production, use specific IPs

5. **Get connection string:**
   - Go to "Database" (left sidebar)
   - Click "Connect" on your cluster
   - Click "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://...`)
   - Replace `<password>` with your actual password

#### Option B: Local MongoDB

1. **Download** MongoDB Community Server from [mongodb.com/download-center/community](https://www.mongodb.com/try/download/community)
2. **Install** MongoDB on your computer
3. **Start** MongoDB:

   - Windows: Usually runs automatically as a service
   - Mac: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

4. **Connection string:**
   ```
   mongodb://localhost:27017/restaurant_pos
   ```

### Step 4: Configure Environment Variables

1. **Create `.env` file** in the project root:

```bash
# Windows (PowerShell)
New-Item .env

# Mac/Linux
touch .env
```

2. **Add the following to `.env`:**

```env
# MongoDB Connection
# For MongoDB Atlas (cloud):
MONGODB_URI="mongodb+srv://restaurant_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/restaurant_pos?retryWrites=true&w=majority"

# OR for local MongoDB:
# MONGODB_URI="mongodb://localhost:27017/restaurant_pos"

# NextAuth Secret (generate a random string)
NEXTAUTH_SECRET="generate-a-random-32-character-string-here"
NEXTAUTH_URL="http://localhost:3000"

# JWT Secret
JWT_SECRET="another-random-secret-key"

# API URL
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

**To generate secure secrets:**

```bash
# On Windows (PowerShell):
-join((48..57)+(65..90)+(97..122)|Get-Random -Count 32|%{[char]$_})

# On Mac/Linux:
openssl rand -base64 32
```

3. **Save the file**

### Step 5: Seed the Database

Populate the database with sample data:

```bash
npm run seed
```

**This creates:**

- ✓ 2 Outlets (Main Branch, Airport Branch)
- ✓ 3 Users (Admin, Manager, Captain)
- ✓ 4 Categories with 13 Menu Items
- ✓ 10 Raw Materials
- ✓ Inventory for both outlets
- ✓ 18 Tables with QR codes

**Default Login Credentials:**

- Email: `admin@restaurant.com`
- Password: `admin123`

### Step 6: Start the Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

### Step 7: Access the Application

1. **Open your browser** and go to: `http://localhost:3000`
2. **You'll be redirected to the login page**
3. **Login with:** admin@restaurant.com / admin123

## ✅ Verification

After successful setup, you should see:

1. ✅ Login page loads
2. ✅ Can login with default credentials
3. ✅ Dashboard shows with metrics
4. ✅ Menu Management shows categories and items
5. ✅ Tables page shows 10 tables for Main Branch
6. ✅ All navigation links work

## 🔧 Troubleshooting

### MongoDB Connection Issues

**Error:** "MongooseServerSelectionError: connect ECONNREFUSED"

**Solutions:**

1. **Local MongoDB:** Make sure MongoDB service is running

   ```bash
   # Windows
   net start MongoDB

   # Mac
   brew services start mongodb-community
   ```

2. **MongoDB Atlas:**
   - Check your connection string in `.env`
   - Make sure password is correct (no `<` `>` brackets)
   - Verify IP is whitelisted (0.0.0.0/0)
   - Check cluster is running (not paused)

### Port Already in Use

**Error:** "Port 3000 is already in use"

**Solution:**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill

# Or use different port:
npm run dev -- -p 3001
```

### Module Not Found

**Error:** "Cannot find module..."

**Solution:**

```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Seed Script Errors

**Error:** "Cannot connect to database"

**Solution:**

1. Make sure `.env` file exists with correct MONGODB_URI
2. Test MongoDB connection:
   ```bash
   # For Atlas, just try accessing your cluster dashboard
   # For local, try:
   mongo --eval "db.version()"
   ```

## 📚 MongoDB Tools

### MongoDB Compass (GUI)

**Free MongoDB GUI tool** - highly recommended!

1. Download from [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
2. Install and open
3. Connect using your connection string
4. Browse collections, query data, and more

### MongoDB Shell (mongosh)

```bash
# Connect to local MongoDB
mongosh

# Connect to Atlas
mongosh "mongodb+srv://cluster0.xxxxx.mongodb.net" --username restaurant_admin

# Show databases
show dbs

# Use database
use restaurant_pos

# Show collections
show collections

# Query data
db.users.find()
db.menuItems.find()
```

## 🌐 Deployment

### Deploying to Vercel

1. **Push to GitHub**
2. **Import in Vercel**
3. **Add environment variables:**
   - `MONGODB_URI` (your Atlas connection string)
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - `NEXTAUTH_URL` (your deployed URL)
4. **Deploy**

### MongoDB Atlas for Production

- Use same free cluster or upgrade for better performance
- Enable backup (available in paid tiers)
- Monitor performance in Atlas dashboard
- Set up alerts for high usage

## 💡 Why MongoDB?

### Advantages:

1. **Easy Setup:** No complex migrations
2. **Flexible Schema:** Easy to modify data structure
3. **Free Cloud Option:** MongoDB Atlas M0 cluster
4. **JSON-like Documents:** Natural fit for JavaScript/TypeScript
5. **Scalable:** Grows with your business
6. **Rich Ecosystem:** Great tools and community

### Perfect for:

- Rapid development
- Flexible data models
- Cloud-first applications
- Startups and MVPs

## 📞 Getting Help

### Common Questions:

**Q: Can I use both local MongoDB and Atlas?**
A: Yes! Just change `MONGODB_URI` in `.env`

**Q: How do I view my data?**
A: Use MongoDB Compass or Atlas web interface

**Q: Is MongoDB free?**
A: Yes! Atlas M0 tier is free forever (512MB)

**Q: Do I need to install anything for Atlas?**
A: No! It's cloud-based, just need the connection string

## ✅ Verification Checklist

Before considering setup complete:

- [ ] Node.js is installed (`node --version`)
- [ ] MongoDB is accessible (local or Atlas)
- [ ] `.env` file is configured with MONGODB_URI
- [ ] `npm install` completed successfully
- [ ] `npm run seed` ran without errors
- [ ] Development server starts: `npm run dev`
- [ ] Can access `http://localhost:3000`
- [ ] Can login with default credentials
- [ ] Dashboard loads with data

## 🎉 Success!

If you can login and see the dashboard, congratulations!

Your Restaurant POS system is ready to use with MongoDB! 🚀

---

**Next Steps:**

1. Explore all features
2. Add your own menu items
3. Try QR code ordering
4. Generate reports
5. Customize for your restaurant

**Need help?** Check:

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
