"use client"

import { usePermissions } from "@/lib/hooks/use-permissions"
import { ShieldAlert } from "lucide-react"

interface SettingsGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
}

export function SettingsGuard({ children, requireAdmin = false, requireSuperAdmin = false }: SettingsGuardProps) {
  const { isLoading, canManageWorkspaceSettings, isSuperAdmin } = usePermissions()

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#e0e0e0] border-t-[#666]" />
      </div>
    )
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <AccessDenied message="Only the account owner can access this page." />
  }

  if (requireAdmin && !canManageWorkspaceSettings) {
    return <AccessDenied message="You need admin permissions to access this page." />
  }

  return <>{children}</>
}

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-[12px] text-center">
      <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-red-50">
        <ShieldAlert className="h-[24px] w-[24px] text-red-500" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[#262626]">Access Denied</p>
        <p className="mt-[4px] text-[13px] text-[#888]">{message}</p>
      </div>
    </div>
  )
}
