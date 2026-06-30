"use client"

import { useRouter } from "next/navigation"
import { BackButton } from "@/components/back-button"
import { cn } from "@/lib/utils"

interface PageBackButtonProps {
  ariaLabel?: string
  onClick?: () => void
}

/** Short vertical divider between the back button and page title. */
export function pageTitleBackDividerClass(className?: string) {
  return cn("h-[20px] w-px shrink-0 bg-[var(--folk-border)]", className)
}

/**
 * Title-bar back button shown at the start of every page header.
 * Defaults to browser history back; renders a trailing divider to
 * separate it from the page title.
 */
export function PageBackButton({ ariaLabel = "Go back", onClick }: PageBackButtonProps) {
  const router = useRouter()

  return (
    <div className="flex shrink-0 items-center gap-[12px]">
      <BackButton
        onClick={onClick ?? (() => router.back())}
        ariaLabel={ariaLabel}
        className="h-[24px] w-[24px] rounded-[6px]"
        iconClassName="h-[13px] w-[13px]"
      />
      <div className={pageTitleBackDividerClass()} aria-hidden="true" />
    </div>
  )
}
