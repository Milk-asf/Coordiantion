"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

const OVERFLOW_BTN_WIDTH = 36

interface ProfileTabDefinition {
  key: string
  label: string
}

interface UseProfileTabOverflowOptions {
  tabs: ProfileTabDefinition[]
  activeTabKey: string
  headerRef: RefObject<HTMLElement | null>
  tabsContainerRef: RefObject<HTMLElement | null>
  getTabBadge?: (tabKey: string) => number | undefined
  remeasureKey?: string | number
  isSidebarVisible?: boolean
  sidebarWidth?: number
}

interface ProfileTabLayout {
  visibleIndices: number[]
  overflowIndices: number[]
  showOverflow: boolean
}

export function computeProfileTabLayout(
  tabWidths: number[],
  availableWidth: number,
  activeIndex: number
): ProfileTabLayout {
  const tabCount = tabWidths.length
  if (tabCount === 0) {
    return { visibleIndices: [], overflowIndices: [], showOverflow: false }
  }

  const totalWidth = tabWidths.reduce((sum, width) => sum + width, 0)
  if (totalWidth <= availableWidth) {
    return {
      visibleIndices: tabWidths.map((_, index) => index),
      overflowIndices: [],
      showOverflow: false,
    }
  }

  let visibleCount = 0
  let usedWidth = 0
  for (let index = 0; index < tabCount; index++) {
    if (usedWidth + tabWidths[index] + OVERFLOW_BTN_WIDTH > availableWidth && visibleCount > 0) break
    usedWidth += tabWidths[index]
    visibleCount++
  }
  visibleCount = Math.max(1, visibleCount)

  let visibleIndices = Array.from({ length: visibleCount }, (_, index) => index)

  if (activeIndex >= visibleCount && visibleCount > 0) {
    visibleIndices = [...visibleIndices.slice(0, visibleCount - 1), activeIndex]
  }

  const visibleSet = new Set(visibleIndices)
  const overflowIndices = tabWidths
    .map((_, index) => index)
    .filter((index) => !visibleSet.has(index))

  return {
    visibleIndices,
    overflowIndices,
    showOverflow: overflowIndices.length > 0,
  }
}

export function useProfileTabOverflow({
  tabs,
  activeTabKey,
  headerRef,
  tabsContainerRef,
  getTabBadge,
  remeasureKey,
  isSidebarVisible,
  sidebarWidth,
}: UseProfileTabOverflowOptions) {
  const tabWidthsRef = useRef<number[]>([])
  const overflowBtnRef = useRef<HTMLButtonElement>(null)
  const [isTabOverflowOpen, setIsTabOverflowOpen] = useState(false)
  const [layout, setLayout] = useState<ProfileTabLayout>({
    visibleIndices: tabs.map((_, index) => index),
    overflowIndices: [],
    showOverflow: false,
  })

  const measureTabWidths = useCallback(() => {
    const measurer = headerRef.current?.querySelector("[data-tab-measurer]")
    if (!measurer) return
    const measureNodes = measurer.querySelectorAll("[data-tab-measure]")
    tabWidthsRef.current = Array.from(measureNodes).map(
      (node) => (node as HTMLElement).offsetWidth + 2
    )
  }, [headerRef])

  const updateLayout = useCallback(() => {
    if (!tabsContainerRef.current) return
    measureTabWidths()

    const availableWidth = tabsContainerRef.current.offsetWidth
    const widths = tabWidthsRef.current
    if (widths.length === 0) {
      setLayout({
        visibleIndices: tabs.map((_, index) => index),
        overflowIndices: [],
        showOverflow: false,
      })
      return
    }

    const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeTabKey))
    setLayout(computeProfileTabLayout(widths, availableWidth, activeIndex))
  }, [activeTabKey, measureTabWidths, tabs, tabsContainerRef])

  useEffect(() => {
    updateLayout()
  }, [updateLayout, remeasureKey, isSidebarVisible, sidebarWidth])

  useEffect(() => {
    const handleResize = () => updateLayout()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateLayout])

  useEffect(() => {
    const container = tabsContainerRef.current
    if (!container || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => updateLayout())
    observer.observe(container)
    return () => observer.disconnect()
  }, [tabsContainerRef, updateLayout])

  useEffect(() => {
    if (!layout.overflowIndices.some((index) => tabs[index]?.key === activeTabKey)) {
      setIsTabOverflowOpen(false)
    }
  }, [activeTabKey, layout.overflowIndices, tabs])

  return {
    overflowBtnRef,
    isTabOverflowOpen,
    setIsTabOverflowOpen,
    visibleIndices: layout.visibleIndices,
    overflowIndices: layout.overflowIndices,
    showOverflow: layout.showOverflow,
    getTabBadge,
  }
}
