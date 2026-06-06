package com.g14.medical_imaging_system.dto.inferapi;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InferImgRes {
    private InferenceResultDto inferResult;
}
