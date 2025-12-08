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
    console.log('🌱 Starting simple MySQL seed (Users + Outlets only)...\n')

    // Clear existing data
    await prisma.user.deleteMany({})
    // await prisma.outlet.deleteMany({})
    console.log('🗑️  Cleared existing data\n')

    // Create Outlets
    // const outlet1 = await prisma.outlet.create({
    //   data: {
    //     name: 'Main Branch',
    //     code: 'MB001',
    //     address: '123 Restaurant Street, Downtown',
    //     city: 'Mumbai',
    //     state: 'Maharashtra',
    //     zipCode: '400001',
    //     phone: '+91-1234567890',
    //     email: 'main@restaurant.com',
    //     openingTime: '09:00',
    //     closingTime: '23:00',
    //   }
    // })

    // const outlet2 = await prisma.outlet.create({
    //   data: {
    //     name: 'Airport Branch',
    //     code: 'AB002',
    //     address: '789 Airport Road, Terminal 2',
    //     city: 'Mumbai',
    //     state: 'Maharashtra',
    //     zipCode: '400099',
    //     phone: '+91-9876543210',
    //     email: 'airport@restaurant.com',
    //     openingTime: '06:00',
    //     closingTime: '01:00',
    //   }
    // })
    // console.log('✓ Outlets created (2 outlets)')

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
        },
        {
          email: 'captain@restaurant.com',
          username: 'captain',
          password: hashedPassword,
          firstName: 'Sarah',
          lastName: 'Captain',
          role: 'CAPTAIN',
          phone: '+91-7777777777',
        },
        {
          email: 'cashier@restaurant.com',
          username: 'cashier',
          password: hashedPassword,
          firstName: 'Mike',
          lastName: 'Cashier',
          role: 'CASHIER',
          phone: '+91-6666666666',
        },
      ]
    })
    console.log('✓ Users created (4 users)')

    console.log('\n✅ Simple PostgreSQL seed completed successfully! 🎉\n')
    console.log('📊 Summary:')
    console.log('   • 4 Users with different roles\n')
    console.log('📧 Login credentials:')
    console.log('   Email: admin@restaurant.com')
    console.log('   Password: admin123')
    console.log('   Email: manager@restaurant.com')
    console.log('   Password: admin123')
    console.log('   Email: captain@restaurant.com')
    console.log('   Password: admin123')
    console.log('   Email: cashier@restaurant.com')
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
