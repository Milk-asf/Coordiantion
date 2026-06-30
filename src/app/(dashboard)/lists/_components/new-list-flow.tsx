"use client"

import { useMemo, useState } from "react"
import { ArrowRight, CalendarCheck, LayoutGrid, LayoutList, Plus, Search, ShieldCheck, Users, Wallet, X } from "lucide-react"
import type { ComponentType } from "react"
import { FormModal } from "@/components/form-modal"
import { cn } from "@/lib/utils"
import {
  LIST_TEMPLATES,
  LIST_TEMPLATE_CATEGORIES,
  type ListTemplate,
  type ListTemplateCategory,
} from "@/lib/lists/definitions"
import { NewListModal, type NewListConfig } from "./new-list-modal"

interface NewListFlowProps {
  onClose: () => void
  onCreate: (config: NewListConfig) => void
}

const CATEGORY_ICONS: Record<ListTemplateCategory, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "People & HR": Users,
  "Service delivery": CalendarCheck,
  Finance: Wallet,
  "Quality & compliance": ShieldCheck,
}

type CategoryFilter = ListTemplateCategory | "all"

export function NewListFlow({ onClose, onCreate }: NewListFlowProps) {
  const [step, setStep] = useState<"choose" | "configure">("choose")
  const [template, setTemplate] = useState<ListTemplate | null>(null)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")

  const query = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      LIST_TEMPLATES.filter((item) => {
        const matchesCategory = category === "all" || item.category === category
        const matchesQuery = !query || [item.name, item.description].some((text) => text.toLowerCase().includes(query))
        return matchesCategory && matchesQuery
      }),
    [query, category],
  )

  const categoryCounts = useMemo(() => {
    const counts = LIST_TEMPLATE_CATEGORIES.reduce(
      (acc, name) => ({ ...acc, [name]: 0 }),
      {} as Record<ListTemplateCategory, number>,
    )
    for (const item of LIST_TEMPLATES) counts[item.category] += 1
    return counts
  }, [])

  const handlePick = (picked: ListTemplate | null) => {
    setTemplate(picked)
    setStep("configure")
  }

  if (step === "configure") {
    return (
      <NewListModal
        template={template}
        onBack={() => setStep("choose")}
        onClose={onClose}
        onCreate={onCreate}
      />
    )
  }

  return (
    <FormModal onClose={onClose} width={880} className="h-[640px]">
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-folk-border-subtle bg-folk-surface p-[20px]">
          <h2 className="text-[16px] font-semibold text-folk-text">Create a list</h2>
          <p className="mt-[4px] text-[12px] leading-[1.5] text-folk-secondary">
            Start from a template or build one from scratch. Lists show every record from a data source — add the fields you care about as columns.
          </p>

          <div className="mt-[24px]">
            <p className="px-[4px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">Start fresh</p>
            <button
              type="button"
              onClick={() => handlePick(null)}
              className="mt-[8px] flex w-full items-center justify-between gap-[8px] rounded-[6px] px-[10px] py-[8px] text-left text-[13px] text-folk-text transition-colors hover:bg-white"
              tabIndex={0}
            >
              <span className="flex items-center gap-[8px]">
                <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] bg-folk-hover text-folk-secondary">
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.75} />
                </span>
                Start from scratch
              </span>
              <ArrowRight className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.75} />
            </button>
          </div>

          <div className="mt-[24px] min-h-0 flex-1 overflow-y-auto">
            <p className="px-[4px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">Templates</p>
            <nav className="mt-[8px] flex flex-col gap-[2px]">
              <CategoryButton
                label="All templates"
                count={LIST_TEMPLATES.length}
                icon={LayoutGrid}
                isActive={category === "all"}
                onClick={() => setCategory("all")}
              />
              {LIST_TEMPLATE_CATEGORIES.map((name) => (
                <CategoryButton
                  key={name}
                  label={name}
                  count={categoryCounts[name]}
                  icon={CATEGORY_ICONS[name]}
                  isActive={category === name}
                  onClick={() => setCategory(name)}
                />
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-folk-border-subtle px-[20px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-folk-placeholder" strokeWidth={1.75} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates…"
                className="h-[32px] w-full max-w-[280px] rounded-[6px] border border-folk-border bg-white pl-[30px] pr-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-folk-text"
                tabIndex={0}
              />
            </div>
            <div className="ml-auto flex items-center gap-[8px]">
              <button
                type="button"
                onClick={() => handlePick(null)}
                className="primary-btn folk-pill-btn px-[12px] py-[6px] text-[13px] font-medium"
                tabIndex={0}
              >
                Start from scratch
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                aria-label="Close"
                tabIndex={0}
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-[20px]">
            <p className="mb-[12px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">
              {category === "all" ? "Start from a template" : category}
            </p>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[64px] text-center">
                <LayoutList className="h-[22px] w-[22px] text-folk-tertiary" strokeWidth={1.5} />
                <p className="mt-[10px] text-[13px] text-folk-secondary">No templates match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePick(item)}
                    className="group flex flex-col rounded-[8px] border border-[#bababa] bg-white p-[14px] text-left transition-colors hover:border-folk-text hover:bg-folk-hover"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-[8px]">
                      <span
                        className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[16px]"
                        style={{ backgroundColor: `${item.iconColor}1a` }}
                      >
                        {item.icon}
                      </span>
                      <span className="text-[14px] font-semibold text-folk-text">{item.name}</span>
                    </div>
                    <p className="mt-[6px] line-clamp-2 text-[12px] leading-[1.5] text-folk-secondary">{item.description}</p>
                    <div className="mt-[12px] flex items-center gap-[12px] text-[11px] capitalize text-folk-tertiary">
                      <span>{item.view}</span>
                      <span>{item.columns.length} columns</span>
                      <ArrowRight className="ml-auto h-[13px] w-[13px] opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.75} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FormModal>
  )
}

interface CategoryButtonProps {
  label: string
  count: number
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  isActive: boolean
  onClick: () => void
}

function CategoryButton({ label, count, icon: Icon, isActive, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[7px] text-left text-[13px] transition-colors",
        isActive ? "bg-white font-medium text-folk-text shadow-[0_1px_2px_rgba(0,0,0,0.05)]" : "text-folk-secondary hover:bg-white hover:text-folk-text",
      )}
      tabIndex={0}
    >
      <Icon className="h-[14px] w-[14px] shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[11px] tabular-nums text-folk-tertiary">{count}</span>
    </button>
  )
}
