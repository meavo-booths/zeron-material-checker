import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/lib/auth.config";
import { ZERON_TOOL_CARD_ID } from "@/lib/constants";
import { authorizeInvitedGoogleUser, isGoogleAuthEnabled } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

const googleProvider = isGoogleAuthEnabled()
  ? Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })
  : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [...(googleProvider ? [googleProvider] : [])],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const ok = await authorizeInvitedGoogleUser({
        user,
        account,
        name: user.name ?? (profile?.name as string | undefined),
        image: user.image ?? (profile?.picture as string | undefined),
        validate: async (existingUser) => {
          const access = await prisma.toolCardAccess.findFirst({
            where: {
              userId: existingUser.id,
              cardId: ZERON_TOOL_CARD_ID,
            },
          });
          return Boolean(access);
        },
      });

      if (!ok) {
        const email = user.email?.trim().toLowerCase();
        if (email && !email.endsWith("@meavo.com")) {
          return "/login?error=DomainNotAllowed";
        }
        const existing = email
          ? await prisma.user.findUnique({ where: { email } })
          : null;
        if (existing) return "/login?error=NoAccess";
        return "/login?error=NotInvited";
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { systemRole: true },
        });
        token.systemRole = dbUser?.systemRole ?? "USER";
      }
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.systemRole = (token.systemRole as "ADMIN" | "USER") ?? "USER";
      }
      if (session.user && token.email) {
        session.user.email = token.email as string;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    },
  },
});
