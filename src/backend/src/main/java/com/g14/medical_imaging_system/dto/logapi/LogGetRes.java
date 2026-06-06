package com.g14.medical_imaging_system.dto.logapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class LogGetRes {
    private List<Auditlog> auditlog;

    private Long total;

    @JsonProperty("page_no")
    private Integer pageNo;

    @JsonProperty("page_size")
    private Integer pageSize;

    @Getter
    @Setter
    @Builder
    public static class Auditlog {
        private String operator;

        @JsonProperty("operation_type")
        private String operationType;

        @JsonProperty("operation_time")
        private String operationTime;

        @JsonProperty("target_id")
        private String targetId;

        @JsonProperty("target_type")
        private String targetType;

        @JsonProperty("operation_status")
        private Integer operationStatus;

        @JsonProperty("error_msg")
        private String errorMsg;
    }
}
