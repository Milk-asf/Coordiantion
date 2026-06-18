"use client"

import type { LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

interface BusinessPlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
}

export function BusinessPlaceholderPage({ title, description, icon }: BusinessPlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center border-b border-folk-border bg-folk-nav px-[16px]">
        <span className="text-[13px] font-medium text-folk-text">{title}</span>
      </div>
      <EmptyState icon={icon} title={title} description={description} className="flex-1" />
    </div>
  )
}
