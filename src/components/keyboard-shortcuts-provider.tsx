"use client"

import { useKeyboardShortcuts, KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts"

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { isHelpOpen, setIsHelpOpen, shortcuts } = useKeyboardShortcuts()

  return (
    <>
      {children}
      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        shortcuts={shortcuts}
      />
    </>
  )
}
