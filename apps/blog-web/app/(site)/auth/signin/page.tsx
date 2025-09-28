import Link from "next/link";

import { AdminSignInButton } from "@/components/auth/admin-signin-button";

interface SignInPageProps {
  searchParams?: {
    callbackUrl?: string;
    error?: string;
  };
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl = searchParams?.callbackUrl ?? "/admin";
  const errorMessage = searchParams?.error;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-lg shadow-slate-950">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">
            관리자 로그인
          </h1>
          <p className="text-sm text-slate-400">
            블로그 콘텐츠 관리를 위해 Google 계정으로 로그인해 주세요.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage === "AccessDenied"
              ? "접근 권한이 없는 계정입니다. 관리자 계정을 확인해 주세요."
              : "로그인 도중 오류가 발생했어요. 다시 시도해 주세요."}
          </div>
        ) : null}

        <div className="space-y-4">
          <AdminSignInButton callbackUrl={callbackUrl} />
          <p className="text-center text-xs text-slate-500">
            로그인에 문제가 있으면{" "}
            <Link className="text-emerald-300 hover:text-emerald-200" href="/">
              홈으로 돌아가기
            </Link>
            를 눌러주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
