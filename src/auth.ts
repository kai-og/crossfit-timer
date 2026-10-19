import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isCoach } from "@/lib/auth-domain";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Reads AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and AUTH_SECRET from the environment.
  providers: [Google({ authorization: { params: { prompt: "select_account" } } })],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Only coaches get a session at all, so any session means "is a coach".
    signIn({ account, profile }) {
      return account?.provider === "google" && isCoach(profile);
    },
  },
});
