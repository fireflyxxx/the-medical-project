import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import * as echarts from 'echarts';
import request from '../../../utils/request';
import { updateCase, updateStudy, deleteStudy } from '../../../api/medical';

// ─── Types ───────────────────────────────────────────────────────────────────

// Bbox 类型定义 - 支持两种格式
interface Bbox {
  // 格式1: 左上角坐标 + 宽高
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // 格式2: 左上角和右下角坐标
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // 通用属性
  label?: string;
  confidence?: number;
}

interface InferResult {
  resultId: string | number;
  imageId?: string | number;
  caseId?: string | number;
  imageName?: string;
  confidenceScore?: number;
  annotatedImgPath?: string;
  imageUrl?: string;
  lesionType?: string;
  label?: string;
  aiPrediction?: string;
  confidence?: number;
  doctorName?: string;
  doctorFollowup?: string;
  status?: string;
  stars?: number;
  comment?: string;
  createdTime?: string;
  imagePath?: string;
  bbox?: Bbox | Bbox[];
  // 后端返回的医生修改相关字段
  isModified?: boolean;
  modifiedBbox?: Bbox | Bbox[];
  modifiedLabel?: string;
  modifiedBy?: string;
  modifiedTime?: string;
  // 标记是否有真实的推理结果（用于判断是否显示查看详情按钮）
  hasRealResult?: boolean;
}


interface InferResultDetail extends InferResult {
  originalImgPath?: string;
  annotatedImgPath?: string;
}

// Backend DTO Types (CamelCase - 后端实际返回的命名格式)
interface StudyDto {
  studyId?: string | number;
  study_id?: string | number; // 兼容 snake_case
  imageIds?: (string | number)[];
  image_ids?: (string | number)[]; // 兼容 snake_case
  studyTime?: string;
  study_time?: string; // 兼容 snake_case
  studyType?: string;
  study_type?: string; // 兼容 snake_case
  studyDesc?: string;
  study_desc?: string; // 兼容 snake_case
}

interface CaseDto {
  caseId?: string | number;
  case_id?: string | number; // 兼容 snake_case
  name?: string;
  gender?: number;
  age?: number;
  idNumber?: string;
  contact?: string;
  medicalHistory?: string;
  caseDesc?: string;
  case_desc?: string; // 兼容 snake_case
  createdTime?: string;
  updatedTime?: string;
  studys?: StudyDto[];
}

// interface InferenceResultDto {
//   resultId: string | number;
//   result_id?: string | number; // 兼容 snake_case
//   imageId?: string | number;
//   image_id?: string | number; // 兼容 snake_case
//   caseId?: string | number;
//   case_id?: string | number; // 兼容 snake_case
//   confidenceScore?: number;
//   confidence_score?: number; // 兼容 snake_case
//   annotatedImgPath?: string;
//   annotated_img_path?: string; // 兼容 snake_case
//   originalImgPath?: string;
//   original_img_path?: string; // 兼容 snake_case
//   label?: string;
//   bbox?: Bbox | Bbox[] | Record<string, unknown>;
//   comment?: InferComment;
//   createdTime?: string;
//   created_time?: string; // 兼容 snake_case
//   isModified?: boolean;
//   modifiedBbox?: Bbox | Bbox[] | Record<string, unknown>;
//   modifiedLabel?: string;
//   modifiedBy?: string;
//   modifiedTime?: string;
// }

const POLL_INTERVAL = 30000;
// 开发环境使用空字符串（依赖 Vite 代理），生产环境使用完整 URL

const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE_URL || '').replace(/\/$/, '');

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asIdString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && (value.trim() === '' || value.toLowerCase() === 'undefined' || value.toLowerCase() === 'null')) return undefined;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    if (value.id != null) return asIdString(value.id);
    if (value.caseId != null) return asIdString(value.caseId);
    if (value.case_id != null) return asIdString(value.case_id);
    if (value.resultId != null) return asIdString(value.resultId);
    if (value.result_id != null) return asIdString(value.result_id);
    if (value.imageId != null) return asIdString(value.imageId);
    if (value.image_id != null) return asIdString(value.image_id);
  }
  return undefined;
};

const inferImageIdFromAnnotatedPath = (path?: string): string | undefined => {
  if (!path) return undefined;
  // Try direct filename first if it's just the ID
  const parts = path.split(/[\\/]/);
  const filename = parts[parts.length - 1].split('.')[0];
  if (filename.startsWith('IMG')) return filename;

  const matched = path.match(/(IMG[0-9A-Z]+)/i);
  return matched?.[1];
};

const parseInferResults = (resultsPayload: any): InferResult[] => {
  console.log('[parseInferResults] 输入数据:', { resultsPayload });

  const toArray = (p: any): any[] => {
    if (Array.isArray(p)) return p;
    if (!p || typeof p !== 'object') return [];
    const keys = ['result_list', 'results', 'infer_results', 'data', 'list'];
    for (const k of keys) {
      if (Array.isArray(p[k])) return p[k];
    }
    if (p.data && typeof p.data === 'object') {
      for (const k of keys) {
        if (Array.isArray(p.data[k])) return p.data[k];
      }
    }
    return [];
  };

  const rawResults = toArray(resultsPayload);

  console.log('[parseInferResults] 解析后的数组:', {
    rawResults: rawResults.length,
    resultsDetail: rawResults
  });

  const results: InferResult[] = [];

  rawResults.forEach(resDto => {
    const rid = asIdString(resDto.resultId || resDto.result_id);

    // 如果完全没有 resultId，跳过
    if (!rid) {
      console.warn('[parseInferResults] 跳过无效的推理结果（缺少 result_id）:', resDto);
      return;
    }

    const caseId = asIdString(resDto.caseId || resDto.case_id);

    // 过滤掉没有 caseId 的数据（孤立的推理结果）
    if (!caseId) {
      console.warn('[parseInferResults] 跳过没有关联病例的推理结果:', resDto);
      return;
    }

    const imageId = asIdString(resDto.imageId || resDto.image_id);

    // 如果没有 imageId，尝试从 annotatedImgPath 中提取
    let extractedImageId = imageId;
    if (!extractedImageId) {
      const extracted = inferImageIdFromAnnotatedPath(resDto.annotatedImgPath || resDto.annotated_img_path);
      if (extracted) {
        extractedImageId = extracted;
        console.log('[parseInferResults] 从路径中提取 imageId:', extracted, '路径:', resDto.annotatedImgPath);
      }
    }

    // 解析 bbox 数据
    let parsedBbox: Bbox | Bbox[] | undefined = undefined;
    if (resDto.bbox) {
      try {
        if (Array.isArray(resDto.bbox)) {
          parsedBbox = resDto.bbox as Bbox[];
        } else if (typeof resDto.bbox === 'string') {
          parsedBbox = JSON.parse(resDto.bbox);
        } else if (typeof resDto.bbox === 'object') {
          parsedBbox = resDto.bbox as Bbox;
        }
      } catch (e) {
        console.warn('Failed to parse bbox:', e);
      }
    }

    results.push({
      resultId: rid,
      imageId: extractedImageId || undefined,
      caseId: caseId,
      imageName: extractedImageId || rid,
      confidence: resDto.confidenceScore || resDto.confidence_score,
      confidenceScore: resDto.confidenceScore || resDto.confidence_score,
      annotatedImgPath: resDto.annotatedImgPath || resDto.annotated_img_path,
      imagePath: resDto.originalImgPath || resDto.original_img_path,
      aiPrediction: resDto.label || '未知',
      label: resDto.label || '-',
      // 保存完整的 comment 对象（如果是对象则序列化为 JSON）
      comment: typeof resDto.comment === 'object' && resDto.comment !== null
        ? JSON.stringify(resDto.comment)
        : resDto.comment,
      status: '待处理',
      createdTime: resDto.createdTime || resDto.created_time,
      bbox: parsedBbox,
      isModified: resDto.isModified,
      modifiedBbox: resDto.modifiedBbox,
      modifiedLabel: resDto.modifiedLabel,
      modifiedBy: resDto.modifiedBy,
      modifiedTime: resDto.modifiedTime,
      hasRealResult: true,
    });
  });

  console.log(`[parseInferResults] 返回 ${results.length} 条结果`);

  return results;
};


const toImageSrc = (raw?: string): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('data:image/')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${IMAGE_BASE}${value}`;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 64) return `data:image/jpeg;base64,${value}`;
  return `${IMAGE_BASE}/${value.replace(/^\.?\//, '')}`;
};

// ─── BboxCanvas 组件：根据 bbox 数据实时渲染标注框────────────────────────────────────────
interface BboxCanvasProps {
  src: string;
  bbox?: Bbox | Bbox[];
  alt?: string;
  className?: string;
}

function BboxCanvas({ src, bbox, alt, className }: BboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  console.log('[BboxCanvas] 接收到的 props:', { src, bbox, alt });

  // 绘制 bbox 标注框
  const drawBboxes = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !loaded) {
      console.log('[BboxCanvas] 绘制条件不满足:', { canvas: !!canvas, img: !!img, loaded });
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { naturalWidth, naturalHeight } = img;
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    console.log('[BboxCanvas] 开始绘制, 图片尺寸:', { naturalWidth, naturalHeight });

    // 先绘制原图
    ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

    // 绘制标注框
    if (bbox) {
      const bboxes = Array.isArray(bbox) ? bbox : [bbox];
      console.log('[BboxCanvas] 准备绘制标注框:', bboxes);

      bboxes.forEach((box, index) => {
        // 支持两种 bbox 格式：
        // 1. {x, y, width, height} - 左上角坐标 + 宽高
        // 2. {x1, y1, x2, y2} - 左上角和右下角坐标
        let x, y, w, h;

        if (box.x1 != null && box.y1 != null && box.x2 != null && box.y2 != null) {
          // 格式2: x1, y1, x2, y2
          // 判断是否为百分比坐标（0-100）还是像素坐标
          const isPercentage = box.x1 <= 100 && box.y1 <= 100 && box.x2 <= 100 && box.y2 <= 100;

          if (isPercentage) {
            // 百分比坐标，需要转换为像素坐标
            x = (box.x1 / 100) * naturalWidth;
            y = (box.y1 / 100) * naturalHeight;
            w = ((box.x2 - box.x1) / 100) * naturalWidth;
            h = ((box.y2 - box.y1) / 100) * naturalHeight;
            console.log(`[BboxCanvas] 百分比坐标转换: (${box.x1}, ${box.y1}, ${box.x2}, ${box.y2}) -> (${x}, ${y}, ${w}, ${h})`);
          } else {
            // 像素坐标，直接使用
            x = box.x1;
            y = box.y1;
            w = box.x2 - box.x1;
            h = box.y2 - box.y1;
          }
        } else if (box.x != null && box.y != null) {
          // 格式1: x, y, width, height
          x = box.x;
          y = box.y;
          w = box.width ?? 50;
          h = box.height ?? 50;
        } else {
          console.warn('[BboxCanvas] 跳过无效的 bbox:', box);
          return;
        }

        console.log(`[BboxCanvas] 绘制标注框 ${index + 1}:`, { x, y, w, h, label: box.label });

        // 根据标签类型选择颜色
        const label = box.label || '';
        let strokeColor = '#FF0000'; // 默认红色
        if (label.includes('良性')) {
          strokeColor = '#22C55E'; // 绿色
        } else if (label.includes('疑似') || label.includes('可疑')) {
          strokeColor = '#F59E0B'; // 橙色
        } else if (label.includes('恶性')) {
          strokeColor = '#EF4444'; // 红色
        }

        // 绘制边框
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // 绘制标签背景
        ctx.fillStyle = strokeColor;
        const labelText = box.label || `区域${index + 1}`;
        const confidenceText = box.confidence != null ? ` ${(box.confidence * 100).toFixed(1)}%` : '';
        const text = `${labelText}${confidenceText}`;
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(text).width;
        const padding = 4;
        ctx.fillRect(x, y - 22, textWidth + padding * 2, 20);

        // 绘制标签文字
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, x + padding, y - 7);
      });
    } else {
      console.log('[BboxCanvas] 没有 bbox 数据');
    }
  }, [bbox, loaded]);

  // 图片加载完成后重绘
  useEffect(() => {
    if (loaded) {
      drawBboxes();
    }
  }, [loaded, drawBboxes]);

  return (
    <div className={`relative ${className || ''}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        className="hidden"
        onLoad={() => setLoaded(true)}
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover cursor-pointer"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        onDoubleClick={() => {
          const canvas = canvasRef.current;
          if (canvas) {
            // 将 canvas 转换为图片并在新标签页打开
            const dataUrl = canvas.toDataURL('image/png');
            const newWindow = window.open();
            if (newWindow) {
              newWindow.document.write(`
                <html>
                  <head>
                    <title>图片查看 - ${alt || '医学影像'}</title>
                    <style>
                      body { margin: 0; padding: 20px; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                    </style>
                  </head>
                  <body>
                    <img src="${dataUrl}" alt="${alt || '医学影像'}" />
                  </body>
                </html>
              `);
              newWindow.document.close();
            }
          }
        }}
        title="双击查看原图（含标注框）"
      />
    </div>
  );
}

// ─── Heatmap Modal ──────────────────────────────────────────────────────────

interface HeatmapModalProps {
  sampleId: string;
  imageId: string;
  type: string;
  caseId?: string;
  onClose: () => void;
}

function HeatmapModal({ sampleId, imageId, type, caseId, onClose }: HeatmapModalProps) {
  const [detail, setDetail] = useState<InferResultDetail | null>(null);
  const isBenign = type === 'benign';
  const isSuspect = type === 'suspect';

  const [commentText, setCommentText] = useState('');
  const [satisfaction, setSatisfaction] = useState('满意');

  // 满意度英文转中文
  const getSatisfactionText = (value: string) => {
    const map: Record<string, string> = {
      'ACCURATE': '准确',
      'FALSE_POSITIVE': '假阳性',
      'FALSE_NEGATIVE': '假阴性',
    };
    return map[value] || value;
  };

  const fetchDetail = useCallback(() => {
    // 优先通过 sampleId（resultId）获取推理结果
    const fetchBySampleId = () => {
      // 检查 sampleId 是否有效
      if (!sampleId || sampleId === 'N/A' || sampleId === 'undefined' || String(sampleId).startsWith('img-') || String(sampleId).startsWith('joined-') || String(sampleId).startsWith('extra-')) {
        console.warn('[HeatmapModal] sampleId 无效或为临时ID，跳过:', sampleId);
        return Promise.reject('Invalid sampleId');
      }

      return request.post(`/api/v1/infer_result/get/${sampleId}`)
        .then((res: any) => {
          console.log('[HeatmapModal] 后端返回的原始数据:', res);
          console.log('[HeatmapModal] bbox 数据:', res.bbox, 'type:', typeof res.bbox);

          // 解析 bbox 数据（可能是字符串格式）
          let parsedBbox = res.bbox;
          if (res.bbox && typeof res.bbox === 'string') {
            try {
              parsedBbox = JSON.parse(res.bbox);
              console.log('[HeatmapModal] 解析后的 bbox:', parsedBbox);
            } catch (e) {
              console.warn('Failed to parse bbox:', e);
            }
          }

          // 解析 modifiedBbox 数据
          let parsedModifiedBbox = res.modifiedBbox ?? res.modified_bbox;
          if (parsedModifiedBbox && typeof parsedModifiedBbox === 'string') {
            try {
              parsedModifiedBbox = JSON.parse(parsedModifiedBbox);
              console.log('[HeatmapModal] 解析后的 modifiedBbox:', parsedModifiedBbox);
            } catch (e) {
              console.warn('Failed to parse modifiedBbox:', e);
            }
          }

          const detailData = {
            ...res,
            confidence: res.confidenceScore ?? res.confidence_score ?? res.confidence,
            originalImgPath: res.originalImgPath ?? res.original_img_path ?? res.imagePath ?? res.image_path ?? res.annotatedImgPath ?? res.annotated_img_path,
            imageId: res.imageId ?? res.image_id ?? imageId,
            caseId: res.caseId ?? res.case_id ?? caseId, // 使用传入的 caseId 作为备用
            resultId: res.resultId ?? res.result_id,
            bbox: parsedBbox,
            modifiedBbox: parsedModifiedBbox,
            hasRealResult: true,
          };

          console.log('[HeatmapModal] 后端返回的完整数据:', res);
          console.log('[HeatmapModal] 字段映射检查:', {
            'imageId字段': {
              'res.imageId': res.imageId,
              'res.image_id': res.image_id,
              '传入的imageId': imageId,
              '最终值': detailData.imageId
            },
            'caseId字段': {
              'res.caseId': res.caseId,
              'res.case_id': res.case_id,
              '最终值': detailData.caseId
            },
            'resultId字段': {
              'res.resultId': res.resultId,
              'res.result_id': res.result_id,
              '最终值': detailData.resultId
            },
            'modifiedBbox字段': {
              'res.modifiedBbox': res.modifiedBbox,
              'res.modified_bbox': res.modified_bbox,
              '解析后': parsedModifiedBbox,
              '类型': typeof parsedModifiedBbox
            }
          });
          console.log('[HeatmapModal] 设置的 detail 数据:', detailData);

          setDetail(detailData);

          // 如果没有 caseId，尝试通过 imageId 获取
          const finalImageId = detailData.imageId;
          console.log('[HeatmapModal] 检查是否需要补充 caseId:', {
            'caseId存在': !!detailData.caseId,
            'imageId': finalImageId,
            'imageId有效': finalImageId && !String(finalImageId).startsWith('RES')
          });

          if (!detailData.caseId && finalImageId && !String(finalImageId).startsWith('RES')) {
            console.log('[HeatmapModal] 尝试通过 imageId 获取 caseId:', finalImageId);
            request.get(`/api/v1/image/get/${finalImageId}`)
              .then((response: any) => {
                const imageDto = response as { caseId?: string; case_id?: string };
                console.log('[HeatmapModal] 通过 imageId 补充 caseId:', imageDto);
                const fetchedCaseId = imageDto?.caseId || imageDto?.case_id;
                if (fetchedCaseId) {
                  console.log('[HeatmapModal] 成功获取 caseId:', fetchedCaseId);
                  setDetail(prev => prev ? { ...prev, caseId: fetchedCaseId } : prev);
                } else {
                  console.warn('[HeatmapModal] 图片信息中也没有 caseId');
                }
              })
              .catch(err => console.warn('[HeatmapModal] 获取 caseId 失败:', err));
          }

          if (res.comment) {
             const c = typeof res.comment === 'string' ? JSON.parse(res.comment) : res.comment;
             setCommentText(c.sentence || '');
             setSatisfaction(c.satisfaction || '满意');
          }
        });
    };

    const fetchByImageId = () => {
      // 检查 imageId 是否有效
      if (!imageId || imageId === 'N/A' || imageId === 'undefined') {
        console.warn('[HeatmapModal] imageId 无效，无法获取图片信息:', imageId);
        return Promise.reject('Invalid imageId');
      }

      // 如果没有推理结果，通过 imageId 获取图片信息
      return request.get(`/api/v1/image/get/${imageId}`)
        .then((imageDto: any) => {
          console.log('[HeatmapModal] 通过 imageId 获取的图片信息:', imageDto);
          const detailData: InferResultDetail = {
            resultId: '' as any,
            imageId: imageDto.imageId ?? imageDto.image_id ?? imageId,
            caseId: imageDto.caseId ?? imageDto.case_id,
            originalImgPath: imageDto.imagePath ?? imageDto.image_path,
            label: '未推理',
            aiPrediction: '未推理',
            hasRealResult: false,
          };
          console.log('[HeatmapModal] 设置的 detail 数据（仅图片）:', detailData);
          setDetail(detailData);
        });
    };

    // 先尝试通过 sampleId 获取，失败则通过 imageId 获取
    fetchBySampleId().catch((err) => {
      console.warn('[HeatmapModal] 通过 sampleId 获取失败，尝试通过 imageId 获取:', err);
      fetchByImageId().catch(() => {});
    });
  }, [sampleId, imageId, caseId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between z-10">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center">
              <Icon icon="solar:eye-bold" className="mr-3 text-3xl" style={{ color: '#722ED1' }} />
              影像分析详情
            </h3>
            <p className="text-sm text-slate-500 mt-1">样本编号: <span className="font-mono font-bold">{sampleId}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon icon="solar:close-circle-bold" className="text-3xl" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-purple-100">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                <Icon icon="solar:cpu-bolt-bold" className="mr-2" style={{ color: '#722ED1' }} />
                AI热力图分析
              </h4>
              <div className="bg-white rounded-lg overflow-hidden border">
                {detail?.originalImgPath
                  ? <BboxCanvas
                      src={toImageSrc(detail.originalImgPath) || ''}
                      bbox={detail.bbox}
                      alt="AI Prediction with Bbox"
                      className="w-full h-80 object-cover"
                    />
                  : <div className="w-full h-80 flex items-center justify-center bg-slate-100 text-slate-400 text-sm">暂无原始图像</div>}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">AI预测结果:</span>
                  <span className={`font-bold ${isBenign ? 'text-green-600' : isSuspect ? 'text-orange-600' : 'text-red-600'}`}>{detail?.label ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">置信度:</span>
                  <span className="font-mono font-bold text-slate-800">{detail?.confidence != null ? detail.confidence.toFixed(2) : '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">推理时间:</span>
                  <span className="text-slate-700 text-xs">{detail?.createdTime ? new Date(detail.createdTime).toLocaleString('zh-CN') : '-'}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-purple-100">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                <Icon icon="solar:user-bold" className="mr-2" style={{ color: '#722ED1' }} />
                医生修改信息
              </h4>
              <div className="bg-white rounded-lg overflow-hidden border">
                {(() => {
                  console.log('[医生修改信息] detail:', detail);
                  console.log('[医生修改信息] isModified:', detail?.isModified);
                  console.log('[医生修改信息] modifiedBbox:', detail?.modifiedBbox);
                  console.log('[医生修改信息] originalImgPath:', detail?.originalImgPath);

                  if (detail?.isModified && detail?.originalImgPath) {
                    // 检查 modifiedBbox 是否存在且不为空数组
                    const hasModifiedBbox = detail?.modifiedBbox &&
                      (Array.isArray(detail.modifiedBbox) ? detail.modifiedBbox.length > 0 : true);

                    if (hasModifiedBbox) {
                      return (
                        <BboxCanvas
                          src={toImageSrc(detail.originalImgPath) || ''}
                          bbox={detail.modifiedBbox}
                          alt="Modified Image"
                          className="w-full h-80 object-cover"
                        />
                      );
                    }
                    // 如果没有 modifiedBbox 或为空数组，但有原始 bbox，显示原始框
                    else if (detail?.bbox) {
                      return (
                        <BboxCanvas
                          src={toImageSrc(detail.originalImgPath) || ''}
                          bbox={detail.bbox}
                          alt="Original Image"
                          className="w-full h-80 object-cover"
                        />
                      );
                    }
                  }

                  return (
                    <div className="w-full h-80 flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
                      医生未标注此推理结果
                    </div>
                  );
                })()}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">是否标注:</span>
                  {detail?.isModified ? (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">已标注</span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">未标注</span>
                  )}
                </div>
                {detail?.isModified && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">修改后标签:</span>
                      <span className="font-bold text-blue-600">{detail?.modifiedLabel ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">修改者:</span>
                      <span className="text-slate-700">{detail?.modifiedBy ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">修改时间:</span>
                      <span className="text-slate-700 text-xs">{detail?.modifiedTime ? new Date(detail.modifiedTime).toLocaleString('zh-CN') : '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 基本信息卡片 */}
          <div className="bg-white p-6 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <Icon icon="solar:document-text-bold" className="mr-2" style={{ color: '#722ED1' }} />
              基本信息
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">样本编号</p>
                <p className="font-mono text-sm text-slate-800">
                  {detail?.hasRealResult && detail?.resultId ? detail.resultId : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">影像ID</p>
                <p className="font-mono text-sm text-slate-800">{detail?.imageId ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">病例ID</p>
                <p className="font-mono text-sm text-slate-800">{detail?.caseId ?? '-'}</p>
              </div>
            </div>
          </div>


          <div className="bg-white p-6 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <Icon icon="solar:chat-round-bold" className="mr-2" style={{ color: '#722ED1' }} />
              医生评论
            </h4>
            {detail?.comment ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500 mb-1">满意度</p>
                  <p className="text-base text-slate-800">{getSatisfactionText(satisfaction) || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">评论内容</p>
                  <div className="bg-slate-50 p-4 rounded-lg text-base text-slate-700 leading-relaxed border border-slate-100 min-h-[120px]">
                    {commentText || '-'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                暂无医生评论
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Model Upload Modal ─────────────────────────────────────────────────────

function ModelUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [algorithmType, setAlgorithmType] = useState('yolov8');
  const [description, setDescription] = useState('');
  const [labelsMapping, setLabelsMapping] = useState('');
  const [defaultThreshold, setDefaultThreshold] = useState('0.45');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !modelName || !modelVersion || !algorithmType) {
      alert('请填写所有必填项');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model_name', modelName);
      formData.append('model_version', modelVersion);
      formData.append('algorithm_type', algorithmType);
      if (description) formData.append('description', description);
      if (labelsMapping) formData.append('labels_mapping', labelsMapping);
      if (defaultThreshold) formData.append('default_threshold', defaultThreshold);

      const token = sessionStorage.getItem('token');
      const response = await fetch('/api/v1/model/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      await response.json();
      alert('模型上传成功！');
      if (onSuccess) onSuccess();
      else onClose();
    } catch (error: any) {
      console.error('上传失败:', error);
      alert(`上传失败: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center">
              <Icon icon="solar:upload-bold" className="mr-3 text-3xl" style={{ color: '#722ED1' }} />
              上传新模型
            </h3>
            <p className="text-sm text-slate-500 mt-1">上传训练好的模型文件并填写相关信息</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon icon="solar:close-circle-bold" className="text-3xl" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <Icon icon="solar:file-bold" className="mr-2" style={{ color: '#722ED1' }} />
              模型文件 *
            </h4>
            <div
              className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon icon="solar:cloud-upload-bold" className="text-5xl text-purple-300 mb-3 mx-auto block" />
              {file ? (
                <p className="text-sm text-slate-800 font-medium mb-2">{file.name}</p>
              ) : (
                <p className="text-sm text-slate-600 mb-2">拖拽文件到此处或点击选择</p>
              )}
              <p className="text-xs text-slate-400">支持格式: .pt, .pth (最大 500MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pt,.pth"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <Icon icon="solar:document-text-bold" className="mr-2" style={{ color: '#722ED1' }} />
              模型信息
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">模型名称 *</label>
                <input
                  type="text"
                  placeholder="如: YOLO骨折检测版"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">模型版本 *</label>
                <input
                  type="text"
                  placeholder="如: v9.0"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">算法类型 *</label>
                <select
                  value={algorithmType}
                  onChange={(e) => setAlgorithmType(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="yolov8">YOLOv8</option>
                  <option value="faster_rcnn">Faster R-CNN</option>
                  <option value="torchscript">TorchScript</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">模型描述</label>
                <textarea
                  placeholder="描述模型的用途和特点..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">标签映射</label>
                <textarea
                  placeholder='如: {"0": "骨折", "1": "正常"}'
                  rows={2}
                  value={labelsMapping}
                  onChange={(e) => setLabelsMapping(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">可选，JSON格式的类别标签映射</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">默认置信度阈值</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="如: 0.45"
                  value={defaultThreshold}
                  onChange={(e) => setDefaultThreshold(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 flex items-start">
              <Icon icon="solar:info-circle-bold" className="mr-2 text-blue-600 mt-0.5 shrink-0" />
              上传后系统将自动验证模型格式并运行基础测试。测试通过后将提交给管理员审批，审批通过后即可部署到生产环境。
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-purple-200 transition-all disabled:opacity-50"
              style={{ background: '#722ED1' }}
            >
              {uploading ? '上传中...' : '开始上传'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Model Detail Modal ─────────────────────────────────────────────────────

interface ModelDetailData {
  id: number;
  modelName: string;
  modelVersion: string;
  description?: string;
  algorithmType: string;
  defaultThreshold: number;
  status: string;
  createdTime: string;
  labelsMapping?: string;
}

function ModelDetailModal({ model, onClose }: { model: ModelDetailData; onClose: () => void }) {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { text: '生产环境', class: 'bg-green-500' };
      case 'PENDING': return { text: '待审批', class: 'bg-orange-500' };
      case 'INACTIVE': return { text: '已下线', class: 'bg-slate-400' };
      default: return { text: status, class: 'bg-slate-400' };
    }
  };

  const statusDisplay = getStatusDisplay(model.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 flex items-center">
              <Icon icon="solar:box-bold" className="mr-3 text-3xl" style={{ color: '#722ED1' }} />
              模型详情
            </h3>
            <p className="text-sm text-slate-500 mt-1">查看模型的详细信息</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icon icon="solar:close-circle-bold" className="text-3xl" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-6 rounded-2xl border border-purple-100" style={{ background: 'linear-gradient(to bottom right, #faf5ff, #eff6ff)' }}>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center">
              <Icon icon="solar:document-text-bold" className="mr-2" style={{ color: '#722ED1' }} />
              基本信息
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">模型名称</p>
                <p className="font-medium text-slate-800">{model.modelName} {model.modelVersion}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">模型状态</p>
                <span className={`text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase ${statusDisplay.class}`}>
                  {statusDisplay.text}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">算法类型</p>
                <p className="font-medium text-slate-800">{model.algorithmType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">默认阈值</p>
                <p className="font-medium text-slate-800">{model.defaultThreshold}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">创建时间</p>
                <p className="font-medium text-slate-800">{new Date(model.createdTime).toLocaleString('zh-CN')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">模型ID</p>
                <p className="font-medium text-slate-800">{model.id}</p>
              </div>
              {model.description && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">模型描述</p>
                  <p className="font-medium text-slate-800">{model.description}</p>
                </div>
              )}
              {model.labelsMapping && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">标签映射</p>
                  <pre className="font-medium text-slate-800 text-xs bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto">{model.labelsMapping}</pre>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Training Overview Tab ──────────────────────────────────────────────────

function TrainingOverview() {
  const chartRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<InferResult[]>([]);

  const fetchResults = useCallback(async () => {
    try {
      let resultsRes: any = [];
      try {
        resultsRes = await request.get('/api/v1/infer_result/get');
      } catch (e) { console.warn('Overview results fetch failed (backend 500)', e); }
      setResults(parseInferResults(resultsRes));
    } catch (err) {
      console.error('[Researcher Dashboard] Global Fetch error:', err);
      setResults([]);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    const id = setInterval(fetchResults, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Compute stats from results
  const total = results.length;
  const evaluated = results.filter(r => r.stars != null || (r.comment && r.comment !== '-')).length;
  const unevaluated = total - evaluated;

  // 计算满意样本数（satisfaction === 'ACCURATE'）
  const satisfied = results.filter(r => {
    if (!r.comment || r.comment === '-') return false;
    try {
      const commentObj = typeof r.comment === 'string' ? JSON.parse(r.comment) : r.comment;
      return commentObj.satisfaction === 'ACCURATE';
    } catch {
      return false;
    }
  }).length;

  // 计算满意率：医生满意样本数/医生评价样本数
  const satisfactionRate = evaluated > 0 ? ((satisfied / evaluated) * 100).toFixed(1) + '%' : '-';

  const avgConf = total > 0
    ? (results.reduce((s, r) => s + (r.confidence ?? 0), 0) / total)
    : null;
  const avgAccuracy = avgConf != null ? (avgConf * 100).toFixed(1) + '%' : '-';

  const evalPct = total > 0 ? ((evaluated / total) * 100).toFixed(1) + '%' : '-';
  const unevalPct = total > 0 ? ((unevaluated / total) * 100).toFixed(1) + '%' : '-';

  // To avoid lint warning/error if applicable
  console.debug('Evaluation stats:', { evaluated, unevaluated });

  useEffect(() => {
    if (!chartRef.current || !pieRef.current) return;
    const chart = echarts.init(chartRef.current);

    // 计算最近30天的日期范围
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    // 按日期统计累计满意率
    const satisfactionData = days.map(date => {
      // 获取该日期之前（包括当天）的所有评价
      const evaluatedUpToDate = results.filter(r => {
        if (!r.comment || r.comment === '-' || !r.createdTime) return false;
        const createdDate = new Date(r.createdTime);
        return createdDate <= date;
      });

      // 获取该日期之前（包括当天）的所有满意评价
      const satisfiedUpToDate = evaluatedUpToDate.filter(r => {
        try {
          const commentObj = typeof r.comment === 'string' ? JSON.parse(r.comment) : r.comment;
          return commentObj.satisfaction === 'ACCURATE';
        } catch {
          return false;
        }
      });

      // 计算满意率
      if (evaluatedUpToDate.length === 0) return null; // 没有评价时显示为空
      return satisfiedUpToDate.length / evaluatedUpToDate.length;
    });

    const dayLabels = days.map(d => `${d.getDate()}日`);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const value = params[0].value;
          if (value === null) return '暂无数据';
          return `${params[0].name}<br/>医生满意率: ${(value * 100).toFixed(1)}%`;
        }
      },
      legend: { data: ['医生满意率'], top: 'top' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dayLabels, axisLabel: { interval: 4 } },
      yAxis: { type: 'value', min: 0, max: 1.0 },
      series: [
        {
          name: '医生满意率',
          type: 'line',
          smooth: true,
          data: satisfactionData,
          itemStyle: { color: '#722ED1' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(114,46,209,0.2)' },
                { offset: 1, color: 'rgba(114,46,209,0)' }
              ]
            }
          },
          connectNulls: false // 不连接空值点
        },
      ],
    });
    const pie = echarts.init(pieRef.current);
    pie.setOption({
      series: [{
        type: 'pie', radius: ['50%', '80%'], data: [
          { value: evaluated, name: '已评价', itemStyle: { color: '#722ED1' } },
          { value: unevaluated, name: '未评价', itemStyle: { color: '#E8E8E8' } },
        ],
        label: { show: false }, emphasis: { label: { show: false } },
      }],
    });
    const onResize = () => { chart.resize(); pie.resize(); };
    window.addEventListener('resize', onResize);
    return () => { chart.dispose(); pie.dispose(); window.removeEventListener('resize', onResize); };
  }, [evaluated, unevaluated, satisfied, results]);

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: '平均置信度', value: avgAccuracy, delta: '', deltaClass: 'text-green-500', sub: '全部样本', border: 'border-purple-100' },
          { label: '医生满意率', value: satisfactionRate, delta: '', deltaClass: 'text-green-500', sub: `${satisfied}/${evaluated} 满意`, valueClass: 'text-purple-600', border: 'border-purple-100' },
          { label: '未评价数', value: total > 0 ? unevaluated.toLocaleString() : '-', delta: '', deltaClass: 'text-slate-400', sub: `${unevaluated}例待评价`, valueClass: 'text-slate-600', border: 'border-slate-100' },
          { label: '累计样本数', value: total > 0 ? total.toLocaleString() : '-', delta: '', deltaClass: 'text-purple-400', sub: '验证集', border: 'border-purple-100' },
        ].map(c => (
          <div key={c.label} className={`bg-white p-6 rounded-2xl border ${c.border} shadow-sm`}>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
            <div className="flex items-end space-x-2">
              <span className={`text-3xl font-bold font-mono ${c.valueClass ?? 'text-slate-800'}`}>{c.value}</span>
              <span className={`${c.deltaClass} text-xs font-bold pb-1`}>{c.delta}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center">
              <Icon icon="solar:graph-bold" className="mr-2" style={{ color: '#722ED1' }} />
              模型性能趋势 (近30天)
            </h3>
          </div>
          <div ref={chartRef} style={{ height: 280 }} />
        </div>
        <div className="col-span-4 bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4">医生反馈分布</h4>
          <div ref={pieRef} style={{ height: 180 }} />
          <div className="mt-4 space-y-2">
            {([['bg-purple-600','已评价', evalPct],['bg-slate-200','未评价', unevalPct]] as [string,string,string][]).map(([bg,label,pct]) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${bg}`}></div>
                  <span className="text-slate-600">{label}</span>
                </div>
                <span className="font-bold">{pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Dataset Samples Tab ────────────────────────────────────────────────────


function DatasetSamples() {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [heatmap, setHeatmap] = useState<{ id: string; imageId: string; type: string; hasRealResult?: boolean; caseId?: string } | null>(null);
  const [results, setResults] = useState<InferResult[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      let resultsRes: any = [];

      try {
        resultsRes = await request.get('/api/v1/infer_result/get');
        console.log('[fetchResults] 获取到的推理结果:', resultsRes);
      } catch (e: any) {
        console.warn('获取推理结果失败 (后端脏数据):', e.message);
      }

      const parsed = parseInferResults(resultsRes);
      console.log('[fetchResults] Parsed results:', parsed);
      setResults(parsed);

      const nextImageMap: Record<string, string> = {};

      // 收集所有需要获取的imageId
      const imageIdsToFetch = new Set<string>();
      parsed.forEach(item => {
        // 只有当 imageId 看起来像真实的图片ID时才尝试获取
        // 排除 resultId（通常以 RES 开头）和其他无效值
        const imageId = String(item.imageId);
        if (imageId &&
            imageId !== 'Unknown' &&
            imageId !== 'N/A' &&
            !imageId.startsWith('RES') &&  // 排除 resultId
            !imageId.startsWith('extra-') &&
            !imageId.startsWith('img-') &&
            !imageId.startsWith('joined-')) {
          imageIdsToFetch.add(imageId);
        }
      });

      // 批量获取图片信息
      const imagePromises = Array.from(imageIdsToFetch).map(async (imageId) => {
        try {
          const imageDto = await request.get(`/api/v1/image/get/${imageId}`) as { imagePath?: string; image_path?: string };
          console.log(`[fetchResults] Image ${imageId} DTO:`, imageDto);
          if (imageDto?.imagePath || imageDto?.image_path) {
            const src = toImageSrc(imageDto.imagePath || imageDto.image_path || '');
            if (src) {
              nextImageMap[imageId] = src;
            }
          }
        } catch (e) {
          console.warn(`获取图片 ${imageId} 失败:`, e);
        }
      });

      await Promise.all(imagePromises);

      // 同时也处理推理结果中的图片路径（作为备用）
      parsed.forEach(item => {
        // 优先使用 originalImgPath，如果没有则使用 annotatedImgPath
        const imgPath = item.imagePath || item.annotatedImgPath;
        if (item.imageId && imgPath && !nextImageMap[String(item.imageId)]) {
          const src = toImageSrc(imgPath);
          if (src) {
            nextImageMap[String(item.imageId)] = src;
            if (item.imageName) nextImageMap[item.imageName] = src;
          }
        }
      });

      console.log('[fetchResults] Final imageMap:', nextImageMap);
      setImageMap(nextImageMap);
    } catch (err: any) {
      console.error('[DatasetSamples] Global error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchResults();
    const id = setInterval(fetchResults, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const total = results.length;
  const evaluated = results.filter(r => r.stars != null || (r.comment && r.comment !== '-')).length;

  const unevaluated = total - evaluated;
  const avgConf = total > 0
    ? (results.reduce((s, r) => s + (r.confidence ?? 0), 0) / total).toFixed(2)
    : '-';

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (
          !String(r.imageId ?? '').toLowerCase().includes(q) &&
          !String(r.imageName ?? '').toLowerCase().includes(q)
        ) return false;
      }
      if (startDate && r.createdTime) {
        if (r.createdTime.slice(0, 10) < startDate) return false;
      }
      if (endDate && r.createdTime) {
        if (r.createdTime.slice(0, 10) > endDate) return false;
      }
      return true;
    }).sort((a, b) => {
      // 按推理时间降序排列（越新的越在上面）
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [results, searchQuery, startDate, endDate]);

  const pageSize = viewMode === 'table' ? 10 : 30;
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedResults = filteredResults.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="p-8 space-y-6">
      {heatmap && <HeatmapModal sampleId={heatmap.id} imageId={heatmap.imageId} type={heatmap.type} caseId={heatmap.caseId} onClose={() => setHeatmap(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center">
            <Icon icon="solar:clipboard-list-bold" className="mr-3 text-3xl" style={{ color: '#722ED1' }} />
            数据集样本明细 - 验证集反馈
          </h3>
          <p className="text-sm text-slate-500 mt-1">查看AI预测结果与医生标注的对比分析</p>
        </div>
        <div className="flex space-x-3 items-center">
          <div className="relative">
            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="按样本编号搜索（如 RES12345678）…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-base border rounded-lg pl-9 pr-4 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-300 w-64"
            />
          </div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-base border rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-300" />
          <span className="flex items-center text-slate-500">至</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-base border rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-300" />
          <button
            onClick={async () => {
              try {
                // 根据数据字典，获取影像需要传入 image_id，这里刷新数据即可
                fetchResults();
              } catch (err) { console.error('刷新数据失败:', err); }
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-base text-white transition-all"
            style={{ background: '#722ED1' }}
          >
            <Icon icon="solar:refresh-bold" className="text-lg" />
            <span>刷新数据</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-4 flex-1">
          {[
            { label: '总样本数', value: total > 0 ? total.toLocaleString() : '-', cls: 'text-slate-800', border: 'border-purple-100' },
            { label: '已评价', value: total > 0 ? evaluated.toLocaleString() : '-', cls: 'text-purple-600', border: 'border-purple-100' },
            { label: '未评价', value: total > 0 ? unevaluated.toLocaleString() : '-', cls: 'text-slate-400', border: 'border-slate-100' },
            { label: '平均置信度', value: avgConf, cls: 'text-purple-600', border: 'border-purple-100' },
          ].map(c => (
            <div key={c.label} className={`bg-white p-4 rounded-xl border ${c.border} shadow-sm`}>
              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className={`text-2xl font-bold font-mono ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex border rounded-lg overflow-hidden bg-white ml-4">
          <button onClick={() => setViewMode('table')} className={`p-4 transition-all ${viewMode === 'table' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon icon="solar:list-bold" className="text-2xl" />
          </button>
          <button onClick={() => setViewMode('card')} className={`p-4 transition-all ${viewMode === 'card' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon icon="solar:gallery-bold" className="text-2xl" />
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <table className="w-full text-base">
            <thead className="bg-slate-50 text-slate-500 text-left font-medium border-b">
              <tr>
                {['影像','样本编号','病例ID','AI预测','置信度','推理时间','是否标注','标注者','操作'].map(h => (
                  <th key={h} className="px-6 py-4 text-base">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-400">加载中...</td></tr>
              )}
              {!loading && filteredResults.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-400">{searchQuery.trim() ? '未找到匹配的病例' : '暂无数据'}</td></tr>
              )}
              {pagedResults.map(row => {
                const rowImageSrc = imageMap[String(row.imageId ?? row.resultId)] ?? toImageSrc(row.imageUrl) ?? toImageSrc(row.imagePath) ?? null;
                return (
                <tr
                  key={row.resultId}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group text-base"
                  onClick={() => setHeatmap({
                    id: String(row.resultId),
                    imageId: String(row.imageId),
                    type: row.label === '良性' ? 'benign' : row.label === '疑似恶性' ? 'suspect' : 'malignant',
                    hasRealResult: row.hasRealResult,
                    caseId: row.caseId ? String(row.caseId) : undefined
                  })}
                >
                  <td className="px-6 py-4">
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                      <BboxCanvas
                        src={rowImageSrc || ''}
                        bbox={row.bbox}
                        alt={row.imageName ?? String(row.resultId)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-base text-slate-600">{row.hasRealResult ? (row.resultId ?? '-') : '-'}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{row.caseId ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-sm font-bold ${row.aiPrediction === '良性' ? 'bg-green-100 text-green-700' : row.aiPrediction === '恶性' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{row.aiPrediction ?? '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-100 h-1 rounded-full">
                        <div className={`h-1 rounded-full ${row.confidence && row.confidence > 0.8 ? 'bg-green-500' : row.confidence && row.confidence > 0.5 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${Math.round((row.confidence ?? 0) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-mono">{row.confidence != null ? row.confidence.toFixed(2) : '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {row.createdTime ? new Date(row.createdTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {row.isModified ? (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">已标注</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600">未标注</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {row.modifiedBy ?? '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {row.imageId && row.imageId !== 'N/A' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHeatmap({
                              id: String(row.resultId),
                              imageId: String(row.imageId),
                              type: row.label === '良性' ? 'benign' : row.label === '疑似恶性' ? 'suspect' : 'malignant',
                              hasRealResult: row.hasRealResult,
                              caseId: row.caseId ? String(row.caseId) : undefined
                            });
                          }}
                          className="text-base hover:underline text-purple-600 font-medium"
                        >
                          查看详情
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">暂无详情</span>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500">共 {filteredResults.length} 条验证记录，第 {safePage}/{totalPages} 页</span>
            <div className="flex space-x-2">
              <button
                className="p-1 px-3 border rounded bg-white text-xs hover:bg-slate-50 disabled:opacity-50"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <button
                className="p-1 px-3 border rounded bg-white text-xs hover:bg-slate-50 disabled:opacity-50"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
        <div className="grid grid-cols-6 gap-4">
          {filteredResults.length === 0 && !loading && <p className="col-span-6 text-center text-sm text-slate-400 py-8">{searchQuery.trim() ? '未找到匹配的病例' : '暂无数据'}</p>}
          {pagedResults.map(card => {
            const cardImageSrc = imageMap[String(card.imageId ?? card.resultId)] ?? toImageSrc(card.imageUrl) ?? toImageSrc(card.imagePath) ?? null;
            return (
            <div
              key={card.resultId}
              onClick={() => {
                setHeatmap({
                  id: String(card.resultId),
                  imageId: String(card.imageId),
                  type: card.label === '良性' ? 'benign' : card.label === '疑似恶性' ? 'suspect' : 'malignant',
                  hasRealResult: card.hasRealResult,
                  caseId: card.caseId ? String(card.caseId) : undefined
                });
              }}
              className="bg-white rounded-lg border border-purple-100 shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden">
                <BboxCanvas
                  src={cardImageSrc || ''}
                  bbox={card.bbox}
                  alt={card.imageName ?? String(card.resultId)}
                  className="w-full h-full"
                />
                <div className="absolute top-1.5 right-1.5">
                  {card.isModified ? (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">已标注</span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">未标注</span>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="font-mono text-sm text-slate-500">{card.hasRealResult ? (card.resultId || '-') : '-'}</p>
                <p className="text-sm font-medium text-slate-800">病例ID: {card.caseId || '-'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">AI预测:</span>
                  <span className={`font-bold ${card.aiPrediction === '良性' ? 'text-green-600' : card.aiPrediction === '恶性' ? 'text-red-600' : 'text-orange-600'}`}>{card.aiPrediction ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">置信度:</span>
                  <span className="font-mono font-bold">{card.confidence != null ? card.confidence.toFixed(2) : '-'}</span>
                </div>
                <div className="pt-1.5 border-t text-right">
                  {card.imageId && card.imageId !== 'N/A' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeatmap({
                          id: String(card.resultId),
                          imageId: String(card.imageId),
                          type: card.label === '良性' ? 'benign' : card.label === '疑似恶性' ? 'suspect' : 'malignant',
                          hasRealResult: card.hasRealResult,
                          caseId: card.caseId ? String(card.caseId) : undefined
                        });
                      }}
                      className="text-sm text-purple-600 hover:underline font-bold"
                    >
                      查看详情
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">暂无详情</span>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
        <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-slate-500">共 {filteredResults.length} 条验证记录，第 {safePage}/{totalPages} 页</span>
          <div className="flex space-x-2">
            <button
              className="p-1 px-3 border rounded bg-white text-xs hover:bg-slate-50 disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              上一页
            </button>
            <button
              className="p-1 px-3 border rounded bg-white text-xs hover:bg-slate-50 disabled:opacity-50"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
// ─── Model Library Tab ──────────────────────────────────────────────────────

type ProductionModel = {
  id: number;
  version: string;
  name: string;
  status: string;
  statusClass: string;
  deployDate: string;
  dataset: string;
  desc: string;
  canTakeDown: boolean;
  rawData: any; // 保存原始模型数据
};
type HistoryModel = {
  id: number;
  version: string;
  name: string;
  status: string;
  canRedeploy: boolean;
  uploadDate: string;
  dataset: string;
  desc: string;
  rawData: any; // 保存原始模型数据
};

function ModelLibrary() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailModel, setDetailModel] = useState<any | null>(null);
  const [productionModels, setProductionModels] = useState<ProductionModel[]>([]);
  const [historyModels, setHistoryModels] = useState<HistoryModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = async () => {
    try {
      // 科研端也需要看到所有状态的模型（包括自己上传的PENDING状态）
      const res = await request.get('/api/v1/model/all') as any;
      // request拦截器已经返回了data，所以res直接就是数组
      const models = Array.isArray(res) ? res : (res?.data ?? []);
      console.log('[Researcher Models] 获取到的模型列表:', models);

      // 将模型数据转换为界面需要的格式
      const production: ProductionModel[] = [];
      const history: HistoryModel[] = [];

      models.forEach((model: any) => {
        if (model.status === 'ACTIVE') {
          production.push({
            id: model.id,
            version: model.modelVersion || 'v1.0',
            name: model.modelName || '未命名模型',
            status: '生产环境',
            statusClass: 'bg-green-500',
            deployDate: model.createdTime || '-',
            dataset: model.algorithmType || '-',
            desc: model.description || '-',
            canTakeDown: true,
            rawData: model
          });
        } else if (model.status === 'INACTIVE') {
          history.push({
            id: model.id,
            version: model.modelVersion || 'v1.0',
            name: model.modelName || '未命名模型',
            status: '已下线',
            canRedeploy: true,
            uploadDate: model.createdTime || '-',
            dataset: model.algorithmType || '-',
            desc: model.description || '-',
            rawData: model
          });
        } else if (model.status === 'PENDING') {
          history.push({
            id: model.id,
            version: model.modelVersion || 'v1.0',
            name: model.modelName || '未命名模型',
            status: '待审批',
            canRedeploy: false,
            uploadDate: model.createdTime || '-',
            dataset: model.algorithmType || '-',
            desc: model.description || '-',
            rawData: model
          });
        }
      });

      setProductionModels(production);
      setHistoryModels(history);
    } catch (error) {
      console.error('获取模型列表失败:', error);
      setProductionModels([]);
      setHistoryModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleUploadSuccess = () => {
    setUploadOpen(false);
    fetchModels(); // 上传成功后刷新列表
  };

  return (
    <div className="p-8 space-y-8">
      {uploadOpen && <ModelUploadModal onClose={() => setUploadOpen(false)} onSuccess={handleUploadSuccess} />}
      {detailModel && <ModelDetailModal model={detailModel} onClose={() => setDetailModel(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center">
            <Icon icon="solar:box-bold" className="mr-3 text-3xl" style={{ color: '#722ED1' }} />
            模型库管理
          </h3>
          <p className="text-sm text-slate-500 mt-1">查看和管理所有训练模型版本</p>
        </div>
        <button onClick={() => setUploadOpen(true)} className="text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-200 transition-all flex items-center" style={{ background: '#722ED1' }}>
          <Icon icon="solar:upload-bold" className="mr-2" /> 上传新模型
        </button>
      </div>

      {/* Production Models */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b border-purple-100/50" style={{ background: 'linear-gradient(to right, rgba(245,243,255,0.5), rgba(239,246,255,0.5))' }}>
          <h4 className="font-bold text-slate-800 flex items-center">
            <Icon icon="solar:star-bold" className="mr-2 text-purple-600 text-xl" />
            生产环境模型
          </h4>
        </div>
        <div className="divide-y divide-slate-100/80">
          {loading && (
            <div className="p-8 text-center text-sm text-slate-400">加载中...</div>
          )}
          {!loading && productionModels.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">暂无生产环境模型</div>
          )}
          {productionModels.map(m => (
            <div key={m.version} className="p-6 hover:bg-slate-50/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h5 className="text-lg font-bold text-slate-800">{m.name}</h5>
                    <span className={`${m.statusClass} text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest`}>{m.status}</span>
                  </div>
                  <div className="flex items-center gap-40 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">部署时间</p><p className="font-medium text-slate-700">{m.deployDate}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">算法类型</p><p className="font-medium text-slate-700">{m.dataset}</p></div>
                    <div className="flex-1"><p className="text-slate-500 text-xs mb-1">模型描述</p><p className="font-medium text-slate-700">{m.desc}</p></div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-6">
                  <button onClick={() => setDetailModel(m.rawData)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 transition-all hover:border-purple-300 hover:shadow-sm">查看详情</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History Models */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100/50 bg-slate-50/50">
          <h4 className="font-bold text-slate-800 flex items-center">
            <Icon icon="solar:history-bold" className="mr-2 text-xl" style={{ color: '#722ED1' }} />
            历史模型版本
          </h4>
        </div>
        <div className="divide-y divide-slate-100/80">
          {!loading && historyModels.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">暂无历史模型</div>
          )}
          {historyModels.map(m => (
            <div key={m.version} className="p-6 hover:bg-slate-50/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h5 className="text-lg font-bold text-slate-800">{m.name}</h5>
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{m.status}</span>
                  </div>
                  <div className="flex items-center gap-40 text-sm">
                    <div><p className="text-slate-500 text-xs mb-1">上传时间</p><p className="font-medium text-slate-700">{m.uploadDate}</p></div>
                    <div><p className="text-slate-500 text-xs mb-1">算法类型</p><p className="font-medium text-slate-700">{m.dataset}</p></div>
                    <div className="flex-1"><p className="text-slate-500 text-xs mb-1">模型描述</p><p className="font-medium text-slate-700">{m.desc}</p></div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-6">
                  <button onClick={() => setDetailModel(m.rawData)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm">查看详情</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ─── Model Config Tab ───────────────────────────────────────────────────────

function ModelConfig() {
  // 状态管理
  const [learningRate, setLearningRate] = useState(0.001);
  const [batchSize, setBatchSize] = useState('32');
  const [epochs, setEpochs] = useState(100);
  const [validationSplit, setValidationSplit] = useState(0.2);
  const [optimizer, setOptimizer] = useState('Adam');
  const [momentum, setMomentum] = useState(0.9);
  const [weightDecay, setWeightDecay] = useState(0.0001);
  const [scheduler, setScheduler] = useState('ReduceLROnPlateau');
  const [backbone, setBackbone] = useState('EfficientNet-B4');
  const [inputSize, setInputSize] = useState('256x256');
  const [dropout, setDropout] = useState(0.3);
  const [pretrained, setPretrained] = useState(true);
  const [augHFlip, setAugHFlip] = useState(true);
  const [augVFlip, setAugVFlip] = useState(true);
  const [augRotate, setAugRotate] = useState(true);
  const [augColor, setAugColor] = useState(false);
  const [augBlur, setAugBlur] = useState(false);
  const [augCutout, setAugCutout] = useState(false);
  const [augStrength, setAugStrength] = useState(2);
  const [earlyStopping, setEarlyStopping] = useState(10);
  const [gradientClipping, setGradientClipping] = useState(1.0);
  const [randomSeed, setRandomSeed] = useState(42);

  // 导出配置文件
  const handleExportConfig = () => {
    const config = {
      basic_training: {
        learning_rate: learningRate,
        batch_size: parseInt(batchSize),
        epochs: epochs,
        validation_split: validationSplit
      },
      optimizer: {
        type: optimizer,
        momentum: momentum,
        weight_decay: weightDecay,
        scheduler: scheduler
      },
      model_architecture: {
        backbone: backbone,
        input_size: inputSize,
        dropout: dropout,
        pretrained: pretrained
      },
      data_augmentation: {
        horizontal_flip: augHFlip,
        vertical_flip: augVFlip,
        rotate: augRotate,
        color_jitter: augColor,
        gaussian_blur: augBlur,
        cutout_mixup: augCutout,
        strength: augStrength
      },
      advanced: {
        early_stopping: earlyStopping,
        gradient_clipping: gradientClipping,
        random_seed: randomSeed
      }
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_config_${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-').split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center">
            <Icon icon="solar:settings-minimalistic-bold" className="mr-3 text-3xl" style={{ color: '#722ED1' }} />
            模型训练参数记录
          </h3>
          <p className="text-sm text-slate-500 mt-1">查看和管理模型训练参数配置 (仅供参考，实际训练请在本地环境进行)</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportConfig}
            className="text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-200 transition-all flex items-center"
            style={{ background: '#722ED1' }}
          >
            <Icon icon="solar:download-bold" className="mr-2" /> 导出配置文件
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Basic Training Params */}
        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center">
            <Icon icon="solar:chart-2-bold" className="mr-2" style={{ color: '#722ED1' }} />
            基础训练参数
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">学习率 (Learning Rate)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0.0001"
                  max="0.01"
                  step="0.0001"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0.0001"
                  max="0.01"
                  step="0.0001"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">批次大小 (Batch Size)</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
              >
                {['8','16','32','64','128'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">训练轮次 (Epochs)</label>
              <input
                type="number"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">验证集比例 (Validation Split)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0.1"
                  max="0.3"
                  step="0.05"
                  value={validationSplit}
                  onChange={(e) => setValidationSplit(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0.1"
                  max="0.3"
                  step="0.05"
                  value={validationSplit}
                  onChange={(e) => setValidationSplit(parseFloat(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Optimizer Config */}
        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center">
            <Icon icon="solar:cpu-bolt-bold" className="mr-2" style={{ color: '#722ED1' }} />
            优化器配置
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">优化器 (Optimizer)</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={optimizer}
                onChange={(e) => setOptimizer(e.target.value)}
              >
                {['SGD','Adam','AdamW','RMSprop'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">动量 (Momentum)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={momentum}
                  onChange={(e) => setMomentum(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={momentum}
                  onChange={(e) => setMomentum(parseFloat(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">权重衰减 (Weight Decay)</label>
              <input
                type="number"
                step="0.0001"
                value={weightDecay}
                onChange={(e) => setWeightDecay(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">学习率调度器</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={scheduler}
                onChange={(e) => setScheduler(e.target.value)}
              >
                {['None','ReduceLROnPlateau','CosineAnnealing','StepLR'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Model Architecture */}
        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center">
            <Icon icon="solar:layers-bold" className="mr-2" style={{ color: '#722ED1' }} />
            模型架构
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">骨干网络 (Backbone)</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={backbone}
                onChange={(e) => setBackbone(e.target.value)}
              >
                {['ResNet50','ResNet101','EfficientNet-B4','VGG16','DenseNet121'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">输入尺寸 (Input Size)</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={inputSize}
                onChange={(e) => setInputSize(e.target.value)}
              >
                {['224x224','256x256','512x512','1024x1024'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">Dropout率</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={dropout}
                  onChange={(e) => setDropout(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={dropout}
                  onChange={(e) => setDropout(parseFloat(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">预训练权重</label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="pretrained"
                  checked={pretrained}
                  onChange={(e) => setPretrained(e.target.checked)}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="pretrained" className="text-sm text-slate-700">使用ImageNet预训练权重</label>
              </div>
            </div>
          </div>
        </div>

        {/* Data Augmentation */}
        <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center">
            <Icon icon="solar:gallery-bold" className="mr-2" style={{ color: '#722ED1' }} />
            数据增强策略
          </h4>
          <div className="space-y-3">
            {[
              { id: 'aug-hflip', label: '随机水平翻转', checked: augHFlip, setter: setAugHFlip },
              { id: 'aug-vflip', label: '随机垂直翻转', checked: augVFlip, setter: setAugVFlip },
              { id: 'aug-rotate', label: '随机旋转 (±15°)', checked: augRotate, setter: setAugRotate },
              { id: 'aug-color', label: '颜色抖动', checked: augColor, setter: setAugColor },
              { id: 'aug-blur', label: '高斯模糊', checked: augBlur, setter: setAugBlur },
              { id: 'aug-cutout', label: 'Cutout/Mixup', checked: augCutout, setter: setAugCutout },
            ].map(({ id, label, checked, setter }) => (
              <div key={id} className="flex items-center justify-between">
                <label htmlFor={id} className="text-sm text-slate-700">{label}</label>
                <input
                  type="checkbox"
                  id={id}
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                  className="w-4 h-4 text-purple-600"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block mt-4">增强强度</label>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-slate-500">弱</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="1"
                  value={augStrength}
                  onChange={(e) => setAugStrength(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-slate-500">强</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Config */}
      <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center">
          <Icon icon="solar:settings-bold" className="mr-2" style={{ color: '#722ED1' }} />
          高级配置
        </h4>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">早停轮次 (Early Stopping)</label>
            <input
              type="number"
              value={earlyStopping}
              onChange={(e) => setEarlyStopping(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">梯度裁剪 (Gradient Clipping)</label>
            <input
              type="number"
              step="0.1"
              value={gradientClipping}
              onChange={(e) => setGradientClipping(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-widest mb-2 block">随机种子 (Random Seed)</label>
            <input
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
            />
          </div>
        </div>
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <p className="text-xs text-slate-600 flex items-start">
            <Icon icon="solar:info-circle-bold" className="mr-2 text-purple-600 mt-0.5" />
            <span>此配置为当前部署模型的训练参数记录。您可以导出此配置用于本地训练参考，或在上传新模型时填写对应的训练参数。</span>
          </p>
        </div>
      </div>
    </div>
  );
}
function ResearcherDashboard() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  const [editingCase, setEditingCase] = useState<CaseDto | null>(null);
  const [editingStudy, setEditingStudy] = useState<{ caseId: string | number; study: StudyDto } | null>(null);



  const handleUpdateCase = async (caseId: string | number, data: any) => {
    try {
      await updateCase(caseId, data);
      setEditingCase(null);
      window.location.reload();
    } catch (err) {
      console.error('更新病例失败:', err);
    }
  };

  const handleUpdateStudy = async (caseId: string | number, studyId: string | number, data: any) => {
    try {
      await updateStudy(caseId, studyId, data);
      setEditingStudy(null);
      window.location.reload();
    } catch (err) {
      console.error('更新检查失败:', err);
    }
  };

  const handleDeleteStudy = async (caseId: string | number, studyId: string | number) => {
    if (!window.confirm('确定要删除该检查吗？')) return;
    try {
      await deleteStudy(caseId, studyId);
      window.location.reload();
    } catch (err) {
      console.error('删除检查失败:', err);
    }
  };

  return (
    <>
      {tab === 'overview' && <TrainingOverview />}
      {tab === 'datasets' && <DatasetSamples />}
      {tab === 'models' && <ModelLibrary />}
      {tab === 'config' && <ModelConfig />}

      {editingCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-96">
            <h3 className="text-lg font-bold mb-4">编辑病例信息</h3>
            <div className="space-y-4">
              <input
                className="w-full border rounded p-2"
                defaultValue={editingCase.name}
                placeholder="姓名"
                id="edit-case-name"
              />
              <textarea
                className="w-full border rounded p-2"
                defaultValue={editingCase.case_desc}
                placeholder="描述"
                id="edit-case-desc"
              />
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase">关联检查 (Studies)</p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {editingCase.studys?.map((s: StudyDto) => (
                    <div key={s.studyId || s.study_id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <span className="text-xs text-slate-600">{s.studyType || s.study_type || '未知类型'} ({s.studyTime || s.study_time})</span>
                      <button onClick={() => setEditingStudy({ caseId: editingCase.caseId || editingCase.case_id!, study: s })} className="text-[10px] text-blue-600">编辑</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={() => setEditingCase(null)} className="px-4 py-2 text-slate-500">取消</button>
                <button
                  onClick={() => {
                    const name = (document.getElementById('edit-case-name') as HTMLInputElement).value;
                    const desc = (document.getElementById('edit-case-desc') as HTMLTextAreaElement).value;
                    handleUpdateCase(editingCase.caseId || editingCase.case_id!, { name, case_desc: desc });
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingStudy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-96">
            <h3 className="text-lg font-bold mb-4">编辑检查信息</h3>
            <div className="space-y-4">
              <input
                className="w-full border rounded p-2"
                defaultValue={editingStudy.study.study_type}
                placeholder="检查类型"
                id="edit-study-type"
              />
              <textarea
                className="w-full border rounded p-2"
                defaultValue={editingStudy.study.study_desc}
                placeholder="检查描述"
                id="edit-study-desc"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => handleDeleteStudy(editingStudy.caseId, editingStudy.study.studyId || editingStudy.study.study_id!)} className="px-4 py-2 text-red-600">删除</button>
                <div className="flex-1" />
                <button onClick={() => setEditingStudy(null)} className="px-4 py-2 text-slate-500">取消</button>
                <button
                  onClick={() => {
                    const type = (document.getElementById('edit-study-type') as HTMLInputElement).value;
                    const desc = (document.getElementById('edit-study-desc') as HTMLTextAreaElement).value;
                    handleUpdateStudy(editingStudy.caseId, editingStudy.study.studyId || editingStudy.study.study_id!, { study_type: type, study_desc: desc });
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResearcherDashboard;
