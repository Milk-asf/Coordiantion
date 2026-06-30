"use client"

import type { LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageTitleBar } from "@/components/page-title-bar"

interface BusinessPlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
}

export function BusinessPlaceholderPage({ title, description, icon }: BusinessPlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title={title} />
      <EmptyState icon={icon} title={title} description={description} className="flex-1" />
    </div>
  )
}
