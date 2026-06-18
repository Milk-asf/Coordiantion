export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-folk-border-subtle bg-folk-nav px-[32px] py-[20px]">
        <div className="flex items-center gap-[12px]">
          <div className="h-[28px] w-[160px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          <div className="h-[24px] w-[40px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="h-[32px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          <div className="h-[32px] w-[100px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-[8px] border-b border-folk-border-subtle bg-folk-nav px-[32px] py-[12px]">
        <div className="h-[28px] w-[70px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="h-[28px] w-[90px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="h-[28px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
      </div>

      {/* Table skeleton */}
      <div className="flex-1 px-[32px] py-[16px]">
        {/* Table header */}
        <div className="mb-[4px] flex items-center gap-[16px] border-b border-folk-border-subtle pb-[12px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[14px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" style={{ width: `${[120, 100, 140, 90, 110][i]}px` }} />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-[16px] border-b border-[#f8f8f8] py-[14px]"
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="flex items-center gap-[10px]">
              <div className="h-[22px] w-[22px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[130px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            </div>
            <div className="h-[14px] w-[100px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[22px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[90px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[70px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
