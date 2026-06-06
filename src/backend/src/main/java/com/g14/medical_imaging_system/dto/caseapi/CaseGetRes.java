package com.g14.medical_imaging_system.dto.caseapi;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CaseGetRes {

    @JsonProperty("case_id")
    private String caseId;

    @JsonProperty("name")
    private String name;

    @JsonProperty("gender")
    private Integer gender;

    @JsonProperty("age")
    private Integer age;

    @JsonProperty("id_number")
    private String idNumber;

    @JsonProperty("contact")
    private String contact;

    @JsonProperty("medical_history")
    private String medicalHistory;

    @JsonProperty("created_time")
    @JsonFormat(pattern = "yyyyMMddHHmm")
    private LocalDateTime createdTime;

    @JsonProperty("updated_time")
    @JsonFormat(pattern = "yyyyMMddHHmm")
    private LocalDateTime updatedTime;

    @JsonProperty("case_desc")
    private String caseDesc;

    @JsonProperty("studys")
    private List<StudyRes> studys;
}