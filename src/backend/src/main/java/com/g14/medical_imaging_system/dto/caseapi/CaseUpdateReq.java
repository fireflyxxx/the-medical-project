package com.g14.medical_imaging_system.dto.caseapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.util.List;

@Data
public class CaseUpdateReq {
    private String name;
    private Integer gender;

    @Min(value = 1, message = "age must be > 0")
    @Max(value = 199, message = "age must be < 200")
    private Integer age;

    private String idNumber;
    private String contact;
    private String medicalHistory;
    private String caseDesc;

    @Valid
    private List<StudyPayload> studys;
}
