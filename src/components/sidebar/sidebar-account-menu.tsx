"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Clock, LogOut, Settings } from "lucide-react"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { cn } from "@/lib/utils"

interface SidebarAccountMenuProps {
  isCollapsed: boolean
}

export function SidebarAccountMenu({ isCollapsed }: SidebarAccountMenuProps) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const {
    activeWorkspace,
    workspaces,
    switchWorkspace,
    currentUserName,
    currentUserEmail,
  } = useWorkspace()
  const { settings: orgSettings } = useWorkspaceSettings()

  const displayName = orgSettings.orgName || activeWorkspace?.name || "Workspace"
  const workspaceInitial =
    (orgSettings.orgName || activeWorkspace?.name)?.[0]?.toUpperCase() || "W"
  const hasMultipleWorkspaces = workspaces.length > 1
  const workspaceSectionHeight =
    workspaces.length > 0 ? 22 + workspaces.length * 36 + 8 : 0
  const accountHeaderHeight = currentUserEmail ? 56 : 40
  const menuEstimatedHeight = accountHeaderHeight + workspaceSectionHeight + 116

  const workspaceAvatar = orgSettings.logoUrl ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={orgSettings.logoUrl}
      alt=""
      className="h-[16px] w-[16px] shrink-0 rounded-[4px] object-contain"
    />
  ) : (
    <div className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] bg-folk-hover text-[10px] font-medium text-[#9e9e9e]">
      {workspaceInitial}
    </div>
  )

  const handleLogout = async () => {
    setIsOpen(false)
    const supabase = createClient()
    if (supabase) await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleSwitchWorkspace = (workspaceId: string) => {
    setIsOpen(false)
    switchWorkspace(workspaceId)
  }

  return (
    <div className={cn("relative min-w-0", isCollapsed ? "shrink-0" : "min-w-0 flex-1")}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-[29px] w-full min-w-0 items-center gap-[6px] rounded-[6px] border border-folk-border-strong bg-white text-left transition-colors hover:bg-folk-hover",
          isCollapsed ? "w-[29px] justify-center px-0" : "px-[8px]",
        )}
        aria-label="Account and workspace menu"
        aria-expanded={isOpen}
        tabIndex={0}
      >
        {isCollapsed ? (
          // Same workspace identity as the expanded trigger — the menu it
          // opens is workspace-first, so the trigger shouldn't switch to
          // showing the user.
          workspaceAvatar
        ) : (
          <>
            {workspaceAvatar}
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#202020]">
              {displayName}
            </span>
            <ChevronDown
              className={cn(
                "h-[12px] w-[12px] shrink-0 text-[#616161] transition-transform",
                isOpen && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          </>
        )}
      </button>

      <FixedDropdownMenu
        isOpen={isOpen}
        anchorRef={triggerRef}
        onClose={() => setIsOpen(false)}
        estimatedHeight={menuEstimatedHeight}
        minWidth={240}
        align="left"
        scrollable={false}
        className="py-[4px]"
      >
        <div className="border-b border-folk-border-subtle px-[12px] py-[10px]">
          <p className="truncate text-[13px] font-medium text-folk-text">
            {currentUserName || "Account"}
          </p>
          {currentUserEmail ? (
            <p className="truncate text-[11px] text-folk-secondary">{currentUserEmail}</p>
          ) : null}
        </div>

        {workspaces.length > 0 ? (
          <div className="border-b border-folk-border-subtle py-[4px]">
            <p className="px-[12px] py-[6px] text-[10px] font-medium tracking-wide text-folk-secondary">
              {hasMultipleWorkspaces ? "WORKSPACES" : "WORKSPACE"}
            </p>
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleSwitchWorkspace(workspace.id)}
                  disabled={isActive}
                  className={cn(
                    "flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium transition-colors",
                    isActive
                      ? "cursor-default bg-folk-hover text-folk-text"
                      : "text-folk-secondary hover:bg-folk-hover hover:text-folk-text",
                  )}
                  tabIndex={0}
                >
                  {isActive && orgSettings.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={orgSettings.logoUrl}
                      alt=""
                      className="h-[20px] w-[20px] shrink-0 rounded-[4px] object-contain"
                    />
                  ) : (
                    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-folk-hover text-[10px] font-medium text-[#9e9e9e]">
                      {(isActive ? displayName : workspace.name)[0]?.toUpperCase() || "W"}
                    </span>
                  )}
                  {/* The active row shows the same display name as the trigger —
                      org name when set, workspace name otherwise. Other
                      workspaces' org settings aren't loaded, so they fall back
                      to their workspace name. */}
                  <span className="min-w-0 flex-1 truncate">{isActive ? displayName : workspace.name}</span>
                  {isActive ? <Check className="h-[14px] w-[14px] shrink-0 text-folk-text" strokeWidth={2} /> : null}
                </button>
              )
            })}
          </div>
        ) : null}

        <Link
          href="/timesheets"
          onClick={() => setIsOpen(false)}
          className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          <Clock className="h-[14px] w-[14px]" strokeWidth={1.75} />
          My work
        </Link>
        <Link
          href="/settings"
          onClick={() => setIsOpen(false)}
          className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          <Settings className="h-[14px] w-[14px]" strokeWidth={1.75} />
          Settings
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          <LogOut className="h-[14px] w-[14px]" strokeWidth={1.75} />
          Sign out
        </button>
      </FixedDropdownMenu>
    </div>
  )
}
