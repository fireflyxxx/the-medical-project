package com.g14.medical_imaging_system.dto.caseapi;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class StudyCreateReq {
    @Valid
    private List<StudyPayload> studys;
}
