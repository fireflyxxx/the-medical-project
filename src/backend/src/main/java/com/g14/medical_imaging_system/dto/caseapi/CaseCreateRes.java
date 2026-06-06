package com.g14.medical_imaging_system.dto.caseapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CaseCreateRes {
    @JsonProperty("case_id")
    private String caseId;
}
