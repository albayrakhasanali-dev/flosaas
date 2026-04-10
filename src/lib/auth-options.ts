import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { verifyPassword } from "./password";

// Map legacy role names to new ones
function mapRole(role: string): string {
  if (role === "super_admin" || role === "sirket_yoneticisi") return "admin";
  if (role === "lokasyon_sefi") return "personel";
  return role; // already "admin" or "personel"
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            lokasyonlar: { select: { lokasyonId: true } },
          },
        });

        if (!user || !user.isActive) return null;
        if (!verifyPassword(credentials.password, user.password)) return null;

        // Get location IDs from join table (or fallback to old lokasyonId)
        let lokasyonIds = user.lokasyonlar.map((ul) => ul.lokasyonId);
        if (lokasyonIds.length === 0 && user.lokasyonId) {
          lokasyonIds = [user.lokasyonId];
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: mapRole(user.role),
          sirketId: user.sirketId,
          lokasyonIds,
        } as unknown as { id: string; email: string; name: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.role = mapRole(u.role as string);
        token.sirketId = u.sirketId;
        token.lokasyonIds = u.lokasyonIds;
      }
      // Always map role for existing tokens with old role names
      if (token.role) {
        token.role = mapRole(token.role as string);
      }
      // Ensure lokasyonIds is always an array (old tokens may lack it)
      if (!Array.isArray(token.lokasyonIds)) {
        token.lokasyonIds = [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.sub;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).sirketId = token.sirketId;
        (session.user as Record<string, unknown>).lokasyonIds = token.lokasyonIds || [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
