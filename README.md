# Restaurant POS System

A comprehensive Point of Sale (POS) system for restaurant chains built with Next.js 14, TypeScript, MongoDB, and Tailwind CSS. This system includes features for centralized management, multi-outlet operations, inventory tracking, QR-based ordering, and comprehensive reporting.

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

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Headless UI
- **Backend:** Next.js API Routes
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js
- **Real-time:** Polling (can be upgraded to WebSockets/Pusher)
- **QR Codes:** qrcode library
- **Charts:** Recharts
- **State Management:** Zustand
- **HTTP Client:** Axios, SWR

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn
- **MongoDB** (local or cloud via MongoDB Atlas)
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

### 3. Set up MongoDB

#### Option A: Local MongoDB

1. **Install MongoDB Community Server** from [mongodb.com/download-center/community](https://www.mongodb.com/try/download/community)
2. **Start MongoDB service**:
   - Windows: MongoDB usually runs as a service automatically
   - Mac/Linux: `mongod` or `brew services start mongodb-community`

#### Option B: MongoDB Atlas (Recommended - Free & Easy!)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free
3. Create a free cluster (M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string

### 4. Set up environment variables

Create a `.env` file in the root directory:

```env
# MongoDB Connection (choose one)

# Local MongoDB:
MONGODB_URI="mongodb://localhost:27017/restaurant_pos"

# OR MongoDB Atlas (cloud):
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/restaurant_pos?retryWrites=true&w=majority"

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

### 5. Seed the database

```bash
npm run seed
```

This creates sample data:

- ✓ 2 Outlets (Main Branch, Airport Branch)
- ✓ 3 Users (Admin, Manager, Captain)
- ✓ 4 Categories with 13 Menu Items
- ✓ 10 Raw Materials
- ✓ Inventory for both outlets
- ✓ 18 Tables with QR codes

### 6. Run the development server

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
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── login/            # Login page
│   │   ├── qr-order/         # QR ordering pages
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/           # Reusable components
│   │   ├── layouts/          # Layout components
│   │   ├── menu/             # Menu components
│   │   ├── orders/           # Order components
│   │   └── tables/           # Table components
│   ├── lib/                  # Utility libraries
│   │   ├── auth.ts           # Authentication config
│   │   ├── mongodb.ts        # MongoDB connection
│   │   └── utils.ts          # Helper functions
│   ├── models/               # Mongoose models
│   │   ├── User.ts
│   │   ├── Outlet.ts
│   │   ├── Category.ts
│   │   ├── MenuItem.ts
│   │   ├── Order.ts
│   │   ├── Table.ts
│   │   └── ...
│   └── types/                # TypeScript types
├── scripts/
│   └── seed.js               # Database seed script
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

### Authentication

- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Menu

- `GET /api/menu` - Get all menu items with categories
- `GET /api/menu/categories` - Get all categories
- `POST /api/menu/categories` - Create category
- `POST /api/menu/items` - Create menu item
- `PUT /api/menu/items/[id]` - Update menu item
- `PATCH /api/menu/items/[id]` - Partial update
- `DELETE /api/menu/items/[id]` - Delete menu item

### Orders

- `GET /api/orders` - Get all orders (with filters)
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get order details
- `PATCH /api/orders/[id]` - Update order status

### Tables

- `GET /api/tables` - Get all tables
- `POST /api/tables` - Create new table
- `PUT /api/tables/[id]` - Update table
- `PATCH /api/tables/[id]` - Update table status
- `DELETE /api/tables/[id]` - Delete table
- `GET /api/tables/qr/[qrCode]` - Get table by QR code

### Inventory

- `GET /api/inventory` - Get inventory levels

### Reports

- `GET /api/reports` - Get analytics data

### Users

- `GET /api/users` - Get all users
- `PATCH /api/users/[id]` - Update user

## 🔒 Security Features

- Secure password hashing with bcrypt
- JWT-based authentication
- Role-based access control (RBAC)
- Protected API routes
- Session management with NextAuth
- MongoDB injection prevention with Mongoose
- XSS protection

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables (including MONGODB_URI)
4. Deploy

### MongoDB Atlas for Production

1. Create production cluster in MongoDB Atlas
2. Get connection string
3. Add to Vercel environment variables
4. Whitelist Vercel IPs or allow from anywhere (0.0.0.0/0)

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

**Built with ❤️ using Next.js, TypeScript, and MongoDB**
