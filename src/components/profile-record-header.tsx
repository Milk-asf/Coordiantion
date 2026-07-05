"use client"

import type { ComponentType, ReactNode, ButtonHTMLAttributes } from "react"
import { PageTitleBar, PageToolbarBar } from "@/components/page-title-bar"
import { folkNavActionLinkClass } from "@/components/tab-active-indicator"

export interface ProfileMetadataItem {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
}

interface ProfileRecordHeaderProps {
  name: ReactNode
  metadata?: ProfileMetadataItem[]
  actions?: ReactNode
  onBack?: () => void
  backLabel?: string
}

export function ProfileMetadataPill({ icon: Icon, label }: ProfileMetadataItem) {
  return (
    <span className="inline-flex h-[26px] max-w-full items-center gap-[6px] rounded-[8px] border border-[#d9d9d9] bg-white px-[8px] text-[12px] font-normal text-[var(--folk-nav-secondary)]">
      <Icon className="h-[12px] w-[12px] shrink-0 text-[var(--folk-nav-secondary)]" strokeWidth={1.5} />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function ProfileNavTextAction({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={folkNavActionLinkClass(className)} tabIndex={0} {...props}>
      {children}
    </button>
  )
}

export function ProfileRecordHeader({
  name,
  metadata = [],
  actions,
  onBack,
  backLabel = "Back",
}: ProfileRecordHeaderProps) {
  const titleContent = name
    ? typeof name === "string"
      ? name
      : name
    : ""

  const hasMetadata = metadata.length > 0

  return (
    <>
      <PageTitleBar
        title={titleContent}
        onBack={onBack}
        backLabel={backLabel}
        showBack={Boolean(onBack)}
        trailing={actions ? <div className="flex shrink-0 items-center gap-[12px]">{actions}</div> : undefined}
      />
      {hasMetadata ? (
        <PageToolbarBar align="left">
          <div className="hidden min-w-0 flex-wrap items-center gap-[6px] lg:flex">
            {metadata.map((item) => (
              <ProfileMetadataPill key={item.label} icon={item.icon} label={item.label} />
            ))}
          </div>
        </PageToolbarBar>
      ) : null}
    </>
  )
}
