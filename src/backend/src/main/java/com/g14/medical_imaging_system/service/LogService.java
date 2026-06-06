package com.g14.medical_imaging_system.service;

import com.g14.medical_imaging_system.dto.logapi.LogGetReq;
import com.g14.medical_imaging_system.dto.logapi.LogGetRes;
import com.g14.medical_imaging_system.entity.AuditLog;
import com.g14.medical_imaging_system.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class LogService {
    private static final DateTimeFormatter OPERATION_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

    private final AuditLogRepository auditLogRepository;

    public LogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public LogGetRes getLogs(LogGetReq req) {
        int pageNo = req.getPageNo() == null ? 1 : req.getPageNo();
        int pageSize = req.getPageSize() == null ? 20 : req.getPageSize();
        if (pageNo < 1 || pageSize < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page_no and page_size must be positive");
        }

        if (req.getOperationStatus() != null && req.getOperationStatus() != 0 && req.getOperationStatus() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "operation_status must be 0 or 1");
        }

        LocalDateTime startTime = parseTime(req.getStartTime(), "start_time");
        LocalDateTime endTime = parseTime(req.getEndTime(), "end_time");
        if (startTime != null && endTime != null && startTime.isAfter(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "start_time must be before end_time");
        }

        Specification<AuditLog> spec = (root, query, cb) -> cb.conjunction();
        if (hasText(req.getOperator())) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("operator"), req.getOperator()));
        }
        if (hasText(req.getOperationType())) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("operationType"), req.getOperationType()));
        }
        if (hasText(req.getTargetId())) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("targetId"), req.getTargetId()));
        }
        if (hasText(req.getTargetType())) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("targetType"), req.getTargetType()));
        }
        if (req.getOperationStatus() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("operationStatus"), req.getOperationStatus()));
        }
        if (startTime != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("operationTime"), startTime));
        }
        if (endTime != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("operationTime"), endTime));
        }

        Page<AuditLog> page = auditLogRepository.findAll(
                spec,
                PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "operationTime"))
        );

        List<LogGetRes.Auditlog> auditlogs = page.getContent().stream()
                .map(log -> LogGetRes.Auditlog.builder()
                        .operator(log.getOperator())
                        .operationType(log.getOperationType())
                        .operationTime(log.getOperationTime() == null ? null : OPERATION_TIME_FORMATTER.format(log.getOperationTime()))
                        .targetId(log.getTargetId())
                        .targetType(log.getTargetType())
                        .operationStatus(log.getOperationStatus())
                        .errorMsg(log.getErrorMsg())
                        .build())
                .toList();

        return LogGetRes.builder()
                .auditlog(auditlogs)
                .total(page.getTotalElements())
                .pageNo(pageNo)
                .pageSize(pageSize)
                .build();
    }

    private LocalDateTime parseTime(String time, String fieldName) {
        if (!hasText(time)) {
            return null;
        }
        try {
            return LocalDateTime.parse(time, OPERATION_TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " format must be yyyyMMddHHmm");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
