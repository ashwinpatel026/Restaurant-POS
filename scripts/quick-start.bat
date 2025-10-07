@echo off
REM Restaurant POS Quick Start Script for Windows
REM This script will set up the entire project automatically

echo.
echo ============================================
echo   Restaurant POS System - Quick Start
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

REM Check if .env exists
if not exist .env (
    echo Setting up environment variables...
    if exist .env.example (
        copy .env.example .env
        echo [WARNING] .env file created from .env.example
        echo [WARNING] Please edit .env with your database credentials
        echo.
        echo Press any key after updating .env file...
        pause >nul
    ) else (
        echo [ERROR] .env.example not found
        pause
        exit /b 1
    )
) else (
    echo [OK] .env file exists
)
echo.

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate Prisma Client
    pause
    exit /b 1
)
echo [OK] Prisma Client generated
echo.

REM Run migrations
echo Running database migrations...
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to run migrations. Check your database connection.
    pause
    exit /b 1
)
echo [OK] Database migrated
echo.

REM Seed database
echo Seeding database with sample data...
call npx prisma db seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to seed database
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
echo To start the development server, run:
echo    npm run dev
echo.
echo Then open: http://localhost:3000
echo.
echo Login credentials:
echo    Email: admin@restaurant.com
echo    Password: admin123
echo.
echo Check README.md for more information
echo Check SETUP_GUIDE.md for detailed setup instructions
echo Check FEATURES.md for complete feature list
echo.
pause

