package com.g14.medical_imaging_system.dto.caseapi;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.g14.medical_imaging_system.entity.StudyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Data
public class StudyPayload {
    @NotNull(message = "study_time is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonProperty("study_time")
    private LocalDate studyTime;

    @NotNull(message = "study_type is required")
    @JsonProperty("study_type")
    private StudyType studyType;

    @NotBlank(message = "study_desc is required")
    @JsonProperty("study_desc")
    private String studyDesc;

    @JsonProperty("images")
    private List<MultipartFile> images;
}
