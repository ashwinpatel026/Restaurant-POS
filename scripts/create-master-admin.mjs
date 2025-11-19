import { PrismaClient } from '@prisma/master-client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const masterPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.MASTER_DATABASE_URL }
  }
})

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating super admin...')

    // Check if admin already exists
    const existingAdmin = await masterPrisma.admin.findUnique({
      where: { email: 'admin@master.com' }
    })

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists!')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Username: ${existingAdmin.username}`)
      console.log('')
      console.log('💡 To create a new admin, use a different email or delete the existing one.')
      return
    }

    // Get password from environment or use default
    const password = process.env.MASTER_ADMIN_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create super admin
    const admin = await masterPrisma.admin.create({
      data: {
        email: 'admin@master.com',
        username: 'superadmin',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    console.log('✅ Super admin created successfully!')
    console.log('')
    console.log('📋 Login Credentials:')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Username: ${admin.username}`)
    console.log(`   Password: ${password}`)
    console.log('')
    console.log('🔐 Please change the password after first login!')
    console.log('')
    console.log('🌐 Login URL: http://localhost:3000/master/login')
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
    if (error.code === 'P2002') {
      console.error('   Error: Email or username already exists')
    } else if (error.code === 'P1001') {
      console.error('   Error: Cannot connect to database')
      console.error('   Please check your MASTER_DATABASE_URL in .env file')
    }
    process.exit(1)
  } finally {
    await masterPrisma.$disconnect()
  }
}

// Run the script
createSuperAdmin()

