"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  SquareCheck,
  User,
  BookOpen,
  CircleDollarSign,
  FileCheck,
  StickyNote,
  Package,
  Settings,
  ArrowRight,
} from "lucide-react"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useStaff } from "@/lib/hooks/use-staff"

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  action: () => void
  category: "page" | "client" | "task" | "staff"
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { clients } = useClients()
  const { tasks } = useTasks()
  const { staff } = useStaff()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const pages: CommandItem[] = useMemo(() => [
    { id: "p-dashboard", label: "Dashboard", icon: <SquareCheck className="h-[16px] w-[16px]" />, action: () => router.push("/"), category: "page" },
    { id: "p-tasks", label: "Tasks", icon: <SquareCheck className="h-[16px] w-[16px]" />, action: () => router.push("/tasks"), category: "page" },
    { id: "p-clients", label: "Clients", icon: <User className="h-[16px] w-[16px]" />, action: () => router.push("/clients"), category: "page" },
    { id: "p-contacts", label: "Contacts", icon: <BookOpen className="h-[16px] w-[16px]" />, action: () => router.push("/contacts"), category: "page" },
    { id: "p-staff", label: "Staff", icon: <User className="h-[16px] w-[16px]" />, action: () => router.push("/staff"), category: "page" },
    { id: "p-invoicing", label: "Invoicing", icon: <CircleDollarSign className="h-[16px] w-[16px]" />, action: () => router.push("/invoicing"), category: "page" },
    { id: "p-ndis", label: "NDIS Plans", icon: <FileCheck className="h-[16px] w-[16px]" />, action: () => router.push("/ndis-plans"), category: "page" },
    { id: "p-notes", label: "Notes", icon: <StickyNote className="h-[16px] w-[16px]" />, action: () => router.push("/notes"), category: "page" },
    { id: "p-documents", label: "Documents", icon: <Package className="h-[16px] w-[16px]" />, action: () => router.push("/documents"), category: "page" },
    { id: "p-settings", label: "Settings", icon: <Settings className="h-[16px] w-[16px]" />, action: () => router.push("/settings/general"), category: "page" },
  ], [router])

  const clientItems: CommandItem[] = useMemo(() =>
    clients.map((c) => ({
      id: `c-${c.id}`,
      label: c.name,
      sublabel: c.participant?.ndisNumber || undefined,
      icon: <div className="flex h-[16px] w-[16px] items-center justify-center rounded-[4px] bg-[#DBEAFE] text-[8px] font-semibold text-[#2563EB]">{c.iconText}</div>,
      action: () => router.push(`/clients/${c.id}`),
      category: "client" as const,
    })),
  [clients, router])

  const taskItems: CommandItem[] = useMemo(() =>
    tasks.filter((t) => t.status !== "done").map((t) => ({
      id: `t-${t.id}`,
      label: t.title,
      sublabel: t.client || undefined,
      icon: <SquareCheck className="h-[16px] w-[16px]" />,
      action: () => router.push(`/tasks`),
      category: "task" as const,
    })),
  [tasks, router])

  const staffItems: CommandItem[] = useMemo(() =>
    staff.map((s) => ({
      id: `s-${s.id}`,
      label: s.name,
      sublabel: s.details?.role || undefined,
      icon: <div className="flex h-[16px] w-[16px] items-center justify-center rounded-[4px] bg-[#DBEAFE] text-[8px] font-semibold text-[#2563EB]">{s.iconText}</div>,
      action: () => router.push(`/staff/${s.id}`),
      category: "staff" as const,
    })),
  [staff, router])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return pages.slice(0, 8)

    const all = [...pages, ...clientItems, ...taskItems, ...staffItems]
    return all
      .filter((item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [query, pages, clientItems, taskItems, staffItems])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = useCallback((item: CommandItem) => {
    setIsOpen(false)
    item.action()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault()
      handleSelect(filtered[selectedIndex])
    }
  }, [filtered, selectedIndex, handleSelect])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!isOpen) return null

  const grouped = {
    page: filtered.filter((i) => i.category === "page"),
    client: filtered.filter((i) => i.category === "client"),
    task: filtered.filter((i) => i.category === "task"),
    staff: filtered.filter((i) => i.category === "staff"),
  }

  let runningIndex = -1

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />

      <div className="relative w-[560px] overflow-hidden rounded-[12px] border border-[#e0e0e0] bg-white shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-[12px] border-b border-[#f0f0f0] px-[16px]">
          <Search className="h-[16px] w-[16px] shrink-0 text-[#999]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, clients, tasks…"
            className="h-[48px] flex-1 bg-transparent text-[14px] text-[#262626] outline-none placeholder:text-[#bbb]"
          />
          <kbd className="rounded-[4px] border border-[#e8e8e8] bg-[#f5f5f5] px-[6px] py-[2px] text-[11px] text-[#999]">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-[8px]">
          {filtered.length === 0 && (
            <div className="px-[12px] py-[24px] text-center text-[13px] text-[#999]">
              No results found
            </div>
          )}

          {(["page", "client", "task", "staff"] as const).map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            const label = cat === "page" ? "Pages" : cat === "client" ? "Clients" : cat === "task" ? "Tasks" : "Staff"

            return (
              <div key={cat} className="mb-[4px]">
                <div className="px-[12px] py-[6px] text-[11px] font-medium uppercase tracking-wide text-[#999]">
                  {label}
                </div>
                {items.map((item) => {
                  runningIndex++
                  const idx = runningIndex
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-left transition-colors ${
                        idx === selectedIndex ? "bg-[#f0f4ff] text-[#262626]" : "text-[#555] hover:bg-[#f8f8f8]"
                      }`}
                      tabIndex={-1}
                    >
                      <span className="shrink-0 text-[#888]">{item.icon}</span>
                      <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="truncate text-[12px] text-[#bbb]">{item.sublabel}</span>
                      )}
                      <ArrowRight className="h-[12px] w-[12px] shrink-0 text-[#ccc]" />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-[16px] border-t border-[#f0f0f0] px-[16px] py-[10px]">
          <span className="flex items-center gap-[4px] text-[11px] text-[#bbb]">
            <kbd className="rounded-[3px] border border-[#e8e8e8] bg-[#f5f5f5] px-[4px] py-[1px] text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-[4px] text-[11px] text-[#bbb]">
            <kbd className="rounded-[3px] border border-[#e8e8e8] bg-[#f5f5f5] px-[4px] py-[1px] text-[10px]">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-[4px] text-[11px] text-[#bbb]">
            <kbd className="rounded-[3px] border border-[#e8e8e8] bg-[#f5f5f5] px-[4px] py-[1px] text-[10px]">⌘K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  )
}
