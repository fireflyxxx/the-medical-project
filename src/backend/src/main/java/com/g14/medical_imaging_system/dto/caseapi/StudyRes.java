package com.g14.medical_imaging_system.dto.caseapi;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.g14.medical_imaging_system.entity.StudyType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class StudyRes {
    @JsonProperty("study_time")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate studyTime;

    @JsonProperty("study_type")
    private String studyType;

    @JsonProperty("study_desc")
    private String studyDesc;

    @JsonProperty("images")
    private List<String> images;
}