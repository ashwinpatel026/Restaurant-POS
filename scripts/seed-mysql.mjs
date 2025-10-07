import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

const prisma = new PrismaClient()

async function seed() {
  try {
    console.log('🌱 Starting MySQL seed...\n')

    // Clear existing data (in reverse order of dependencies)
    await prisma.orderItem.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.inventory.deleteMany({})
    await prisma.table.deleteMany({})
    await prisma.menuItem.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.menuMaster.deleteMany({})
    await prisma.modifierItem.deleteMany({})
    await prisma.modifier.deleteMany({})
    await prisma.rawMaterial.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.outlet.deleteMany({})
    await prisma.centralKitchen.deleteMany({})
    
    console.log('🗑️  Cleared existing data\n')

    // Create Central Kitchen
    const centralKitchen = await prisma.centralKitchen.create({
      data: {
        name: 'Main Central Kitchen',
        address: '456 Supply Street, Industrial Area',
        phone: '+91-1111111111',
        email: 'kitchen@restaurant.com',
      }
    })
    console.log('✓ Central Kitchen created')

    // Create Outlets
    const outlet1 = await prisma.outlet.create({
      data: {
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
      }
    })

    const outlet2 = await prisma.outlet.create({
      data: {
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
      }
    })
    console.log('✓ Outlets created')

    // Create Users
    const hashedPassword = await bcrypt.hash('admin123', 10)

    await prisma.user.createMany({
      data: [
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
          outletId: outlet1.id,
        },
        {
          email: 'captain@restaurant.com',
          username: 'captain',
          password: hashedPassword,
          firstName: 'Sarah',
          lastName: 'Captain',
          role: 'CAPTAIN',
          phone: '+91-7777777777',
          outletId: outlet1.id,
        },
      ]
    })
    console.log('✓ Users created')

    // Create Categories
    const appetizers = await prisma.category.create({
      data: {
        name: 'Appetizers',
        description: 'Start your meal with our delicious appetizers',
        sortOrder: 1,
      }
    })

    const mainCourse = await prisma.category.create({
      data: {
        name: 'Main Course',
        description: 'Our signature main dishes',
        sortOrder: 2,
      }
    })

    const desserts = await prisma.category.create({
      data: {
        name: 'Desserts',
        description: 'Sweet endings to your meal',
        sortOrder: 3,
      }
    })

    const beverages = await prisma.category.create({
      data: {
        name: 'Beverages',
        description: 'Refreshing drinks and beverages',
        sortOrder: 4,
      }
    })

    const flatbreads = await prisma.category.create({
      data: { name: 'Flatbreads', sortOrder: 5 }
    })

    const sandwiches = await prisma.category.create({
      data: { name: 'Sandwiches, Subs & Wraps', sortOrder: 6 }
    })

    const beerBottled = await prisma.category.create({
      data: { name: 'Beer Bottled', sortOrder: 7 }
    })
    console.log('✓ Categories created')

    // Create Modifiers
    const courses = await prisma.modifier.create({
      data: {
        name: 'Courses',
        type: 'SINGLE',
        minSelect: 1,
        maxSelect: 1,
        items: {
          create: [
            { name: 'As App', isDefault: true },
            { name: 'As Entree' },
            { name: 'Fire' },
            { name: 'ToGo' },
          ]
        }
      }
    })

    const toppings = await prisma.modifier.create({
      data: {
        name: 'Toppings',
        type: 'MULTIPLE',
        minSelect: 0,
        maxSelect: 5,
        items: {
          create: [
            { name: 'Chips' },
            { name: 'Fries' },
            { name: 'Onion Rings' },
            { name: 'Sweet Potato Fries' },
            { name: 'House Salad Side' },
          ]
        }
      }
    })

    // Create Menu Items
    await prisma.menuItem.createMany({
      data: [
        // Appetizers
        {
          name: 'Paneer Tikka',
          description: 'Grilled cottage cheese with spices',
          categoryId: appetizers.id,
          price: 280,
          cost: 120,
          isVeg: true,
          preparationTime: 15,
          tags: ['popular', 'spicy'],
        },
        {
          name: 'Chicken Wings',
          description: 'Crispy fried chicken wings',
          categoryId: appetizers.id,
          price: 320,
          cost: 150,
          isVeg: false,
          preparationTime: 20,
          tags: ['popular'],
        },
        {
          name: 'Spring Rolls',
          description: 'Vegetable spring rolls with dipping sauce',
          categoryId: appetizers.id,
          price: 200,
          cost: 80,
          isVeg: true,
          preparationTime: 12,
        },
        // Main Course
        {
          name: 'Butter Chicken',
          description: 'Creamy tomato-based curry with tender chicken',
          categoryId: mainCourse.id,
          price: 380,
          cost: 180,
          isVeg: false,
          preparationTime: 25,
          tags: ['popular', 'chef-special'],
        },
        {
          name: 'Dal Makhani',
          description: 'Creamy black lentils cooked overnight',
          categoryId: mainCourse.id,
          price: 260,
          cost: 100,
          isVeg: true,
          preparationTime: 20,
          tags: ['popular'],
        },
        {
          name: 'Biryani',
          description: 'Fragrant basmati rice with spices and meat',
          categoryId: mainCourse.id,
          price: 420,
          cost: 200,
          isVeg: false,
          preparationTime: 30,
          tags: ['popular', 'spicy'],
        },
        {
          name: 'Veg Biryani',
          description: 'Fragrant basmati rice with vegetables',
          categoryId: mainCourse.id,
          price: 320,
          cost: 140,
          isVeg: true,
          preparationTime: 25,
        },
        // Desserts
        {
          name: 'Gulab Jamun',
          description: 'Sweet milk dumplings in sugar syrup',
          categoryId: desserts.id,
          price: 120,
          cost: 40,
          isVeg: true,
          preparationTime: 5,
          tags: ['popular'],
        },
        {
          name: 'Ice Cream',
          description: 'Choice of vanilla, chocolate, or strawberry',
          categoryId: desserts.id,
          price: 100,
          cost: 35,
          isVeg: true,
          preparationTime: 3,
        },
        {
          name: 'Chocolate Brownie',
          description: 'Warm chocolate brownie with vanilla ice cream',
          categoryId: desserts.id,
          price: 180,
          cost: 70,
          isVeg: true,
          preparationTime: 8,
        },
        // Beverages
        {
          name: 'Fresh Lime Soda',
          description: 'Refreshing lime soda',
          categoryId: beverages.id,
          price: 80,
          cost: 20,
          isVeg: true,
          preparationTime: 5,
        },
        {
          name: 'Mango Lassi',
          description: 'Sweet mango yogurt drink',
          categoryId: beverages.id,
          price: 120,
          cost: 40,
          isVeg: true,
          preparationTime: 5,
          tags: ['popular'],
        },
        {
          name: 'Coffee',
          description: 'Hot coffee',
          categoryId: beverages.id,
          price: 90,
          cost: 25,
          isVeg: true,
          preparationTime: 5,
        },
        // Flatbreads
        {
          name: 'Chicken Flatbread',
          description: 'Grilled chicken with cheese and herbs on flatbread',
          categoryId: flatbreads.id,
          price: 320,
          isVeg: false,
          preparationTime: 15,
        },
        // Sandwiches
        {
          name: 'Angus Burger',
          description: 'Juicy Angus beef burger with your choice of sides',
          categoryId: sandwiches.id,
          price: 450,
          isVeg: false,
          preparationTime: 18,
        },
        // Beer
        {
          name: 'Bud Lime',
          description: 'Refreshing lime-flavored beer',
          categoryId: beerBottled.id,
          price: 250,
          isVeg: true,
          preparationTime: 0,
        },
        {
          name: 'Bud Platinum',
          description: 'Smooth platinum lager',
          categoryId: beerBottled.id,
          price: 280,
          isVeg: true,
          preparationTime: 0,
        },
      ]
    })
    console.log('✓ Menu items created (17 items)')

    // Create Raw Materials
    const rawMaterials = await prisma.rawMaterial.createMany({
      data: [
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
      ]
    })
    console.log('✓ Raw materials created')

    // Get created raw materials for inventory
    const createdRawMaterials = await prisma.rawMaterial.findMany()

    // Create Inventory for both outlets
    for (const outlet of [outlet1, outlet2]) {
      await prisma.inventory.createMany({
        data: createdRawMaterials.map((rm) => ({
          outletId: outlet.id,
          rawMaterialId: rm.id,
          quantity: rm.reorderLevel * (outlet.id === outlet1.id ? 3 : 2),
          status: 'IN_STOCK',
          lastRestocked: new Date(),
        }))
      })
    }
    console.log('✓ Inventory created')

    // Create Tables for both outlets
    const capacities1 = [2, 4, 4, 6, 2, 4, 6, 8, 4, 6]
    await prisma.table.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        outletId: outlet1.id,
        tableNumber: String(i + 1),
        capacity: capacities1[i],
        qrCode: `table-${outlet1.code}-${i + 1}-${Date.now()}-${i}`,
        location: i < 5 ? 'Indoor' : 'Outdoor',
        status: 'AVAILABLE',
      }))
    })

    const capacities2 = [2, 4, 4, 6, 2, 4, 6, 4]
    await prisma.table.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        outletId: outlet2.id,
        tableNumber: String(i + 1),
        capacity: capacities2[i],
        qrCode: `table-${outlet2.code}-${i + 1}-${Date.now()}-${i}`,
        location: 'Indoor',
        status: 'AVAILABLE',
      }))
    })
    console.log('✓ Tables created (18 tables)')

    console.log('\n✅ MySQL seed completed successfully! 🎉\n')
    console.log('📊 Summary:')
    console.log('   • 1 Central Kitchen')
    console.log('   • 2 Outlets')
    console.log('   • 3 Users')
    console.log('   • 7 Categories')
    console.log('   • 17 Menu Items')
    console.log('   • 10 Raw Materials')
    console.log('   • 20 Inventory Items')
    console.log('   • 18 Tables with QR codes\n')
    console.log('📧 Login credentials:')
    console.log('   Email: admin@restaurant.com')
    console.log('   Password: admin123\n')

  } catch (error) {
    console.error('❌ Error seeding MySQL database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()
  .then(() => {
    console.log('🎉 Seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error)
    process.exit(1)
  })
