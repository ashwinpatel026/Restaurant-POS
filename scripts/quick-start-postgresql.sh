#!/bin/bash

echo "================================"
echo "PostgreSQL Quick Start Setup"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please update the DATABASE_URL in .env file with your PostgreSQL credentials!"
    echo "   Example: postgresql://postgres:your_password@localhost:5432/restaurant_pos?schema=public"
    echo ""
    read -p "Press enter to continue after updating .env file..."
else
    echo ".env file already exists."
fi

echo ""
echo "Installing dependencies..."
npm install --legacy-peer-deps

echo ""
echo "Generating Prisma Client for PostgreSQL..."
npx prisma generate

echo ""
echo "Pushing schema to PostgreSQL database..."
echo "(This will create all tables in your PostgreSQL database)"
npx prisma db push

echo ""
echo "Seeding database with initial data..."
npm run seed:simple

echo ""
echo "Seeding menu data..."
npm run seed:menu

echo ""
echo "Seeding tax data..."
npm run seed:tax

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Default Admin Credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "To start the development server, run:"
echo "npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""

