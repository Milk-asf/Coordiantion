export default function SettingsLoading() {
  return (
    <div className="flex h-full">
      {/* Settings sidebar skeleton */}
      <div className="w-[220px] border-r border-[#f0f0f0] px-[16px] py-[24px]">
        <div className="mb-[24px] h-[18px] w-[80px] animate-pulse rounded-[4px] bg-[#f0f0f0]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-[6px] h-[32px] w-full animate-pulse rounded-[6px] bg-[#f0f0f0]" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>

      {/* Settings content skeleton */}
      <div className="flex-1 px-[40px] py-[32px]">
        <div className="mb-[8px] h-[24px] w-[180px] animate-pulse rounded-[6px] bg-[#f0f0f0]" />
        <div className="mb-[32px] h-[14px] w-[300px] animate-pulse rounded-[4px] bg-[#f0f0f0]" />

        <div className="space-y-[20px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-[8px]">
              <div className="h-[14px] w-[100px] animate-pulse rounded-[4px] bg-[#f0f0f0]" />
              <div className="h-[38px] w-full animate-pulse rounded-[8px] bg-[#f0f0f0]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
