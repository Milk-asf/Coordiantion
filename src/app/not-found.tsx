import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-[16px] bg-[#fafafa] px-[24px]">
      <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[16px] bg-[#f0f0f0]">
        <span className="text-[28px] font-bold text-[#ccc]">?</span>
      </div>
      <h1 className="text-[20px] font-semibold text-[#262626]">Page not found</h1>
      <p className="max-w-[360px] text-center text-[14px] text-[#888]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/tasks"
        className="mt-[8px] rounded-[8px] border border-[#e0e0e0] bg-white px-[20px] py-[10px] text-[14px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
      >
        Go to dashboard
      </Link>
    </div>
  )
}
