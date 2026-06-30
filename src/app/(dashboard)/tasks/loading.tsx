export default function TasksLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="h-[20px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="flex items-center gap-[8px]">
          <div className="h-[28px] w-[60px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
          <div className="h-[28px] w-[60px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
        </div>
      </div>
      <div className="flex-1 p-[16px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="mb-[8px] flex items-center gap-[12px] rounded-none border border-folk-border-subtle px-[12px] py-[10px]">
            <div className="h-[16px] w-[16px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] flex-1 animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[80px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="h-[14px] w-[60px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
