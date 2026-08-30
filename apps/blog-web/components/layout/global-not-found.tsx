import Link from "next/link";

/**
 * 일치하는 route가 없거나 공개 목록이 범위를 벗어났을 때 표시합니다.
 */
export function GlobalNotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <p className="mb-3 text-sm font-semibold text-cyan-300">404</p>
      <h1 className="text-3xl font-bold text-white">페이지를 찾을 수 없습니다</h1>
      <p className="mt-4 max-w-lg text-slate-300">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/10"
        >
          홈으로 돌아가기
        </Link>
        <Link
          href="/posts"
          className="rounded border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700/40"
        >
          모든 포스트 보기
        </Link>
      </div>
    </main>
  );
}
