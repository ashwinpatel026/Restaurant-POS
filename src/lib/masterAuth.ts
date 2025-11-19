import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { masterPrisma } from './databaseManager'

export const masterAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Master Admin Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const admin = await masterPrisma.admin.findUnique({
          where: { email: credentials.email }
        })

        if (!admin || !admin.isActive) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          admin.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // Update last login
        await masterPrisma.admin.update({
          where: { adminId: admin.adminId },
          data: { lastLoginAt: new Date() }
        }).catch(err => {
          console.error('Failed to update last login:', err)
        })

        return {
          id: admin.adminId.toString(),
          email: admin.email,
          name: `${admin.firstName} ${admin.lastName}`,
          role: admin.role,
          type: 'master_admin' // Distinguish from location users
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.type = user.type
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.type = token.type as string
      }
      return session
    }
  },
  pages: {
    signIn: '/master/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

