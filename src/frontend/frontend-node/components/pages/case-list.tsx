"use client"

import { FolderOpen, PlusCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { api, CaseDto, formatDate } from "@/lib/api"

interface CaseListProps {
  onShowCreateCase: () => void
  onShowCaseDetail: (caseId: string) => void
  refresh?: boolean
}

export function CaseList({ onShowCreateCase, onShowCaseDetail, refresh }: CaseListProps) {
  const [cases, setCases] = useState<CaseDto[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [timeFilter, setTimeFilter] = useState<string>("all")

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true)
        const data = await api.getCases()
        setCases(data)
      } catch (error) {
        console.error("Failed to fetch cases:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
  }, [refresh])

  const handleDelete = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation()
    if (confirm("确定要删除此病例吗？此操作不可恢复。")) {
      try {
        await api.deleteCase(caseId)
        // Refresh cases list
        const data = await api.getCases()
        setCases(data)
      } catch (error) {
        console.error("Failed to delete case:", error)
      }
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-card-foreground">病例管理</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-card-foreground flex items-center">
            <FolderOpen className="mr-3 text-primary w-8 h-8" />
            病例列表
          </h3>
          <p className="text-sm text-muted-foreground mt-1">查看和管理所有病例记录</p>
        </div>
        <button
          onClick={onShowCreateCase}
          className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all flex items-center"
        >
          <PlusCircle className="mr-2 w-4 h-4" />
          新建病例
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-4">
        <input
          className="flex-1 border rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
          placeholder="搜索病例编号或患者姓名"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="text-sm border rounded-lg px-4 py-2 bg-card outline-none appearance-none cursor-pointer pr-8"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="all">全部时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
        </select>
      </div>

      {/* Case Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-left font-medium border-b">
            <tr>
              <th className="px-6 py-4">病例编号</th>
              <th className="px-6 py-4">患者信息</th>
              <th className="px-6 py-4">检查数</th>
              <th className="px-6 py-4">影像数</th>
              <th className="px-6 py-4">最后更新</th>
              <th className="px-6 py-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-muted-foreground">加载中...</p>
                </td>
              </tr>
            ) : (
              (() => {
                const filteredCases = cases.filter((caseItem) => {
                  if (!searchTerm) {
                    // Only apply time filter if no search term
                  } else {
                    const searchLower = searchTerm.toLowerCase();
                    if (!caseItem.caseId.toLowerCase().includes(searchLower) &&
                        !caseItem.name.toLowerCase().includes(searchLower)) {
                      return false;
                    }
                  }

                  // Time filter based on updatedTime
                  if (timeFilter !== "all" && caseItem.updatedTime) {
                    const updatedDate = new Date(caseItem.updatedTime);
                    const now = new Date();

                    if (timeFilter === "today") {
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      if (updatedDate < today) return false;
                    } else if (timeFilter === "week") {
                      const weekAgo = new Date(now);
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      if (updatedDate < weekAgo) return false;
                    } else if (timeFilter === "month") {
                      const monthAgo = new Date(now);
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      if (updatedDate < monthAgo) return false;
                    }
                  }

                  return true;
                });
                
                if (filteredCases.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-muted-foreground">
                          {searchTerm ? "没有找到匹配的病例" : "暂无病例数据"}
                        </p>
                      </td>
                    </tr>
                  );
                }
                
                return filteredCases.map((caseItem) => {
                  // Calculate exam count and image count
                  const examCount = caseItem.studys?.length || 0;
                  const imageCount = caseItem.studys?.reduce((total, study) => {
                    return total + (study.imageIds?.length || study.images?.length || 0);
                  }, 0) || 0;
                  
                  // Format gender
                  const genderStr = caseItem.gender === 1 ? "男" : "女";
                  
                  return (
                    <tr
                      key={caseItem.caseId}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => onShowCaseDetail(caseItem.caseId)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono text-card-foreground font-medium">{caseItem.caseId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-card-foreground">{caseItem.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {caseItem.age}岁 {genderStr}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{examCount}</td>
                      <td className="px-6 py-4">{imageCount}</td>
                      <td className="px-6 py-4">{formatDate(caseItem.updatedTime)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onShowCaseDetail(caseItem.caseId)
                            }}
                            className="text-primary hover:text-primary/80 text-sm font-medium px-3 py-1.5 rounded border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            查看
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, caseItem.caseId)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded border border-red-200 hover:border-red-500 hover:bg-red-50 transition-all"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
