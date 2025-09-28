import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const isProduction = process.env.NODE_ENV === "production";

// Mion 계정 구분 함수 - 요구사항 문서 기준
function getUserRole(email: string): "ADMIN" | "USER" {
  return email === process.env.ADMIN_EMAIL ? "ADMIN" : "USER";
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // 첫 로그인 시 사용자 정보를 토큰에 저장
      if (account && user) {
        token.googleId = account.providerAccountId;
        token.role = getUserRole(user.email!);
      }
      return token;
    },
    async session({ session, token }) {
      // 세션에 추가 정보 포함
      if (session.user) {
        session.user.id = token.sub!;
        session.user.googleId = token.googleId as string;
        session.user.role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
  },
  cookies: {
    csrfToken: {
      name: isProduction
        ? `__Secure-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    sessionToken: {
      name: isProduction
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7일
  },
  secret: process.env.NEXTAUTH_SECRET,
};
