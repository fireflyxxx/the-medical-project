package com.g14.medical_imaging_system.dto.inferapi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InferenceResultDto {
    private String resultId;
    private String imageId;
    private String caseId;
    private String originalImgPath;
    private Object bbox; // 改为 Object 以支持同时返回单个 Map 或多个 Map 组成的 List
    private Double confidenceScore;
    private String label;
    private java.time.LocalDateTime createdTime; // AI推理完成入库时间
    
    // Doctor modified fields
    private Boolean isModified;
    private Object modifiedBbox;
    private String modifiedLabel;
    private String modifiedBy;
    private java.time.LocalDateTime modifiedTime;

    private String annotatedImgPath;
    private CommentDto comment;

    private Long modelId;
    private String modelName;
    private Long duration;
}


