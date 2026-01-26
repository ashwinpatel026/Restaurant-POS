# Restaurant POS System

A comprehensive Point of Sale (POS) system for restaurant chains built with Next.js 15, TypeScript, PostgreSQL, and Tailwind CSS. This system includes features for centralized management, multi-outlet operations, inventory tracking, QR-based ordering, and comprehensive reporting.

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

### Core Documentation
- [**Architecture**](./docs/ARCHITECTURE.md) - System architecture, technology stack, and design decisions
- [**Database Schema**](./docs/DATABASE_SCHEMA.md) - Complete database documentation with ERD diagrams
- [**API Reference**](./docs/API_REFERENCE.md) - Complete API endpoint documentation
- [**Diagram Viewing Guide**](./docs/DIAGRAM_VIEWING_GUIDE.md) - How to view Mermaid diagrams in documentation

### System Documentation
- [**Event Pricing System**](./docs/EVENT_PRICING_SYSTEM.md) - Time-based event pricing system
- [**Functions Reference**](./docs/FUNCTIONS_REFERENCE.md) - Database functions and stored procedures
- [**Sync System**](./docs/SYNC_SYSTEM_SUMMARY.md) - Data synchronization system

### Additional Documentation
- [**Multi-Tenant Architecture**](./docs/SIMPLIFIED_TWO_DATABASE_ARCHITECTURE.md) - Multi-tenant design
- [**POS API Routes**](./docs/POS_API_ROUTES.md) - POS sync API documentation
- [**Migration Instructions**](./docs/MIGRATION_INSTRUCTIONS.md) - Database migration guide

## 🚀 Features

### 1. **Centralized Menu Management**

- Standardized menu items and pricing across all outlets
- Category-based menu organization
- Easy-to-use interface for menu updates
- Real-time menu synchronization
- Support for vegetarian/non-vegetarian indicators
- Custom pricing and cost tracking

### 2. **Centralized Monitoring Dashboard**

- Real-time data from all outlets
- Sales and revenue tracking
- Active orders monitoring
- Inventory level alerts
- Multi-location operational status

### 3. **Central Kitchen Management**

- Supply order management from outlets to central kitchen
- Order tracking with status updates
- Delivery scheduling
- Inventory distribution management

### 4. **Comprehensive POS Reporting**

- Sales performance analytics
- Inventory usage reports
- User activity logs
- Top-selling items analysis
- Date range filtering
- Export capabilities

### 5. **Table Management System**

- Table status tracking (Available, Occupied, Reserved, Maintenance)
- QR code generation for each table
- Capacity management
- Location-based table organization
- Real-time table status updates

### 6. **Inventory Management**

- Real-time stock level monitoring
- Low stock alerts
- Reorder level tracking
- Multi-unit support (kg, ltr, pcs, etc.)
- Inventory status tracking

### 7. **QR Code-Based Ordering**

- Customer self-service ordering
- Mobile-optimized menu display
- Real-time order placement
- Table-specific QR codes
- Order tracking for customers

### 8. **Order Management**

- Multiple order types (Dine-in, Takeaway, Delivery, QR Orders)
- Real-time order status tracking
- Kitchen display integration
- Order history and analytics
- Payment processing

### 9. **User Management & Authentication**

- Role-based access control (Super Admin, Admin, Manager, Captain, Waiter, Cashier)
- Secure authentication with NextAuth
- User activity logging
- Multi-outlet user assignment

### 10. **Modern UI/UX**

- Responsive design for all devices
- Intuitive navigation
- Real-time updates
- Beautiful, modern interface with Tailwind CSS
- Toast notifications for user feedback

## 🛠️ Tech Stack

- **Frontend:** Next.js 15.5.7, React 18.3.1, TypeScript 5.5.3
- **Styling:** Tailwind CSS 3.4.4, Headless UI 2.2.9
- **Backend:** Next.js API Routes (App Router)
- **Database:** PostgreSQL with Prisma ORM 6.16.3
- **Authentication:** NextAuth.js 4.24.7 + JWT
- **Real-time:** Socket.io 4.7.5 (optional)
- **QR Codes:** qrcode 1.5.3
- **Forms:** Formik 2.4.9 + Yup 1.7.1
- **State Management:** Zustand 4.5.4
- **Notifications:** React Hot Toast 2.4.1

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn
- **PostgreSQL 12+** (local or managed database)
- **Git**

## 🔧 Installation

### 1. Navigate to the project

```bash
cd C:\xampp\htdocs\restaurants_pos
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL Databases

The system uses **two PostgreSQL databases**:

1. **Master Database**: For templates and tenant management
2. **Location Database**: For operational data (all stores)

#### Option A: Local PostgreSQL

1. **Install PostgreSQL** from [postgresql.org/download](https://www.postgresql.org/download/)
2. **Create databases**:
   ```sql
   CREATE DATABASE restaurant_pos_master;
   CREATE DATABASE restaurant_pos_location;
   ```

#### Option B: Managed PostgreSQL (Recommended)

Use services like:
- **Supabase** (Free tier available)
- **Neon** (Free tier available)
- **AWS RDS**
- **Google Cloud SQL**

### 4. Set up environment variables

Create a `.env` file in the root directory:

```env
# Master Database (PostgreSQL)
MASTER_DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_pos_master"

# Location Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_pos_location"

# NextAuth (generate random secrets)
NEXTAUTH_SECRET="your-super-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# JWT
JWT_SECRET="another-secret-key-for-jwt-tokens"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

**Generate secure secrets (run in terminal):**

```bash
# On Windows PowerShell:
-join((48..57)+(65..90)+(97..122)|Get-Random -Count 32|%{[char]$_})

# On Mac/Linux:
openssl rand -base64 32
```

### 5. Run database migrations

```bash
# Generate Prisma clients
npm run db:generate

# Push schema to databases
npm run db:push

# Or run migrations
npm run db:migrate
```

### 6. Seed the database (Optional)

```bash
npm run seed
```

This creates sample data in the databases.

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Default Login Credentials

After seeding the database:

- **Email:** admin@restaurant.com
- **Password:** admin123

## 📁 Project Structure

```
restaurants_pos/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── master/       # Master dashboard APIs
│   │   │   ├── dashboard/    # Location dashboard APIs
│   │   │   └── pos/          # POS sync APIs
│   │   ├── dashboard/        # Location dashboard pages
│   │   ├── master/           # Master dashboard pages
│   │   ├── qr-order/         # QR ordering pages (public)
│   │   └── ...
│   ├── components/           # Reusable components
│   │   ├── forms/            # Form components
│   │   ├── layouts/          # Layout components
│   │   ├── modals/           # Modal components
│   │   └── ui/               # UI components
│   ├── lib/                  # Utility libraries
│   │   ├── auth/             # Authentication
│   │   ├── sync/             # Sync system
│   │   ├── database.ts       # Location DB client
│   │   └── databaseManager.ts # Both DB clients
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Location database schema
│   └── master-schema.prisma  # Master database schema
├── scripts/                  # Database scripts
│   ├── *.sql                 # SQL functions/procedures
│   └── *.mjs                 # Migration scripts
├── docs/                     # Documentation
├── .env                      # Environment variables
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🎯 Quick Start

After installation:

1. **Login** at http://localhost:3000
2. **Use credentials:** admin@restaurant.com / admin123
3. **Explore features:**
   - Dashboard → Overview
   - Menu Management → Add items
   - Tables → Generate QR codes
   - Orders → Create orders
   - Reports → View analytics

## 📝 API Documentation

See [API Reference](./docs/API_REFERENCE.md) for complete API documentation.

### API Categories

1. **Master Dashboard APIs** (`/api/master/*`)
   - Tenant management (Companies, Dealers, Locations)
   - Master menu templates
   - Sync management
   - User and role management

2. **Location Dashboard APIs** (`/api/dashboard/*`)
   - Store-specific menu management
   - Orders and tables
   - Time events
   - Reports and statistics

3. **POS Sync APIs** (`/api/pos/sync/*`)
   - External POS client synchronization
   - Menu items, orders, tables
   - Incremental sync support

## 🔒 Security Features

- Secure password hashing with bcryptjs
- JWT-based authentication for master dashboard
- NextAuth.js session management for location dashboard
- Role-based access control (RBAC) with granular permissions
- Protected API routes with middleware
- SQL injection prevention with Prisma ORM
- XSS protection with React
- Store code filtering for data isolation

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `MASTER_DATABASE_URL`
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `JWT_SECRET`
4. Run build command: `npm run build`
5. Deploy

### PostgreSQL for Production

1. Set up managed PostgreSQL databases (Supabase, Neon, AWS RDS, etc.)
2. Get connection strings for both databases
3. Add to Vercel environment variables
4. Run migrations: `npm run db:migrate`
5. Create sync triggers: `npm run sync:triggers`

## 🧪 Development

```bash
# Run development server
npm run dev

# Seed database
npm run seed

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

## 📚 MongoDB Atlas Setup (Free Cloud Database)

1. **Sign up** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a cluster** (select M0 Free tier)
3. **Create database user:**
   - Database Access → Add New Database User
   - Username: `restaurant_admin`
   - Password: (generate strong password)
4. **Whitelist IP:**
   - Network Access → Add IP Address
   - For development: `0.0.0.0/0` (allow all)
   - For production: Add specific IPs
5. **Get connection string:**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your password
6. **Add to `.env`:**
   ```
   MONGODB_URI="mongodb+srv://restaurant_admin:yourpassword@cluster0.xxxxx.mongodb.net/restaurant_pos?retryWrites=true&w=majority"
   ```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Support

For support, open an issue in the repository.

## 🎉 Acknowledgments

- Next.js team for the amazing framework
- MongoDB and Mongoose for excellent database tools
- Tailwind CSS for the utility-first CSS framework
- All open-source contributors

---

**Built with ❤️ using Next.js, TypeScript, and PostgreSQL**

## 📖 Additional Resources

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Event Pricing System](./docs/EVENT_PRICING_SYSTEM.md)
- [Sync System](./docs/SYNC_SYSTEM_SUMMARY.md)
