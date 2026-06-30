export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center border-b border-folk-border bg-white px-[16px]">
        <div className="h-[16px] w-[90px] animate-pulse rounded-[4px] bg-[var(--folk-border-subtle)]" />
      </div>
      <div className="flex-1 overflow-auto bg-folk-page p-[24px]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-[22px]">
          <div>
            <div className="h-[26px] w-[260px] animate-pulse rounded-[4px] bg-[var(--folk-border-subtle)]" />
            <div className="mt-[8px] h-[14px] w-[180px] animate-pulse rounded-[4px] bg-[var(--folk-border-subtle)]" />
          </div>
          <div className="h-[78px] animate-pulse rounded-[10px] bg-[var(--folk-border-subtle)]" />
          <div className="flex gap-[12px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[84px] flex-1 animate-pulse rounded-[8px] bg-[var(--folk-border-subtle)]" />
            ))}
          </div>
          <div className="h-[140px] animate-pulse rounded-[8px] bg-[var(--folk-border-subtle)]" />
          <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[110px] animate-pulse rounded-[8px] bg-[var(--folk-border-subtle)]" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-[12px] lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[220px] animate-pulse rounded-[8px] bg-[var(--folk-border-subtle)]" />
            ))}
          </div>
          <div className="h-[260px] animate-pulse rounded-[8px] bg-[var(--folk-border-subtle)]" />
        </div>
      </div>
    </div>
  )
}
