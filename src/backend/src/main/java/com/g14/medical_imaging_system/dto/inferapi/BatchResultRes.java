package com.g14.medical_imaging_system.dto.inferapi;

import lombok.Data;
import java.util.List;

@Data
public class BatchResultRes {
    private String batchId;
    private Long duration; // 推理完成的总耗时 (毫秒)
    private List<InferenceResultDto> results;
}
