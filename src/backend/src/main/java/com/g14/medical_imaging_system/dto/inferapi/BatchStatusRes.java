package com.g14.medical_imaging_system.dto.inferapi;

import lombok.Data;

import java.util.List;

@Data
public class BatchStatusRes {
    private String batchId;
    private String overallStatus; // PENDING, PROCESSING, COMPLETED
    private Long duration; // in milliseconds
    private Progress progress;
    private List<TaskDetail> tasksDetail;

    @Data
    public static class Progress {
        private int total;
        private int completed;
        private int success;
        private int failed;
        private int pending;
    }

    @Data
    public static class TaskDetail {
        private Long taskId;
        private Long imageId;
        private String status;
        private String errorMessage;
    }
}