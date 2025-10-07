const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../src/models/User').default;
const Outlet = require('../src/models/Outlet').default;
const Category = require('../src/models/Category').default;
const MenuItem = require('../src/models/MenuItem').default;
const { RawMaterial, Inventory } = require('../src/models/Inventory');
const { CentralKitchen } = require('../src/models/SupplyOrder');
const Table = require('../src/models/Table').default;

async function seed() {
  try {
    console.log('🌱 Starting MongoDB seed...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_pos');
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Outlet.deleteMany({}),
      Category.deleteMany({}),
      MenuItem.deleteMany({}),
      RawMaterial.deleteMany({}),
      Inventory.deleteMany({}),
      CentralKitchen.deleteMany({}),
      Table.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data\n');

    // Create Central Kitchen
    const centralKitchen = await CentralKitchen.create({
      name: 'Main Central Kitchen',
      address: '456 Supply Street, Industrial Area',
      phone: '+91-1111111111',
      email: 'kitchen@restaurant.com',
    });
    console.log('✓ Central Kitchen created');

    // Create Outlets
    const outlet1 = await Outlet.create({
      name: 'Main Branch',
      code: 'MB001',
      address: '123 Restaurant Street, Downtown',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      phone: '+91-1234567890',
      email: 'main@restaurant.com',
      openingTime: '09:00',
      closingTime: '23:00',
    });

    const outlet2 = await Outlet.create({
      name: 'Airport Branch',
      code: 'AB002',
      address: '789 Airport Road, Terminal 2',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400099',
      phone: '+91-9876543210',
      email: 'airport@restaurant.com',
      openingTime: '06:00',
      closingTime: '01:00',
    });
    console.log('✓ Outlets created');

    // Create Users
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.create({
      email: 'admin@restaurant.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      phone: '+91-9999999999',
    });

    await User.create({
      email: 'manager@restaurant.com',
      username: 'manager',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Manager',
      role: 'OUTLET_MANAGER',
      phone: '+91-8888888888',
      outletId: outlet1._id,
    });

    await User.create({
      email: 'captain@restaurant.com',
      username: 'captain',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Captain',
      role: 'CAPTAIN',
      phone: '+91-7777777777',
      outletId: outlet1._id,
    });
    console.log('✓ Users created');

    // Create Categories
    const appetizers = await Category.create({
      name: 'Appetizers',
      description: 'Start your meal with our delicious appetizers',
      sortOrder: 1,
    });

    const mainCourse = await Category.create({
      name: 'Main Course',
      description: 'Our signature main dishes',
      sortOrder: 2,
    });

    const desserts = await Category.create({
      name: 'Desserts',
      description: 'Sweet endings to your meal',
      sortOrder: 3,
    });

    const beverages = await Category.create({
      name: 'Beverages',
      description: 'Refreshing drinks and beverages',
      sortOrder: 4,
    });
    console.log('✓ Categories created');

    // Create Menu Items
    await MenuItem.create([
      // Appetizers
      {
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese with spices',
        categoryId: appetizers._id,
        price: 280,
        cost: 120,
        isVeg: true,
        preparationTime: 15,
        tags: ['popular', 'spicy'],
      },
      {
        name: 'Chicken Wings',
        description: 'Crispy fried chicken wings',
        categoryId: appetizers._id,
        price: 320,
        cost: 150,
        isVeg: false,
        preparationTime: 20,
        tags: ['popular'],
      },
      {
        name: 'Spring Rolls',
        description: 'Vegetable spring rolls with dipping sauce',
        categoryId: appetizers._id,
        price: 200,
        cost: 80,
        isVeg: true,
        preparationTime: 12,
      },
      // Main Course
      {
        name: 'Butter Chicken',
        description: 'Creamy tomato-based curry with tender chicken',
        categoryId: mainCourse._id,
        price: 380,
        cost: 180,
        isVeg: false,
        preparationTime: 25,
        tags: ['popular', 'chef-special'],
      },
      {
        name: 'Dal Makhani',
        description: 'Creamy black lentils cooked overnight',
        categoryId: mainCourse._id,
        price: 260,
        cost: 100,
        isVeg: true,
        preparationTime: 20,
        tags: ['popular'],
      },
      {
        name: 'Biryani',
        description: 'Fragrant basmati rice with spices and meat',
        categoryId: mainCourse._id,
        price: 420,
        cost: 200,
        isVeg: false,
        preparationTime: 30,
        tags: ['popular', 'spicy'],
      },
      {
        name: 'Veg Biryani',
        description: 'Fragrant basmati rice with vegetables',
        categoryId: mainCourse._id,
        price: 320,
        cost: 140,
        isVeg: true,
        preparationTime: 25,
      },
      // Desserts
      {
        name: 'Gulab Jamun',
        description: 'Sweet milk dumplings in sugar syrup',
        categoryId: desserts._id,
        price: 120,
        cost: 40,
        isVeg: true,
        preparationTime: 5,
        tags: ['popular'],
      },
      {
        name: 'Ice Cream',
        description: 'Choice of vanilla, chocolate, or strawberry',
        categoryId: desserts._id,
        price: 100,
        cost: 35,
        isVeg: true,
        preparationTime: 3,
      },
      {
        name: 'Chocolate Brownie',
        description: 'Warm chocolate brownie with vanilla ice cream',
        categoryId: desserts._id,
        price: 180,
        cost: 70,
        isVeg: true,
        preparationTime: 8,
      },
      // Beverages
      {
        name: 'Fresh Lime Soda',
        description: 'Refreshing lime soda',
        categoryId: beverages._id,
        price: 80,
        cost: 20,
        isVeg: true,
        preparationTime: 5,
      },
      {
        name: 'Mango Lassi',
        description: 'Sweet mango yogurt drink',
        categoryId: beverages._id,
        price: 120,
        cost: 40,
        isVeg: true,
        preparationTime: 5,
        tags: ['popular'],
      },
      {
        name: 'Coffee',
        description: 'Hot coffee',
        categoryId: beverages._id,
        price: 90,
        cost: 25,
        isVeg: true,
        preparationTime: 5,
      },
    ]);
    console.log('✓ Menu items created');

    // Create Raw Materials
    const rawMaterials = await RawMaterial.create([
      { name: 'Chicken', unit: 'kg', reorderLevel: 20 },
      { name: 'Paneer', unit: 'kg', reorderLevel: 15 },
      { name: 'Tomatoes', unit: 'kg', reorderLevel: 25 },
      { name: 'Onions', unit: 'kg', reorderLevel: 30 },
      { name: 'Rice', unit: 'kg', reorderLevel: 50 },
      { name: 'Dal', unit: 'kg', reorderLevel: 20 },
      { name: 'Milk', unit: 'ltr', reorderLevel: 40 },
      { name: 'Spices Mix', unit: 'kg', reorderLevel: 10 },
      { name: 'Oil', unit: 'ltr', reorderLevel: 30 },
      { name: 'Flour', unit: 'kg', reorderLevel: 40 },
    ]);
    console.log('✓ Raw materials created');

    // Create Inventory for Outlet 1
    await Inventory.create(
      rawMaterials.map((rm) => ({
        outletId: outlet1._id,
        rawMaterialId: rm._id,
        quantity: rm.reorderLevel * 3,
        status: 'IN_STOCK',
        lastRestocked: new Date(),
      }))
    );

    // Create Inventory for Outlet 2
    await Inventory.create(
      rawMaterials.map((rm) => ({
        outletId: outlet2._id,
        rawMaterialId: rm._id,
        quantity: rm.reorderLevel * 2,
        status: 'IN_STOCK',
        lastRestocked: new Date(),
      }))
    );
    console.log('✓ Inventory created');

    // Create Tables for Outlet 1
    const capacities1 = [2, 4, 4, 6, 2, 4, 6, 8, 4, 6];
    await Table.create(
      Array.from({ length: 10 }, (_, i) => ({
        outletId: outlet1._id,
        tableNumber: String(i + 1),
        capacity: capacities1[i],
        qrCode: `table-${outlet1.code}-${i + 1}-${Date.now()}`,
        location: i < 5 ? 'Indoor' : 'Outdoor',
        status: 'AVAILABLE',
      }))
    );

    // Create Tables for Outlet 2
    const capacities2 = [2, 4, 4, 6, 2, 4, 6, 4];
    await Table.create(
      Array.from({ length: 8 }, (_, i) => ({
        outletId: outlet2._id,
        tableNumber: String(i + 1),
        capacity: capacities2[i],
        qrCode: `table-${outlet2.code}-${i + 1}-${Date.now()}`,
        location: 'Indoor',
        status: 'AVAILABLE',
      }))
    );
    console.log('✓ Tables created');

    console.log('\n✅ Seed completed successfully! 🎉\n');
    console.log('📧 Login credentials:');
    console.log('   Email: admin@restaurant.com');
    console.log('   Password: admin123\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();

