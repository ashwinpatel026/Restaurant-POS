import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Define schemas inline for seeding
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: String,
  role: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet' },
}, { timestamps: true });

const OutletSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  openingTime: { type: String, required: true },
  closingTime: { type: String, required: true },
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const MenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true },
  cost: Number,
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  preparationTime: { type: Number, default: 15 },
  tags: [String],
  modifiers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Modifier' }],
}, { timestamps: true });

const RawMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, required: true },
  reorderLevel: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const InventorySchema = new mongoose.Schema({
  outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  rawMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
  quantity: { type: Number, required: true },
  status: { type: String, default: 'IN_STOCK' },
  lastRestocked: Date,
}, { timestamps: true });

const CentralKitchenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const TableSchema = new mongoose.Schema({
  outletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', required: true },
  tableNumber: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: { type: String, default: 'AVAILABLE' },
  qrCode: { type: String, required: true, unique: true },
  location: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Modifiers inline schema for seed
const ModifierItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { _id: true });

const ModifierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['single', 'multiple'], default: 'multiple' },
  minSelect: { type: Number, default: 0 },
  maxSelect: { type: Number, default: 0 },
  items: [ModifierItemSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Create models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', OutletSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
const RawMaterial = mongoose.models.RawMaterial || mongoose.model('RawMaterial', RawMaterialSchema);
const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
const CentralKitchen = mongoose.models.CentralKitchen || mongoose.model('CentralKitchen', CentralKitchenSchema);
const Table = mongoose.models.Table || mongoose.model('Table', TableSchema);
const Modifier = mongoose.models.Modifier || mongoose.model('Modifier', ModifierSchema);

async function seed() {
  try {
    console.log('🌱 Starting MongoDB seed...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_pos';
    await mongoose.connect(mongoUri);
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

    await User.create([
      {
        email: 'admin@restaurant.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        phone: '+91-9999999999',
      },
      {
        email: 'manager@restaurant.com',
        username: 'manager',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        role: 'OUTLET_MANAGER',
        phone: '+91-8888888888',
        outletId: outlet1._id,
      },
      {
        email: 'captain@restaurant.com',
        username: 'captain',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Captain',
        role: 'CAPTAIN',
        phone: '+91-7777777777',
        outletId: outlet1._id,
      },
    ]);
    console.log('✓ Users created');

    // Create Masters/Categories for scenarios
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
    // Additional categories for examples
    const flatbreads = await Category.create({ name: 'Flatbreads', sortOrder: 5 });
    const sandwiches = await Category.create({ name: 'Sandwiches, Subs & Wraps', sortOrder: 6 });
    const beerBottled = await Category.create({ name: 'Beer Bottled', sortOrder: 7 });
    console.log('✓ Categories created');

    // Create Modifiers
    const courses = await Modifier.create({
      name: 'Courses',
      type: 'single',
      minSelect: 1,
      maxSelect: 1,
      items: [
        { name: 'As App', isDefault: true },
        { name: 'As Entree' },
        { name: 'Fire' },
        { name: 'ToGo' },
      ],
    });

    const toppings = await Modifier.create({
      name: 'Toppings',
      type: 'multiple',
      minSelect: 0,
      maxSelect: 5,
      items: [
        { name: 'Chips' },
        { name: 'Fries' },
        { name: 'Onion Rings' },
        { name: 'Sweet Potato Fries' },
        { name: 'House Salad Side' },
      ],
    });

    // Create Menu Items
    await MenuItem.create([
      // Example scenario 1: Food - Flatbreads - Chicken Flatbread - Courses
      {
        name: 'Chicken Flatbread',
        description: 'Grilled chicken with cheese and herbs on flatbread',
        categoryId: flatbreads._id,
        price: 320,
        isVeg: false,
        preparationTime: 15,
        modifiers: [courses._id],
      },
      // Example scenario 2: Food - Sandwiches - Angus Burger - Toppings, Courses
      {
        name: 'Angus Burger',
        description: 'Juicy Angus beef burger with your choice of sides',
        categoryId: sandwiches._id,
        price: 450,
        isVeg: false,
        preparationTime: 18,
        modifiers: [toppings._id, courses._id],
      },
      // Alcohol example: Beer categories
      {
        name: 'Bud Lime',
        description: 'Refreshing lime-flavored beer',
        categoryId: beerBottled._id,
        price: 250,
        isVeg: true,
        preparationTime: 0,
      },
      {
        name: 'Bud Platinum',
        description: 'Smooth platinum lager',
        categoryId: beerBottled._id,
        price: 280,
        isVeg: true,
        preparationTime: 0,
      },
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
    console.log('✓ Menu items created (13 items)');

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
        qrCode: `table-${outlet1.code}-${i + 1}-${Date.now()}-${i}`,
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
        qrCode: `table-${outlet2.code}-${i + 1}-${Date.now()}-${i}`,
        location: 'Indoor',
        status: 'AVAILABLE',
      }))
    );
    console.log('✓ Tables created (18 tables)');

    console.log('\n✅ Seed completed successfully! 🎉\n');
    console.log('📊 Summary:');
    console.log('   • 2 Outlets');
    console.log('   • 3 Users');
    console.log('   • 4 Categories');
    console.log('   • 13 Menu Items');
    console.log('   • 10 Raw Materials');
    console.log('   • 20 Inventory Items');
    console.log('   • 18 Tables with QR codes\n');
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

