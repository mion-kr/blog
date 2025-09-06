import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string
      googleId: string
      role: "ADMIN" | "USER"
    }
  }

  interface User {
    id: string
    name: string
    email: string
    image?: string
    googleId?: string
    role?: "ADMIN" | "USER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string
    role?: "ADMIN" | "USER"
  }
}