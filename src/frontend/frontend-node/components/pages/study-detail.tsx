"use client"

import { useState, useEffect, useRef } from "react"
import { HeartPulse, Image, Cpu, BarChart2, History, Play, Pen, Star, Download, Upload, Loader2, X, Eye, Plus } from "lucide-react"
import { api, StudyDto, ImageDto, ModelDto } from "@/lib/api"
import { API_BASE_URL, API_BASE_URL_IMAGE } from "@/lib/api"

interface StudyDetailProps {
  studyId: string
  onShowCaseList: () => void
  onShowCaseDetail: (caseId: string) => void
}

interface InferenceHistoryItem {
  satisfaction: any
  id: string
  image: string
  model: string
  status: string
  result: string
  confidence: number
  time: string
  // 后端返回的医生修改相关字段
  isModified?: boolean
  modifiedBbox?: any[]
  modifiedLabel?: string
  modifiedBy?: string
  modifiedTime?: string
  bbox?: any[]
}

export function StudyDetail({ studyId, onShowCaseList, onShowCaseDetail }: StudyDetailProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [study, setStudy] = useState<StudyDto | null>(null)
  const [images, setImages] = useState<ImageDto[]>([])
  const [inferenceHistory, setInferenceHistory] = useState<InferenceHistoryItem[]>([])
  const [caseId, setCaseId] = useState<string>("")
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false)
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [models, setModels] = useState<ModelDto[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.01)
  const [uploading, setUploading] = useState<boolean>(false)
  const [inferring, setInferring] = useState<boolean>(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false)
  const [previewImage, setPreviewImage] = useState<{ imageId: string; imagePath: string; imageDesc: string; uploadedTime: string; previewImageUrl?: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState<boolean>(false)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDraggingPreview, setIsDraggingPreview] = useState<boolean>(false)
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [inferError, setInferError] = useState<string>("")
  const [inferResult, setInferResult] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false)
  const [comment, setComment] = useState<string>("")
  const [satisfaction, setSatisfaction] = useState<string>("ACCURATE")
  const [editingDetection, setEditingDetection] = useState<any>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null)
  const [isHistoryDetailModalOpen, setIsHistoryDetailModalOpen] = useState<boolean>(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null)
  const [historyDetailLoading, setHistoryDetailLoading] = useState<boolean>(false)
  const [doctorBboxes, setDoctorBboxes] = useState<any[]>([]) // 医生手动标注的检测框列表
  const [doctorAnnotatedUrl, setDoctorAnnotatedUrl] = useState<string | null>(null) // 医生标注后的图像URL
  const [editingBboxIndex, setEditingBboxIndex] = useState<number | null>(null) // 当前正在编辑的检测框索引
  const [modelsLoading, setModelsLoading] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement>(null) // 编辑模态框画布引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // 获取模型列表
  const fetchModels = async () => {
    try {
      setModelsLoading(true)
      const activeModels = await api.getActiveModels()
      setModels(activeModels)
      // 设置默认选中的模型
      if (activeModels.length > 0 && !selectedModel) {
        setSelectedModel(activeModels[0].id.toString())
        setConfidenceThreshold(activeModels[0].defaultThreshold)
      }
    } catch (error) {
      console.error("Failed to fetch models:", error)
    } finally {
      setModelsLoading(false)
    }
  }

  // 上传图片
  const handleUploadImages = async (files: File[]) => {
    try {
      setUploading(true)
      
      const MAX_SINGLE_MB = 5
      const MAX_TOTAL_MB = 50
      let totalSize = 0
      
      // 检查单张图片大小
      for (const file of files) {
        totalSize += file.size
        if (file.size > MAX_SINGLE_MB * 1024 * 1024) {
          alert(`"${file.name}" 大小 ${(file.size / 1024 / 1024).toFixed(1)}MB，单张图片不超过${MAX_SINGLE_MB}MB`)
          setUploading(false)
          return
        }
      }
      // 检查总大小
      if (totalSize > MAX_TOTAL_MB * 1024 * 1024) {
        alert(`批量上传总量 ${(totalSize / 1024 / 1024).toFixed(1)}MB，不超过${MAX_TOTAL_MB}MB`)
        setUploading(false)
        return
      }
      
      // 检查是否有 DCM 文件
      const dcmFiles = files.filter(file => file.name.toLowerCase().endsWith('.dcm'))
      if (dcmFiles.length > 0) {
        console.log(`Detected ${dcmFiles.length} DCM files, will upload directly for backend processing`)
      }
      
      // 调用API上传图片
      const result = await api.uploadImages(caseId, studyId, files)
      
      // 刷新影像列表
      // 由于后端没有专门的获取检查影像的API，我们需要重新获取病例详情
      const cases = await api.getCases()
      let targetCase = null
      let targetStudy = null
      
      for (const caseItem of cases) {
        for (const study of caseItem.studys) {
          if (study.studyId === studyId) {
            targetCase = caseItem
            targetStudy = study
            break
          }
        }
        if (targetStudy) break
      }
      
      if (targetStudy) {
        // 清空当前影像列表，使用后端返回的真实数据
        const newImages: ImageDto[] = []
        
        // 遍历上传成功的影像ID，获取每张影像的详细信息
            for (const imageId of result.imageIds) {
              try {
                const image = await api.getImage(imageId)
                newImages.push({
                  imageId: image.imageId,
                  imagePath: image.imagePath,
                  imageDesc: image.imageDesc,
                  uploadedTime: image.uploadedTime
                })
              } catch (error) {
                console.error(`Failed to get image ${imageId}:`, error)
                // 如果获取影像详情失败，使用默认值
                newImages.push({
                  imageId: imageId,
                  imagePath: "",
                  imageDesc: `Image ${imageId}`,
                  uploadedTime: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-').replace('T', ' ').substring(0, 16)
                })
              }
            }
        
        setImages([...images, ...newImages])
      }
      
      setIsUploadModalOpen(false)
    } catch (error) {
      console.error("Failed to upload images:", error)
      let errorMessage = "上传失败，请重试"
      if (error instanceof Error) {
        if (error.message.includes("413")) {
          errorMessage = "文件大小超过限制，请选择较小的图片文件"
        } else if (error.message.includes("Failed to upload images")) {
          errorMessage = error.message
        }
      }
      alert(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  // 删除图片
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("确定要删除此影像吗？")) return
    
    try {
      // 调用API删除图片
      await api.deleteImage(imageId)
      setImages(images.filter(image => image.imageId !== imageId))
    } catch (error) {
      console.error("Failed to delete image:", error)
    }
  }

  // 获取推理历史记录
  const fetchInferenceHistory = async (imageIds?: string[]) => {
    try {
      const results = await api.getAllInferResults();
      console.log('Inference history results:', results);
      
      // 获取当前检查的图片ID列表（优先使用传入的参数，否则使用状态）
      const currentStudyImageIds = imageIds || images.map(img => img.imageId);
      console.log('Current study image IDs:', currentStudyImageIds);
      
      // 转换后端返回的数据格式为前端需要的格式，并过滤只保留当前检查的图片ID相关记录
      const formattedHistory = results
        .filter((result: any) => currentStudyImageIds.includes(result.imageId))
        .map((result: any) => {
          // 查找对应的模型信息
          const modelInfo = models.find(model => model.id.toString() === result.model);
          return {
            id: result.resultId,
            image: result.imageId,
            model: result.modelName,
            status: "成功",
            result: result.label || "未知",
            confidence: result.confidenceScore || 0,
            satisfaction: result.satisfaction || result.comment?.satisfaction || null,
            comment: result.sentence || result.comment?.sentence || null,
            time: result.createdTime ? new Date(result.createdTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-').replace('T', ' ').substring(0, 16) : new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-').replace('T', ' ').substring(0, 16),
            rawTime: result.createdTime ? new Date(result.createdTime).getTime() : 0,
            duration: result.duration || result.durationMs || result.elapsedTime || result.processingTime || null,
            // 后端返回的医生修改相关字段
            isModified: result.isModified,
            modifiedBbox: result.modifiedBbox,
            modifiedLabel: result.modifiedLabel,
            modifiedBy: result.modifiedBy,
            modifiedTime: result.modifiedTime,
            bbox: result.bbox // AI推理的原始检测框
          };
        })
      // 按时间降序排序（最新的在前）
      .sort((a: any, b: any) => b.rawTime - a.rawTime);
      
      console.log('Formatted history with comments:', formattedHistory);
      setInferenceHistory(formattedHistory);
    } catch (error) {
      console.error("Failed to fetch inference history:", error);
    }
  }

  // 发起AI推理
  const handleInfer = async () => {
    if (selectedImages.length === 0) {
      return
    }
    
    try {
      setInferring(true)
      setInferError("")
      
      // 调用批量推理API
      const batchResult = await api.inferBatch(selectedImages, selectedModel, confidenceThreshold)
      
      console.log('Batch inference result:', batchResult)
      
      if (!batchResult.batchId) {
        throw new Error('批量推理请求失败，未返回batchId');
      }
      
      // 轮询任务状态，直到完成
      let finalStatusResult: any = null;
      const checkBatchStatus = async () => {
        const statusResult = await api.getBatchStatus(batchResult.batchId);
        console.log('Batch status:', statusResult);
        
        if (statusResult.overallStatus === 'COMPLETED') {
          finalStatusResult = statusResult;
          return statusResult;
        } else if (statusResult.overallStatus === 'PENDING' || statusResult.overallStatus === 'PROCESSING') {
          // 等待一段时间后再次检查
          await new Promise(resolve => setTimeout(resolve, 500));
          return checkBatchStatus();
        } else {
          throw new Error(`批量推理失败，状态: ${statusResult.overallStatus}`);
        }
      };
      
      // 等待任务完成
      await checkBatchStatus();
      
      // 获取批量推理结果
      const batchResults = await api.getBatchResult(batchResult.batchId);
      console.log('Batch inference results:', batchResults);

      // 刷新推理历史记录
      await fetchInferenceHistory();

      // 弹出全局提示
      const successCount = finalStatusResult?.progress?.success || batchResults?.length || 0;
      alert(`推理完成！共处理 ${selectedImages.length} 张影像，其中 ${successCount} 张推理成功。`);

      // 存储推理结果（如果只有一张图片，显示结果）
      if (selectedImages.length === 1 && batchResults && batchResults.length > 0) {
        setInferResult({ inferResult: batchResults[0] })
        
        // 生成标注图像
        if (batchResults[0].bbox && Array.isArray(batchResults[0].bbox)) {
          try {
            const selectedImageData = images.find(img => img.imageId === selectedImages[0]);
            if (selectedImageData && selectedImageData.imagePath) {
              const imageUrl = `${API_BASE_URL_IMAGE}${selectedImageData.imagePath}`;
              const annotatedUrl = await drawAnnotatedImage(
                imageUrl, 
                batchResults[0].bbox,
                batchResults[0].label,
                batchResults[0].confidenceScore
              );
              setAnnotatedImageUrl(annotatedUrl);
              console.log('Generated annotated image:', annotatedUrl);
            }
          } catch (error) {
            console.error('Failed to generate annotated image:', error);
          }
        }
      }

    } catch (error) {
      console.error("Failed to infer batch:", error)
      setInferError(error instanceof Error ? error.message : "推理失败，请重试")
      setInferResult(null)
    } finally {
      setInferring(false)
    }
  }

  // 编辑检测框
  const handleEditDetection = (detection: any, index: number) => {
    console.log('[handleEditDetection] Called with detection:', detection, 'and index:', index)
    setEditingDetection(detection)
    setEditingBboxIndex(index)
    setIsEditModalOpen(true)
  }

  // 添加新的检测框
  const handleAddDetection = () => {
    const newDetection = {
      x1: 10,
      y1: 10,
      x2: 30,
      y2: 30,
      label: '医生标注',
      confidence: 1.0
    }
    const newBboxes = [...doctorBboxes, newDetection]
    setDoctorBboxes(newBboxes)
    // 重新生成医生标注图像
    regenerateDoctorAnnotatedImage(newBboxes)
  }

  // 删除检测框
  const handleDeleteDetection = (index: number) => {
    const newBboxes = doctorBboxes.filter((_, i) => i !== index)
    setDoctorBboxes(newBboxes)
    if (newBboxes.length === 0) {
      setDoctorAnnotatedUrl(null)
    } else {
      regenerateDoctorAnnotatedImage(newBboxes)
    }
  }

  // 重新生成医生标注图像（AI框+医生框）
  const regenerateDoctorAnnotatedImage = async (doctorBoxes: any[]) => {
    const selectedImageData = images.find(img => img.imageId === selectedImage)
    if (!selectedImageData || !selectedImageData.imagePath) return

    const imageUrl = `${API_BASE_URL_IMAGE}${selectedImageData.imagePath}`
    const aiBoxes = inferResult?.inferResult?.bbox || []

    try {
      const annotatedUrl = await drawAnnotatedImageWithBothBoxes(
        imageUrl,
        aiBoxes,
        doctorBoxes,
        inferResult?.inferResult?.label || '未知',
        inferResult?.inferResult?.confidenceScore || 0
      )
      setDoctorAnnotatedUrl(annotatedUrl)
    } catch (error) {
      console.error('Failed to regenerate doctor annotated image:', error)
    }
  }

  // 绘制同时包含AI标注和医生标注的图像
  const drawAnnotatedImageWithBothBoxes = async (
    imageUrl: string,
    aiBoxes: any[],
    doctorBoxes: any[],
    label: string,
    confidenceScore: number
  ): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height

        // 绘制原始图像
        ctx.drawImage(img, 0, 0)

        // 绘制AI检测框（蓝色）- 后端返回的是像素坐标 {y1, x1, y2, x2}
        if (Array.isArray(aiBoxes)) {
          aiBoxes.forEach((box: any) => {
            const x = box.x1 || 0
            const y = box.y1 || 0
            const w = (box.x2 || 0) - x
            const h = (box.y2 || 0) - y
            ctx.strokeStyle = '#0000FF'
            ctx.lineWidth = Math.max(2, img.width / 500)
            ctx.strokeRect(x, y, w, h)
            const labelText = `${label || "未知"} (${(confidenceScore * 100 || 0).toFixed(1)}%) - AI`
            ctx.fillStyle = '#0000FF'
            ctx.fillRect(x, y - 20, ctx.measureText(labelText).width + 10, 20)
            ctx.fillStyle = '#FFFFFF'
            ctx.font = `${Math.max(12, img.width / 80)}px Arial`
            ctx.fillText(labelText, x + 5, y - 5)
          })
        }

        // 绘制医生检测框（绿色）- 医生框是百分比坐标 (0-100)，需要转换为像素坐标
        if (Array.isArray(doctorBoxes)) {
          doctorBoxes.forEach((box: any) => {
            const x = (box.x1 / 100) * img.width
            const y = (box.y1 / 100) * img.height
            const w = ((box.x2 - box.x1) / 100) * img.width
            const h = ((box.y2 - box.y1) / 100) * img.height
            ctx.strokeStyle = '#00FF00'
            ctx.lineWidth = Math.max(3, img.width / 333)
            ctx.strokeRect(x, y, w, h)
            const labelText = `${box.label || "医生标注"} (手动)`
            ctx.fillStyle = '#00FF00'
            ctx.fillRect(x, y - 20, ctx.measureText(labelText).width + 10, 20)
            ctx.fillStyle = '#FFFFFF'
            ctx.font = `${Math.max(12, img.width / 80)}px Arial`
            ctx.fillText(labelText, x + 5, y - 5)
          })
        }

        try {
          const annotatedUrl = canvas.toDataURL('image/png')
          resolve(annotatedUrl)
        } catch (error) {
          console.error('Failed to generate annotated image:', error)
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = imageUrl
    })
  }

  // 保存检测框编辑
  const handleSaveDetection = async () => {
    console.log('[handleSaveDetection] === START ===')
    console.log('[handleSaveDetection] inferResult?.inferResult?.resultId:', inferResult?.inferResult?.resultId)
    console.log('[handleSaveDetection] editingBboxIndex:', editingBboxIndex, 'type:', typeof editingBboxIndex)
    console.log('[handleSaveDetection] editingDetection:', editingDetection)
    console.log('[handleSaveDetection] doctorBboxes before:', JSON.stringify(doctorBboxes))

    if (!inferResult?.inferResult?.resultId) {
      console.log('[handleSaveDetection] No resultId, cannot save!')
      setIsEditModalOpen(false)
      setEditingDetection(null)
      setEditingBboxIndex(null)
      return
    }

    try {
      // 构建医生标注的检测框列表
      let finalDoctorBboxes = [...doctorBboxes]
      console.log('[handleSaveDetection] finalDoctorBboxes initial:', JSON.stringify(finalDoctorBboxes))

      // 如果有正在编辑的检测框
      if (editingDetection) {
        console.log('[handleSaveDetection] editingDetection exists, editingBboxIndex:', editingBboxIndex)
        if (editingBboxIndex === -1 || editingBboxIndex === null) {
          // 编辑AI检测框或新添加 -> 创建新的医生标注
          console.log('[handleSaveDetection] Adding new doctor annotation')
          finalDoctorBboxes.push({
            x1: editingDetection.x1,
            y1: editingDetection.y1,
            x2: editingDetection.x2,
            y2: editingDetection.y2
          })
        } else if (editingBboxIndex >= 0) {
          // 编辑医生已有的标注 -> 更新它
          console.log('[handleSaveDetection] Updating existing doctor annotation at index', editingBboxIndex)
          finalDoctorBboxes[editingBboxIndex] = {
            x1: editingDetection.x1,
            y1: editingDetection.y1,
            x2: editingDetection.x2,
            y2: editingDetection.y2
          }
        } else {
          console.log('[handleSaveDetection] editingBboxIndex is unexpected value:', editingBboxIndex)
        }
        setDoctorBboxes(finalDoctorBboxes)
        console.log('[handleSaveDetection] finalDoctorBboxes after:', JSON.stringify(finalDoctorBboxes))
      } else {
        console.log('[handleSaveDetection] No editingDetection!')
      }

      // 调用后端API保存
      console.log('[handleSaveDetection] Calling API with resultId:', inferResult.inferResult.resultId, 'and bboxes:', finalDoctorBboxes)
      const apiResult = await api.updateDocBbox(inferResult.inferResult.resultId, finalDoctorBboxes)
      console.log('[handleSaveDetection] API call succeeded, result:', apiResult)

      // 重新获取最新数据并更新
      const updatedResult = await api.getInferResult(inferResult.inferResult.resultId)
      console.log('[handleSaveDetection] Updated result:', updatedResult)

      // 更新推理结果状态
      if (updatedResult) {
        console.log('[handleSaveDetection] Updated result modifiedBbox:', updatedResult.modifiedBbox)
        const newInferResult = {
          ...inferResult,
          inferResult: {
            ...inferResult.inferResult,
            modifiedBbox: updatedResult.modifiedBbox || finalDoctorBboxes,
            doctorBboxes: updatedResult.modifiedBbox || finalDoctorBboxes,
            isModified: updatedResult.isModified ?? (finalDoctorBboxes.length > 0)
          }
        }
        setInferResult(newInferResult)
        // 更新本地医生标注状态
        if (updatedResult.modifiedBbox) {
          setDoctorBboxes(updatedResult.modifiedBbox)
        }
        console.log('[handleSaveDetection] State updated, newInferResult:', newInferResult)

        // 重新生成医生标注图像
        await regenerateDoctorAnnotatedImage(finalDoctorBboxes)
        console.log('[handleSaveDetection] Image regenerated')

        // 刷新历史记录
        await fetchInferenceHistory()
        console.log('[handleSaveDetection] History refreshed')
      } else {
        console.log('[handleSaveDetection] No updatedResult returned')
      }
    } catch (error) {
      console.error('[handleSaveDetection] Error:', error)
    }

    setIsEditModalOpen(false)
    setEditingDetection(null)
    setEditingBboxIndex(null)
  }

  // 评价结果
  const handleRateResult = () => {
    setIsRateModalOpen(true)
  }

  // 保存评价
  const handleSaveRating = async () => {
    if (!inferResult || !inferResult.inferResult?.resultId) {
      return
    }
    
    try {
      // 调用API保存评价
      const result = await api.createComment(
        inferResult.inferResult.resultId,
        comment,
        satisfaction
      )
      
      console.log('Comment created successfully:', result)
      
      // 关闭模态框并重置表单
      setIsRateModalOpen(false)
      setComment("")
      setSatisfaction("ACCURATE")
      
      // 刷新推理历史记录
      await fetchInferenceHistory()
    } catch (error) {
      console.error("Failed to save rating:", error)
      alert('评价失败，请重试')
    }
  }

  // 查看历史记录详情
  const handleViewHistoryDetail = async (historyItem: any) => {
    try {
      setHistoryDetailLoading(true)
      setSelectedHistoryItem(historyItem)

      // 调用API获取详细的推理结果
      const detail = await api.getInferResult(historyItem.id)
      console.log('History detail:', detail)

      // 获取图片信息 - 使用 historyItem.image 而不是 detail.imageId
      const imageId = historyItem.image || detail.imageId
      const imageData = images.find(img => img.imageId === imageId)

      if (imageData && imageData.imagePath) {
        const imageUrl = `${API_BASE_URL_IMAGE}${imageData.imagePath}`
        console.log('Generating comparison image for:', imageUrl)
        console.log('AI boxes:', detail.bbox)
        console.log('Doctor boxes:', detail.modifiedBbox)

        // 生成标注图像
        let comparisonUrl = ''
        let aiOnlyUrl = ''
        if (detail.modifiedBbox && detail.modifiedBbox.length > 0) {
          // 有医生修改的检测框，生成包含AI和医生标注的对比图像
          comparisonUrl = await drawAnnotatedImageWithBothBoxes(
            imageUrl,
            detail.bbox || [],
            detail.modifiedBbox || [],
            detail.label || historyItem.result || '未知',
            detail.confidenceScore || historyItem.confidence || 0
          )
          // 同时生成AI-only标注图像用于右侧显示
          aiOnlyUrl = await drawAnnotatedImage(
            imageUrl,
            detail.bbox || [],
            detail.label || historyItem.result || '未知',
            detail.confidenceScore || historyItem.confidence || 0
          )
        } else {
          // 没有医生修改，只生成AI标注图像
          comparisonUrl = await drawAnnotatedImage(
            imageUrl,
            detail.bbox || [],
            detail.label || historyItem.result || '未知',
            detail.confidenceScore || historyItem.confidence || 0
          )
          aiOnlyUrl = comparisonUrl
        }
        console.log('Comparison image generated:', comparisonUrl ? 'YES' : 'NO')
        console.log('AI-only image generated:', aiOnlyUrl ? 'YES' : 'NO')

        // 将对比图像URL存储到selectedHistoryItem中
        setSelectedHistoryItem({
          ...historyItem,
          detail: detail,
          comparisonImageUrl: comparisonUrl,
          aiOnlyImageUrl: aiOnlyUrl
        })
      } else {
        console.log('No image data found for imageId:', imageId)
        setSelectedHistoryItem({
          ...historyItem,
          detail: detail
        })
      }

      // 打开详情模态框
      setIsHistoryDetailModalOpen(true)
    } catch (error) {
      console.error('Failed to get history detail:', error)
      alert('获取历史记录详情失败，请重试')
    } finally {
      setHistoryDetailLoading(false)
    }
  }

  // 绘制标注图像
  const drawAnnotatedImage = async (imageUrl: string, bbox: any[], label: string, confidenceScore: number) => {
    return new Promise<string>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous'; // 允许跨域加载图像
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // 设置画布尺寸
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制原始图像
        ctx.drawImage(img, 0, 0);
        
        // 绘制检测框 - 后端返回的是像素坐标，格式为 {y1, x1, y2, x2}
        console.log('[drawAnnotatedImage] bbox:', JSON.stringify(bbox), 'label:', label, 'confidenceScore:', confidenceScore)
        if (Array.isArray(bbox) && bbox.length > 0) {
          bbox.forEach((box: any) => {
            console.log('[drawAnnotatedImage] Drawing box:', JSON.stringify(box))
            // 后端返回的 bbox 格式是 {y1, x1, y2, x2}，且是像素坐标
            const x = box.x1 || 0
            const y = box.y1 || 0
            const w = (box.x2 || 0) - x
            const h = (box.y2 || 0) - y
            console.log('[drawAnnotatedImage] Pixel coords:', {x, y, w, h}, 'img size:', {width: img.width, height: img.height})
            ctx.strokeStyle = '#FF0000'
            ctx.lineWidth = Math.max(2, img.width / 500)
            ctx.strokeRect(x, y, w, h)

            // 绘制标签
            const labelText = `${label || "未知"} (${(confidenceScore * 100 || 0).toFixed(1)}%)`

            ctx.fillStyle = '#FF0000'
            ctx.fillRect(x, y - 20, ctx.measureText(labelText).width + 10, 20)
            ctx.fillStyle = '#FFFFFF'
            ctx.font = `${Math.max(12, img.width / 80)}px Arial`
            ctx.fillText(labelText, x + 5, y - 5)
          });
        } else {
          console.log('[drawAnnotatedImage] No bbox to draw, bbox is array:', Array.isArray(bbox), 'length:', bbox?.length)
        }
        
        // 生成标注图像URL
        try {
          const annotatedUrl = canvas.toDataURL('image/png');
          resolve(annotatedUrl);
        } catch (error) {
          console.error('Failed to generate annotated image:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }

  // 处理鼠标滚轮缩放
  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoomLevel(prev => Math.max(50, Math.min(300, prev + delta)));
  };

  // 开始拖拽预览图（仅在放大后启用）
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel <= 100) return
    e.preventDefault()
    setIsDraggingPreview(true)
    setDragStartPoint({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    })
  }

  // 拖拽预览图
  const handlePreviewMouseMove = (e: MouseEvent) => {
    if (!isDraggingPreview || zoomLevel <= 100) return
    setPanOffset({
      x: e.clientX - dragStartPoint.x,
      y: e.clientY - dragStartPoint.y
    })
  }

  // 结束拖拽预览图
  const handlePreviewMouseUp = () => {
    setIsDraggingPreview(false)
  }

  useEffect(() => {
    if (!isDraggingPreview) return
    window.addEventListener('mousemove', handlePreviewMouseMove)
    window.addEventListener('mouseup', handlePreviewMouseUp)
    return () => {
      window.removeEventListener('mousemove', handlePreviewMouseMove)
      window.removeEventListener('mouseup', handlePreviewMouseUp)
    }
  }, [isDraggingPreview, dragStartPoint, zoomLevel])

  useEffect(() => {
    if (zoomLevel <= 100) {
      setPanOffset({ x: 0, y: 0 })
      setIsDraggingPreview(false)
    }
  }, [zoomLevel])

  // 手动标注画布逻辑
  useEffect(() => {
    if (!isEditModalOpen) return
    
    const canvas = document.getElementById('annotationCanvas') as HTMLCanvasElement
    const img = document.getElementById('annotationImage') as HTMLImageElement
    
    if (!canvas || !img) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let isDrawing = false
    let startX = 0
    let startY = 0
    let currentX = 0
    let currentY = 0
    
    // 调整画布尺寸
    const resizeCanvas = () => {
      if (img) {
        canvas.width = img.offsetWidth
        canvas.height = img.offsetHeight
      }
    }
    
    // 初始化画布
    const initCanvas = () => {
      resizeCanvas()
      redrawCanvas()
    }

    // 获取图片偏移量和尺寸
    const getImageOffset = () => {
      const imgRect = img.getBoundingClientRect()
      const imgRenderedWidth = imgRect.width
      const imgRenderedHeight = imgRect.height
      const containerWidth = canvas.parentElement?.clientWidth || canvas.width
      const containerHeight = canvas.parentElement?.clientHeight || canvas.height
      return {
        offsetX: (containerWidth - imgRenderedWidth) / 2,
        offsetY: (containerHeight - imgRenderedHeight) / 2,
        imgRenderedWidth,
        imgRenderedHeight
      }
    }

    // 重绘画布
    const redrawCanvas = () => {
      const { offsetX, offsetY, imgRenderedWidth, imgRenderedHeight } = getImageOffset()

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制AI标注的检测框（蓝色）
      if (inferResult?.inferResult?.bbox && Array.isArray(inferResult.inferResult.bbox)) {
        inferResult.inferResult.bbox.forEach((box: any) => {
          const x = offsetX + (box.x1 / 100) * imgRenderedWidth
          const y = offsetY + (box.y1 / 100) * imgRenderedHeight
          const w = ((box.x2 - box.x1) / 100) * imgRenderedWidth
          const h = ((box.y2 - box.y1) / 100) * imgRenderedHeight
          ctx.strokeStyle = '#0000FF'
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, w, h)
          const label = inferResult.inferResult.label || "未知"
          const confidence = inferResult.inferResult.confidenceScore || 0
          const labelText = `${label} (${(confidence * 100).toFixed(1)}%) - AI`
          ctx.fillStyle = '#0000FF'
          ctx.fillRect(x, y - 20, ctx.measureText(labelText).width + 10, 20)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '12px Arial'
          ctx.fillText(labelText, x + 5, y - 5)
        })
      }

      // 绘制医生已保存的检测框（绿色）
      if (doctorBboxes.length > 0) {
        doctorBboxes.forEach((box: any) => {
          const x = offsetX + (box.x1 / 100) * imgRenderedWidth
          const y = offsetY + (box.y1 / 100) * imgRenderedHeight
          const w = ((box.x2 - box.x1) / 100) * imgRenderedWidth
          const h = ((box.y2 - box.y1) / 100) * imgRenderedHeight
          ctx.strokeStyle = '#00FF00'
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, w, h)
          const labelText = `${box.label || "医生标注"} (手动)`
          ctx.fillStyle = '#00FF00'
          ctx.fillRect(x, y - 20, ctx.measureText(labelText).width + 10, 20)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = '12px Arial'
          ctx.fillText(labelText, x + 5, y - 5)
        })
      }

      // 绘制当前正在编辑的检测框（红色）
      if (editingDetection) {
        const x = offsetX + (editingDetection.x1 / 100) * imgRenderedWidth
        const y = offsetY + (editingDetection.y1 / 100) * imgRenderedHeight
        const w = ((editingDetection.x2 - editingDetection.x1) / 100) * imgRenderedWidth
        const h = ((editingDetection.y2 - editingDetection.y1) / 100) * imgRenderedHeight
        ctx.strokeStyle = '#FF0000'
        ctx.lineWidth = 3
        ctx.strokeRect(x, y, w, h)
        const labelText = `${editingDetection.label || "医生标注"} (编辑中)`
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(x, y - 20, ctx.measureText(labelText).width + 10, 20)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 12px Arial'
        ctx.fillText(labelText, x + 5, y - 5)
      }
    }

    // 鼠标事件处理 - 只支持拖拽绘制新框
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      startX = e.clientX - rect.left
      startY = e.clientY - rect.top
      currentX = startX
      currentY = startY
      isDrawing = true
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return

      const rect = canvas.getBoundingClientRect()
      currentX = e.clientX - rect.left
      currentY = e.clientY - rect.top

      // 拖拽过程中不预览，只清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const handleMouseUp = () => {
      if (!isDrawing) return
      isDrawing = false

      const { offsetX, offsetY, imgRenderedWidth, imgRenderedHeight } = getImageOffset()

      // 计算相对坐标 (0-100)
      const relativeStartX = (Math.min(startX, currentX) - offsetX) / imgRenderedWidth * 100
      const relativeStartY = (Math.min(startY, currentY) - offsetY) / imgRenderedHeight * 100
      const relativeEndX = (Math.max(startX, currentX) - offsetX) / imgRenderedWidth * 100
      const relativeEndY = (Math.max(startY, currentY) - offsetY) / imgRenderedHeight * 100

      const x1 = Math.max(0, Math.min(100, Number(relativeStartX.toFixed(1))))
      const y1 = Math.max(0, Math.min(100, Number(relativeStartY.toFixed(1))))
      const x2 = Math.max(0, Math.min(100, Number(relativeEndX.toFixed(1))))
      const y2 = Math.max(0, Math.min(100, Number(relativeEndY.toFixed(1))))

      // 如果绘制区域太小，忽略
      if (Math.abs(x2 - x1) < 1 || Math.abs(y2 - y1) < 1) {
        redrawCanvas()
        return
      }

      // 创建新的检测框
      const newDetection = {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        label: editingBboxIndex === -1 ? (inferResult?.inferResult?.label || '未知') : '医生标注',
        confidence: editingBboxIndex === -1 ? (inferResult?.inferResult?.confidenceScore || 1) : 1
      }
      setEditingDetection(newDetection)

      redrawCanvas()
    }

    // 添加事件监听器
    img.addEventListener('load', initCanvas)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('resize', resizeCanvas)

    // 初始化
    initCanvas()
    
    return () => {
      img.removeEventListener('load', initCanvas)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isEditModalOpen, editingDetection, doctorBboxes, editingBboxIndex, inferResult])

  // 导出结果
  const handleExportResult = async () => {
    if (!inferResult) {
      return
    }

    try {
      const timestamp = Date.now()

      // 导出JSON文件
      const selectedModelData = models.find(model => model.id.toString() === selectedModel)
      const exportData = {
        imageId: selectedImage,
        model: selectedModelData ? `${selectedModelData.modelName} (v${selectedModelData.modelVersion})` : selectedModel,
        result: inferResult.inferResult,
        timestamp: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')
      }
      const jsonString = JSON.stringify(exportData, null, 2)
      const jsonBlob = new Blob([jsonString], { type: 'application/json' })
      const jsonUrl = URL.createObjectURL(jsonBlob)
      const jsonLink = document.createElement('a')
      jsonLink.href = jsonUrl
      jsonLink.download = `inference-result-${timestamp}.json`
      jsonLink.click()
      URL.revokeObjectURL(jsonUrl)

      // 导出AI标注图像（如果存在annotatedImageUrl）
      if (annotatedImageUrl) {
        const imageLink = document.createElement('a')
        imageLink.href = annotatedImageUrl
        imageLink.download = `inference-image-${timestamp}.png`
        imageLink.click()
      }
    } catch (error) {
      console.error("Failed to export result:", error)
    }
  }

  // 查看影像
  const handleViewImage = async (imageId: string) => {
    try {
      setPreviewLoading(true)
      // 调用API获取影像详情
      const image = await api.getImage(imageId)
      setPreviewImage({
        imageId: image.imageId,
        imagePath: image.imagePath,
        imageDesc: image.imageDesc,
        uploadedTime: image.uploadedTime
      })
      setZoomLevel(100)
      setPanOffset({ x: 0, y: 0 })
      setIsPreviewModalOpen(true)
    } catch (error) {
      console.error("Failed to get image:", error)
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    const fetchStudyDetails = async () => {
      try {
        setLoading(true)
        // 从API获取检查详情
        // 由于后端没有专门的获取检查详情的API，我们需要通过获取病例详情来获取检查信息
        
        // 1. 首先获取所有病例，然后找到包含当前检查的病例
        const cases = await api.getCases()
        console.log('Cases data:', cases)
        
        // 2. 查找包含当前检查的病例
        let targetCase = null
        let targetStudy = null
        
        for (const caseItem of cases) {
          for (const study of caseItem.studys) {
            if (study.studyId === studyId) {
              targetCase = caseItem
              targetStudy = study
              break
            }
          }
          if (targetStudy) break
        }
        
        if (targetStudy && targetCase) {
          setStudy(targetStudy)
          setCaseId(targetCase.caseId)
          
          // 3. 获取影像列表
          let currentImages: ImageDto[] = []
          
          // 尝试从 targetStudy 中获取影像列表
          if (targetStudy.images && targetStudy.images.length > 0) {
            currentImages = targetStudy.images.map(img => ({
              imageId: img.imageId,
              imagePath: img.imagePath,
              imageDesc: img.imageDesc,
              uploadedTime: img.uploadedTime
            }))
            setImages(currentImages)
          } else if (targetStudy.imageIds && targetStudy.imageIds.length > 0) {
            // 如果有 imageIds 但没有 images，尝试获取每张影像的详细信息
            for (const imageId of targetStudy.imageIds) {
              try {
                const image = await api.getImage(imageId)
                currentImages.push({
                  imageId: image.imageId,
                  imagePath: image.imagePath,
                  imageDesc: image.imageDesc,
                  uploadedTime: image.uploadedTime
                })
              } catch (error) {
                console.error(`Failed to get image ${imageId}:`, error)
                // 如果获取影像详情失败，使用默认值
                currentImages.push({
                  imageId: imageId,
                  imagePath: "",
                  imageDesc: `Image ${imageId}`,
                  uploadedTime: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-').replace('T', ' ').substring(0, 16)
                })
              }
            }
            setImages(currentImages)
          } else {
            // 如果没有影像，使用空数组
            setImages([])
          }
          
          // 4. 获取推理历史记录（传入当前检查的图片ID列表）
          const currentImageIds = currentImages.map(img => img.imageId)
          await fetchInferenceHistory(currentImageIds)
        } else {
          throw new Error("检查记录未找到")
        }
      } catch (error) {
        console.error("Failed to fetch study details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudyDetails()
    fetchModels()
  }, [studyId])

  return (
    <div className="p-8 space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={onShowCaseList} className="hover:text-primary">
              病例管理
            </button>
            <span className="text-border">›</span>
            <button onClick={() => onShowCaseDetail(caseId)} className="hover:text-primary">
              病例详情
            </button>
            <span className="text-border">›</span>
            <span className="font-medium text-card-foreground">检查详情</span>
          </div>

          {/* Study Info */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <HeartPulse className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-bold text-card-foreground">检查类型: {study?.studyType || "未知"}</p>
                  <p className="text-xs text-muted-foreground">检查时间: {study?.studyTime || "未知"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded text-xs font-bold">{images.length}张影像</span>
                <span className="bg-green-100 text-green-600 px-3 py-1 rounded text-xs font-bold">{inferenceHistory.length}次推理</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left: Image Management */}
            <div className="col-span-4 bg-card rounded-2xl border border-border shadow-sm p-6 h-[calc(100vh-200px)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-card-foreground flex items-center">
                  <Image className="mr-2 text-primary w-5 h-5" />
                  影像管理
                </h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={images.length > 0 && selectedImages.length === images.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedImages(images.map(img => img.imageId));
                        } else {
                          setSelectedImages([]);
                        }
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground ml-1">全选</span>
                  </label>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-all flex items-center"
                  >
                    <Upload className="mr-1 w-4 h-4" />
                    上传
                  </button>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {images.map((image) => (
                  <div key={image.imageId} className={`border ${selectedImages.includes(image.imageId) ? 'border-primary bg-primary/5' : 'border-border'} rounded-lg p-3 hover:border-primary transition-all`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="bg-muted rounded-lg h-32 w-full mb-2 flex items-center justify-center overflow-hidden">
                        {image.imagePath ? (
                          <img 
                            src={`${API_BASE_URL_IMAGE}${image.imagePath}`} 
                            alt={image.imageDesc || 'Image'} 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Image className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.imageId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedImages([...selectedImages, image.imageId]);
                          } else {
                            setSelectedImages(selectedImages.filter(id => id !== image.imageId));
                          }
                        }}
                        className="ml-2 w-5 h-5 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs font-mono text-card-foreground mb-2">{image.imageId}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewImage(image.imageId)}
                        className="flex-1 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded border border-primary/20 hover:border-primary transition-all"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image.imageId)}
                        className="flex-1 text-sm font-medium bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded border border-red-200 hover:border-red-500 transition-all"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Inference Area */}
            <div className="col-span-8 space-y-6">
              {/* Inference Config */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                <h3 className="font-bold text-card-foreground mb-4 flex items-center">
                  <Cpu className="mr-2 text-primary w-5 h-5" />
                  AI推理配置
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">选择影像</label>
                    <div className="border border-border rounded-lg p-3 bg-card max-h-24 overflow-y-auto">
                      {images.map((image) => (
                        <div key={image.imageId} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={selectedImages.includes(image.imageId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedImages([...selectedImages, image.imageId]);
                              } else {
                                setSelectedImages(selectedImages.filter(id => id !== image.imageId));
                              }
                              // 不再同步到selectedImage，避免影响下方推理结果展示
                            }}
                            className="mr-2 w-5 h-5 cursor-pointer"
                          />
                          <span className="text-sm">{image.imageId}</span>
                        </div>
                      ))}
                      {images.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          暂无影像
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      已选择 {selectedImages.length} 张影像
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">AI模型</label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value)
                        // 当选择模型时，更新默认阈值
                        const selectedModelData = models.find(model => model.id.toString() === e.target.value)
                        if (selectedModelData) {
                          setConfidenceThreshold(selectedModelData.defaultThreshold)
                        }
                      }}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                    >
                      {modelsLoading ? (
                        <option value="">加载中...</option>
                      ) : models.length === 0 ? (
                        <option value="">无可用模型</option>
                      ) : (
                        models.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.modelName} ({model.modelVersion})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">置信度阈值</label>
                    <input
                      type="number"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                      step={0.1}
                      min={0}
                      max={1}
                      className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                </div>
                {inferError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">
                    {inferError}
                  </div>
                )}
                <button
                  onClick={handleInfer}
                  disabled={(selectedImages.length === 0) || inferring}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg transition-all flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inferring ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      推理中...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 w-5 h-5" />
                      发起AI推理 ({selectedImages.length} 张影像)
                    </>
                  )}
                </button>
              </div>

              {/* Inference Results */}
              <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                <h3 className="font-bold text-card-foreground mb-4 flex items-center">
                  <BarChart2 className="mr-2 text-primary w-5 h-5" />
                  推理结果展示
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">选择影像</label>
                    <select
                      value={selectedImage}
                      onChange={async (e) => {
                        const newImageId = e.target.value
                        setSelectedImage(newImageId)
                        setInferResult(null)
                        setDoctorBboxes([]) // 清空医生标注
                        setDoctorAnnotatedUrl(null) // 清空医生标注图像

                        // 尝试获取该图片的推理结果
                        if (newImageId) {
                          try {
                            console.log('Selected image ID:', newImageId)
                            // 获取所有推理结果
                            const results = await api.getAllInferResults()
                            console.log('All inference results:', results)
                            console.log('Number of inference results:', results.length)

                            // 打印每个结果的 imageId
                            results.forEach((result: any, index: number) => {
                              console.log(`Result ${index} imageId:`, result.imageId)
                            })

                            // 从 annotatedImgPath 中提取图片 ID 来匹配
                            const imageResult = results.find((result: any) => {
                              if (result.imageId === newImageId) {
                                return true;
                              }
                              // 从 annotatedImgPath 中提取图片 ID
                              if (result.annotatedImgPath) {
                                const imgIdMatch = result.annotatedImgPath.match(/IMG[0-9A-F]{10}/i);
                                if (imgIdMatch && imgIdMatch[0] === newImageId) {
                                  return true;
                                }
                              }
                              return false;
                            })
                            console.log('Image inference result:', imageResult)

                            if (imageResult) {
                              // 构建推理结果对象
                              const inferResultData = {
                                inferResult: {
                                  label: imageResult.label,
                                  confidenceScore: imageResult.confidenceScore,
                                  bbox: imageResult.bbox || imageResult.detections,
                                  detections: imageResult.bbox || imageResult.detections,
                                  resultId: imageResult.resultId,
                                  // 后端返回的医生修改相关字段
                                  isModified: imageResult.isModified,
                                  doctorBboxes: imageResult.modifiedBbox || [],
                                  modifiedLabel: imageResult.modifiedLabel
                                }
                              }
                              console.log('Constructed infer result:', inferResultData)
                              setInferResult(inferResultData)

                              // 如果有医生修改的检测框，加载它们
                              if (imageResult.isModified && imageResult.modifiedBbox) {
                                setDoctorBboxes(imageResult.modifiedBbox)
                              }

                              // 生成标注图像
                              if (inferResultData.inferResult.bbox && Array.isArray(inferResultData.inferResult.bbox)) {
                                try {
                                  const selectedImageData = images.find(img => img.imageId === newImageId);
                                  if (selectedImageData && selectedImageData.imagePath) {
                                    const imageUrl = `${API_BASE_URL_IMAGE}${selectedImageData.imagePath}`;

                                    // 如果有医生修改的检测框，生成包含AI和医生标注的图像
                                    if (imageResult.isModified && imageResult.modifiedBbox && imageResult.modifiedBbox.length > 0) {
                                      // 医生标注图像（AI+医生框）
                                      const doctorAnnotatedUrl = await drawAnnotatedImageWithBothBoxes(
                                        imageUrl,
                                        inferResultData.inferResult.bbox,
                                        imageResult.modifiedBbox,
                                        inferResultData.inferResult.label,
                                        inferResultData.inferResult.confidenceScore
                                      );
                                      // AI标注图像（只用AI框）
                                      const aiAnnotatedUrl = await drawAnnotatedImage(
                                        imageUrl,
                                        inferResultData.inferResult.bbox,
                                        inferResultData.inferResult.label,
                                        inferResultData.inferResult.confidenceScore
                                      );
                                      setDoctorAnnotatedUrl(doctorAnnotatedUrl)
                                      setAnnotatedImageUrl(aiAnnotatedUrl)
                                    } else {
                                      // 只有AI标注
                                      const annotatedUrl = await drawAnnotatedImage(
                                        imageUrl,
                                        inferResultData.inferResult.bbox,
                                        inferResultData.inferResult.label,
                                        inferResultData.inferResult.confidenceScore
                                      );
                                      setAnnotatedImageUrl(annotatedUrl)
                                    }
                                    console.log('Generated annotated image');
                                  }
                                } catch (error) {
                                  console.error('Failed to generate annotated image:', error);
                                }
                              }
                            } else {
                              console.log('No inference result found for image:', newImageId)
                              setAnnotatedImageUrl(null);
                              setDoctorAnnotatedUrl(null);
                            }
                          } catch (error) {
                            console.error('Failed to get inference results:', error)
                          }
                        }
                      }}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                    >
                      <option value="">请选择影像</option>
                      {images.map((image) => (
                        <option key={image.imageId} value={image.imageId}>{image.imageId}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">选择任务ID</label>
                    <select
                      value={inferResult?.inferResult?.resultId || ""}
                      onChange={async (e) => {
                        const resultId = e.target.value
                        if (resultId) {
                          try {
                            // 重置医生标注
                            setDoctorBboxes([])
                            setDoctorAnnotatedUrl(null)

                            // 获取指定任务ID的推理结果
                            const result = await api.getInferResult(resultId)
                            console.log('Selected task result:', result)

                            if (result) {
                              // 构建推理结果对象
                              const inferResultData = {
                                inferResult: {
                                  label: result.label,
                                  confidenceScore: result.confidenceScore,
                                  bbox: result.bbox || result.detections,
                                  detections: result.bbox || result.detections,
                                  resultId: result.resultId,
                                  // 后端返回的医生修改相关字段
                                  isModified: result.isModified,
                                  doctorBboxes: result.modifiedBbox || [],
                                  modifiedLabel: result.modifiedLabel
                                }
                              }
                              console.log('Constructed infer result:', inferResultData)
                              setInferResult(inferResultData)

                              // 如果有医生修改的检测框，加载它们
                              if (result.isModified && result.modifiedBbox) {
                                setDoctorBboxes(result.modifiedBbox)
                              }

                              // 生成标注图像
                              if (inferResultData.inferResult.bbox && Array.isArray(inferResultData.inferResult.bbox)) {
                                try {
                                  const selectedImageData = images.find(img => img.imageId === result.imageId);
                                  if (selectedImageData && selectedImageData.imagePath) {
                                    const imageUrl = `${API_BASE_URL_IMAGE}${selectedImageData.imagePath}`;

                                    // 如果有医生修改的检测框，生成包含AI和医生标注的图像
                                    if (result.isModified && result.modifiedBbox && result.modifiedBbox.length > 0) {
                                      // 医生标注图像（AI+医生框）
                                      const doctorAnnotatedUrl = await drawAnnotatedImageWithBothBoxes(
                                        imageUrl,
                                        inferResultData.inferResult.bbox,
                                        result.modifiedBbox,
                                        inferResultData.inferResult.label,
                                        inferResultData.inferResult.confidenceScore
                                      );
                                      // AI标注图像（只用AI框）
                                      const aiAnnotatedUrl = await drawAnnotatedImage(
                                        imageUrl,
                                        inferResultData.inferResult.bbox,
                                        inferResultData.inferResult.label,
                                        inferResultData.inferResult.confidenceScore
                                      );
                                      setDoctorAnnotatedUrl(doctorAnnotatedUrl)
                                      setAnnotatedImageUrl(aiAnnotatedUrl)
                                    } else {
                                      // 只有AI标注
                                      const annotatedUrl = await drawAnnotatedImage(
                                        imageUrl,
                                        inferResultData.inferResult.bbox,
                                        inferResultData.inferResult.label,
                                        inferResultData.inferResult.confidenceScore
                                      );
                                      setAnnotatedImageUrl(annotatedUrl)
                                    }
                                    console.log('Generated annotated image');
                                  }
                                } catch (error) {
                                  console.error('Failed to generate annotated image:', error);
                                }
                              }
                            }
                          } catch (error) {
                            console.error('Failed to get task result:', error)
                          }
                        } else {
                          setInferResult(null)
                          setAnnotatedImageUrl(null)
                          setDoctorAnnotatedUrl(null)
                        }
                      }}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-card outline-none focus:border-primary"
                    >
                      <option value="">请选择任务ID</option>
                      {selectedImage && inferenceHistory.filter(item => item.image === selectedImage).map((item) => (
                        <option key={item.id} value={item.id}>{item.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        {doctorAnnotatedUrl ? '标注后影像' : '原始影像'}
                        {doctorAnnotatedUrl && <span className="ml-2 text-green-500">(已标注)</span>}
                      </p>
                      {selectedImage && images.find(img => img.imageId === selectedImage)?.imagePath && (
                        <button
                          onClick={() => {
                            const selectedImageData = images.find(img => img.imageId === selectedImage);
                            if (selectedImageData) {
                              setPreviewImage({
                                imageId: selectedImageData.imageId,
                                imagePath: selectedImageData.imagePath,
                                imageDesc: selectedImageData.imageDesc,
                                uploadedTime: selectedImageData.uploadedTime,
                                previewImageUrl: doctorAnnotatedUrl || undefined
                              });
                              setIsPreviewModalOpen(true);
                            }
                          }}
                          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center px-3 py-1.5 rounded border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </button>
                      )}
                    </div>
                    <div className="bg-muted rounded-lg h-64 flex items-center justify-center overflow-hidden">
                      {selectedImage && images.find(img => img.imageId === selectedImage)?.imagePath ? (
                        // 如果有医生修改后的标注图像，显示它；否则显示原始图像
                        doctorAnnotatedUrl ? (
                          <img
                            src={doctorAnnotatedUrl}
                            alt="标注后影像"
                            className="max-w-[80%] max-h-[80%] object-contain"
                          />
                        ) : (
                          <img
                            src={`${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedImage)?.imagePath}`}
                            alt="原始影像"
                            className="max-w-[80%] max-h-[80%] object-contain"
                          />
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">请选择影像</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">AI推理结果</p>
                      {selectedImage && (annotatedImageUrl || images.find(img => img.imageId === selectedImage)?.imagePath) && (
                        <button
                          onClick={() => {
                            const selectedImageData = images.find(img => img.imageId === selectedImage);
                            if (selectedImageData) {
                              setPreviewImage({
                                imageId: selectedImageData.imageId,
                                imagePath: selectedImageData.imagePath,
                                imageDesc: selectedImageData.imageDesc,
                                uploadedTime: selectedImageData.uploadedTime,
                                previewImageUrl: annotatedImageUrl || undefined
                              });
                              setIsPreviewModalOpen(true);
                            }
                          }}
                          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center px-3 py-1.5 rounded border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </button>
                      )}
                    </div>
                    <div className="bg-muted rounded-lg h-64 flex items-center justify-center overflow-hidden relative">
                      {selectedImage && images.find(img => img.imageId === selectedImage)?.imagePath ? (
                        <>
                          {annotatedImageUrl ? (
                            <img
                              src={annotatedImageUrl}
                              alt="AI标注影像"
                              className="max-w-[80%] max-h-[80%] object-contain"
                            />
                          ) : (
                            <img
                              src={`${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedImage)?.imagePath}`}
                              alt="AI标注影像"
                              className="max-w-[80%] max-h-[80%] object-contain"
                              ref={imageRef}
                              onLoad={() => {
                                if (imageRef.current) {
                                  setImageDimensions({
                                    width: imageRef.current.naturalWidth,
                                    height: imageRef.current.naturalHeight
                                  });
                                }
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">请选择影像并发起推理</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Result Details */}
                <div className="bg-muted rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">分类结果</p>
                      <p className="text-sm font-bold text-card-foreground">{inferResult?.inferResult?.label || "未知"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">置信度</p>
                      <p className="text-sm font-bold text-card-foreground">{(inferResult?.inferResult?.confidenceScore * 100 || 0).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">AI检测框</p>
                      <p className="text-sm font-bold text-card-foreground">{inferResult?.inferResult?.detections?.length || 0}个</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">医生标注</p>
                      <p className="text-sm font-bold text-card-foreground">
                        {doctorBboxes.length}个
                        {inferResult?.inferResult?.isModified && <span className="ml-1 text-green-500">(已标注)</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Doctor Bboxes List */}
                {doctorBboxes.length > 0 && (
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">医生标注的检测框</p>
                      <button
                        onClick={handleAddDetection}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加
                      </button>
                    </div>
                    <div className="space-y-2">
                      {doctorBboxes.map((box, index) => (
                        <div key={index} className="flex items-center justify-between bg-card rounded p-2">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{box.label || `检测框 ${index + 1}`}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({box.x1?.toFixed(1)}, {box.y1?.toFixed(1)}) - ({box.x2?.toFixed(1)}, {box.y2?.toFixed(1)})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditDetection(box, index)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              <Pen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDetection(index)}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (inferResult?.inferResult?.detections && inferResult.inferResult.detections.length > 0) {
                        // 如果有AI检测框，打开编辑模式编辑第一个AI检测框
                        handleEditDetection(inferResult.inferResult.detections[0], -1)
                      } else {
                        // 否则打开模态框添加新的空白检测框
                        const newDetection = {
                          x1: 10,
                          y1: 10,
                          x2: 30,
                          y2: 30,
                          label: '医生标注',
                          confidence: 1.0
                        }
                        setEditingDetection(newDetection)
                        setEditingBboxIndex(-1) // -1 表示新添加的框
                        setIsEditModalOpen(true)
                      }
                    }}
                    disabled={!inferResult}
                    className="flex-1 bg-card border border-green-500 text-green-500 hover:bg-green-50 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pen className="mr-2 w-5 h-5" />
                    {inferResult?.inferResult?.detections && inferResult.inferResult.detections.length > 0 ? '编辑检测框' : '添加检测框'}
                  </button>
                  <button
                    onClick={handleRateResult}
                    disabled={!inferResult}
                    className="flex-1 bg-card border border-orange-500 text-orange-500 hover:bg-orange-50 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Star className="mr-2 w-5 h-5" />
                    评价结果
                  </button>
                  <button
                    onClick={handleExportResult}
                    disabled={!inferResult}
                    className="flex-1 bg-card border border-green-500 text-green-500 hover:bg-green-50 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="mr-2 w-5 h-5" />
                    导出结果
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inference History */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <h3 className="font-bold text-card-foreground mb-4 flex items-center">
              <History className="mr-2 text-primary w-5 h-5" />
              推理历史记录
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-left font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">任务ID</th>
                    <th className="px-4 py-3">影像</th>
                    <th className="px-4 py-3">模型</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">结果</th>
                    <th className="px-4 py-3">置信度</th>
                    <th className="px-4 py-3">标注</th>
                    <th className="px-4 py-3">评价</th>
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inferenceHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                      <td className="px-4 py-3">{item.image}</td>
                      <td className="px-4 py-3">{item.model}</td>
                      <td className="px-4 py-3">
                        <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.result}</td>
                      <td className="px-4 py-3">{item.confidence}</td>
                      <td className="px-4 py-3">
                        {item.isModified ? (
                          <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            已标注
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            未标注
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.satisfaction ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.satisfaction === 'ACCURATE' ? 'bg-green-100 text-green-600' :
                            item.satisfaction === 'FALSE_POSITIVE' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {item.satisfaction === 'ACCURATE' ? '准确' :
                             item.satisfaction === 'FALSE_POSITIVE' ? '假阳性' :
                             '假阴性'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">未评价</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">{item.time}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => handleViewHistoryDetail(item)}
                          className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-all hover:scale-105"
                        >
                          <Eye className="w-5 h-5" />
                          <span>查看</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload Modal */}
          {isUploadModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-card-foreground flex items-center">
                    <Upload className="mr-2 text-primary w-6 h-6" />
                    上传影像
                  </h3>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={uploading}
                    className="text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">选择图片</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*,.dcm"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持 PNG、JPG、DICOM 格式，单张不超过5MB，总量不超过50MB</p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadModalOpen(false)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      disabled={uploading}
                      className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0) {
                          const files = Array.from(fileInputRef.current.files)
                          handleUploadImages(files)
                        }
                      }}
                      disabled={uploading}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        "上传"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview Modal */}
          {isPreviewModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-bold text-card-foreground">影像预览</h3>
                  <button 
                    onClick={() => {
                      setIsPreviewModalOpen(false)
                      setZoomLevel(100)
                      setPanOffset({ x: 0, y: 0 })
                    }}
                    disabled={previewLoading}
                    className="text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 flex flex-col items-center">
                  {/* Zoom Controls */}
                  <div className="w-full flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                        className="bg-muted hover:bg-muted/80 text-card-foreground px-3 py-1 rounded-lg text-sm"
                      >
                        - 缩小
                      </button>
                      <span className="text-sm font-medium">{zoomLevel}%</span>
                      <button 
                        onClick={() => setZoomLevel(Math.min(300, zoomLevel + 10))}
                        className="bg-muted hover:bg-muted/80 text-card-foreground px-3 py-1 rounded-lg text-sm"
                      >
                        放大 +
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setZoomLevel(100)
                        setPanOffset({ x: 0, y: 0 })
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-lg text-sm"
                    >
                      重置缩放
                    </button>
                  </div>
                  <div 
                    ref={previewContainerRef}
                    onWheel={handleWheelZoom}
                    onMouseDown={handlePreviewMouseDown}
                    className={`mb-4 w-full max-h-[50vh] flex items-center justify-center overflow-hidden ${zoomLevel > 100 ? (isDraggingPreview ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                  >
                    {previewLoading ? (
                      <div className="flex flex-col items-center justify-center h-64 w-full">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
                      </div>
                    ) : previewImage ? (
                      previewImage.previewImageUrl ? (
                        <img
                          src={previewImage.previewImageUrl}
                          alt={previewImage.imageDesc || 'Preview Image'}
                          className="max-h-[50vh] object-contain transition-transform duration-100 cursor-pointer"
                          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                          draggable={false}
                          onDoubleClick={() => {
                            const newWindow = window.open('', '_blank');
                            if (newWindow) {
                              newWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                  <title>标注结果预览</title>
                                  <style>
                                    body {
                                      margin: 0;
                                      padding: 20px;
                                      display: flex;
                                      justify-content: center;
                                      align-items: center;
                                      min-height: 100vh;
                                      background-color: #1a1a1a;
                                    }
                                    img {
                                      max-width: 100%;
                                      max-height: 100vh;
                                      object-fit: contain;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <img src="${previewImage.previewImageUrl}" alt="标注结果" />
                                </body>
                              </html>
                              `);
                              newWindow.document.close();
                            }
                          }}
                        />
                      ) : previewImage.imagePath ? (
                        <img
                          src={`${API_BASE_URL_IMAGE}${previewImage.imagePath}`}
                          alt={previewImage.imageDesc || 'Image'}
                          className="max-h-[50vh] object-contain transition-transform duration-100 cursor-pointer"
                          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                          draggable={false}
                          onDoubleClick={() => window.open(`${API_BASE_URL_IMAGE}${previewImage.imagePath}`, '_blank')}
                        />
                      ) : (
                        <div className="bg-muted rounded-lg h-64 w-full flex items-center justify-center">
                          <Image className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )
                    ) : (
                      <div className="bg-muted rounded-lg h-64 w-full flex items-center justify-center">
                        <Image className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {previewImage && (
                    <div className="w-full space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">影像ID:</span>
                        <span className="text-sm font-mono">{previewImage.imageId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">描述:</span>
                        <span className="text-sm">{previewImage.imageDesc || '无描述'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">上传时间:</span>
                        <span className="text-sm">{previewImage.uploadedTime || '未知'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Detection Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="text-base font-bold text-card-foreground">
                    {editingBboxIndex !== null ? '编辑医生标注' : '编辑检测框'}
                  </h3>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-muted-foreground hover:text-card-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-5">
                  {/* 手动标注画布 */}
                  <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {selectedImage && (
                      <div className="relative" style={{ maxHeight: '24rem' }}>
                        <img
                          src={`${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedImage)?.imagePath}`}
                          alt="Image for annotation"
                          className="max-h-80 w-auto object-contain"
                          id="annotationImage"
                          crossOrigin="anonymous"
                        />
                        <canvas
                          id="annotationCanvas"
                          ref={canvasRef}
                          className="absolute top-0 left-0 cursor-crosshair"
                        ></canvas>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 border mr-1" style={{ borderColor: '#0000FF' }}></div>
                      <span className="text-muted-foreground">AI</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 border mr-1" style={{ borderColor: '#00FF00' }}></div>
                      <span className="text-muted-foreground">已保存</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 border mr-1" style={{ borderColor: '#FF0000' }}></div>
                      <span className="text-muted-foreground">编辑</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">X1坐标</label>
                      <input
                        type="number"
                        value={editingDetection?.x1 || 0}
                        onChange={(e) => setEditingDetection({...editingDetection, x1: Number(e.target.value)})}
                        min={0}
                        step={0.1}
                        className="w-full text-sm border rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Y1坐标</label>
                      <input
                        type="number"
                        value={editingDetection?.y1 || 0}
                        onChange={(e) => setEditingDetection({...editingDetection, y1: Number(e.target.value)})}
                        min={0}
                        step={0.1}
                        className="w-full text-sm border rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">X2坐标</label>
                      <input
                        type="number"
                        value={editingDetection?.x2 || 0}
                        onChange={(e) => setEditingDetection({...editingDetection, x2: Number(e.target.value)})}
                        min={0}
                        step={0.1}
                        className="w-full text-sm border rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Y2坐标</label>
                      <input
                        type="number"
                        value={editingDetection?.y2 || 0}
                        onChange={(e) => setEditingDetection({...editingDetection, y2: Number(e.target.value)})}
                        min={0}
                        step={0.1}
                        className="w-full text-sm border rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground px-4 py-2 rounded-lg transition-all text-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveDetection}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all text-sm"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rate Result Modal */}
          {isRateModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-bold text-card-foreground">评价结果</h3>
                  <button 
                    onClick={() => setIsRateModalOpen(false)}
                    className="text-muted-foreground hover:text-card-foreground"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">满意度</label>
                    <select
                      value={satisfaction}
                      onChange={(e) => setSatisfaction(e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:border-primary"
                    >
                      <option value="ACCURATE">准确</option>
                      <option value="FALSE_POSITIVE">假阳性</option>
                      <option value="FALSE_NEGATIVE">假阴性</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">评价</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="请输入您的评价..."
                      className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:border-primary h-32"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setIsRateModalOpen(false)}
                      className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground px-4 py-2 rounded-lg transition-all"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveRating}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-all"
                    >
                      提交
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Detail Modal */}
          {isHistoryDetailModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="bg-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-bold text-card-foreground">历史记录详情</h3>
                  <button
                    onClick={() => setIsHistoryDetailModalOpen(false)}
                    className="text-muted-foreground hover:text-card-foreground"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {historyDetailLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : selectedHistoryItem ? (
                    <div className="space-y-4">
                      {/* 图像对比展示 - 放在最上面 */}
                      <div className="border rounded-lg p-4 bg-muted">
                        <p className="text-sm text-muted-foreground mb-4">AI推理结果对比</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {selectedHistoryItem.isModified ? '标注后影像' : '原始影像'}
                              {selectedHistoryItem.isModified && <span className="ml-2 text-green-500">(已标注)</span>}
                            </p>
                            <div className="bg-card rounded-lg p-2 flex items-center justify-center h-64">
                              {selectedHistoryItem.isModified && selectedHistoryItem.comparisonImageUrl ? (
                                <img
                                  src={selectedHistoryItem.comparisonImageUrl}
                                  alt="标注后影像"
                                  className="max-w-full max-h-full object-contain cursor-pointer"
                                  onDoubleClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>图片查看 - 标注后影像</title>
                                            <style>
                                              body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                                              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${selectedHistoryItem.comparisonImageUrl}" alt="标注后影像" />
                                          </body>
                                        </html>
                                      `);
                                      newWindow.document.close();
                                    }
                                  }}
                                />
                              ) : selectedHistoryItem.image && images.find(img => img.imageId === selectedHistoryItem.image)?.imagePath ? (
                                <img
                                  src={`${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedHistoryItem.image)?.imagePath}`}
                                  alt="原始影像"
                                  className="max-w-full max-h-full object-contain cursor-pointer"
                                  onDoubleClick={() => {
                                    const imagePath = `${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedHistoryItem.image)?.imagePath}`;
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>图片查看 - 原始影像</title>
                                            <style>
                                              body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                                              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${imagePath}" alt="原始影像" />
                                          </body>
                                        </html>
                                      `);
                                      newWindow.document.close();
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-muted-foreground text-sm">无图像</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">AI推理结果</p>
                            <div className="bg-card rounded-lg p-2 flex items-center justify-center h-64">
                              {selectedHistoryItem.aiOnlyImageUrl ? (
                                <img
                                  src={selectedHistoryItem.aiOnlyImageUrl}
                                  alt="AI推理影像"
                                  className="max-w-full max-h-full object-contain cursor-pointer"
                                  onDoubleClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>图片查看 - AI推理影像</title>
                                            <style>
                                              body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                                              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${selectedHistoryItem.aiOnlyImageUrl}" alt="AI推理影像" />
                                          </body>
                                        </html>
                                      `);
                                      newWindow.document.close();
                                    }
                                  }}
                                />
                              ) : selectedHistoryItem.image && images.find(img => img.imageId === selectedHistoryItem.image)?.imagePath ? (
                                <img
                                  src={`${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedHistoryItem.image)?.imagePath}`}
                                  alt="AI推理影像"
                                  className="max-w-full max-h-full object-contain cursor-pointer"
                                  onDoubleClick={() => {
                                    const imagePath = `${API_BASE_URL_IMAGE}${images.find(img => img.imageId === selectedHistoryItem.image)?.imagePath}`;
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>图片查看 - 原始影像</title>
                                            <style>
                                              body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                                              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${imagePath}" alt="原始影像" />
                                          </body>
                                        </html>
                                      `);
                                      newWindow.document.close();
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-muted-foreground text-sm">无图像</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                          <div className="flex items-center">
                            <div className="w-4 h-4 border-2 mr-2" style={{ borderColor: '#0000FF' }}></div>
                            <span className="text-muted-foreground">AI检测框</span>
                          </div>
                          {selectedHistoryItem.isModified && (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 mr-2" style={{ borderColor: '#00FF00' }}></div>
                              <span className="text-muted-foreground">医生标注</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 基本信息 - 放在图片下面 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">任务ID</p>
                          <p className="font-mono text-sm truncate">{selectedHistoryItem.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">影像ID</p>
                          <p className="text-sm truncate">{selectedHistoryItem.image}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">模型</p>
                          <p className="text-sm">{selectedHistoryItem.model}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">结果</p>
                          <p className="text-sm">{selectedHistoryItem.result}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">置信度</p>
                          <p className="text-sm">{(selectedHistoryItem.confidence * 100 || 0).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">耗时</p>
                          <p className="text-sm">{selectedHistoryItem.duration ? `${selectedHistoryItem.duration}ms` : '未知'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">状态</p>
                          <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            {selectedHistoryItem.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">标注状态</p>
                          {selectedHistoryItem.isModified ? (
                            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              已标注
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              未标注
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">评价</p>
                          {selectedHistoryItem.satisfaction ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedHistoryItem.satisfaction === 'ACCURATE' ? 'bg-green-100 text-green-600' :
                              selectedHistoryItem.satisfaction === 'FALSE_POSITIVE' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {selectedHistoryItem.satisfaction === 'ACCURATE' ? '准确' :
                               selectedHistoryItem.satisfaction === 'FALSE_POSITIVE' ? '假阳性' :
                               '假阴性'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">未评价</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">时间</p>
                          <p className="text-sm">{selectedHistoryItem.time}</p>
                        </div>
                        {selectedHistoryItem.modifiedBy && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">标注人</p>
                            <p className="text-sm">{selectedHistoryItem.modifiedBy}</p>
                          </div>
                        )}
                        {selectedHistoryItem.modifiedTime && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">标注时间</p>
                            <p className="text-sm">{selectedHistoryItem.modifiedTime}</p>
                          </div>
                        )}
                      </div>

                      {/* 评价内容 */}
                      {selectedHistoryItem.comment && (
                        <div className="border rounded-lg p-4 bg-muted">
                          <p className="text-sm text-muted-foreground mb-2">评价内容</p>
                          <p className="text-sm">{selectedHistoryItem.comment}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">无历史记录详情</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
