"use client"

import { FileText, ClipboardList, PlusCircle, Pen, Trash2, HeartPulse } from "lucide-react"
import { useState, useEffect } from "react"
import { api, CaseDto, StudyDto, formatDate } from "@/lib/api"

interface CaseDetailProps {
  caseId: string
  onShowCaseList: () => void
  onShowStudyDetail: (studyId: string) => void
  onCreateStudy: () => void
}

export function CaseDetail({ 
  caseId, 
  onShowCaseList, 
  onShowStudyDetail,
  onCreateStudy 
}: CaseDetailProps) {
  const [caseData, setCaseData] = useState<CaseDto | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [inferenceResults, setInferenceResults] = useState<any[]>([])

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        setLoading(true)
        const data = await api.getCaseDetails(caseId)
        setCaseData(data)
        
        // 获取所有推理结果
        const results = await api.getAllInferResults()
        setInferenceResults(results)
      } catch (error) {
        console.error("Failed to fetch case details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCaseDetails()
  }, [caseId])

  const handleDeleteStudy = async (e: React.MouseEvent, studyId: string) => {
    e.stopPropagation()
    if (confirm("确定要删除此检查记录吗？\n\n警告：将同步删除该检查下的所有影像和推理任务！")) {
      try {
        // Call API to delete study
        await api.deleteStudy(caseId, studyId)
        // Refresh case details
        const data = await api.getCaseDetails(caseId)
        setCaseData(data)
        // Refresh inference results
        const results = await api.getAllInferResults()
        setInferenceResults(results)
      } catch (error) {
        console.error("Failed to delete study:", error)
      }
    }
  }

  const handleEditCase = () => {
    if (caseData) {
      setEditFormData({
        name: caseData.name,
        gender: caseData.gender,
        age: caseData.age,
        idNumber: caseData.idNumber,
        contact: caseData.contact,
        medicalHistory: caseData.medicalHistory,
        caseDesc: caseData.caseDesc
      })
      setIsEditModalOpen(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData((prev: any) => ({
      ...prev,
      [name]: name === 'age' || name === 'gender' ? Number(value) : value
    }))
  }

  const handleSubmitEdit = async () => {
    try {
      await api.updateCase(caseId, editFormData)
      // Refresh case details
      const data = await api.getCaseDetails(caseId)
      setCaseData(data)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error("Failed to update case:", error)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={onShowCaseList} className="hover:text-primary">
          病例管理
        </button>
        <span className="text-border">›</span>
        <span className="font-medium text-card-foreground">病例详情</span>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-card-foreground flex items-center">
              <FileText className="mr-2 text-primary w-6 h-6" />
              病例基础信息
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, index) => (
              <div key={index}>
                <p className="text-xs text-muted-foreground mb-1">加载中...</p>
                <p className="text-sm font-mono font-bold text-card-foreground">...</p>
              </div>
            ))}
          </div>
        </div>
      ) : caseData ? (
        <>
          {/* Case Info Card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-card-foreground flex items-center">
                <FileText className="mr-2 text-primary w-6 h-6" />
                病例基础信息
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleEditCase}
                  className="text-sm bg-card border border-primary text-primary hover:bg-primary/5 px-4 py-2.5 rounded-lg transition-all flex items-center"
                >
                  <Pen className="mr-2 w-5 h-5" />
                  编辑
                </button>
                <button
                  onClick={async () => {
                    if (confirm("确定要删除此病例吗？此操作不可恢复。")) {
                      try {
                        await api.deleteCase(caseId)
                        onShowCaseList()
                      } catch (error) {
                        console.error("Failed to delete case:", error)
                      }
                    }
                  }}
                  className="text-sm bg-card border border-red-500 text-red-500 hover:bg-red-50 px-4 py-2.5 rounded-lg transition-all flex items-center"
                >
                  <Trash2 className="mr-2 w-5 h-5" />
                  删除病例
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">病例编号</p>
                <p className="text-sm font-mono font-bold text-card-foreground">{caseData.caseId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">患者姓名</p>
                <p className="text-sm font-bold text-card-foreground">{caseData.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">性别</p>
                <p className="text-sm text-card-foreground">{caseData.gender === 1 ? "男" : "女"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">年龄</p>
                <p className="text-sm text-card-foreground">{caseData.age}岁</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">身份证号</p>
                <p className="text-sm text-card-foreground">{caseData.idNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">手机号</p>
                <p className="text-sm text-card-foreground">{caseData.contact}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">创建时间</p>
                <p className="text-sm text-card-foreground">{formatDate(caseData.createdTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">最后更新</p>
                <p className="text-sm text-card-foreground">{formatDate(caseData.updatedTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">病史</p>
                <p className="text-sm text-card-foreground">{caseData.medicalHistory || "无"}</p>
              </div>
              <div className="col-span-3">
                <p className="text-xs text-muted-foreground mb-1">病例描述</p>
                <p className="text-sm text-card-foreground">{caseData.caseDesc || "无"}</p>
              </div>
            </div>
          </div>

          {/* Examination List */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-card-foreground flex items-center">
                <ClipboardList className="mr-2 text-primary w-6 h-6" />
                检查记录列表
              </h3>
              <button
                    onClick={onCreateStudy}
                    className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all flex items-center"
                  >
                    <PlusCircle className="mr-2 w-4 h-4" />
                    新建检查
                  </button>
            </div>

            <div className="space-y-4">
              {caseData.studys && caseData.studys.length > 0 ? (
                caseData.studys.map((exam) => {
                  const imageCount = exam.imageIds?.length || exam.images?.length || 0;
                  // 获取当前检查的所有影像ID
                  const studyImageIds = exam.imageIds || exam.images?.map(img => img.imageId) || [];
                  // 计算推理次数
                  const inferenceCount = inferenceResults.filter(result => studyImageIds.includes(result.imageId)).length;
                  return (
                    <div
                      key={exam.studyId}
                      onClick={() => onShowStudyDetail(exam.studyId)}
                      className="border border-border rounded-xl p-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <HeartPulse className="w-6 h-6 text-primary" />
                          <div>
                            <p className="font-bold text-card-foreground">检查: {exam.studyType}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(exam.studyTime)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">影像数量</p>
                            <p className="text-sm font-bold text-card-foreground">{imageCount}张</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">推理次数</p>
                            <p className="text-sm font-bold text-card-foreground">{inferenceCount}次</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            已完成推理
                          </span>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                            {imageCount}张影像
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onShowStudyDetail(exam.studyId)
                            }}
                            className="text-primary hover:text-primary/80 text-sm font-medium px-3 py-1.5 rounded border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            查看详情
                          </button>
                          <button
                            onClick={(e) => handleDeleteStudy(e, exam.studyId)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded border border-red-200 hover:border-red-500 hover:bg-red-50 transition-all"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">暂无检查记录</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Case Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-card-foreground flex items-center">
                    <Pen className="mr-2 text-primary w-6 h-6" />
                    编辑病例信息
                  </h3>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-muted-foreground hover:text-card-foreground"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">患者姓名</label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={handleInputChange}
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">性别</label>
                      <select
                        name="gender"
                        value={editFormData.gender}
                        onChange={handleInputChange}
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                      >
                        <option value={1}>男</option>
                        <option value={0}>女</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">年龄</label>
                      <input
                        type="number"
                        name="age"
                        value={editFormData.age}
                        onChange={handleInputChange}
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">身份证号</label>
                      <input
                        type="text"
                        name="idNumber"
                        value={editFormData.idNumber}
                        onChange={handleInputChange}
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">手机号</label>
                      <input
                        type="text"
                        name="contact"
                        value={editFormData.contact}
                        onChange={handleInputChange}
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">病史</label>
                    <textarea
                      name="medicalHistory"
                      value={editFormData.medicalHistory}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">病例描述</label>
                    <textarea
                      name="caseDesc"
                      value={editFormData.caseDesc}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground px-4 py-2 rounded-lg transition-all"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitEdit}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all"
                    >
                      保存更改
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">病例不存在或已被删除</p>
          </div>
        </div>
      )}
    </div>
  )
}
