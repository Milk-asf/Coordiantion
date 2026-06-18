export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-folk-surface">
      <div className="flex flex-col items-center gap-[12px]">
        <div className="h-[24px] w-[24px] animate-spin rounded-full border-[2px] border-folk-border border-t-[#888]" />
        <span className="text-[13px] font-medium text-folk-secondary">Loading…</span>
      </div>
    </div>
  )
}
