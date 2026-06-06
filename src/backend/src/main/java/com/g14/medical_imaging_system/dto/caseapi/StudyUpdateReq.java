package com.g14.medical_imaging_system.dto.caseapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StudyUpdateReq {
    @Valid
    @NotNull(message = "study is required")
    private StudyPayload study;
}
