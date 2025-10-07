# 🚀 Quick Start Guide - Restaurant POS with MongoDB

## For Complete Beginners - 10 Minute Setup!

### Prerequisites

✅ **Node.js installed** - [Download here](https://nodejs.org/) (choose LTS version)
✅ **That's it!** No need to install MongoDB locally.

---

## Setup Steps

### 1️⃣ Open Terminal/Command Prompt

**Windows:**

- Press `Win + R`
- Type `cmd` and press Enter

**Mac:**

- Press `Cmd + Space`
- Type `Terminal` and press Enter

### 2️⃣ Navigate to Project

```bash
cd C:\xampp\htdocs\restaurants_pos
```

### 3️⃣ Create Free MongoDB Database (2 minutes)

**Go to:** https://www.mongodb.com/cloud/atlas/register

1. **Sign up** (use Google to make it faster)
2. **Answer the survey** (just click Next, Next, Next)
3. **Create FREE cluster:**
   - Click "**Build a Database**"
   - Choose "**M0 FREE**" (the free option)
   - Click "**Create**"
4. **Create user:**
   - Username: `admin`
   - Click "**Autogenerate Secure Password**"
   - **COPY THE PASSWORD!** ✍️ (you'll need it)
   - Click "**Create User**"
5. **Allow access:**
   - Click "**Add My Current IP Address**"
   - OR click "**Allow Access from Anywhere**"
   - Click "**Finish and Close**"
6. **Get connection string:**
   - Click "**Connect**"
   - Click "**Connect your application**"
   - **COPY the connection string** 📋

### 4️⃣ Create `.env` File

In your project folder, create a file named `.env` and add:

```env
MONGODB_URI="your-connection-string-here"
NEXTAUTH_SECRET="any-random-long-string-here"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="another-random-string"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

**Important:**

- Replace `your-connection-string-here` with what you copied
- In the connection string, replace `<password>` with the password you copied
- Add `/restaurant_pos` before the `?` in the connection string

**Example:**

```env
MONGODB_URI="mongodb+srv://admin:MyP@ss123@cluster0.xxxxx.mongodb.net/restaurant_pos?retryWrites=true&w=majority"
NEXTAUTH_SECRET="asdf1234qwer5678zxcv9012"
NEXTAUTH_URL="http://localhost:3000"
JWT_SECRET="hjkl3456bnm7890"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### 5️⃣ Run These Commands

```bash
# Install everything
npm install

# Create sample data
npm run seed

# Start the app
npm run dev
```

### 6️⃣ Open in Browser

Go to: **http://localhost:3000**

Login with:

- **Email:** `admin@restaurant.com`
- **Password:** `admin123`

## 🎉 Done!

You should see the dashboard with:

- Today's orders
- Sales stats
- Menu items
- Tables

---

## 🎯 What's Next?

### Try These Features:

1. **Menu Management**

   - Click "Menu Management" in sidebar
   - Add a category
   - Add menu items

2. **Create an Order**

   - Click "Orders" → "New Order"
   - Select items
   - Create order

3. **Table QR Codes**

   - Click "Tables"
   - Click QR icon on any table
   - Download or print QR code
   - Scan with your phone!

4. **View Reports**
   - Click "Reports"
   - See sales analytics
   - Try different date ranges

---

## ❓ Troubleshooting

### "Cannot connect to MongoDB"

**If using Atlas:**

1. Check internet connection
2. Make sure connection string is correct in `.env`
3. Verify IP is whitelisted in Atlas
4. Check password has no `<` `>` brackets

**If using Local:**

1. Make sure MongoDB is installed
2. Check if MongoDB service is running:
   ```bash
   net start MongoDB
   ```

### "Port 3000 already in use"

```bash
# Stop the process or use different port:
npm run dev -- -p 3001
```

### "npm run seed fails"

1. Check `.env` file exists
2. Verify MONGODB_URI is correct
3. Test connection in MongoDB Compass

---

## 💡 Pro Tips

### View Your Data:

**MongoDB Compass** (easiest):

- Download from [mongodb.com/compass](https://www.mongodb.com/products/compass)
- Connect using your connection string
- Browse all your data visually

**MongoDB Atlas Dashboard:**

- Login to [cloud.mongodb.com](https://cloud.mongodb.com)
- Click "Browse Collections"
- View data in browser

### Reset Everything:

```bash
# Re-run seed to reset database
npm run seed
```

### Generate New Secrets:

```bash
# Windows PowerShell
-join((48..57)+(65..90)+(97..122)|Get-Random -Count 32|%{[char]$_})
```

---

## 🆘 Still Having Issues?

1. Read `MONGODB_SETUP.md` for detailed guide
2. Check `SETUP_GUIDE.md` for step-by-step instructions
3. Read `README.md` for complete documentation

---

## ✨ Enjoy Your POS System!

You now have a full-featured restaurant management system running on MongoDB!

**No SQL knowledge required** - MongoDB works with simple JavaScript objects! 🎊
