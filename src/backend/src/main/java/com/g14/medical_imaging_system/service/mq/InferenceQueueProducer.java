package com.g14.medical_imaging_system.service.mq;

public interface InferenceQueueProducer {
    void sendBatchTask(String batchId, Long taskId);
}