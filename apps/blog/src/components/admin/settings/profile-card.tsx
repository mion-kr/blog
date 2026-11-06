import { User } from "lucide-react"
import Image from "next/image"

interface ProfileCardProps {
  name: string
  email: string
  image?: string | null
  role: string
}

export function ProfileCard({ name, email, image, role }: ProfileCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold text-slate-50">
        <User className="h-5 w-5" />
        <h2>프로필 정보</h2>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6">
        {image ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-700">
            <Image
              src={image}
              alt={`${name}의 프로필 사진`}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800">
            <User className="h-12 w-12 text-slate-500" />
          </div>
        )}

        <div className="w-full space-y-3 text-center">
          <div>
            <p className="text-sm text-slate-400">이름</p>
            <p className="mt-1 text-base font-medium text-slate-100">{name}</p>
          </div>

          <div>
            <p className="text-sm text-slate-400">이메일</p>
            <p className="mt-1 text-base font-medium text-slate-100">{email}</p>
          </div>

          <div>
            <p className="text-sm text-slate-400">역할</p>
            <span className="mt-1 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
              {role}
            </span>
          </div>
        </div>

        <div className="mt-2 w-full rounded-lg bg-slate-800/50 p-4 text-center">
          <p className="text-sm text-slate-400">
            ℹ️ Google 계정 정보는 Google에서만 변경할 수 있어요.
          </p>
        </div>
      </div>
    </div>
  )
}