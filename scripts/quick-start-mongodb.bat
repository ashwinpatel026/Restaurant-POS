@echo off
REM Restaurant POS Quick Start with MongoDB
REM This script will guide you through MongoDB setup

echo.
echo ============================================
echo   Restaurant POS - MongoDB Quick Setup
echo ============================================
echo.

REM Check if Node.js is installed
echo Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

node --version
echo [OK] Node.js found
echo.

REM Check if .env exists
if not exist .env (
    echo.
    echo ============================================
    echo   MongoDB Setup Instructions
    echo ============================================
    echo.
    echo You need to set up MongoDB first!
    echo.
    echo Choose ONE option:
    echo.
    echo Option 1: MongoDB Atlas (Cloud - Recommended)
    echo   1. Go to: https://www.mongodb.com/cloud/atlas/register
    echo   2. Create free account
    echo   3. Create M0 FREE cluster
    echo   4. Get connection string
    echo   5. Come back here
    echo.
    echo Option 2: Local MongoDB
    echo   1. Download from: https://www.mongodb.com/try/download/community
    echo   2. Install MongoDB
    echo   3. Start MongoDB service
    echo   4. Come back here
    echo.
    echo After setup, press any key to continue...
    pause >nul
    echo.
    echo Now, let's create your .env file...
    echo.
    
    REM Create .env file
    (
        echo # MongoDB Connection
        echo # Replace with your MongoDB connection string:
        echo MONGODB_URI="mongodb://localhost:27017/restaurant_pos"
        echo # Or for Atlas: mongodb+srv://username:password@cluster.mongodb.net/restaurant_pos
        echo.
        echo # NextAuth
        echo NEXTAUTH_SECRET="your-secret-key-here-change-this"
        echo NEXTAUTH_URL="http://localhost:3000"
        echo.
        echo # JWT
        echo JWT_SECRET="your-jwt-secret-key-change-this"
        echo.
        echo # API
        echo NEXT_PUBLIC_API_URL="http://localhost:3000/api"
    ) > .env
    
    echo [OK] .env file created
    echo.
    echo [IMPORTANT] Please edit .env file with your MongoDB connection string!
    echo.
    echo Open .env in a text editor and:
    echo   1. Update MONGODB_URI with your connection string
    echo   2. Change NEXTAUTH_SECRET to a random string
    echo   3. Change JWT_SECRET to another random string
    echo.
    echo Press any key after updating .env...
    pause >nul
) else (
    echo [OK] .env file exists
)
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Seed database
echo Seeding database with sample data...
call npm run seed
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to seed database
    echo.
    echo Common issues:
    echo   - MongoDB is not running (if local)
    echo   - Wrong connection string in .env
    echo   - Network/firewall blocking Atlas connection
    echo.
    echo Please check your MongoDB connection and try again.
    pause
    exit /b 1
)
echo [OK] Database seeded
echo.

REM Success message
echo ============================================
echo   Setup completed successfully!
echo ============================================
echo.
echo To start the application:
echo    npm run dev
echo.
echo Then open: http://localhost:3000
echo.
echo Login with:
echo    Email: admin@restaurant.com
echo    Password: admin123
echo.
echo Check MONGODB_SETUP.md for detailed MongoDB guide
echo.
pause

