"use client"

import { useEffect, useState } from "react"
import { PlusCircle, X } from "lucide-react"
import { api } from "@/lib/api"

interface CreateStudyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  caseId: string
}

export function CreateStudyModal({ isOpen, onClose, onSuccess, caseId }: CreateStudyModalProps) {
  const [studyType, setStudyType] = useState("")
  const [studyTime, setStudyTime] = useState("")
  const [studyDesc, setStudyDesc] = useState("")

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const dateTimeString =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        "T" +
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0")
      setStudyTime(dateTimeString)
    }
  }, [isOpen])

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      console.log('Creating study with data:', {
        caseId,
        studyType: studyType,
        studyDate: studyTime,
        studyDesc: studyDesc || "无"
      })
      await api.createStudy(caseId, {
        studyType: studyType,
        studyDate: studyTime,
        studyDesc: studyDesc || "无"
      })
      handleClose()
      onSuccess()
    } catch (error) {
      console.error("Failed to create study:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStudyType("")
    setStudyTime("")
    setStudyDesc("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-card-foreground flex items-center">
            <PlusCircle className="mr-2 text-primary w-6 h-6" />
            新建检查
          </h3>
          <button onClick={handleClose} className="text-muted-foreground hover:text-card-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">检查类型 *</label>
            <select
              value={studyType}
              onChange={(e) => setStudyType(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">请选择检查类型</option>
              <option value="胸部X光">胸部X光</option>
              <option value="胸部CT">胸部CT</option>
              <option value="胸部MRI">胸部MRI</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">检查时间 *</label>
            <input
              type="datetime-local"
              value={studyTime}
              onChange={(e) => setStudyTime(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">检查描述</label>
            <textarea
              value={studyDesc}
              onChange={(e) => setStudyDesc(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="请输入检查描述（可选）"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground px-4 py-2 rounded-lg transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "创建中..." : "创建检查"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}