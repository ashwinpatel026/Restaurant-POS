import NextAuth from 'next-auth'
import { masterAuthOptions } from '@/lib/masterAuth'

const handler = NextAuth(masterAuthOptions)

export { handler as GET, handler as POST }

