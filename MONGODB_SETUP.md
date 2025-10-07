# MongoDB Setup Guide for Restaurant POS

## 🎯 Quick Setup (Choose One Path)

### Path 1: MongoDB Atlas (Cloud - Recommended for Beginners) ⭐

**No installation required! Takes 5 minutes!**

#### Step 1: Create Free Account

1. Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with email or Google account
3. Complete verification

#### Step 2: Create Free Cluster

1. Click "**Build a Database**"
2. Choose "**M0 FREE**" (512MB, shared cluster)
3. Cloud Provider: **AWS** (or any)
4. Region: Choose **closest to you**
5. Cluster Name: Leave default or name it "**RestaurantPOS**"
6. Click "**Create Cluster**" (takes 1-3 minutes)

#### Step 3: Create Database User

1. You'll see a security popup, or go to "**Database Access**" (left menu)
2. Click "**Add New Database User**"
3. Authentication: **Password**
4. Username: `restaurant_admin`
5. Password: Click "**Autogenerate Secure Password**" → **Copy it!** ✍️
6. User Privileges: **Atlas admin**
7. Click "**Add User**"

#### Step 4: Allow Network Access

1. Go to "**Network Access**" (left menu)
2. Click "**Add IP Address**"
3. Click "**Allow Access from Anywhere**" (0.0.0.0/0)
   - ⚠️ For development only
   - For production, add specific IPs
4. Click "**Confirm**"

#### Step 5: Get Connection String

1. Go to "**Database**" (left menu)
2. Click "**Connect**" button on your cluster
3. Click "**Connect your application**"
4. Driver: **Node.js** (default)
5. **Copy the connection string**

It looks like:

```
mongodb+srv://restaurant_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. **Important:** Replace `<password>` with your actual password (no brackets!)
7. **Add database name** before the `?`:

```
mongodb+srv://restaurant_admin:yourpassword@cluster0.xxxxx.mongodb.net/restaurant_pos?retryWrites=true&w=majority
```

#### Step 6: Update .env File

Create `.env` file in your project root:

```env
MONGODB_URI="mongodb+srv://restaurant_admin:yourpassword@cluster0.xxxxx.mongodb.net/restaurant_pos?retryWrites=true&w=majority"

NEXTAUTH_SECRET="put-any-random-32-character-string-here"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="another-random-secret-key"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

**Done! Skip to "Step 7: Install & Run" below** ⬇️

---

### Path 2: Local MongoDB (For Advanced Users)

#### Step 1: Install MongoDB

**Windows:**

1. Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run installer (choose "Complete" installation)
3. Install as Windows Service (check the box)
4. Install MongoDB Compass (GUI tool)

**Mac:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

#### Step 2: Verify MongoDB is Running

```bash
# Windows
net start MongoDB

# Mac/Linux
brew services list | grep mongodb
# or
sudo systemctl status mongod
```

#### Step 3: Update .env File

```env
MONGODB_URI="mongodb://localhost:27017/restaurant_pos"

NEXTAUTH_SECRET="put-any-random-32-character-string-here"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="another-random-secret-key"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

---

## Step 7: Install & Run

```bash
# Install dependencies
npm install

# Seed the database
npm run seed

# Start development server
npm run dev
```

## Step 8: Login & Explore

1. Open: **http://localhost:3000**
2. Login with:
   - **Email:** admin@restaurant.com
   - **Password:** admin123

## 🎉 You're Done!

You should now see:

- ✅ Beautiful dashboard with metrics
- ✅ Menu items and categories
- ✅ Tables with QR codes
- ✅ All features working

---

## 🛠️ Useful MongoDB Tools

### MongoDB Compass (Recommended)

**Free GUI for MongoDB** - makes it easy to view and manage data!

1. **Download:** [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
2. **Install** and open
3. **Connect:**
   - **For Atlas:** Paste your connection string
   - **For Local:** `mongodb://localhost:27017`
4. **Browse your data:**
   - Select `restaurant_pos` database
   - View collections (users, menuItems, orders, etc.)
   - Query and edit data visually

### VS Code Extension

**MongoDB for VS Code** - manage MongoDB from your editor!

1. Install extension: "MongoDB for VS Code"
2. Click MongoDB icon in sidebar
3. Add connection
4. Browse and query directly in VS Code

---

## 📊 Understanding Your Database

### Collections Created:

After seeding, you'll have these collections:

- **users** - System users (admin, manager, etc.)
- **outlets** - Restaurant locations
- **categories** - Menu categories
- **menuitems** - Food items
- **tables** - Restaurant tables
- **orders** - Customer orders
- **inventories** - Stock levels
- **rawmaterials** - Ingredients
- **centralkitchens** - Central kitchen info
- **supplyorders** - Supply requests

### Sample Queries:

```javascript
// In MongoDB Compass or mongosh:

// View all users
db.users.find();

// View menu items
db.menuitems.find({ isVeg: true });

// View today's orders
db.orders.find({
  createdAt: { $gte: new Date("2025-10-01") },
});

// Count tables
db.tables.countDocuments();
```

---

## 🔍 Troubleshooting Common Issues

### 1. "MONGODB_URI not defined"

**Fix:** Make sure `.env` file exists with MONGODB_URI

### 2. "Authentication failed"

**Fix (Atlas):**

- Double-check username and password in connection string
- Make sure no special characters need encoding
- Regenerate password if needed

### 3. "Connection timeout"

**Fix (Atlas):**

- Check internet connection
- Verify IP whitelist (0.0.0.0/0)
- Check firewall settings

**Fix (Local):**

- Make sure MongoDB service is running
- Try: `net start MongoDB` (Windows)

### 4. "Cannot find module 'mongoose'"

**Fix:**

```bash
npm install
```

---

## 💻 MongoDB Atlas - Detailed Steps with Screenshots

### Creating Your First Cluster

1. **After login**, you'll see "Deploy a cloud database"
2. **Click "Build a Database"**
3. You'll see three options:

   - **Serverless** - Pay per use
   - **Dedicated** - Starting at $0.08/hr
   - **Shared** - **FREE** ⬅️ Choose this!

4. **M0 FREE Configuration:**

   - Cloud Provider: AWS (recommended)
   - Region: Select nearest (e.g., Mumbai for India)
   - Cluster Tier: M0 Sandbox (FREE)
   - Click "Create"

5. **Security Setup (automatic popup):**

   - **Username:** restaurant_admin
   - **Password:** Auto-generate ✅ → **COPY PASSWORD!**
   - **IP Access:** Add "0.0.0.0/0" → Confirm

6. **Wait 1-3 minutes** for cluster deployment

7. **Get Connection String:**
   - Click "Connect"
   - "Connect your application"
   - Copy string
   - Replace `<password>` with your copied password
   - Add `/restaurant_pos` before the `?`

### Example Connection String:

**Before:**

```
mongodb+srv://restaurant_admin:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

**After (with password and database):**

```
mongodb+srv://restaurant_admin:MyP@ssw0rd123@cluster0.abc123.mongodb.net/restaurant_pos?retryWrites=true&w=majority
```

---

## 🚀 Quick Commands Reference

```bash
# Install everything
npm install

# Seed database (run once)
npm run seed

# Start development
npm run dev

# Check for errors
npm run lint

# Type check
npx tsc --noEmit
```

---

## 📱 Access Your Cloud Database

### Using MongoDB Compass:

1. Open MongoDB Compass
2. Paste your full connection string
3. Click "Connect"
4. See all your data!

### Using MongoDB Atlas Dashboard:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Login
3. Click "Browse Collections"
4. View all your data in the browser

---

## 🎓 Learning Resources

- [MongoDB University](https://university.mongodb.com/) - Free courses
- [Mongoose Docs](https://mongoosejs.com/docs/) - Official guide
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/) - Cloud platform docs

---

## ✨ That's It!

You're now running a professional Restaurant POS system with MongoDB!

**No complex SQL, no migrations, just pure JavaScript objects! 🎉**

For any issues, refer to the troubleshooting section above or check the main README.md file.

---

**Pro Tip:** Bookmark your MongoDB Atlas dashboard - you'll use it to monitor your database in production!
