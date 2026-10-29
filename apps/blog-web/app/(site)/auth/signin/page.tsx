import type { Metadata } from "next";
import Link from "next/link";

import styles from "./signin.module.css";

import { AdminSignInButton } from "@/components/auth/admin-signin-button";
import { getSafeCallbackUrl } from "@/lib/auth/callback-url";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "관리자 로그인 | Mion's Blog",
  description: "Mion's Blog 관리자 로그인",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: null,
  openGraph: null,
  twitter: null,
};

interface SignInSearchParams {
  callbackUrl?: string | string[];
  error?: string;
}

interface SignInPageProps {
  searchParams?: Promise<SignInSearchParams>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl);
  const errorMessage = params?.error;

  const session = await getSession();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main id="main" className={styles.root}>
      <header className="page-head">
        <div className="container">
          <h1>관리자 로그인</h1>
          <p className="lead">블로그 콘텐츠 관리를 위해 Google 계정으로 로그인해 주세요.</p>
        </div>
      </header>

      <div className="container signin">
        {errorMessage ? (
          <p className="signin-error" role="alert">
            {errorMessage === "AccessDenied"
              ? "접근 권한이 없는 계정입니다. 관리자 계정을 확인해 주세요."
              : "로그인 도중 오류가 발생했어요. 다시 시도해 주세요."}
          </p>
        ) : null}

        <AdminSignInButton callbackUrl={callbackUrl} />
        <p className="signin-note">
          로그인에 문제가 있으면 <Link href="/">홈으로 돌아가기</Link>를 눌러주세요.
        </p>
      </div>
    </main>
  );
}
