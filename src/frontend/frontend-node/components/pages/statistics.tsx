"use client"

import { useState, useEffect } from "react"
import { BarChart3, Users, FileImage, Brain, TrendingUp, Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import { api } from "@/lib/api"

interface StatsData {
  totalCases: number
  totalStudies: number
  totalImages: number
  totalInferences: number
}

export function Statistics() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsData>({
    totalCases: 0,
    totalStudies: 0,
    totalImages: 0,
    totalInferences: 0,
  })
  const [dailyData, setDailyData] = useState<{ name: string; value: number }[]>([])
  const [resultData, setResultData] = useState<{ name: string; value: number }[]>([])
  const [modelData, setModelData] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      setLoading(true)

      const [cases, inferResultsAll] = await Promise.all([
        api.getCases(),
        api.getAllInferResults()
      ])

      // 筛选当前医生的推理结果：收集该医生所有病例下的 imageId
      const myImageIds = new Set<string>()
      if (Array.isArray(cases)) {
        cases.forEach((c: any) => {
          c.studys?.forEach((s: any) => {
            s.imageIds?.forEach((imgId: string) => myImageIds.add(imgId))
            s.images?.forEach((img: any) => {
              if (img.imageId) myImageIds.add(img.imageId)
            })
          })
        })
      }

      const inferResults = Array.isArray(inferResultsAll)
        ? inferResultsAll.filter((r: any) => myImageIds.has(r.imageId))
        : []

      const totalCases = Array.isArray(cases) ? cases.length : 0

      const totalStudies = Array.isArray(cases)
        ? cases.reduce((sum: number, c: any) => sum + (c.studys?.length || 0), 0)
        : 0

      const totalImages = Array.isArray(cases)
        ? cases.reduce((sum: number, c: any) => {
            return sum + c.studys?.reduce((studySum: number, s: any) => {
              const imgCount = s.images?.length || s.imageIds?.length || 0
              return studySum + imgCount
            }, 0) || 0
          }, 0)
        : 0

      const totalInferences = Array.isArray(inferResults) ? inferResults.length : 0

      setStats({
        totalCases,
        totalStudies,
        totalImages,
        totalInferences,
      })

      if (Array.isArray(inferResults)) {
        const labelCounts: Record<string, number> = {}
        const modelCounts: Record<string, number> = {}
        const dailyCounts: Record<string, number> = {}

        inferResults.forEach((result: any) => {
          if (result.label) {
            labelCounts[result.label] = (labelCounts[result.label] || 0) + 1
          }
          if (result.model) {
            modelCounts[result.model] = (modelCounts[result.model] || 0) + 1
          }
          if (result.createdTime) {
            const date = new Date(result.createdTime).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
            dailyCounts[date] = (dailyCounts[date] || 0) + 1
          }
        })

        setResultData(
          Object.entries(labelCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        )

        setModelData(
          Object.entries(modelCounts)
            .map(([name, value]) => ({ name, value }))
        )

        const last7Days: { name: string; value: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
          const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short', month: 'numeric', day: 'numeric' })
          last7Days.push({
            name: `${dayName}`,
            value: dailyCounts[dateStr] || 0,
          })
        }
        setDailyData(last7Days)
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ["#4A90E2", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-card-foreground">统计分析</span>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-card-foreground flex items-center">
          <BarChart3 className="mr-3 text-primary w-8 h-8" />
          数据统计报表
        </h3>
        <p className="text-sm text-muted-foreground mt-1">查看系统数据统计和分析报表</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                总病例数
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold font-mono text-card-foreground">{stats.totalCases}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                总检查数
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold font-mono text-card-foreground">{stats.totalStudies}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                总影像数
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold font-mono text-card-foreground">{stats.totalImages}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
                推理任务数
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold font-mono text-card-foreground">{stats.totalInferences}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Brain className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h4 className="font-bold text-card-foreground mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            近7天推理趋势
          </h4>
          <div className="h-[300px]">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} label={{ value: '推理次数', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${value}`, '推理次数']}
                  />
                  <Bar dataKey="value" fill="#4A90E2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                暂无数据
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h4 className="font-bold text-card-foreground mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-primary" />
            推理结果分布
          </h4>
          <div className="h-[300px]">
            {resultData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {resultData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                暂无数据
              </div>
            )}
          </div>
        </div>
      </div>

      {modelData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h4 className="font-bold text-card-foreground mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-primary" />
            模型使用分布
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
