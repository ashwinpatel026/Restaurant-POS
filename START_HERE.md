# 🎯 START HERE - Complete Setup in 3 Steps!

## ✅ Step 1: Dependencies Installed!

You've already completed `npm install` successfully!

---

## 🗄️ Step 2: Set Up MongoDB (Choose One)

### ⭐ Option A: MongoDB Atlas (Recommended - FREE & EASY!)

**No installation! Works in the cloud!**

1. **Create free account:**

   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up with email or Google

2. **Create FREE cluster:**

   - Click "Build a Database"
   - Choose "M0 FREE" (512MB free forever!)
   - Select AWS and closest region
   - Click "Create"

3. **Create user & allow access:**

   - Username: `admin`
   - Click "Autogenerate Secure Password" → **COPY IT!**
   - IP: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Finish and Close"

4. **Get connection string:**

   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://admin:<password>@cluster0...`

5. **Update `.env` file in your project:**

   - Open the `.env` file (already created in your project)
   - Replace `MONGODB_URI` with your connection string
   - **Important:** Replace `<password>` with your actual password
   - Add `/restaurant_pos` before the `?`

   Example:

   ```env
   MONGODB_URI="mongodb+srv://admin:YourPassword123@cluster0.xxxxx.mongodb.net/restaurant_pos?retryWrites=true&w=majority"
   ```

6. **Also update the secrets in `.env`:**
   ```env
   NEXTAUTH_SECRET="any-random-32-character-string-like-asdf1234qwer5678"
   JWT_SECRET="another-random-string-zxcv9012hjkl3456"
   ```

**Done with Option A!** Skip Option B and go to Step 3 below.

---

### Option B: Local MongoDB

**Only if you want to run MongoDB on your computer:**

1. **Download** MongoDB from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. **Install** MongoDB (choose "Complete" installation)
3. **Start MongoDB:**

   ```bash
   net start MongoDB
   ```

4. **Update `.env` file:**
   - Keep it as: `MONGODB_URI="mongodb://localhost:27017/restaurant_pos"`
   - Update the secrets as shown in Option A step 6

---

## 🌱 Step 3: Seed Database & Run

```bash
# Create sample data
npm run seed

# Start the application
npm run dev
```

---

## 🎉 Step 4: Login!

1. **Open browser:** http://localhost:3000
2. **Login with:**
   - Email: `admin@restaurant.com`
   - Password: `admin123`

---

## ✅ You Should See:

- Dashboard with sales stats
- Menu items (Butter Chicken, Paneer Tikka, etc.)
- Tables with QR codes
- All features working!

---

## ❓ Troubleshooting

### "npm run seed" fails

**Most common reason:** MongoDB connection string is wrong

**Fix:**

1. Check `.env` file exists
2. Verify `MONGODB_URI` is correct:
   - For Atlas: Should start with `mongodb+srv://`
   - Password should have no `<` `>` brackets
   - Database name should be before the `?`: `/restaurant_pos?`
3. Test your connection:
   - Download MongoDB Compass: [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
   - Paste your connection string
   - If it connects, your string is correct!

### Port 3000 already in use

```bash
npm run dev -- -p 3001
```

---

## 📚 Need More Help?

- **QUICK_START.md** - Beginner-friendly guide
- **MONGODB_SETUP.md** - Detailed MongoDB Atlas setup
- **README.md** - Complete documentation

---

## 🎊 That's It!

Your Restaurant POS system is ready!

**Next:** Explore the features:

- Create orders
- Manage menu
- Generate QR codes for tables
- View reports

**Enjoy! 🚀**
