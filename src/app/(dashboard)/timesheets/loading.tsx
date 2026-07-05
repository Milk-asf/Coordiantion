export default function TimesheetsLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="h-[20px] w-[90px] animate-pulse rounded-[6px] bg-[var(--folk-border-subtle)]" />
        <div className="h-[28px] w-[100px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-[12px] px-[24px]">
        <div className="h-[44px] w-[44px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
        <div className="h-[16px] w-[140px] animate-pulse rounded-[6px] bg-[var(--folk-border-subtle)]" />
        <div className="h-[12px] w-[240px] animate-pulse rounded-[6px] bg-[var(--folk-border-subtle)]" />
      </div>
    </div>
  )
}
