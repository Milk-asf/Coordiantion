export default function ClientsLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-folk-nav px-[16px]">
        <div className="h-[20px] w-[100px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="flex items-center gap-[8px]">
          <div className="h-[28px] w-[60px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
          <div className="h-[28px] w-[28px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
        </div>
      </div>
      <div className="flex-1 p-[16px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-[8px] flex items-center gap-[12px] rounded-none border border-folk-border-subtle px-[12px] py-[10px]">
            <div className="h-[32px] w-[32px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[140px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[100px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
