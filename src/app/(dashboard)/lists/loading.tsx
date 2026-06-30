export default function ListsLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="h-[20px] w-[60px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="h-[28px] w-[80px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-[12px] px-[24px]">
        <div className="h-[44px] w-[44px] animate-pulse rounded-full bg-[var(--folk-border-subtle)]" />
        <div className="h-[16px] w-[120px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
        <div className="h-[12px] w-[240px] animate-pulse rounded-none bg-[var(--folk-border-subtle)]" />
      </div>
    </div>
  )
}
