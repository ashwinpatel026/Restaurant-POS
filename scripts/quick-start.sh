#!/bin/bash

# Restaurant POS Quick Start Script
# This script will set up the entire project automatically

echo "🍽️  Restaurant POS System - Quick Start"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📦 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL command not found. Make sure PostgreSQL is installed and running.${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Setting up environment variables..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  .env file created from .env.example${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env with your database credentials before continuing${NC}"
        echo ""
        echo "Press Enter after updating .env file..."
        read
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate Prisma Client${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Prisma Client generated${NC}"

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to run migrations. Check your database connection.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database migrated${NC}"

# Seed database
echo ""
echo "🌱 Seeding database with sample data..."
npx prisma db seed

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to seed database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database seeded${NC}"

# Success message
echo ""
echo -e "${GREEN}======================================"
echo "✅ Setup completed successfully!"
echo "======================================${NC}"
echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "🌐 Then open: http://localhost:3000"
echo ""
echo "📧 Login credentials:"
echo "   Email: admin@restaurant.com"
echo "   Password: admin123"
echo ""
echo "📚 Check README.md for more information"
echo "📘 Check SETUP_GUIDE.md for detailed setup instructions"
echo "📗 Check FEATURES.md for complete feature list"
echo ""

