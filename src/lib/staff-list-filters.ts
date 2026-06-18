import type { Client, StaffMember } from "@/lib/types"

export interface StaffListFilterState extends Record<string, string[]> {
  status: string[]
  role: string[]
  department: string[]
  employmentType: string[]
  client: string[]
}

export const emptyStaffListFilters: StaffListFilterState = {
  status: [],
  role: [],
  department: [],
  employmentType: [],
  client: [],
}

export function filterStaff(
  staff: StaffMember[],
  clients: Client[],
  filters: StaffListFilterState
) {
  return staff.filter((member) => {
    if (member.status === "inactive" && filters.status.length === 0) {
      return false
    }

    if (filters.status.length > 0 && !filters.status.includes(member.status)) {
      return false
    }

    const d = member.details

    if (filters.role.length > 0 && !filters.role.includes(d.role)) {
      return false
    }

    if (filters.department.length > 0 && !filters.department.includes(d.department)) {
      return false
    }

    if (filters.employmentType.length > 0 && !filters.employmentType.includes(d.employmentType)) {
      return false
    }

    if (filters.client.length > 0) {
      const memberClientIds = clients
        .filter((c) => c.owner === member.name)
        .map((c) => c.id)
      if (!filters.client.some((clientId) => memberClientIds.includes(clientId))) {
        return false
      }
    }

    return true
  })
}
