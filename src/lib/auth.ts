import NextAuth, { DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { Rol } from '@prisma/client'

// Extend session type to include role
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      rol: Rol
    } & DefaultSession['user']
  }

  interface User {
    rol: Rol
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    rol: Rol
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos')
        }

        // Find user by email
        const user = await prisma.usuario.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user) {
          throw new Error('Credenciales inválidas')
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!isPasswordValid) {
          throw new Error('Credenciales inválidas')
        }

        // Return user object
        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = user.rol
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.rol = token.rol
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
})
