import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/features/auth/schema";
import { email } from "zod";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email;
        const password = parsed.data.password;

        if (email !== process.env.SEED_ADMIN_EMAIL) return null;
        else if (password !== process.env.SEED_ADMIN_PASSWORD) return null;
        else if (process.env.SEED_ADMIN_ID === undefined) return null;

        return {
          id: process.env.SEED_ADMIN_ID,
          name: process.env.SEED_ADMIN_NAME,
          email: process.env.SEED_ADMIN_EMAIL,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
