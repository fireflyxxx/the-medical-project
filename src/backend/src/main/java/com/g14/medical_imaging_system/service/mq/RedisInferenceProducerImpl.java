package com.g14.medical_imaging_system.service.mq;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "mq.type", havingValue = "redis", matchIfMissing = true)
public class RedisInferenceProducerImpl implements InferenceQueueProducer {

    private final StringRedisTemplate redisTemplate;

    public RedisInferenceProducerImpl(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void sendBatchTask(String batchId, Long taskId) {
        redisTemplate.opsForList().leftPush("inference_queue", taskId.toString());
    }
}