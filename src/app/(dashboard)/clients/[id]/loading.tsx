export default function ClientProfileLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center gap-[12px] border-b border-folk-border-subtle bg-folk-nav px-[16px]">
        <div className="h-[28px] w-[28px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
        <div className="h-[16px] w-[140px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="ml-auto flex items-center gap-[8px]">
          <div className="h-[28px] w-[60px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
          <div className="h-[28px] w-[60px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
          <div className="h-[28px] w-[60px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
        </div>
      </div>
      <div className="flex flex-1">
        <div className="flex-1 p-[24px]">
          <div className="mb-[24px] flex items-center gap-[16px]">
            <div className="h-[56px] w-[56px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
            <div className="flex flex-col gap-[6px]">
              <div className="h-[20px] w-[180px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[120px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-[12px] flex items-center gap-[12px]">
              <div className="h-[14px] w-[100px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[200px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            </div>
          ))}
        </div>
        <div className="hidden w-[320px] border-l border-folk-border-subtle p-[20px] lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-[16px] flex flex-col gap-[4px]">
              <div className="h-[12px] w-[60px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              <div className="h-[14px] w-[140px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
