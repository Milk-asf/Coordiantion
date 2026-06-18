/** Folk CRM table — light grid borders, 36px rows per design brief. */
export const TABLE_ROW_HEIGHT = "h-[36px] max-h-[36px]"

export const TABLE_HEADER_HEIGHT = "h-[32px] max-h-[32px]"

export const TABLE_CELL_X = "px-[16px]"

/** Use collapse so adjacent cell borders merge into continuous grid lines. */
export const TABLE_GRID = "border-collapse text-left"

/** Persistent 1px divider on sticky column right edge (border-r collapses away on scroll). */
export const TABLE_STICKY_DIVIDER = "shadow-[inset_-1px_0_0_0_var(--folk-border)]"

export const TABLE_CHECKBOX_CELL = "w-[40px] min-w-[40px] max-w-[40px] border-r border-folk-border px-[12px]"

/** Last sticky column — pseudo-element right edge (single line, survives horizontal scroll). */
export const TABLE_CELL_STICKY_EDGE = `${TABLE_ROW_HEIGHT} align-middle border-b border-folk-border bg-folk-surface ${TABLE_CELL_X} ${TABLE_STICKY_DIVIDER}`

export const TABLE_HEADER_STICKY_EDGE = `${TABLE_HEADER_HEIGHT} align-middle border-b border-folk-border bg-white ${TABLE_CELL_X} text-[11px] font-medium uppercase tracking-normal text-folk-secondary ${TABLE_STICKY_DIVIDER}`

export const TABLE_HEADER_STICKY_CHECKBOX = `${TABLE_HEADER_HEIGHT} align-middle border-b border-folk-border bg-white ${TABLE_CHECKBOX_CELL}`

export const TABLE_CELL_STICKY_CHECKBOX = `${TABLE_ROW_HEIGHT} align-middle border-b border-folk-border bg-folk-surface ${TABLE_CHECKBOX_CELL}`

export const TABLE_CELL_BASE = `${TABLE_ROW_HEIGHT} align-middle border-b border-r border-folk-border ${TABLE_CELL_X}`

export const TABLE_CELL_LAST = `${TABLE_ROW_HEIGHT} align-middle border-b border-folk-border ${TABLE_CELL_X}`

export const TABLE_HEADER_CELL = `${TABLE_HEADER_HEIGHT} align-middle border-b border-r border-folk-border bg-white ${TABLE_CELL_X} text-[11px] font-medium uppercase tracking-normal text-folk-secondary`

export const TABLE_HEADER_CELL_LAST = `${TABLE_HEADER_HEIGHT} align-middle border-b border-folk-border bg-white ${TABLE_CELL_X} text-[11px] font-medium uppercase tracking-normal text-folk-secondary`

export const TABLE_CELL_INNER = "flex h-full min-w-0 items-center gap-[10px] overflow-hidden"

export const TABLE_CHIP = "folk-chip inline-flex h-[20px] shrink-0 items-center whitespace-nowrap bg-folk-hover px-[8px] text-[11px] font-medium text-folk-secondary"

export const TABLE_TEXT_CELL = "overflow-hidden whitespace-nowrap text-[13px] font-normal text-folk-text"

export const TABLE_NAME_CELL = "overflow-hidden whitespace-nowrap text-[13px] font-semibold text-folk-text"

export const TABLE_ROW_HOVER = "group-hover:bg-folk-hover"

/** 36px profile/panel tables (Goals, Files, Contacts tab, etc.) */
export const TABLE_PANEL_ROW = "h-[36px] align-middle whitespace-nowrap"

export const TABLE_PANEL_HEADER = `${TABLE_PANEL_ROW} border-b border-r border-folk-border bg-folk-surface px-[20px] text-[11px] font-medium uppercase tracking-normal text-folk-secondary`

export const TABLE_PANEL_HEADER_LAST = `${TABLE_PANEL_ROW} border-b border-folk-border bg-folk-surface px-[20px] text-[11px] font-medium uppercase tracking-normal text-folk-secondary`

export const TABLE_PANEL_CELL = `${TABLE_PANEL_ROW} border-b border-r border-folk-border bg-folk-surface px-[20px]`

export const TABLE_PANEL_CELL_LAST = `${TABLE_PANEL_ROW} border-b border-folk-border bg-folk-surface px-[20px]`

export const TABLE_PANEL_TEXT = "text-[13px] font-medium text-folk-text"

export const TABLE_FULL = `w-full ${TABLE_GRID}`

/** Flexible-height grid cells (import preview, etc.) */
export const TABLE_GRID_HEADER = "border-b border-r border-folk-border bg-folk-surface px-[16px] py-[8px] text-left text-[11px] font-medium uppercase tracking-normal text-folk-secondary"

export const TABLE_GRID_HEADER_LAST = "border-b border-folk-border bg-folk-surface px-[16px] py-[8px] text-left text-[11px] font-medium uppercase tracking-normal text-folk-secondary"

export const TABLE_GRID_CELL = "border-b border-r border-folk-border px-[16px] py-[8px]"

export const TABLE_GRID_CELL_LAST = "border-b border-folk-border px-[16px] py-[8px]"

export const TABLE_PANEL_HEADER_STICKY = `sticky top-0 z-20 ${TABLE_PANEL_HEADER}`

export const TABLE_PANEL_HEADER_STICKY_LAST = `sticky top-0 z-20 ${TABLE_PANEL_HEADER_LAST}`

/** Sticky first column — pseudo-element right edge only (no border-r) to avoid doubled lines. */
export const TABLE_PANEL_HEADER_STICKY_EDGE = `sticky left-0 top-0 z-30 ${TABLE_PANEL_ROW} border-b border-folk-border bg-folk-surface px-[20px] text-[11px] font-medium uppercase tracking-normal text-folk-secondary ${TABLE_STICKY_DIVIDER}`

export const TABLE_PANEL_CELL_STICKY_EDGE = `${TABLE_PANEL_ROW} border-b border-folk-border bg-folk-surface px-[20px] ${TABLE_STICKY_DIVIDER}`

export const TABLE_PROFILE_CELL = TABLE_PANEL_CELL

export const TABLE_PROFILE_CELL_LAST = TABLE_PANEL_CELL_LAST

export const TABLE_PROFILE_HEADER = TABLE_PANEL_HEADER

export const TABLE_PROFILE_HEADER_LAST = TABLE_PANEL_HEADER_LAST

export const TABLE_ROW_SELECTED = "bg-folk-selected"

/** Spreadsheet-style active cell — selected fill and dark border. */
export const TABLE_CELL_SELECTED = "folk-table-cell-selected"

export const TABLE_NAME_COLUMN_KEY = "__name__"

export interface TableCellSelection {
  rowId: string
  columnKey: string
}

export function isTableCellSelected(
  selection: TableCellSelection | null,
  rowId: string,
  columnKey: string
): boolean {
  return selection?.rowId === rowId && selection?.columnKey === columnKey
}

export function tableCellSelectionClass(
  selection: TableCellSelection | null,
  rowId: string,
  columnKey: string
): string {
  return isTableCellSelected(selection, rowId, columnKey) ? TABLE_CELL_SELECTED : ""
}
