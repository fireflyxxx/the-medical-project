// API service for backend communication

export const API_BASE_URL = '/api/v1';
export const API_BASE_URL_IMAGE = '';

const getToken = (): string => {
  const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') ?? '') : '';
  console.log('Retrieved token:', token);
  return token;
};

interface CaseDto {
  caseId: string;
  name: string;
  gender: number;
  age: number;
  idNumber: string;
  contact: string;
  medicalHistory: string;
  createdTime: string;
  updatedTime: string;
  caseDesc: string;
  studys: StudyDto[];
}

interface StudyDto {
  studyId: string;
  studyType: string;
  studyTime: string;
  studyDesc: string;
  images: ImageDto[];
  imageIds?: string[];
}

interface ImageDto {
  imageId: string;
  imagePath: string;
  imageUrl?: string;
  imageDesc: string;
  uploadedTime: string;
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-').replace('T', ' ').substring(0, 16);
};

// API functions
export const api = {
  // Get all cases
  getCases: async (): Promise<CaseDto[]> => {
    const response = await fetch(`${API_BASE_URL}/cases/get`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cases');
    }

    const data = await response.json();
    return data.data;
  },

  // Create a new case
  createCase: async (caseData: any): Promise<{ caseId: string }> => {
    const response = await fetch(`${API_BASE_URL}/cases/create`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(caseData),
    });

    if (!response.ok) {
      throw new Error('Failed to create case');
    }

    const data = await response.json();
    return data.data;
  },

  // Delete a case
  deleteCase: async (caseId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/delete`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete case');
    }
  },

  // Update a case
  updateCase: async (caseId: string, caseData: any): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/update`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(caseData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to update case (${response.status})`;
      throw new Error(errorMessage);
    }
  },

  // Get case details
  getCaseDetails: async (caseId: string): Promise<CaseDto> => {
    const response = await fetch(`${API_BASE_URL}/cases/get?case_id=${caseId}`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch case details');
    }

    const data = await response.json();
    return data.data[0];
  },

  // Create a new study (examination)
  createStudy: async (caseId: string, studyData: any): Promise<{ studyId: string }> => {
    // Map frontend study type to backend enum
    const studyTypeMap: Record<string, string> = {
      "胸部X光": "XRAY",
      "胸部CT": "CR",
      "胸部MRI": "DX"
    };
    
    // Convert LocalDateTime to LocalDate (YYYY-MM-DD)
    const studyDate = studyData.studyDate.split('T')[0];
    
    // Ensure studyDesc is not empty
    const studyDesc = studyData.studyDesc || "无";
    
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/study/create`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studys: [{
          study_type: studyTypeMap[studyData.studyType] || "XRAY",
          study_time: studyDate,
          study_desc: studyDesc
        }]
      }),
    });

    if (!response.ok) {
      // Get detailed error message from response
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to create study (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Create study response:', data);
    // Extract studyId from the first study in the response
    // Check if response structure is as expected
    if (data.data && data.data.study && data.data.study.length > 0) {
      return {
        studyId: data.data.study[0].studyId || data.data.study[0].studyCode || 'unknown'
      };
    } else {
      console.error('Unexpected response structure:', data);
      throw new Error('Invalid response from server');
    }
  },

  // Upload images
  uploadImages: async (caseId: string, studyId: string, files: File[]): Promise<{ imageIds: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/study/${studyId}/upload_image`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to upload images (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Delete image
  deleteImage: async (imageId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/image/delete/${imageId}`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to delete image (${response.status})`;
      throw new Error(errorMessage);
    }
  },

  // Get image
  getImage: async (imageId: string): Promise<ImageDto> => {
    const response = await fetch(`${API_BASE_URL}/image/get/${imageId}`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get image (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Infer image
  inferImage: async (imageId: string, inferData: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/image/infer/${imageId}`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inferData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to infer image (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get all inference results
  getAllInferResults: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/infer_result/get`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get inference results (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get single inference result
  getInferResult: async (resultId: string): Promise<any> => {
    console.log('[API] getInferResult called with resultId:', resultId);
    const response = await fetch(`${API_BASE_URL}/infer_result/get/${resultId}`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get inference result (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[API] getInferResult raw response:', data);
    console.log('[API] getInferResult data.data:', data.data);
    console.log('[API] getInferResult data.data.modifiedBbox:', data.data?.modifiedBbox);
    return data.data;
  },

  // Create comment for inference result
  createComment: async (resultId: string, sentence: string, satisfaction: string): Promise<any> => {
    // 使用正确的请求格式
    const payload = {
      comment: {
        satisfaction: satisfaction,
        sentence: sentence
      }
    };
    
    console.log('Comment payload:', payload);
    console.log('Stringified payload:', JSON.stringify(payload));
    
    try {
      const response = await fetch(`${API_BASE_URL}/infer_result/${resultId}/comment/create`, {
        method: 'POST',
        headers: {
          'Authorization': getToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Failed to create comment (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Success response:', data);
      return data.data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },

  // Delete comment
  deleteComment: async (resultId: string, commentId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/infer_result/${resultId}/comment/${commentId}/delete`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to delete comment (${response.status})`;
      throw new Error(errorMessage);
    }
  },

  // Get doctor's comment information
  getDoctorComment: async (resultId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/infer_result/${resultId}/get`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get doctor comment (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Delete study (examination)
  deleteStudy: async (caseId: string, studyId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/study/${studyId}/delete`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to delete study (${response.status})`;
      throw new Error(errorMessage);
    }
  },

  // Batch inference
  inferBatch: async (imageIds: string[], model: string, confidenceThreshold: number): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/infer/batch`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageIds: imageIds,
        model: model,
        parameter: {
          threshold: confidenceThreshold
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to infer batch (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get batch status
  getBatchStatus: async (batchId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/infer/batch/${batchId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get batch status (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get batch result
  getBatchResult: async (batchId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/infer/batch/${batchId}/result`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get batch result (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Update doctor bbox (detection box) for inference result
  updateDocBbox: async (resultId: string, docBbox: any[]): Promise<any> => {
    const requestBody = { doc_bbox: docBbox };
    console.log('[API] updateDocBbox request:', JSON.stringify(requestBody));
    console.log('[API] resultId:', resultId);
    const response = await fetch(`${API_BASE_URL}/infer_result/${resultId}/doc_bbox/update`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to update doc bbox (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get latest announcement
  getLatestAnnouncement: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/announcement/latest`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get announcement (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get active models
  getActiveModels: async (): Promise<ModelDto[]> => {
    const response = await fetch(`${API_BASE_URL}/model/list`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get active models (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Get all models
  getAllModels: async (): Promise<ModelDto[]> => {
    const response = await fetch(`${API_BASE_URL}/model/all`, {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to get all models (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Update model status
  updateModelStatus: async (modelId: number, status: string): Promise<ModelDto> => {
    const response = await fetch(`${API_BASE_URL}/model/${modelId}/status?status=${status}`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to update model status (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },

  // Upload model
  uploadModel: async (formData: FormData): Promise<ModelDto> => {
    const response = await fetch(`${API_BASE_URL}/model/upload`, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Failed to upload model (${response.status})`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  },
};

interface ModelDto {
  id: number;
  modelName: string;
  modelVersion: string;
  description: string;
  algorithmType: string;
  labelsMapping: string | null;
  defaultThreshold: number;
  status: string;
  createdTime: string;
}

export { formatDate };
export type { CaseDto, StudyDto, ImageDto, ModelDto };