package com.g14.medical_imaging_system.dto.inferapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class InferResultUpdateReq {
    @JsonProperty("doc_bbox")
    private Object docBbox;
}