package com.g14.medical_imaging_system.dto.logapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LogGetReq {
    private String operator;

    @JsonProperty("operation_type")
    private String operationType;

    @JsonProperty("target_id")
    private String targetId;

    @JsonProperty("target_type")
    private String targetType;

    @JsonProperty("operation_status")
    private Integer operationStatus;

    @JsonProperty("start_time")
    private String startTime;

    @JsonProperty("end_time")
    private String endTime;

    @JsonProperty("page_no")
    @Min(1)
    private Integer pageNo = 1;

    @JsonProperty("page_size")
    @Min(1)
    @Max(200)
    private Integer pageSize = 20;
}
