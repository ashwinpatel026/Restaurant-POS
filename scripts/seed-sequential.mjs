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

// Helper function to generate unique codes
function generateCode(prefix, index) {
  return `${prefix}${String(index).padStart(3, '0')}`
}

async function seed() {
  try {
    console.log('🌱 Starting sequential seed (one by one insertion)...\n')

    // Step 1: Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...')
    await prisma.menuItemModifierGroup.deleteMany({})
    await prisma.menuItem.deleteMany({})
    await prisma.modifierItem.deleteMany({})
    await prisma.modifierGroup.deleteMany({})
    await prisma.menuCategory.deleteMany({})
    await prisma.menuMasterEvent.deleteMany({})
    await prisma.menuMaster.deleteMany({})
    await prisma.prepZone.deleteMany({})
    await prisma.printer.deleteMany({})
    await prisma.timeEvent.deleteMany({})
    await prisma.tax.deleteMany({})
    await prisma.user.deleteMany({})
    console.log('✓ Data cleared\n')

    // Step 2: Create Users (one by one)
    console.log('👥 Creating Users...')
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@restaurant.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        phone: '+91-9999999999',
      }
    })
    console.log(`  ✓ Created user: ${adminUser.username} (${adminUser.role})`)

    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@restaurant.com',
        username: 'manager',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        role: 'OUTLET_MANAGER',
        phone: '+91-8888888888',
      }
    })
    console.log(`  ✓ Created user: ${managerUser.username} (${managerUser.role})`)

    const captainUser = await prisma.user.create({
      data: {
        email: 'captain@restaurant.com',
        username: 'captain',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Captain',
        role: 'CAPTAIN',
        phone: '+91-7777777777',
      }
    })
    console.log(`  ✓ Created user: ${captainUser.username} (${captainUser.role})\n`)

    // Step 3: Create Tax (one by one)
    console.log('💰 Creating Tax...')
    const tax1 = await prisma.tax.create({
      data: {
        taxCode: 'TAX001',
        taxname: 'GST 5%',
        taxrate: 5.00,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created tax: ${tax1.taxname} (${tax1.taxCode})`)

    const tax2 = await prisma.tax.create({
      data: {
        taxCode: 'TAX002',
        taxname: 'GST 18%',
        taxrate: 18.00,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created tax: ${tax2.taxname} (${tax2.taxCode})\n`)

    // Step 4: Create Printers (one by one)
    console.log('🖨️  Creating Printers...')
    const printer1 = await prisma.printer.create({
      data: {
        printerCode: 'PRT001',
        printerName: 'Kitchen Printer 1',
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created printer: ${printer1.printerName} (${printer1.printerCode})`)

    const printer2 = await prisma.printer.create({
      data: {
        printerCode: 'PRT002',
        printerName: 'Bar Printer',
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created printer: ${printer2.printerName} (${printer2.printerCode})\n`)

    // Step 5: Create PrepZones (one by one, depends on printers)
    console.log('🍳 Creating Prep Zones...')
    const prepZone1 = await prisma.prepZone.create({
      data: {
        prepZoneCode: 'PZ001',
        prepZoneName: 'Main Kitchen',
        printerCode: printer1.printerCode,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created prep zone: ${prepZone1.prepZoneName} (${prepZone1.prepZoneCode})`)

    const prepZone2 = await prisma.prepZone.create({
      data: {
        prepZoneCode: 'PZ002',
        prepZoneName: 'Bar Station',
        printerCode: printer2.printerCode,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created prep zone: ${prepZone2.prepZoneName} (${prepZone2.prepZoneCode})\n`)

    // Step 6: Create MenuMasters (one by one, depends on prepZones)
    console.log('📋 Creating Menu Masters...')
    const menuMaster1 = await prisma.menuMaster.create({
      data: {
        menuMasterCode: 'MM001',
        name: 'Main Menu',
        labelName: 'Main Menu',
        colorCode: '#3B82F6',
        prepZoneCode: prepZone1.prepZoneCode,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created menu master: ${menuMaster1.name} (${menuMaster1.menuMasterCode})`)

    const menuMaster2 = await prisma.menuMaster.create({
      data: {
        menuMasterCode: 'MM002',
        name: 'Bar Menu',
        labelName: 'Bar Menu',
        colorCode: '#EF4444',
        prepZoneCode: prepZone2.prepZoneCode,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created menu master: ${menuMaster2.name} (${menuMaster2.menuMasterCode})\n`)

    // Step 7: Create MenuCategories (one by one, depends on menuMasters)
    console.log('📁 Creating Menu Categories...')
    const category1 = await prisma.menuCategory.create({
      data: {
        menuMasterCode: menuMaster1.menuMasterCode,
        menuCategoryCode: 'CAT001',
        name: 'Appetizers',
        colorCode: '#10B981',
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created category: ${category1.name} (${category1.menuCategoryCode})`)

    const category2 = await prisma.menuCategory.create({
      data: {
        menuMasterCode: menuMaster1.menuMasterCode,
        menuCategoryCode: 'CAT002',
        name: 'Main Course',
        colorCode: '#F59E0B',
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created category: ${category2.name} (${category2.menuCategoryCode})`)

    const category3 = await prisma.menuCategory.create({
      data: {
        menuMasterCode: menuMaster2.menuMasterCode,
        menuCategoryCode: 'CAT003',
        name: 'Beverages',
        colorCode: '#8B5CF6',
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created category: ${category3.name} (${category3.menuCategoryCode})\n`)

    // Step 8: Create ModifierGroups (one by one, depends on categories)
    console.log('🔧 Creating Modifier Groups...')
    const modifierGroup1 = await prisma.modifierGroup.create({
      data: {
        modifierGroupCode: 'MG001',
        groupName: 'Size Options',
        labelName: 'Size',
        menuCategoryCode: category2.menuCategoryCode,
        isRequired: 0,
        isMultiselect: 0,
        priceStrategy: 1,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier group: ${modifierGroup1.groupName} (${modifierGroup1.modifierGroupCode})`)

    const modifierGroup2 = await prisma.modifierGroup.create({
      data: {
        modifierGroupCode: 'MG002',
        groupName: 'Spice Level',
        labelName: 'Spice Level',
        menuCategoryCode: category2.menuCategoryCode,
        isRequired: 1,
        isMultiselect: 0,
        priceStrategy: 1,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier group: ${modifierGroup2.groupName} (${modifierGroup2.modifierGroupCode})`)

    const modifierGroup3 = await prisma.modifierGroup.create({
      data: {
        modifierGroupCode: 'MG003',
        groupName: 'Ice Type',
        labelName: 'Ice Type',
        menuCategoryCode: category3.menuCategoryCode,
        isRequired: 0,
        isMultiselect: 0,
        priceStrategy: 1,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier group: ${modifierGroup3.groupName} (${modifierGroup3.modifierGroupCode})\n`)

    // Step 9: Create ModifierItems (one by one, depends on modifierGroups)
    console.log('🔹 Creating Modifier Items...')
    const modifierItem1 = await prisma.modifierItem.create({
      data: {
        modifierItemCode: 'MI001',
        modifierGroupCode: modifierGroup1.modifierGroupCode,
        name: 'Small',
        labelName: 'Small',
        colorCode: '#3B82F6',
        price: 0.00,
        displayOrder: 1,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier item: ${modifierItem1.name} (${modifierItem1.modifierItemCode})`)

    const modifierItem2 = await prisma.modifierItem.create({
      data: {
        modifierItemCode: 'MI002',
        modifierGroupCode: modifierGroup1.modifierGroupCode,
        name: 'Medium',
        labelName: 'Medium',
        colorCode: '#10B981',
        price: 5.00,
        displayOrder: 2,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier item: ${modifierItem2.name} (${modifierItem2.modifierItemCode})`)

    const modifierItem3 = await prisma.modifierItem.create({
      data: {
        modifierItemCode: 'MI003',
        modifierGroupCode: modifierGroup1.modifierGroupCode,
        name: 'Large',
        labelName: 'Large',
        colorCode: '#F59E0B',
        price: 10.00,
        displayOrder: 3,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier item: ${modifierItem3.name} (${modifierItem3.modifierItemCode})`)

    const modifierItem4 = await prisma.modifierItem.create({
      data: {
        modifierItemCode: 'MI004',
        modifierGroupCode: modifierGroup2.modifierGroupCode,
        name: 'Mild',
        labelName: 'Mild',
        colorCode: '#10B981',
        price: 0.00,
        displayOrder: 1,
        isDefault: 1,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier item: ${modifierItem4.name} (${modifierItem4.modifierItemCode})`)

    const modifierItem5 = await prisma.modifierItem.create({
      data: {
        modifierItemCode: 'MI005',
        modifierGroupCode: modifierGroup2.modifierGroupCode,
        name: 'Medium',
        labelName: 'Medium Spicy',
        colorCode: '#F59E0B',
        price: 0.00,
        displayOrder: 2,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier item: ${modifierItem5.name} (${modifierItem5.modifierItemCode})`)

    const modifierItem6 = await prisma.modifierItem.create({
      data: {
        modifierItemCode: 'MI006',
        modifierGroupCode: modifierGroup2.modifierGroupCode,
        name: 'Hot',
        labelName: 'Hot',
        colorCode: '#EF4444',
        price: 0.00,
        displayOrder: 3,
        isActive: 1,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created modifier item: ${modifierItem6.name} (${modifierItem6.modifierItemCode})\n`)

    // Step 10: Create MenuItems (one by one, depends on categories)
    console.log('🍽️  Creating Menu Items...')
    const menuItem1 = await prisma.menuItem.create({
      data: {
        menuItemCode: 'MI001',
        menuCategoryCode: category1.menuCategoryCode,
        name: 'Spring Rolls',
        labelName: 'Spring Rolls',
        kitchenName: 'SR',
        colorCode: '#10B981',
        description: 'Crispy vegetable spring rolls with sweet and sour sauce',
        basePrice: 150.00,
        priceStrategy: 1,
        isActive: 1,
        taxCode: tax1.taxCode,
        inheritModifierGroup: true,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created menu item: ${menuItem1.name} (${menuItem1.menuItemCode})`)

    const menuItem2 = await prisma.menuItem.create({
      data: {
        menuItemCode: 'MI002',
        menuCategoryCode: category2.menuCategoryCode,
        name: 'Chicken Curry',
        labelName: 'Chicken Curry',
        kitchenName: 'CC',
        colorCode: '#F59E0B',
        description: 'Authentic Indian chicken curry with rice',
        basePrice: 250.00,
        priceStrategy: 1,
        isActive: 1,
        taxCode: tax2.taxCode,
        inheritModifierGroup: true,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created menu item: ${menuItem2.name} (${menuItem2.menuItemCode})`)

    const menuItem3 = await prisma.menuItem.create({
      data: {
        menuItemCode: 'MI003',
        menuCategoryCode: category3.menuCategoryCode,
        name: 'Fresh Lime Soda',
        labelName: 'Fresh Lime Soda',
        kitchenName: 'FLS',
        colorCode: '#3B82F6',
        description: 'Refreshing lime soda',
        basePrice: 80.00,
        priceStrategy: 1,
        isActive: 1,
        taxCode: tax1.taxCode,
        inheritModifierGroup: false,
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Created menu item: ${menuItem3.name} (${menuItem3.menuItemCode})\n`)

    // Step 11: Create MenuItemModifierGroup assignments (one by one)
    console.log('🔗 Creating Menu Item Modifier Group Assignments...')
    const assignment1 = await prisma.menuItemModifierGroup.create({
      data: {
        menuItemCode: menuItem2.menuItemCode,
        modifierGroupCode: modifierGroup1.modifierGroupCode,
        inheritFromMenuGroup: 0, // Explicit assignment
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Assigned modifier group ${modifierGroup1.groupName} to ${menuItem2.name}`)

    const assignment2 = await prisma.menuItemModifierGroup.create({
      data: {
        menuItemCode: menuItem2.menuItemCode,
        modifierGroupCode: modifierGroup2.modifierGroupCode,
        inheritFromMenuGroup: 0, // Explicit assignment
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Assigned modifier group ${modifierGroup2.groupName} to ${menuItem2.name}`)

    const assignment3 = await prisma.menuItemModifierGroup.create({
      data: {
        menuItemCode: menuItem3.menuItemCode,
        modifierGroupCode: modifierGroup3.modifierGroupCode,
        inheritFromMenuGroup: 0, // Explicit assignment
        createdBy: adminUser.id,
      }
    })
    console.log(`  ✓ Assigned modifier group ${modifierGroup3.groupName} to ${menuItem3.name}\n`)

    // Summary
    console.log('✅ Sequential seed completed successfully! 🎉\n')
    console.log('📊 Summary:')
    console.log(`   • ${3} Users`)
    console.log(`   • ${2} Tax entries`)
    console.log(`   • ${2} Printers`)
    console.log(`   • ${2} Prep Zones`)
    console.log(`   • ${2} Menu Masters`)
    console.log(`   • ${3} Menu Categories`)
    console.log(`   • ${3} Modifier Groups`)
    console.log(`   • ${6} Modifier Items`)
    console.log(`   • ${3} Menu Items`)
    console.log(`   • ${3} Menu Item Modifier Group Assignments\n`)
    console.log('📧 Login credentials:')
    console.log('   Email: admin@restaurant.com')
    console.log('   Password: admin123')
    console.log('   Email: manager@restaurant.com')
    console.log('   Password: admin123')
    console.log('   Email: captain@restaurant.com')
    console.log('   Password: admin123\n')

  } catch (error) {
    console.error('❌ Error during sequential seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()
  .then(() => {
    console.log('🎉 Sequential seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Sequential seeding failed:', error)
    process.exit(1)
  })
