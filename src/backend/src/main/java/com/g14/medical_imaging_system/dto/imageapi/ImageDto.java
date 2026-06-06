package com.g14.medical_imaging_system.dto.imageapi;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ImageDto {
    private String imageId;
    private String caseId;
    private String studyId;
    private String fileName;
    private String fileFormat;
    private Long fileSize;
    private String imagePath;
    private LocalDateTime uploadedTime;
}
