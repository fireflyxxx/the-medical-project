package com.g14.medical_imaging_system.dto.inferapi;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class InferImgReq {
    @NotBlank(message = "model is required")
    private String model;

    @NotNull(message = "parameter is required")
    private Map<String, Object> parameter;
}
