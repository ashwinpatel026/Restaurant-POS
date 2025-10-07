import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

const prisma = new PrismaClient()

async function seedMenuData() {
  try {
    console.log('🌱 Starting menu data seed...\n')

    // Clear existing menu data
    await prisma.menuItemModifier.deleteMany({})
    await prisma.modifierItem.deleteMany({})
    await prisma.modifier.deleteMany({})
    await prisma.menuItem.deleteMany({})
    await prisma.menuCategory.deleteMany({})
    await prisma.menuMaster.deleteMany({})
    await prisma.stationGroupList.deleteMany({})
    await prisma.stationGroup.deleteMany({})
    await prisma.availability.deleteMany({})
    
    console.log('🗑️  Cleared existing menu data\n')

    // Create Availability
    const availability = await prisma.availability.create({
      data: {
        avaiDays: '1,2,3,4,5,6,7', // All days
        avilTime: '09:00-23:00',
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })
    console.log('✓ Availability created')

    // Create Station Groups
    const kitchenGroup = await prisma.stationGroup.create({
      data: {
        groupName: 'Kitchen',
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })

    const barGroup = await prisma.stationGroup.create({
      data: {
        groupName: 'Bar',
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })
    console.log('✓ Station groups created')

    // Create Menu Master
    const mainMenuMaster = await prisma.menuMaster.create({
      data: {
        name: 'Main Menu',
        labelName: 'Main Menu',
        colorCode: '#3B82F6',
        taxId: 1, // Assuming tax ID 1 exists
        stationGroupId: kitchenGroup.stationGroupId,
        availabilityId: availability.availabilityId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })
    console.log('✓ Menu master created')

    // Create Menu Categories
    const appetizers = await prisma.menuCategory.create({
      data: {
        name: 'Appetizers',
        colorCode: '#F59E0B',
        tblMenuMasterId: mainMenuMaster.tblMenuMasterId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })

    const mainCourse = await prisma.menuCategory.create({
      data: {
        name: 'Main Course',
        colorCode: '#10B981',
        tblMenuMasterId: mainMenuMaster.tblMenuMasterId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })

    const beverages = await prisma.menuCategory.create({
      data: {
        name: 'Beverages',
        colorCode: '#8B5CF6',
        tblMenuMasterId: mainMenuMaster.tblMenuMasterId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })
    console.log('✓ Menu categories created')

    // Create Menu Items
    const paneerTikka = await prisma.menuItem.create({
      data: {
        name: 'Paneer Tikka',
        labelName: 'Paneer Tikka',
        colorCode: '#F59E0B',
        calories: '280',
        descrip: 'Grilled cottage cheese with spices',
        skuPlu: 1001,
        isAlcohol: 0,
        priceStrategy: 1, // Base Price
        price: 280.00,
        tblMenuCategoryId: appetizers.tblMenuCategoryId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })

    const butterChicken = await prisma.menuItem.create({
      data: {
        name: 'Butter Chicken',
        labelName: 'Butter Chicken',
        colorCode: '#10B981',
        calories: '450',
        descrip: 'Creamy tomato-based curry with tender chicken',
        skuPlu: 2001,
        isAlcohol: 0,
        priceStrategy: 1, // Base Price
        price: 380.00,
        tblMenuCategoryId: mainCourse.tblMenuCategoryId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })

    const mangoLassi = await prisma.menuItem.create({
      data: {
        name: 'Mango Lassi',
        labelName: 'Mango Lassi',
        colorCode: '#8B5CF6',
        calories: '150',
        descrip: 'Sweet mango yogurt drink',
        skuPlu: 3001,
        isAlcohol: 0,
        priceStrategy: 1, // Base Price
        price: 120.00,
        tblMenuCategoryId: beverages.tblMenuCategoryId,
        isActive: 1,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })
    console.log('✓ Menu items created')

    // Create Modifiers
    const spiceLevel = await prisma.modifier.create({
      data: {
        name: 'Spice Level',
        labelName: 'Spice Level',
        colorCode: '#EF4444',
        priceStrategy: 1, // No Charge
        price: 0.00,
        required: 1, // Required
        isMultiselect: 0, // Single select
        minSelection: 1,
        maxSelection: 1,
        tblMenuItemId: butterChicken.tblMenuItemId,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })

    const sizeModifier = await prisma.modifier.create({
      data: {
        name: 'Size',
        labelName: 'Size',
        colorCode: '#6B7280',
        priceStrategy: 2, // Individual Price
        price: 0.00,
        required: 0, // Optional
        isMultiselect: 0, // Single select
        minSelection: 0,
        maxSelection: 1,
        tblMenuItemId: mangoLassi.tblMenuItemId,
        createdBy: 1,
        storeCode: 'MAIN'
      }
    })
    console.log('✓ Modifiers created')

    // Create Modifier Items
    await prisma.modifierItem.createMany({
      data: [
        {
          name: 'Mild',
          labelName: 'Mild',
          price: 0.00,
          tblModifierId: spiceLevel.tblModifierId,
          storeCode: 'MAIN'
        },
        {
          name: 'Medium',
          labelName: 'Medium',
          price: 0.00,
          tblModifierId: spiceLevel.tblModifierId,
          storeCode: 'MAIN'
        },
        {
          name: 'Hot',
          labelName: 'Hot',
          price: 0.00,
          tblModifierId: spiceLevel.tblModifierId,
          storeCode: 'MAIN'
        },
        {
          name: 'Regular',
          labelName: 'Regular',
          price: 0.00,
          tblModifierId: sizeModifier.tblModifierId,
          storeCode: 'MAIN'
        },
        {
          name: 'Large',
          labelName: 'Large',
          price: 20.00,
          tblModifierId: sizeModifier.tblModifierId,
          storeCode: 'MAIN'
        }
      ]
    })
    console.log('✓ Modifier items created')

    console.log('\n✅ Menu data seed completed successfully! 🎉\n')
    console.log('📊 Summary:')
    console.log('   • 1 Availability record')
    console.log('   • 2 Station groups')
    console.log('   • 1 Menu master')
    console.log('   • 3 Menu categories')
    console.log('   • 3 Menu items')
    console.log('   • 2 Modifiers')
    console.log('   • 5 Modifier items\n')

  } catch (error) {
    console.error('❌ Error seeding menu data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedMenuData()
  .then(() => {
    console.log('🎉 Menu seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Menu seeding failed:', error)
    process.exit(1)
  })
