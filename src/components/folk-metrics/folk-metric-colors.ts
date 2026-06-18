/** Folk CRM dashboard chart palette (Leads / Deals screenshots). */
export const FOLK_METRIC_COLORS = {
  blue: "#3BA3F8",
  pink: "#D6569B",
  yellow: "#FFC133",
  green: "#68D391",
  orange: "#F6AD55",
  purple: "#9F7AEA",
} as const

export const FOLK_METRIC_COLOR_CYCLE = [
  FOLK_METRIC_COLORS.blue,
  FOLK_METRIC_COLORS.pink,
  FOLK_METRIC_COLORS.yellow,
  FOLK_METRIC_COLORS.green,
  FOLK_METRIC_COLORS.orange,
  FOLK_METRIC_COLORS.purple,
] as const

export function getFolkMetricColor(index: number) {
  return FOLK_METRIC_COLOR_CYCLE[index % FOLK_METRIC_COLOR_CYCLE.length]
}
