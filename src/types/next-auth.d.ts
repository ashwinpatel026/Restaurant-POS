import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      outletId: string | null
      accessLevel: string | null
      defaultStoreCode: string | null
      type?: string // Optional field to distinguish user types (e.g., 'master_admin')
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    outletId: string | null
    accessLevel: string | null
    defaultStoreCode: string | null
    type?: string // Optional field to distinguish user types (e.g., 'master_admin')
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    outletId: string | null
    accessLevel: string | null
    defaultStoreCode: string | null
    type?: string // Optional field to distinguish user types (e.g., 'master_admin')
  }
}

