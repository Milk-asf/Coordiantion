"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, FileText, Search, X } from "lucide-react"
import {
  FORM_TEMPLATES,
  FORM_TEMPLATE_CATEGORY_LABELS,
  getFieldTypeLabel,
  type FormTemplate,
  type FormTemplateCategory,
} from "@/lib/form-definitions"
import { cn } from "@/lib/utils"

interface TemplateCenterProps {
  onClose: () => void
  onUseTemplate: (template: FormTemplate) => void
  onBlankForm: () => void
}

const presentCategories = FORM_TEMPLATES.reduce<FormTemplateCategory[]>((acc, template) => {
  if (!acc.includes(template.category)) acc.push(template.category)
  return acc
}, [])

const CATEGORY_FILTERS: { key: "all" | FormTemplateCategory; label: string }[] = [
  { key: "all", label: "All" },
  ...presentCategories.map((category) => ({ key: category, label: FORM_TEMPLATE_CATEGORY_LABELS[category] })),
]

export function TemplateCenter({ onClose, onUseTemplate, onBlankForm }: TemplateCenterProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | FormTemplateCategory>("all")
  const [search, setSearch] = useState("")
  const [preview, setPreview] = useState<FormTemplate | null>(null)

  const query = search.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      FORM_TEMPLATES.filter((template) => {
        if (activeCategory !== "all" && template.category !== activeCategory) return false
        if (!query) return true
        return [template.name, template.description].some((text) => text.toLowerCase().includes(query))
      }),
    [activeCategory, query],
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-[24px]" role="dialog" aria-modal="true">
      <div className="flex h-[640px] max-h-[90vh] w-full max-w-[920px] overflow-hidden rounded-[10px] border border-folk-border bg-white shadow-folk">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-folk-border-subtle bg-[#fafafa] p-[16px]">
          <h2 className="text-[15px] font-semibold text-folk-text">Template Center</h2>
          <div className="mt-[16px] flex flex-col gap-[2px]">
            {CATEGORY_FILTERS.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={cn(
                  "flex items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-left text-[13px] transition-colors",
                  activeCategory === category.key
                    ? "bg-white font-medium text-folk-text shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    : "text-folk-secondary hover:bg-white hover:text-folk-text",
                )}
                tabIndex={0}
              >
                <span
                  className={cn(
                    "flex h-[14px] w-[14px] items-center justify-center rounded-[4px] border",
                    activeCategory === category.key ? "border-folk-text bg-folk-text" : "border-folk-border-strong",
                  )}
                  aria-hidden="true"
                >
                  {activeCategory === category.key && <span className="h-[6px] w-[6px] rounded-[1px] bg-white" />}
                </span>
                {category.label}
              </button>
            ))}
          </div>

          <div className="mt-[24px]">
            <p className="px-[4px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">Record Creation</p>
            <button
              type="button"
              onClick={onBlankForm}
              className="mt-[8px] flex w-full items-center justify-between gap-[8px] rounded-[6px] px-[10px] py-[8px] text-left text-[13px] text-folk-text transition-colors hover:bg-white"
              tabIndex={0}
            >
              <span className="flex items-center gap-[8px]">
                <span className="rounded-[4px] bg-[#eef4fd] px-[5px] py-[1px] text-[10px] font-semibold text-[#2563EB]">New</span>
                Blank form
              </span>
              <ArrowRight className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.75} />
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-folk-border-subtle px-[20px]">
            {preview ? (
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex items-center gap-[6px] text-[13px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
                tabIndex={0}
              >
                <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
                Back to templates
              </button>
            ) : (
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-folk-placeholder" strokeWidth={1.75} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search templates…"
                  className="h-[32px] w-full max-w-[280px] rounded-[6px] border border-folk-border bg-white pl-[30px] pr-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
                  tabIndex={0}
                />
              </div>
            )}
            <div className="ml-auto flex items-center gap-[8px]">
              {preview ? (
                <button
                  type="button"
                  onClick={() => onUseTemplate(preview)}
                  className="primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium"
                  tabIndex={0}
                >
                  Use This Template
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBlankForm}
                  className="rounded-[6px] bg-folk-text px-[12px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-black"
                  tabIndex={0}
                >
                  Blank Form
                </button>
              )}
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
            {preview ? (
              <TemplatePreview template={preview} />
            ) : (
              <>
                <p className="mb-[12px] text-[12px] font-medium uppercase tracking-wide text-folk-tertiary">
                  {activeCategory === "all" ? "All templates" : FORM_TEMPLATE_CATEGORY_LABELS[activeCategory]}
                </p>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-[64px] text-center">
                    <FileText className="h-[22px] w-[22px] text-folk-tertiary" strokeWidth={1.5} />
                    <p className="mt-[10px] text-[13px] text-folk-secondary">No templates match your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                    {filtered.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setPreview(template)}
                        className="group flex flex-col rounded-[8px] border border-folk-border bg-white p-[14px] text-left transition-colors hover:border-folk-border-strong hover:bg-folk-hover"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[18px]">{template.icon}</span>
                          <span className="text-[14px] font-semibold text-folk-text">{template.name}</span>
                        </div>
                        <p className="mt-[6px] line-clamp-2 text-[12px] leading-[1.5] text-folk-secondary">{template.description}</p>
                        <div className="mt-[12px] flex items-center gap-[12px] text-[11px] text-folk-tertiary">
                          <span>{template.steps.length || 1} {template.steps.length === 1 ? "step" : "steps"}</span>
                          <span>{template.fields.length} fields</span>
                          <ArrowRight className="ml-auto h-[13px] w-[13px] opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.75} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplatePreview({ template }: { template: FormTemplate }) {
  const stepLabels = template.steps.length ? template.steps : ["Form"]
  const [activeStep, setActiveStep] = useState(stepLabels[0])
  const stepFields = template.fields.filter((field) =>
    template.steps.length ? field.step === activeStep : true,
  )

  return (
    <div>
      <div className="flex items-center gap-[10px]">
        <span className="text-[22px]">{template.icon}</span>
        <h3 className="text-[18px] font-semibold text-folk-text">{template.name}</h3>
      </div>
      <p className="mt-[6px] text-[13px] text-folk-secondary">{template.description}</p>

      {template.steps.length > 1 && (
        <div className="mt-[16px] flex flex-wrap gap-[4px] border-b border-folk-border-subtle pb-[12px]">
          {stepLabels.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step)}
              className={cn(
                "rounded-[6px] px-[10px] py-[4px] text-[13px] transition-colors",
                activeStep === step ? "bg-folk-hover font-medium text-folk-text" : "text-folk-secondary hover:text-folk-text",
              )}
              tabIndex={0}
            >
              {step}
            </button>
          ))}
        </div>
      )}

      <div className="mt-[16px] flex flex-col gap-[16px]">
        {stepFields.map((field, index) => (
          <div key={`${field.label}-${index}`}>
            <label className="text-[13px] font-medium text-folk-text">
              {field.label ?? getFieldTypeLabel(field.type)}
              {field.required && <span className="ml-[2px] text-red-500">*</span>}
            </label>
            <div className="mt-[6px] h-[38px] rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] leading-[38px] text-folk-placeholder">
              {field.placeholder || getFieldTypeLabel(field.type)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
