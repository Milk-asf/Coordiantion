export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="flex flex-col items-center gap-[12px]">
        <div className="h-[24px] w-[24px] animate-spin rounded-full border-[2px] border-[#e0e0e0] border-t-[#888]" />
        <span className="text-[13px] font-medium text-[#999]">Loading…</span>
      </div>
    </div>
  )
}
