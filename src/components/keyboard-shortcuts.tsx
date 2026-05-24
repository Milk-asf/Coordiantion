"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { X, Command } from "lucide-react"

interface Shortcut {
  key: string
  label: string
  description: string
  action: () => void
  modifier?: "meta" | "ctrl"
}

export function useKeyboardShortcuts(customShortcuts?: Shortcut[]) {
  const router = useRouter()
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const defaultShortcuts: Shortcut[] = [
    { key: "t", label: "G then T", description: "Go to Tasks", action: () => router.push("/tasks") },
    { key: "c", label: "G then C", description: "Go to Clients", action: () => router.push("/clients") },
    { key: "i", label: "G then I", description: "Go to Invoicing", action: () => router.push("/invoicing") },
    { key: "n", label: "G then N", description: "Go to Notes", action: () => router.push("/notes") },
    { key: "s", label: "G then S", description: "Go to Settings", action: () => router.push("/settings/general") },
    { key: "?", label: "?", description: "Show keyboard shortcuts", action: () => setIsHelpOpen(true) },
  ]

  const allShortcuts = [...defaultShortcuts, ...(customShortcuts || [])]
  const shortcutsRef = useRef(allShortcuts)
  shortcutsRef.current = allShortcuts

  useEffect(() => {
    let gPressed = false
    let gTimeout: ReturnType<typeof setTimeout>

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (isInput) return

      if (e.key === "Escape") {
        setIsHelpOpen(false)
        return
      }

      if (e.key === "?") {
        e.preventDefault()
        setIsHelpOpen((prev) => !prev)
        return
      }

      if (e.key === "g" || e.key === "G") {
        gPressed = true
        clearTimeout(gTimeout)
        gTimeout = setTimeout(() => { gPressed = false }, 1000)
        return
      }

      if (gPressed) {
        const shortcut = shortcutsRef.current.find((s) => s.key === e.key.toLowerCase())
        if (shortcut) {
          e.preventDefault()
          shortcut.action()
        }
        gPressed = false
        clearTimeout(gTimeout)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(gTimeout)
    }
  }, [])

  return { isHelpOpen, setIsHelpOpen, shortcuts: allShortcuts }
}

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  shortcuts,
}: {
  isOpen: boolean
  onClose: () => void
  shortcuts: Shortcut[]
}) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="mx-[16px] w-full max-w-[420px] rounded-[12px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[14px]">
          <div className="flex items-center gap-[8px]">
            <Command className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.5} />
            <h2 className="text-[14px] font-semibold text-[#262626]">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            aria-label="Close"
            tabIndex={0}
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-[16px]">
          <div className="space-y-[2px]">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.key + shortcut.description} className="flex items-center justify-between rounded-[6px] px-[10px] py-[8px] hover:bg-[#fafafa]">
                <span className="text-[13px] text-[#555]">{shortcut.description}</span>
                <kbd className="rounded-[4px] border border-[#e0e0e0] bg-[#f8f8f8] px-[6px] py-[2px] font-mono text-[11px] text-[#666]">
                  {shortcut.label}
                </kbd>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-[#f0f0f0] px-[20px] py-[10px]">
          <p className="text-[11px] text-[#bbb]">Press <kbd className="rounded border border-[#e0e0e0] bg-[#f8f8f8] px-[3px] py-[1px] font-mono text-[10px]">?</kbd> to toggle this panel</p>
        </div>
      </div>
    </div>
  )
}
