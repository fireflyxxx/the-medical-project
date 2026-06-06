package com.g14.medical_imaging_system.dto.caseapi;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CaseDto {
    private String caseId;
    private String name;
    private Integer gender;
    private Integer age;
    private String idNumber;
    private String contact;
    private String medicalHistory;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
    private String caseDesc;
    private List<StudyDto> studys;
}
