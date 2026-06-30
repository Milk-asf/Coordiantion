"use client"

import { useRef, useState } from "react"
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Pin, PinOff, SquarePen, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import type { FixedDropdownAlign } from "@/lib/dropdown-utils"

interface DeleteActionsMenuProps {
  onDelete?: () => void
  onRename?: () => void
  onEdit?: () => void
  editLabel?: string
  onPin?: () => void
  isPinned?: boolean
  onArchive?: () => void
  isArchived?: boolean
  confirmTitle?: string
  confirmDescription?: string
  itemName?: string
  ariaLabel?: string
  menuAlign?: "left" | "right"
  menuPlacement?: "top" | "bottom"
  className?: string
  buttonClassName?: string
  stopPropagation?: boolean
}

export function DeleteActionsMenu({
  onDelete,
  onRename,
  onEdit,
  editLabel = "Edit",
  onPin,
  isPinned = false,
  onArchive,
  isArchived = false,
  confirmTitle = "Are you sure?",
  confirmDescription,
  itemName,
  ariaLabel = "More actions",
  menuAlign = "right",
  className = "",
  buttonClassName = "flex h-[28px] w-[28px] items-center justify-center rounded-none text-folk-placeholder transition-colors hover:bg-[#ebebeb] hover:text-folk-secondary",
  stopPropagation = false,
}: DeleteActionsMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const description = confirmDescription ?? (
    itemName
      ? `This will permanently delete "${itemName}". This action cannot be undone.`
      : "This action cannot be undone."
  )

  const handleMenuToggle = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
    setIsMenuOpen((prev) => !prev)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
    setIsMenuOpen(false)
    setIsConfirmOpen(true)
  }

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    onDelete?.()
  }

  const handleRenameClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
    setIsMenuOpen(false)
    onRename?.()
  }

  const handleEditClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
    setIsMenuOpen(false)
    onEdit?.()
  }

  const handleArchiveClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
    setIsMenuOpen(false)
    onArchive?.()
  }

  const handlePinClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation()
    setIsMenuOpen(false)
    onPin?.()
  }

  const menuItemCount = (onEdit ? 1 : 0) + (onRename ? 1 : 0) + (onPin ? 1 : 0) + (onArchive ? 1 : 0) + (onDelete ? 1 : 0)
  const align: FixedDropdownAlign = menuAlign === "right" ? "right" : "left"

  return (
    <>
      <div className={className}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleMenuToggle}
          className={buttonClassName}
          tabIndex={0}
          aria-label={ariaLabel}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
        </button>

        <FixedSelectDropdown
          isOpen={isMenuOpen}
          anchorRef={buttonRef}
          onClose={() => setIsMenuOpen(false)}
          estimatedHeight={menuItemCount * 40 + 8}
          minWidth={160}
          align={align}
          menuClassName="rounded-none border-folk-border-subtle shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={handleEditClick}
              className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-left text-[13px] text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              <SquarePen className="h-[13px] w-[13px]" strokeWidth={1.75} />
              {editLabel}
            </button>
          )}
          {onRename && (
            <button
              type="button"
              role="menuitem"
              onClick={handleRenameClick}
              className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-left text-[13px] text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              <Pencil className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Rename
            </button>
          )}
          {onPin && (
            <button
              type="button"
              role="menuitem"
              onClick={handlePinClick}
              className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-left text-[13px] text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              {isPinned ? (
                <PinOff className="h-[13px] w-[13px]" strokeWidth={1.75} />
              ) : (
                <Pin className="h-[13px] w-[13px]" strokeWidth={1.75} />
              )}
              {isPinned ? "Unpin" : "Pin"}
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              role="menuitem"
              onClick={handleArchiveClick}
              className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-left text-[13px] text-folk-text transition-colors hover:bg-folk-hover"
              tabIndex={0}
            >
              {isArchived ? (
                <ArchiveRestore className="h-[13px] w-[13px]" strokeWidth={1.75} />
              ) : (
                <Archive className="h-[13px] w-[13px]" strokeWidth={1.75} />
              )}
              {isArchived ? "Unarchive" : "Archive"}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={handleDeleteClick}
              className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-left text-[13px] text-red-500 transition-colors hover:bg-red-50"
              tabIndex={0}
            >
              <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
              Delete
            </button>
          )}
        </FixedSelectDropdown>
      </div>

      {onDelete && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={confirmTitle}
          description={description}
          confirmLabel="Delete"
          onConfirm={handleConfirm}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </>
  )
}
