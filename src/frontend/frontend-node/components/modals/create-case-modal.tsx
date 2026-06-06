"use client"

import { useEffect, useState } from "react"
import { PlusCircle, X } from "lucide-react"
import { api } from "@/lib/api"

interface CreateCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateCaseModal({ isOpen, onClose, onSuccess }: CreateCaseModalProps) {
  const [caseNumber, setCaseNumber] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientGender, setPatientGender] = useState("")
  const [patientAge, setPatientAge] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [contact, setContact] = useState("")
  const [medicalHistory, setMedicalHistory] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const generatedNumber = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(Math.floor(Math.random() * 10000)).padStart(4, "0")
      setCaseNumber(generatedNumber)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      // Convert gender to number: 1 for male, 0 for female
      const genderNum = patientGender === "男" ? 1 : 0
      
      // Call API to create case
      await api.createCase({
        name: patientName,
        gender: genderNum,
        age: parseInt(patientAge),
        id_number: idNumber,
        contact: contact,
        medical_history: medicalHistory,
        case_desc: ""
      })
      
      handleClose()
      onSuccess()
    } catch (error) {
      console.error("Failed to create case:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPatientName("")
    setPatientGender("")
    setPatientAge("")
    setIdNumber("")
    setContact("")
    setMedicalHistory("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-card-foreground flex items-center">
            <PlusCircle className="mr-2 text-primary w-6 h-6" />
            新建病例
          </h3>
          <button onClick={handleClose} className="text-muted-foreground hover:text-card-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">病例编号</label>
            <input
              type="text"
              value={caseNumber}
              readOnly
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-muted"
              placeholder="自动生成"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">患者姓名 *</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="请输入患者姓名"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">性别 *</label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">请选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">年龄 *</label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                required
                min={0}
                max={150}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="请输入年龄"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">身份证号 *</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="请输入身份证号"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">联系方式 *</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="请输入联系方式"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">病史 *</label>
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="请输入病史"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "创建中..." : "创建病例"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
