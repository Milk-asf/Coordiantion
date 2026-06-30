"use client"

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import {
  createFormField,
  createFormStep,
  getFieldTypeLabel,
  type Form,
  type FormField,
  type FormFieldType,
  type FormProcessKey,
  type FormSchema,
  type FormSettings,
} from "@/lib/form-definitions"
import { cn } from "@/lib/utils"
import { FormCanvas } from "./form-canvas"
import { FormFieldPalette } from "./form-field-palette"
import { FormFieldPreview } from "./form-field-preview"
import { FormFieldSettings } from "./form-field-settings"
import { FormSettingsPanel } from "./form-settings-panel"

interface FormBuilderProps {
  form: Form
  onChange: (updates: Partial<Form>) => void
  connectedProcess: FormProcessKey | null
  onConnectProcess: (next: FormProcessKey | null) => void
  actions?: ReactNode
  onBack?: () => void
}

type LeftTab = "fields" | "steps"

export function FormBuilder({ form, onChange, connectedProcess, onConnectProcess, actions, onBack }: FormBuilderProps) {
  const [leftTab, setLeftTab] = useState<LeftTab>("fields")
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [dragPaletteLabel, setDragPaletteLabel] = useState<string | null>(null)
  const [draggedField, setDraggedField] = useState<FormField | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // Latest schema for stable callbacks that shouldn't be recreated on every keystroke.
  const schemaRef = useRef(form.schema)
  schemaRef.current = form.schema

  const { fields, steps } = form.schema
  const resolvedStepId = useMemo(() => {
    if (steps.length === 0) return null
    if (activeStepId && steps.some((step) => step.id === activeStepId)) return activeStepId
    return steps[0].id
  }, [activeStepId, steps])

  const visibleFields = useMemo(() => {
    if (steps.length === 0) return fields
    return fields.filter((field) => (field.stepId ?? steps[0].id) === resolvedStepId)
  }, [fields, resolvedStepId, steps])

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  )

  const updateSchema = (next: FormSchema) => onChange({ schema: next })

  const setFields = (nextFields: FormField[]) => updateSchema({ ...form.schema, fields: nextFields })

  const addField = (type: FormFieldType) => {
    const field = createFormField(type, resolvedStepId)
    const lastIndexInStep = steps.length === 0
      ? fields.length - 1
      : fields.reduce((acc, item, index) => ((item.stepId ?? steps[0].id) === resolvedStepId ? index : acc), -1)
    const insertAt = lastIndexInStep === -1 ? fields.length : lastIndexInStep + 1
    const next = [...fields]
    next.splice(insertAt, 0, field)
    setFields(next)
    setSelectedFieldId(field.id)
  }

  const insertFieldBefore = (type: FormFieldType, targetId: string) => {
    const index = fields.findIndex((item) => item.id === targetId)
    if (index === -1) return addField(type)
    const field = createFormField(type, fields[index].stepId ?? resolvedStepId)
    const next = [...fields]
    next.splice(index, 0, field)
    setFields(next)
    setSelectedFieldId(field.id)
  }

  const moveField = (activeId: string, targetId: string | null) => {
    const next = [...fields]
    const from = next.findIndex((item) => item.id === activeId)
    if (from === -1) return
    const [moved] = next.splice(from, 1)

    if (targetId === null) {
      const lastIndexInStep = steps.length === 0
        ? next.length - 1
        : next.reduce((acc, item, index) => ((item.stepId ?? steps[0].id) === resolvedStepId ? index : acc), -1)
      moved.stepId = resolvedStepId
      next.splice(lastIndexInStep === -1 ? next.length : lastIndexInStep + 1, 0, moved)
    } else {
      const to = next.findIndex((item) => item.id === targetId)
      moved.stepId = next[to]?.stepId ?? resolvedStepId
      next.splice(to === -1 ? next.length : to, 0, moved)
    }
    setFields(next)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)))
  }

  // Stable identity so memoized FieldCards don't re-render when unrelated fields change.
  const deleteField = useCallback(
    (fieldId: string) => {
      const schema = schemaRef.current
      const target = schema.fields.find((field) => field.id === fieldId)
      if (target?.system) return
      onChange({ schema: { ...schema, fields: schema.fields.filter((field) => field.id !== fieldId) } })
      setSelectedFieldId((current) => (current === fieldId ? null : current))
    },
    [onChange],
  )

  const updateSettings = (updates: Partial<FormSettings>) => {
    onChange({ settings: { ...form.settings, ...updates } })
  }

  const addStep = () => {
    const step = createFormStep(`Step ${steps.length + 1}`)
    updateSchema({ ...form.schema, steps: [...steps, step] })
    setActiveStepId(step.id)
    setLeftTab("steps")
  }

  const renameStep = (stepId: string, title: string) => {
    updateSchema({ ...form.schema, steps: steps.map((step) => (step.id === stepId ? { ...step, title } : step)) })
  }

  const deleteStep = (stepId: string) => {
    const remaining = steps.filter((step) => step.id !== stepId)
    const fallbackId = remaining[0]?.id ?? null
    updateSchema({
      steps: remaining,
      fields: fields.map((field) => (field.stepId === stepId ? { ...field, stepId: fallbackId } : field)),
    })
    if (resolvedStepId === stepId) setActiveStepId(fallbackId)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.kind === "palette") {
      setDragPaletteLabel(getFieldTypeLabel(data.fieldType as FormFieldType))
      setDraggedField(null)
    } else if (data?.kind === "canvas") {
      setDraggedField(fields.find((item) => item.id === data.fieldId) ?? null)
      setDragPaletteLabel(null)
    }
  }

  const resetDrag = () => {
    setDragPaletteLabel(null)
    setDraggedField(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    resetDrag()
    const active = event.active.data.current
    const over = event.over?.data.current
    if (!active || !over) return

    if (active.kind === "palette") {
      const type = active.fieldType as FormFieldType
      if (over.kind === "field-slot") insertFieldBefore(type, over.fieldId as string)
      else addField(type)
      return
    }

    if (active.kind === "canvas") {
      const activeId = active.fieldId as string
      if (over.kind === "field-slot") moveField(activeId, over.fieldId as string)
      else if (over.kind === "canvas-end") moveField(activeId, null)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={resetDrag}>
      <div className="flex h-full min-h-0">
        <aside className="flex w-[232px] shrink-0 flex-col border-r border-folk-border-subtle bg-white">
          <div className="flex h-[40px] shrink-0 items-center gap-[4px] border-b border-folk-border-subtle px-[8px]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                aria-label="Back to forms"
                tabIndex={0}
              >
                <ArrowLeft className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
            )}
            <LeftTabButton label="Fields" isActive={leftTab === "fields"} onClick={() => setLeftTab("fields")} />
            <LeftTabButton label="Steps" isActive={leftTab === "steps"} onClick={() => setLeftTab("steps")} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {leftTab === "fields" ? (
              <FormFieldPalette onAddField={addField} />
            ) : (
              <StepsPanel
                steps={steps}
                activeStepId={resolvedStepId}
                onSelectStep={setActiveStepId}
                onRenameStep={renameStep}
                onDeleteStep={deleteStep}
                onAddStep={addStep}
              />
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-folk-page">
          {steps.length > 0 && (
            <div className="flex h-[40px] shrink-0 items-center gap-[4px] overflow-x-auto border-b border-folk-border-subtle bg-white px-[16px]">
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={cn(
                    "shrink-0 rounded-[6px] px-[10px] py-[4px] text-[13px] transition-colors",
                    resolvedStepId === step.id ? "bg-folk-hover font-medium text-folk-text" : "text-folk-secondary hover:text-folk-text",
                  )}
                  tabIndex={0}
                >
                  {step.title}
                </button>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                aria-label="Add step"
                tabIndex={0}
              >
                <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FormCanvas
              form={form}
              fields={visibleFields}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onDeleteField={deleteField}
              onOpenFormSettings={() => setSelectedFieldId(null)}
              onFormChange={onChange}
              onSettingsChange={updateSettings}
            />
          </div>
        </div>

        <aside className="flex w-[300px] shrink-0 flex-col border-l border-folk-border-subtle bg-white">
          {actions && (
            <div className="h-[40px] shrink-0 border-b border-folk-border-subtle px-[12px] py-[4px]">
              {actions}
            </div>
          )}
          {selectedField ? (
            <FormFieldSettings
              field={selectedField}
              onChange={(updates) => updateField(selectedField.id, updates)}
              onClose={() => setSelectedFieldId(null)}
            />
          ) : (
            <FormSettingsPanel
              form={form}
              onChange={onChange}
              onSettingsChange={updateSettings}
              connectedProcess={connectedProcess}
              onConnectProcess={onConnectProcess}
            />
          )}
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {draggedField ? (
          <div className="w-[560px] max-w-[80vw] cursor-grabbing rounded-[8px] border border-folk-border-strong bg-white px-[14px] py-[12px] shadow-folk">
            <FormFieldPreview field={draggedField} />
          </div>
        ) : dragPaletteLabel ? (
          <div className="inline-flex items-center gap-[8px] rounded-[6px] border border-folk-border-strong bg-white px-[10px] py-[7px] text-[13px] font-medium text-folk-text shadow-folk-sm">
            {dragPaletteLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function LeftTabButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[6px] px-[10px] py-[5px] text-[13px] font-medium transition-colors",
        isActive ? "bg-folk-hover text-folk-text" : "text-folk-secondary hover:text-folk-text",
      )}
      tabIndex={0}
    >
      {label}
    </button>
  )
}

interface StepsPanelProps {
  steps: Form["schema"]["steps"]
  activeStepId: string | null
  onSelectStep: (stepId: string) => void
  onRenameStep: (stepId: string, title: string) => void
  onDeleteStep: (stepId: string) => void
  onAddStep: () => void
}

function StepsPanel({ steps, activeStepId, onSelectStep, onRenameStep, onDeleteStep, onAddStep }: StepsPanelProps) {
  return (
    <div className="p-[12px]">
      <div className="mb-[8px] flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">Form Steps</span>
        <button
          type="button"
          onClick={onAddStep}
          className="flex items-center gap-[4px] text-[12px] font-medium text-[#2563EB] transition-colors hover:text-[#1d4ed8]"
          tabIndex={0}
        >
          <Plus className="h-[12px] w-[12px]" strokeWidth={2} />
          Step
        </button>
      </div>

      {steps.length === 0 ? (
        <p className="px-[2px] text-[12px] leading-[1.6] text-folk-tertiary">
          Add steps to split this form into multiple pages. Without steps, all fields appear on a single page.
        </p>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "group flex items-center gap-[6px] rounded-[6px] border px-[8px] py-[6px] transition-colors",
                activeStepId === step.id ? "border-[#a3c4f3] bg-[#f5f9ff]" : "border-folk-border bg-white hover:border-folk-border-strong",
              )}
            >
              <input
                value={step.title}
                onChange={(event) => onRenameStep(step.id, event.target.value)}
                onFocus={() => onSelectStep(step.id)}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-folk-text outline-none"
                tabIndex={0}
              />
              <button
                type="button"
                onClick={() => onDeleteStep(step.id)}
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] text-folk-placeholder opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                aria-label={`Delete ${step.title}`}
                tabIndex={0}
              >
                <Trash2 className="h-[12px] w-[12px]" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
