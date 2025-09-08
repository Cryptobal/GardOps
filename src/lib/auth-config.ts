import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // En desarrollo, permitir cualquier credencial
        if (process.env.NODE_ENV === 'development') {
          return {
            id: 'dev-user',
            email: credentials.email,
            name: 'Usuario de Desarrollo'
          };
        }

        // En producción, verificar contra la base de datos
        try {
          const { authenticateUser } = await import('@/lib/api/usuarios');
          const authResult = await authenticateUser({
            email: credentials.email,
            password: credentials.password
          });

          if (authResult) {
            return {
              id: authResult.user.id,
              email: authResult.user.email,
              name: `${authResult.user.nombre} ${authResult.user.apellido}`,
              tenant_id: authResult.user.tenant_id,
              rol: authResult.user.rol
            };
          }
        } catch (error) {
          console.error('Error en autenticación:', error);
        }

        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60 // 30 minutos
  },
  jwt: {
    maxAge: 30 * 60 // 30 minutos
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenant_id = user.tenant_id;
        token.rol = user.rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.tenant_id = token.tenant_id;
        session.user.rol = token.rol;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-key',
  debug: process.env.NODE_ENV === 'development'
};
