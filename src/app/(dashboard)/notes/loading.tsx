export default function NotesLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <div className="h-[20px] w-[60px] animate-pulse rounded bg-[#f0f0f0]" />
        <div className="h-[28px] w-[28px] animate-pulse rounded-full bg-[#f0f0f0]" />
      </div>
      <div className="flex-1 p-[16px]">
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-[8px] rounded-[10px] border border-[#e2e2e2] p-[14px]">
              <div className="h-[14px] w-[60%] animate-pulse rounded bg-[#f0f0f0]" />
              <div className="h-[12px] w-[80%] animate-pulse rounded bg-[#f0f0f0]" />
              <div className="h-[12px] w-[40%] animate-pulse rounded bg-[#f0f0f0]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
