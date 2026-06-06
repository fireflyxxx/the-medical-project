package com.g14.medical_imaging_system.dto.inferapi;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class InferBatchReq {
    @NotEmpty(message = "image_ids cannot be empty")
    private List<String> imageIds;

    @NotNull(message = "model is required")
    private String model;

    private Map<String, Object> parameter;
}