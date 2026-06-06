package com.g14.medical_imaging_system.service.mq;

import com.g14.medical_imaging_system.service.MedicalPlatformService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@EnableScheduling
@ConditionalOnProperty(name = "mq.type", havingValue = "redis", matchIfMissing = true)
public class AsyncInferenceConsumer {

    private final StringRedisTemplate redisTemplate;
    private final MedicalPlatformService medicalPlatformService;

    public AsyncInferenceConsumer(StringRedisTemplate redisTemplate, MedicalPlatformService medicalPlatformService) {
        this.redisTemplate = redisTemplate;
        this.medicalPlatformService = medicalPlatformService;
    }

    @Scheduled(fixedDelay = 100)
    public void consumeTasks() {
        String taskIdStr;
        while ((taskIdStr = redisTemplate.opsForList().rightPop("inference_queue")) != null) {
            try {
                Long taskId = Long.parseLong(taskIdStr);
                medicalPlatformService.executeAsyncInference(taskId);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}