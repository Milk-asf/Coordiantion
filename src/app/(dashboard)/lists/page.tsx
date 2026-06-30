"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Building2, Columns3, LayoutList, Pin, Plus, Table2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageTitleBar } from "@/components/page-title-bar"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { PageError, PageLoader } from "@/components/page-state"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { useToast } from "@/components/toast"
import { folkPrimaryAddBtnClass } from "@/lib/folk-ui"
import {
  WorkspaceCard,
  WorkspaceCardPill,
  WorkspaceCardText,
  pastelFromHex,
} from "@/components/workspace-card"
import { useLists } from "@/lib/lists/context"
import { getListSource, sortLists, type CustomList } from "@/lib/lists/definitions"
import { NewListFlow } from "./_components/new-list-flow"
import { type NewListConfig } from "./_components/new-list-modal"

function formatDate(value: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

export default function ListsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { lists, isLoading, fetchError, createCustomList, togglePin, deleteList, refetch } = useLists()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matched = !query
      ? lists
      : lists.filter((list) =>
          [list.name, getListSource(list.source)?.label ?? ""].some((text) => text.toLowerCase().includes(query)),
        )
    return sortLists(matched)
  }, [lists, searchQuery])

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
    } catch {
      toast("Could not delete list", "error")
    }
  }

  if (isLoading && lists.length === 0) return <PageLoader label="Loading lists…" />
  if (fetchError && lists.length === 0) return <PageError message={fetchError} onRetry={refetch} />

  return (
    <div className="flex h-full flex-col">
      <PageTitleBar title="Lists" />
      <div className="flex h-[44px] shrink-0 items-center justify-end gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className={folkPrimaryAddBtnClass()}
          tabIndex={0}
          aria-label="Add new list"
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          <span>Add new</span>
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="flex-1 overflow-y-auto bg-folk-surface">
          <EmptyState
            icon={LayoutList}
            title="No lists yet"
            description="Create a list from any data source — participants, staff, incidents, tasks and more — then track them as a table or kanban board."
            action={{ label: "Create list", onClick: () => setIsCreating(true) }}
            className="h-full"
          />
        </div>
      ) : (
        <>
          <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle bg-white px-[16px]">
            <ExpandableTableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search lists…" ariaLabel="Search lists" />
            <span className="ml-auto text-[12px] text-folk-secondary">
              {filtered.length} {filtered.length === 1 ? "list" : "lists"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-folk-surface p-[16px]">
            {filtered.length === 0 ? (
              <p className="pt-[48px] text-center text-[13px] text-folk-tertiary">No lists match your search.</p>
            ) : (
              <div className="grid gap-[12px] [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                {filtered.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onOpen={() => router.push(`/lists/${list.id}`)}
                    onPin={() => togglePin(list.id)}
                    onDelete={() => handleDelete(list)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isCreating && <NewListFlow onClose={() => setIsCreating(false)} onCreate={handleCreate} />}
    </div>
  )
}

interface ListCardProps {
  list: CustomList
  onOpen: () => void
  onPin: () => void
  onDelete: () => void
}

function ListCard({ list, onOpen, onPin, onDelete }: ListCardProps) {
  const source = getListSource(list.source)
  const columnCount = list.columns.length

  const rows = [
    {
      icon: Building2,
      content: <WorkspaceCardText>{source?.label ?? "Data source"}</WorkspaceCardText>,
    },
    {
      icon: Briefcase,
      content: (
        <WorkspaceCardText>
          {columnCount} {columnCount === 1 ? "column" : "columns"}
        </WorkspaceCardText>
      ),
    },
    {
      icon: list.view === "kanban" ? Columns3 : Table2,
      content: <WorkspaceCardPill label={list.view === "kanban" ? "Kanban view" : "Table view"} tone="blue" />,
    },
    {
      icon: Briefcase,
      content: <WorkspaceCardText>{formatDate(list.createdAt)}</WorkspaceCardText>,
    },
  ]

  return (
    <WorkspaceCard
      title={list.name || "Untitled list"}
      avatar={list.icon}
      avatarBackground={pastelFromHex(list.iconColor || "#3BA3F8")}
      rows={rows}
      onClick={onOpen}
      headerAccessory={
        list.pinned ? (
          <Pin className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} fill="currentColor" />
        ) : undefined
      }
      actions={
        <DeleteActionsMenu
          ariaLabel={`Actions for ${list.name}`}
          stopPropagation
          onEdit={onOpen}
          editLabel="Open list"
          onPin={onPin}
          isPinned={list.pinned}
          onDelete={onDelete}
          itemName={list.name}
          confirmTitle="Delete list?"
          confirmDescription={`This will permanently delete "${list.name}". The underlying records are not affected.`}
        />
      }
    />
  )
}
