"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { Columns3, LayoutList, Table2, Tag } from "lucide-react"
import { ListViewToolbar } from "@/components/list-view-toolbar"
import { PageTitleBar } from "@/components/page-title-bar"
import { pageTitleTextClass } from "@/components/tab-active-indicator"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { EmptyState } from "@/components/empty-state"
import { PageError, PageLoader } from "@/components/page-state"
import { useToast } from "@/components/toast"
import { tabButtonClass } from "@/components/tab-active-indicator"
import type { TableFilterDefinition } from "@/components/table-multi-filter"
import { useListQueryState } from "@/lib/hooks/use-list-query-state"
import { applyListQuery, buildFilterOptions, queryFieldsFromListFields } from "@/lib/list-query"
import { useLists } from "@/lib/lists/context"
import { createListColumn, createCustomListColumn, formatListRecordCount, getKanbanFields, getListSource, getRecordId, getSourceColumns, resolveListRecords } from "@/lib/lists/definitions"
import type { CustomFieldKind } from "@/lib/lists/custom-field-types"
import { UNASSIGNED_KANBAN_STAGE } from "@/lib/lists/kanban-utils"
import { useListSourceData } from "@/lib/lists/use-list-data"
import { formatFieldValue } from "../_components/list-cell"
import { ListAddRecordsDropdown } from "../_components/list-add-records-dropdown"
import { ListTableView } from "../_components/list-table-view"
import { ListKanbanView } from "../_components/list-kanban-view"
import { useListRecordActions } from "@/lib/lists/use-list-record-actions"

export default function ListDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { getList, isLoading, fetchError, updateList, togglePin, deleteList, refetch } = useLists()
  const { toast } = useToast()
  const { records: sourceRecords } = useListSourceData()

  const list = getList(params.id)
  const { openRecord } = useListRecordActions(list?.source ?? "")
  const [name, setName] = useState("")
  const {
    state: queryState,
    setSearch,
    handleFilterChange,
    handleSelectSort,
    clearSort,
  } = useListQueryState()

  useEffect(() => {
    if (list) setName(list.name)
  }, [list])

  const allSourceRecords = useMemo(() => (list ? sourceRecords[list.source] ?? [] : []), [list, sourceRecords])

  const listRecords = useMemo(
    () => (list ? resolveListRecords(allSourceRecords, list.recordIds) : []),
    [list, allSourceRecords],
  )

  const filterFields = useMemo(() => (list ? getKanbanFields(list.source) : []), [list])

  const filterDefinitions = useMemo<TableFilterDefinition[]>(
    () => filterFields.map((field) => ({ key: field.key, label: field.label, icon: Tag })),
    [filterFields],
  )

  const allColumns = useMemo(() => (list ? getSourceColumns(list.source) : []), [list])
  const queryFields = useMemo(() => queryFieldsFromListFields(allColumns), [allColumns])
  const filterQueryFields = useMemo(() => queryFieldsFromListFields(filterFields), [filterFields])

  const formatListFieldValue = (field: Parameters<typeof formatFieldValue>[0], record: unknown) =>
    formatFieldValue(field, record)

  const filterOptions = useMemo(
    () =>
      buildFilterOptions(listRecords, filterQueryFields, (field, record) =>
        formatListFieldValue(field as Parameters<typeof formatFieldValue>[0], record),
      ),
    [listRecords, filterQueryFields],
  )

  const processedRecords = useMemo(() => {
    if (!list) return []
    return applyListQuery(listRecords, queryState, {
      fields: queryFields,
      formatValue: (field, record) =>
        formatListFieldValue(field as Parameters<typeof formatFieldValue>[0], record),
      searchFields: queryFields,
    })
  }, [list, listRecords, queryState, queryFields])

  const sortFields = useMemo(
    () => allColumns.map((column) => ({ key: column.key, label: column.label })),
    [allColumns],
  )

  if (isLoading && !list) return <PageLoader label="Loading list…" />
  if (fetchError && !list) return <PageError message={fetchError} onRetry={refetch} />
  if (!list) {
    return (
      <div className="flex h-full flex-col">
        <Header name="Lists" onBack={() => router.push("/lists")} />
        <div className="flex-1 bg-folk-surface">
          <EmptyState
            icon={LayoutList}
            title="List not found"
            description="This list may have been deleted."
            action={{ label: "Back to lists", onClick: () => router.push("/lists") }}
            className="h-full"
          />
        </div>
      </div>
    )
  }

  const source = getListSource(list.source)

  const handleSaveName = () => {
    const trimmed = name.trim() || "Untitled list"
    if (trimmed !== list.name) updateList(list.id, { name: trimmed })
  }

  const handleAddSourceField = (fieldKey: string) => {
    updateList(list.id, { columns: [...list.columns, createListColumn(fieldKey)] })
  }

  const handleAddCustomField = (kind: CustomFieldKind) => {
    updateList(list.id, { columns: [...list.columns, createCustomListColumn(kind)] })
  }

  const handleRemoveColumn = (columnId: string) => {
    const removed = list.columns.find((column) => column.id === columnId)
    const nextColumns = list.columns.filter((column) => column.id !== columnId)
    if (!removed?.custom) {
      updateList(list.id, { columns: nextColumns })
      return
    }
    const nextCustomValues = { ...(list.customValues ?? {}) }
    for (const recordId of Object.keys(nextCustomValues)) {
      if (nextCustomValues[recordId]?.[removed.fieldKey] !== undefined) {
        const { [removed.fieldKey]: _removed, ...rest } = nextCustomValues[recordId]
        if (Object.keys(rest).length === 0) delete nextCustomValues[recordId]
        else nextCustomValues[recordId] = rest
      }
    }
    updateList(list.id, { columns: nextColumns, customValues: nextCustomValues })
  }

  const handleCustomValueChange = (recordId: string, fieldKey: string, value: unknown) => {
    const nextCustomValues = { ...(list.customValues ?? {}) }
    nextCustomValues[recordId] = { ...(nextCustomValues[recordId] ?? {}), [fieldKey]: value }
    updateList(list.id, { customValues: nextCustomValues })
  }

  const handleAddRecord = (recordId: string) => {
    const ids = list.recordIds ?? []
    if (ids.includes(recordId)) return
    updateList(list.id, { recordIds: [...ids, recordId] })
  }

  const handleAddAllRecords = () => {
    const memberSet = new Set(list.recordIds ?? [])
    const nextIds = [...(list.recordIds ?? [])]
    allSourceRecords.forEach((record, index) => {
      const id = getRecordId(record, index)
      if (memberSet.has(id)) return
      memberSet.add(id)
      nextIds.push(id)
    })
    updateList(list.id, { recordIds: nextIds })
  }

  const handleDelete = async () => {
    try {
      await deleteList(list.id)
      toast(`Deleted "${list.name}"`, "success")
      router.push("/lists")
    } catch {
      toast("Could not delete list", "error")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        name={name}
        onName={setName}
        onSaveName={handleSaveName}
        icon={list.icon}
        onBack={() => router.push("/lists")}
        actions={
          <DeleteActionsMenu
            ariaLabel={`Actions for ${list.name}`}
            stopPropagation
            onPin={() => togglePin(list.id)}
            isPinned={list.pinned}
            onDelete={handleDelete}
            itemName={list.name}
            confirmTitle="Delete list?"
            confirmDescription={`This will permanently delete "${list.name}". The underlying records are not affected.`}
          />
        }
      />

      {/* View switcher */}
      <div className="flex h-[44px] shrink-0 items-stretch border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="folk-tab-bar flex h-full items-stretch [&_.folk-tab:last-child]:mr-0">
          <button
            type="button"
            onClick={() => updateList(list.id, { view: "table" })}
            className={tabButtonClass(list.view === "table")}
            aria-current={list.view === "table" ? "page" : undefined}
            aria-selected={list.view === "table"}
            tabIndex={0}
          >
            <Table2 className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
            <span className="folk-tab-label">Table</span>
          </button>
          <button
            type="button"
            onClick={() => updateList(list.id, { view: "kanban" })}
            className={tabButtonClass(list.view === "kanban")}
            aria-current={list.view === "kanban" ? "page" : undefined}
            aria-selected={list.view === "kanban"}
            tabIndex={0}
          >
            <Columns3 className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
            <span className="folk-tab-label">Kanban</span>
          </button>
        </div>
      </div>

      {/* Filter / sort toolbar */}
      <ListViewToolbar
        filters={filterDefinitions}
        filterValues={queryState.filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        search={queryState.search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${source?.noun ?? "records"}…`}
        searchAriaLabel="Search list"
        sortFields={sortFields}
        sort={queryState.sort}
        onSelectSort={handleSelectSort}
        onClearSort={clearSort}
      />

      {!source ? (
        <div className="flex-1 bg-folk-surface">
          <EmptyState
            icon={LayoutList}
            title="Unknown data source"
            description="This list points to a data source that no longer exists."
            className="h-full"
          />
        </div>
      ) : list.view === "table" ? (
        <div className="flex-1 overflow-hidden bg-white">
          <ListTableView
            list={list}
            records={processedRecords}
            recordCountLabel={formatListRecordCount(listRecords.length, list.source)}
            onAddSourceField={handleAddSourceField}
            onAddCustomField={handleAddCustomField}
            onRemoveColumn={handleRemoveColumn}
            onCustomValueChange={handleCustomValueChange}
            onOpenRecord={(record, index) => openRecord(record, index)}
            addRecordsSlot={
              <ListAddRecordsDropdown
                sourceKey={list.source}
                allRecords={allSourceRecords}
                memberIds={list.recordIds ?? []}
                onAdd={handleAddRecord}
                onAddAll={handleAddAllRecords}
                variant="inline"
              />
            }
          />
        </div>
      ) : (
        <ListKanbanView
          className="min-h-0 flex-1"
          list={list}
          records={processedRecords}
          onUpdateStages={(stages) => updateList(list.id, { kanbanStages: stages })}
          onMoveRecord={async (record, stageKey) => {
            const recordId = getRecordId(record, 0)
            const assignments = { ...(list.kanbanRecordStages ?? {}) }
            if (stageKey === UNASSIGNED_KANBAN_STAGE) delete assignments[recordId]
            else assignments[recordId] = stageKey
            await updateList(list.id, { kanbanRecordStages: assignments })
            return true
          }}
          onOpenRecord={(record, index) => openRecord(record, index)}
        />
      )}
    </div>
  )
}

interface HeaderProps {
  name: string
  onName?: (value: string) => void
  onSaveName?: () => void
  icon?: string
  onBack: () => void
  actions?: ReactNode
}

function Header({ name, onName, onSaveName, icon, onBack, actions }: HeaderProps) {
  return (
    <PageTitleBar
      onBack={onBack}
      backLabel="Back to lists"
      title={
        <div className="flex min-w-0 flex-1 items-center gap-[8px]">
          {icon ? <span className="shrink-0 text-[16px] leading-none">{icon}</span> : null}
          {onName ? (
            <input
              value={name}
              onChange={(event) => onName(event.target.value)}
              onBlur={onSaveName}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur()
              }}
              className={pageTitleTextClass("min-w-0 flex-1 bg-transparent outline-none")}
              aria-label="List name"
              tabIndex={0}
            />
          ) : (
            <h1 className={pageTitleTextClass("min-w-0 truncate")}>{name}</h1>
          )}
        </div>
      }
      trailing={actions}
    />
  )
}
