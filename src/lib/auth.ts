import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { logAudit } from "./audit";

// Role chosen at self-signup (/signup), consumed once by the sign-in
// callback below. Lives here (not in auth-actions) to avoid a module cycle.
export const OAUTH_ROLE_COOKIE = "bp_oauth_role";

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Auth.js v5 only auto-loads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET, so pass
// the project's GOOGLE_* vars explicitly (with AUTH_* as fallback).
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    // Google OAuth is sign-in ONLY for admin-provisioned accounts.
    // No self-registration: unknown Google emails are rejected, and
    // deactivated / unapproved accounts cannot sign in. Matching emails
    // link to the existing staff/student record. Only wired when configured.
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = SignInSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (user.isActive === false) return null;
        if (user.accountStatus !== "APPROVED") return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await logAudit({
          actorId: user.id,
          action: "USER.LOGIN",
          entity: "User",
          entityId: user.id,
        }).catch(() => undefined);

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    // Google access rules:
    // - Pre-provisioned, active, approved accounts sign straight in.
    // - Unknown Google emails are rejected UNLESS they came through /signup,
    //   which parks a one-time role choice in a cookie. Students are approved
    //   immediately; financial officers are created PENDING and blocked until
    //   an admin approves them. Anything else is rejected (no open registration).
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user?.email;
        if (!email) return false;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          if (existing.isActive === false) return false;
          if (existing.accountStatus !== "APPROVED") return false;
          await logAudit({
            actorId: existing.id,
            action: "USER.LOGIN",
            entity: "User",
            entityId: existing.id,
          }).catch(() => undefined);
          return true;
        }
        const store = await cookies();
        const choice = store.get(OAUTH_ROLE_COOKIE)?.value;
        store.delete(OAUTH_ROLE_COOKIE);
        if (choice !== "student" && choice !== "financial_officer") return false;
        const role: UserRole =
          choice === "student" ? "STUDENT" : "FINANCE_OFFICER";
        const created = await prisma.user.create({
          data: {
            email,
            name: user.name ?? email.split("@")[0],
            role,
            accountStatus: role === "STUDENT" ? "APPROVED" : "PENDING",
          },
        });
        await logAudit({
          actorId: created.id,
          action: "USER.SELF_REGISTERED",
          entity: "User",
          entityId: created.id,
        }).catch(() => undefined);
        // Students continue (the adapter links the Google account via
        // allowDangerousEmailAccountLinking); officers wait for approval.
        return role === "STUDENT";
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && "role" in user) {
        token.role = (user as { role: UserRole }).role;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? token.sub ?? "";
        if (token.role) session.user.role = token.role;
      }
      return session;
    },
  },
});
