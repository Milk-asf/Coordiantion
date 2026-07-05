import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-[16px] bg-folk-surface px-[24px]">
      <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[16px] bg-[var(--folk-border-subtle)]">
        <span className="text-[28px] font-bold text-[#ccc]">?</span>
      </div>
      <h1 className="text-[20px] font-semibold text-folk-text">Page not found</h1>
      <p className="max-w-[360px] text-center text-[14px] text-folk-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/tasks"
        className="mt-[8px] rounded-[6px] border border-folk-border bg-folk-surface px-[20px] py-[10px] text-[14px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
      >
        Go to dashboard
      </Link>
    </div>
  )
}
