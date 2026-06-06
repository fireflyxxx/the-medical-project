"use client"

import { PlusCircle, FolderOpen, BarChart3, Settings, Zap } from "lucide-react"

interface DashboardProps {
  onShowCreateCase: () => void
  onShowCaseList: () => void
  onShowStatistics: () => void
}

export function Dashboard({ onShowCreateCase, onShowCaseList, onShowStatistics }: DashboardProps) {
  const stats = [
    { label: "今日病例数", value: "42", change: "↑ 12%", changeColor: "text-green-500" },
    { label: "待处理检查", value: "15", change: "平均12min", changeColor: "text-muted-foreground" },
    { label: "高风险预警", value: "03", change: "需立即干预", changeColor: "text-red-600 animate-pulse" },
    { label: "推理任务数", value: "68", change: "准确率95.3%", changeColor: "text-muted-foreground" },
  ]

  const quickActions = [
    { icon: PlusCircle, label: "新建病例", onClick: onShowCreateCase },
    { icon: FolderOpen, label: "查看病例", onClick: onShowCaseList },
    { icon: BarChart3, label: "数据统计", onClick: onShowStatistics },
    { icon: Settings, label: "系统设置", onClick: () => {} },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-bold text-card-foreground mb-4 flex items-center">
          <Zap className="mr-2 text-primary w-5 h-5" />
          快捷操作
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
            >
              <action.icon className="w-8 h-8 text-primary mb-2" />
              <span className="text-sm font-medium text-card-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
