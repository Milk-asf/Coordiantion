import { cn } from "@/lib/utils"

/** Dotpoint-style nav typography and chrome */
export function folkNavBarClass(className?: string) {
  return cn(
    "flex h-[44px] shrink-0 items-center border-b border-[var(--folk-nav-bar-border)] bg-white",
    className
  )
}

export function folkNavSecondaryTextClass(className?: string) {
  return cn("text-[12px] font-normal leading-none text-[var(--folk-nav-muted)]", className)
}

export function folkNavPrimaryTextClass(className?: string) {
  return cn("text-[13px] font-medium leading-none text-folk-text", className)
}

/** Standard page title typography — matches title bar h1 across list/detail pages. */
export function pageTitleTextClass(className?: string) {
  return cn("text-[16px] font-semibold leading-[1.2] tracking-[-0.02em] text-folk-text", className)
}

/** Top title row — 52px; bottom border aligns with sidebar workspace header. */
export function pageTitleBarClass(className?: string) {
  return cn(
    "flex h-[52px] shrink-0 items-center border-b border-folk-border bg-white",
    className,
  )
}

/** Sidebar workspace row — same 52px height as pageTitleBarClass for aligned borders. */
export function sidebarWorkspaceHeaderClass(className?: string) {
  return cn(
    "flex h-[52px] shrink-0 items-center border-b border-folk-border bg-white px-3",
    className,
  )
}

export function folkNavActionLinkClass(className?: string) {
  return cn(
    "outline-btn folk-pill-btn h-[28px] min-h-[28px] px-[12px] text-[12px] font-medium leading-none",
    className
  )
}

export function folkNavIconButtonClass(className?: string) {
  return cn(
    "icon-btn folk-nav-icon-btn",
    className
  )
}

export function folkNavDividerClass(className?: string) {
  return cn("h-[16px] w-px shrink-0 bg-[var(--folk-nav-bar-border)]", className)
}

export function folkNavEntityPillClass(className?: string) {
  return cn(
    "inline-flex h-[28px] max-w-full shrink-0 items-center gap-[6px] rounded-[6px] border border-folk-border-strong bg-white px-[8px] text-[13px] font-medium leading-none text-folk-text",
    className
  )
}

export function tabButtonClass(isActive: boolean, className?: string) {
  return cn(
    "folk-tab",
    isActive && "folk-tab-active",
    className
  )
}

/** Bordered pill for sidebar / segmented tabs (Details, Activity, saved views, etc.) */
export function viewTabButtonClass(isActive: boolean, className?: string) {
  return cn(
    "inline-flex shrink-0 items-center gap-[5px] text-[12px] font-normal leading-none transition-colors",
    isActive
      ? "outline-btn folk-pill-btn h-[28px] min-h-[28px] px-[10px] !text-[12px] !font-normal hover:bg-folk-hover"
      : "rounded-full border border-transparent bg-transparent px-[8px] py-[2px] text-[var(--folk-nav-muted)] hover:text-folk-text",
    className
  )
}

/** List-page view tab row (Clients, Staff, etc.) — underline tabs. */
export function listViewTabBarClass(className?: string) {
  return cn(
    "folk-tab-bar folk-tab-scroll relative flex h-[40px] shrink-0 items-stretch gap-0 overflow-x-auto overflow-y-visible border-b border-[var(--folk-nav-bar-border)] bg-white px-[16px]",
    className
  )
}

/** Filter / search row directly above list table or kanban. */
export function listViewFilterBarClass(className?: string) {
  return cn(
    "flex min-h-[41px] shrink-0 flex-wrap items-center gap-[8px] border-b border-folk-border bg-white px-[16px] py-[6px]",
    className,
  )
}

/** Scrollable list body beneath filter toolbar. */
export function listViewBodyClass(className?: string) {
  return cn("min-h-0 flex-1 overflow-auto bg-white outline-none", className)
}

/** Kanban board scroll row. */
export function listViewKanbanScrollClass(className?: string) {
  return cn(
    "folk-kanban-scroll flex h-full min-h-0 items-start gap-[16px] overflow-x-auto overflow-y-hidden bg-white p-[16px] outline-none",
    className,
  )
}

/** Primary page toolbar (title row, 44px). */
export function pageNavBarClass(className?: string) {
  return cn(
    "flex h-[40px] shrink-0 items-center border-b border-[var(--folk-nav-bar-border)] bg-white",
    className
  )
}

/** Secondary toolbar / filter row (41px). */
export function subNavBarClass(className?: string) {
  return cn(
    "flex h-[40px] shrink-0 items-center border-b border-[var(--folk-nav-bar-border)] bg-white",
    className
  )
}

/** Segmented / pill tab row (roster shift parts, list views, etc.). */
export function segmentedTabBarClass(className?: string) {
  return cn("relative flex min-w-0 items-center gap-[4px]", className)
}

/** Profile / record page tab strip — underline tabs aligned to the bar border. */
export function profileTabBarClass(className?: string) {
  return cn("folk-tab-bar relative flex min-w-0 items-stretch gap-0", className)
}

export function profileMainTabScrollClass(className?: string) {
  return cn(
    "folk-tab-bar folk-tab-scroll relative flex h-full min-w-0 flex-1 items-stretch gap-0 overflow-x-auto overflow-y-visible",
    className
  )
}

/** Full-width profile page tab row (client/staff record pages). */
export function profilePageTabRowClass(className?: string) {
  return cn(
    "flex h-[44px] shrink-0 items-stretch border-b border-[var(--folk-nav-bar-border)] bg-white",
    className
  )
}

export function profilePageTabBarClass(className?: string) {
  return cn(
    "folk-tab-bar relative flex h-full min-w-0 flex-1 items-stretch justify-between gap-0 overflow-visible px-[16px]",
    className
  )
}

export function pageNavTabsScrollClass(className?: string) {
  return cn(
    "folk-tab-scroll flex min-w-0 flex-1 items-stretch gap-[12px] overflow-x-auto",
    className,
  )
}
