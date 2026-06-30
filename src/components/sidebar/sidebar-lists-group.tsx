"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Pin, Plus } from "lucide-react"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { cn } from "@/lib/utils"
import { useLists } from "@/lib/lists/context"
import { sortLists, type CustomList } from "@/lib/lists/definitions"
import { NewListFlow } from "@/app/(dashboard)/lists/_components/new-list-flow"
import { type NewListConfig } from "@/app/(dashboard)/lists/_components/new-list-modal"
import { useToast } from "@/components/toast"

interface SidebarListsGroupProps {
  isCollapsed: boolean
}

export function SidebarListsGroup({ isCollapsed }: SidebarListsGroupProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { lists, createCustomList, togglePin, deleteList } = useLists()
  const [isCreating, setIsCreating] = useState(false)
  const orderedLists = sortLists(lists)

  const handleCreate = async (params: NewListConfig) => {
    setIsCreating(false)
    const list = await createCustomList(params)
    if (list) router.push(`/lists/${list.id}`)
    else toast("Could not create list", "error")
  }

  const handleDelete = async (list: CustomList) => {
    try {
      await deleteList(list.id)
      toast(`Deleted "${list.name}"`, "success")
      if (pathname === `/lists/${list.id}`) router.push("/lists")
    } catch {
      toast("Could not delete list", "error")
    }
  }

  return (
    <div className="mt-4">
      {isCollapsed ? (
        <>
          <div className="mx-auto mb-1 h-px w-5 bg-sidebar-border" />
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="folk-sidebar-nav-item mx-auto flex h-[28px] w-[28px] items-center justify-center rounded-[4px] text-[#616161] transition-colors hover:bg-sidebar-hover"
            aria-label="New list"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </>
      ) : (
        <div className="mb-[6px] mt-[16px] flex items-center justify-between pl-[10px] pr-[6px]">
          <p className="text-[11px] font-normal tracking-wide text-[#999999]">Lists</p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] text-[#999999] transition-colors hover:bg-sidebar-hover hover:text-[#616161]"
            aria-label="New list"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <ul className="space-y-px">
        {orderedLists.map((list) => {
          const isActive = pathname === `/lists/${list.id}`
          return (
            <li key={list.id} className="group/list relative">
              <Link
                href={`/lists/${list.id}`}
                className={cn(
                  "mx-1 flex h-[32px] items-center gap-2 rounded-[4px] px-[12px] text-[12px] font-normal transition-colors",
                  isActive
                    ? "bg-sidebar-active font-medium text-sidebar-active-text"
                    : "text-[#616161] hover:bg-sidebar-hover",
                  isCollapsed ? "relative mx-0 justify-center px-0" : "pr-[28px]",
                )}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed ? list.name : undefined}
                tabIndex={0}
              >
                <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center text-[13px] leading-none">
                  {list.icon}
                </span>
                {!isCollapsed && (
                  <span className="flex min-w-0 flex-1 items-center gap-[4px]">
                    <span className="truncate">{list.name || "Untitled list"}</span>
                    {list.pinned && (
                      <Pin className="h-[11px] w-[11px] shrink-0 text-folk-secondary" strokeWidth={1.75} fill="currentColor" />
                    )}
                  </span>
                )}
              </Link>
              {!isCollapsed && (
                <div
                  className={cn(
                    "absolute right-[4px] top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/list:opacity-100 group-focus-within/list:opacity-100",
                    list.pinned && "opacity-100",
                  )}
                  onClick={(event) => event.preventDefault()}
                >
                  <DeleteActionsMenu
                    ariaLabel={`Actions for ${list.name}`}
                    stopPropagation
                    menuAlign="left"
                    buttonClassName="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] text-[#999999] transition-colors hover:bg-sidebar-hover hover:text-[#616161]"
                    onPin={() => togglePin(list.id)}
                    isPinned={list.pinned}
                    onDelete={() => handleDelete(list)}
                    itemName={list.name}
                    confirmTitle="Delete list?"
                    confirmDescription={`This will permanently delete "${list.name}". The underlying records are not affected.`}
                  />
                </div>
              )}
            </li>
          )
        })}

        {!isCollapsed && lists.length === 0 && (
          <li>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mx-1 flex h-[32px] w-[calc(100%-8px)] items-center gap-2 rounded-[4px] px-[12px] text-[12px] font-normal text-[#999999] transition-colors hover:bg-sidebar-hover hover:text-[#616161]"
              tabIndex={0}
            >
              <Plus className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">New list</span>
            </button>
          </li>
        )}
      </ul>

      {isCreating && <NewListFlow onClose={() => setIsCreating(false)} onCreate={handleCreate} />}
    </div>
  )
}
