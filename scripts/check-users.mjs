import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...')
    
    // Check if any users exist
    const userCount = await prisma.user.count()
    console.log(`📊 Total users in database: ${userCount}`)
    
    if (userCount === 0) {
      console.log('❌ No users found. Creating default admin user...')
      
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@restaurant.com',
          username: 'admin',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'SUPER_ADMIN',
          isActive: true
        }
      })
      
      console.log('✅ Default admin user created successfully!')
      console.log('📧 Email: admin@restaurant.com')
      console.log('🔑 Password: admin123')
      console.log('👤 Role: SUPER_ADMIN')
    } else {
      console.log('📋 Existing users:')
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      })
      
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - ${user.isActive ? 'Active' : 'Inactive'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
