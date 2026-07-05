export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="h-[24px] w-[160px] animate-pulse rounded-[6px] bg-[var(--folk-border-subtle)]" />
      <div className="flex flex-col gap-[16px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[6px]">
            <div className="h-[12px] w-[80px] animate-pulse rounded-[6px] bg-[var(--folk-border-subtle)]" />
            <div className="h-[36px] w-full max-w-[400px] animate-pulse rounded-[6px] bg-[var(--folk-border-subtle)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
