"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  SquareCheck,
  StickyNote,
  Package,
  CircleDollarSign,
  FileCheck,
  User,
  BookOpen,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"

const navItems = [
  { label: "Tasks", href: "/tasks", icon: SquareCheck },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Documents", href: "/documents", icon: Package },
  { label: "Invoicing", href: "/invoicing", icon: CircleDollarSign },
  { label: "NDIS Plans", href: "/ndis-plans", icon: FileCheck },
  { label: "Clients", href: "/clients", icon: User },
  { label: "Contacts", href: "/contacts", icon: BookOpen },
  { label: "Staff", href: "/staff", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { activeWorkspace } = useWorkspace()

  return (
    <>
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-[16px] md:hidden">
        <span className="text-[14px] font-semibold text-[#262626] truncate">
          {activeWorkspace?.name || "Coordination"}
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] text-[#555] transition-colors hover:bg-[#f5f5f5]"
          aria-label="Open navigation"
          tabIndex={0}
        >
          <Menu className="h-[20px] w-[20px]" strokeWidth={1.5} />
        </button>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
          <nav className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-xl">
            <div className="flex h-[52px] items-center justify-between border-b border-[#f0f0f0] px-[16px]">
              <span className="text-[14px] font-semibold text-[#262626]">
                {activeWorkspace?.name || "Coordination"}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] text-[#888] transition-colors hover:bg-[#f5f5f5]"
                aria-label="Close navigation"
                tabIndex={0}
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
            </div>
            <ul className="flex flex-col gap-[2px] p-[12px]">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[14px] font-medium transition-colors",
                        isActive
                          ? "bg-[#f0f0f0] text-[#262626]"
                          : "text-[#555] hover:bg-[#f8f8f8] hover:text-[#262626]"
                      )}
                      tabIndex={0}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
