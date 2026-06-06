package com.g14.medical_imaging_system.service;

import com.g14.medical_imaging_system.common.JwtUtils;
import com.g14.medical_imaging_system.entity.AuditLog;
import com.g14.medical_imaging_system.repository.AuditLogRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {
    private static final String OPERATOR_UNKNOWN = "unknown";

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logByToken(String token,
                           String operationType,
                           String targetType,
                           String targetId,
                           int operationStatus,
                           String errorMsg) {
        String operator = resolveOperator(token);
        log(operator, operationType, targetType, targetId, operationStatus, errorMsg);
    }

    public void log(String operator,
                    String operationType,
                    String targetType,
                    String targetId,
                    int operationStatus,
                    String errorMsg) {
        AuditLog log = new AuditLog();
        log.setOperator(operator == null || operator.isBlank() ? OPERATOR_UNKNOWN : operator);
        log.setOperationType(operationType);
        log.setTargetType(targetType);
        log.setTargetId(targetId == null || targetId.isBlank() ? "N/A" : targetId);
        log.setOperationStatus(operationStatus);
        log.setErrorMsg(errorMsg);
        auditLogRepository.save(log);
    }

    private String resolveOperator(String token) {
        if (token == null || token.isBlank()) {
            return OPERATOR_UNKNOWN;
        }
        try {
            Claims claims = JwtUtils.parseToken(token);
            String username = claims.get("username", String.class);
            return username == null || username.isBlank() ? OPERATOR_UNKNOWN : username;
        } catch (JwtException e) {
            return OPERATOR_UNKNOWN;
        }
    }
}
