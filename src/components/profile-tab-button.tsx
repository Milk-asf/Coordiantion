"use client"

import Link from "next/link"
import type { ComponentType, MouseEventHandler, ReactNode } from "react"
import { tabButtonClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"

interface ProfileTabButtonProps {
  isActive: boolean
  label: string
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  badge?: number
  className?: string
  children?: ReactNode
  showIndicator?: boolean
  /** Force the icon to render. Defaults to true for the toolbar variant. */
  showIcon?: boolean
  variant?: "profile" | "toolbar"
  onClick?: () => void
  href?: string
  onContextMenu?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
}

export function ProfileTabButton({
  isActive,
  onClick,
  href,
  label,
  icon: Icon,
  badge,
  className = "",
  children,
  variant = "profile",
  showIcon: showIconProp,
  onContextMenu,
}: ProfileTabButtonProps) {
  const iconClassName = variant === "toolbar" ? "h-[13px] w-[13px]" : "h-[14px] w-[14px]"
  const showIcon = (showIconProp ?? variant === "toolbar") && Icon
  const profileBadgeClassName =
    "folk-tab-badge inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full border px-[5px] text-[11px] font-normal leading-none tabular-nums"
  const badgeClassName = profileBadgeClassName
  const content = (
    <>
      {showIcon && (
        <Icon
          className={cn(
            iconClassName,
            "shrink-0",
            isActive ? "text-folk-text" : "text-[var(--folk-nav-muted)]"
          )}
          strokeWidth={1.5}
        />
      )}
      {variant === "profile" ? (
        <span className="inline-flex min-h-[18px] items-center gap-[6px]">
          {children ?? (
            <>
              <span className="folk-tab-label text-[13px] font-normal leading-none">{label}</span>
              {badge !== undefined && (
                <span className={profileBadgeClassName}>
                  {badge}
                </span>
              )}
            </>
          )}
        </span>
      ) : (
        <>
          <span>{label}</span>
          {badge !== undefined && (
            <span className={badgeClassName}>
              {badge}
            </span>
          )}
          {children}
        </>
      )}
    </>
  )

  // One universal tab style: underline (folk-tab). The variant only affects
  // icon sizing/visibility now.
  const classes = tabButtonClass(isActive, className)

  if (!href && !onClick) {
    return (
      <span className={classes} aria-current={isActive ? "page" : undefined} aria-selected={isActive}>
        {content}
      </span>
    )
  }

  if (href) {
    return (
      <Link
        href={href}
        onContextMenu={onContextMenu}
        className={classes}
        tabIndex={0}
        aria-current={isActive ? "page" : undefined}
        aria-selected={isActive}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={classes}
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      aria-selected={isActive}
    >
      {content}
    </button>
  )
}
