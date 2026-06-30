export default function IncidentsLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="h-[20px] w-[72px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="h-[28px] w-[120px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
      </div>
      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border bg-white px-[16px]">
        <div className="h-[30px] w-[220px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="h-[30px] w-[72px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
      </div>
      <div className="flex-1 p-[16px]">
        <div className="space-y-[8px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-[16px] border-b border-[#d9d9d9] py-[12px]">
              <div className="h-[14px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[140px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[180px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[70px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
