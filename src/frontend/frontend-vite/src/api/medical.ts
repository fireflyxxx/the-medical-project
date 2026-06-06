import request from '../utils/request';

/**
 * Case API
 */
export const getCases = () => request.get('/api/v1/cases/get');
export const updateCase = (caseId: string | number, data: any) => request.post(`/api/v1/cases/${caseId}/update`, data);

/**
 * Study API
 * 创建检查记录
 * POST /api/v1/cases/{case_id}/study/create
 * 请求体: { studies: Study[] }
 */
export const createStudy = (caseId: string | number, studies: any[]) =>
  request.post(`/api/v1/cases/${caseId}/study/create`, { studies });

/**
 * 更改检查记录
 * POST /api/v1/cases/{case_id}/study/{study_id}/update
 * 请求体: { study: { ...要更改的字段 } }
 */
export const updateStudy = (caseId: string | number, studyId: string | number, data: any) =>
  request.post(`/api/v1/cases/${caseId}/study/${studyId}/update`, { study: data });

/**
 * 删除检查记录
 * POST /api/v1/cases/{case_id}/study/{study_id}/delete
 */
export const deleteStudy = (caseId: string | number, studyId: string | number) =>
  request.post(`/api/v1/cases/${caseId}/study/${studyId}/delete`);

/**
 * Image API
 * 注意：根据数据字典，获取影像需要传入 image_id 参数
 */
export const getImage = (imageId: string | number) => request.get(`/api/v1/image/get/${imageId}`);

/**
 * Inference Result API
 * 注意：/api/v1/infer_result/get 接口在数据字典中未明确定义，使用时需确认后端是否支持
 */
export const getInferResults = () => request.get('/api/v1/infer_result/get');
export const getInferResultDetail = (resultId: string | number) => request.get(`/api/v1/infer_result/${resultId}/get`);

/**
 * Comment API
 */
export const createComment = (resultId: string | number, data: { satisfaction: string; sentence: string }) =>
  request.post(`/api/v1/infer_result/${resultId}/comment/create`, data);

/**
 * 删除评论
 * 根据数据字典，需要传入 comment_id 参数
 */
export const deleteComment = (resultId: string | number, commentId: string | number) =>
  request.post(`/api/v1/infer_result/${resultId}/comment/${commentId}/delete`);

/**
 * 上传图片到检查记录
 * POST /api/v1/cases/{case_id}/study/{study_id}/upload_image
 * 请求体: FormData with images field
 * 返回: { imageIds: string[] }
 */
export const uploadImages = (caseId: string | number, studyId: string | number, images: File[]) => {
  const formData = new FormData();
  images.forEach(image => {
    formData.append('images', image);
  });
  return request.post(`/api/v1/cases/${caseId}/study/${studyId}/upload_image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
