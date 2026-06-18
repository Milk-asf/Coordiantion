"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Table2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface SavedView {
  id: string
  name: string
}

export function ClientsViewsNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [views, setViews] = useState<SavedView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)

  const isClientsPage = pathname === "/clients" || pathname.startsWith("/clients/")

  useEffect(() => {
    if (!isClientsPage) return

    const load = () => {
      try {
        setViews(JSON.parse(localStorage.getItem("client-views") || "[]"))
        setActiveViewId(localStorage.getItem("client-active-view"))
      } catch {
        setViews([])
        setActiveViewId(null)
      }
    }

    load()
    window.addEventListener("storage", load)
    const interval = setInterval(load, 1000)
    return () => {
      window.removeEventListener("storage", load)
      clearInterval(interval)
    }
  }, [isClientsPage])

  if (!isClientsPage || isCollapsed) return null

  const handleSelectView = (viewId: string | null) => {
    if (viewId) localStorage.setItem("client-active-view", viewId)
    else localStorage.removeItem("client-active-view")
    setActiveViewId(viewId)
    router.push("/clients")
    router.refresh()
  }

  return (
    <div className="mt-[8px] px-[6px]">
      <p className="mb-[4px] px-[4px] text-[11px] font-normal text-[#999999]">Views</p>
      <ul className="space-y-[1px]">
        <li>
          <button
            type="button"
            onClick={() => handleSelectView(null)}
            className={cn(
              "flex w-full items-center gap-[8px] rounded-none px-[10px] py-[7px] text-[13px] font-normal transition-colors",
              !activeViewId ? "bg-[#f5f5f5] font-medium text-[#111111]" : "text-[#111111] hover:bg-[#f5f5f5]"
            )}
            tabIndex={0}
          >
            <Table2 className="h-[14px] w-[14px] shrink-0 text-[#999999]" strokeWidth={1.5} />
            <span className="truncate">All clients</span>
          </button>
        </li>
        {views.map((view) => (
          <li key={view.id}>
            <button
              type="button"
              onClick={() => handleSelectView(view.id)}
              className={cn(
                "flex w-full items-center gap-[8px] rounded-none px-[10px] py-[7px] text-[13px] font-normal transition-colors",
                activeViewId === view.id ? "bg-[#f5f5f5] font-medium text-[#111111]" : "text-[#111111] hover:bg-[#f5f5f5]"
              )}
              tabIndex={0}
            >
              <Table2 className="h-[14px] w-[14px] shrink-0 text-[#999999]" strokeWidth={1.5} />
              <span className="truncate">{view.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
