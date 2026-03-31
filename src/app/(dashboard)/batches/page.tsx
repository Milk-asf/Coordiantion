"use client"

import { Layers } from "lucide-react"

export default function BatchesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
        <span className="text-[13px] font-medium text-[#262626]">Batches</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Layers className="h-[32px] w-[32px] text-[#ddd]" strokeWidth={1.5} />
        <p className="mt-[12px] text-[14px] font-medium text-[#999]">No batches yet</p>
        <p className="mt-[4px] text-[12px] text-[#bbb]">Batches will appear here</p>
      </div>
    </div>
  )
}
