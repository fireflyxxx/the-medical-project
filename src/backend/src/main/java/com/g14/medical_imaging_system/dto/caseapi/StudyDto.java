package com.g14.medical_imaging_system.dto.caseapi;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class StudyDto {
    private String studyId;
    private LocalDate studyTime;
    private String studyType;
    private String studyDesc;
    private List<String> imageIds;
}
