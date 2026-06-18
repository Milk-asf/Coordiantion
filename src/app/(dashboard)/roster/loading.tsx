export default function RosterLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center border-b border-folk-border-subtle bg-folk-nav px-[16px]">
        <div className="h-[20px] w-[60px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle bg-folk-nav px-[16px]">
          <div className="h-[32px] w-[64px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          <div className="h-[32px] w-[64px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
          <div className="h-[16px] w-[180px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="w-[96px] shrink-0 border-folk-border-subtle p-[6px]">
            <div className="mb-[12px] h-[16px] w-[72px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            <div className="mb-[8px] h-[34px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="mb-[8px] py-[10px] pl-[4px] pr-[2px]">
                <div className="space-y-[6px]">
                  <div className="h-[12px] w-[64px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
                  <div className="h-[10px] w-[40px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 p-[16px]">
            <div className="mb-[12px] flex gap-[12px]">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-[56px] w-[148px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} className="mb-[8px] flex gap-[12px]">
                {Array.from({ length: 7 }).map((_, colIndex) => (
                  <div key={colIndex} className="h-[96px] w-[148px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
