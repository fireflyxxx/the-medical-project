"use client"

import { LayoutDashboard, FolderOpen, BarChart3, HeartPulse, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"

type PageType = "dashboard" | "caseList" | "caseDetail" | "studyDetail" | "statistics"

interface SidebarProps {
  currentPage: PageType
  onNavigate: (page: PageType) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { userInfo, logout } = useAuthStore();

  const getActiveIndex = () => {
    if (currentPage === "dashboard") return 0
    if (currentPage === "caseList" || currentPage === "caseDetail" || currentPage === "studyDetail") return 1
    if (currentPage === "statistics") return 2
    return 0
  }

  const activeIndex = getActiveIndex()
  const displayName = userInfo?.name || userInfo?.name || "";
  const firstLetter = displayName.charAt(0).toUpperCase() || "D";
  const username = userInfo?.name || "doctor";

  const menuItems = [
    { icon: LayoutDashboard, label: "工作台", page: "dashboard" as PageType, index: 0 },
    { icon: FolderOpen, label: "病例管理", page: "caseList" as PageType, index: 1 },
  ]

  const statisticsItems = [
    { icon: BarChart3, label: "统计分析", page: "statistics" as PageType, index: 2 },
  ]

  return (
    <aside className="w-64 bg-card border-r flex flex-col items-stretch shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 gap-2 border-b">
        <HeartPulse className="text-3xl text-primary" />
        <span className="text-xl font-bold tracking-tight">MediVision AI</span>
      </div>

      {/* Menu */}
      <div className="flex-1 p-4 space-y-2 mt-4">
        <div className="text-[10px] font-bold text-muted-foreground px-2 mb-2 uppercase tracking-widest">
          主要功能
        </div>
        {menuItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground transition-all",
              activeIndex === item.index
                ? "bg-primary/10 text-primary"
                : "hover:bg-primary/5 hover:text-primary"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="text-[10px] font-bold text-muted-foreground px-2 mb-2 mt-6 uppercase tracking-widest">
          数据统计
        </div>
        {statisticsItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground transition-all",
              activeIndex === item.index
                ? "bg-primary/10 text-primary"
                : "hover:bg-primary/5 hover:text-primary"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* User Info */}
      <div className="p-4 bg-gradient-to-br from-muted to-primary/5 border-t">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 rounded-full border-2 border-blue-600 shadow-sm bg-blue-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{firstLetter}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-black truncate">{username}</p>
            <p className="text-xs text-primary">医生</p>
          </div>
          <button 
            onClick={() => {
              logout();
              window.location.href = '/';
            }} 
            className="text-muted-foreground hover:text-red-500 transition-colors" 
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-sm"></div>
          <span className="text-xs text-muted-foreground">在线</span>
        </div>
      </div>
    </aside>
  )
}
