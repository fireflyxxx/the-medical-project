package com.g14.medical_imaging_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operator", nullable = false, length = 64)
    private String operator;

    @Column(name = "operation_type", nullable = false, length = 64)
    private String operationType;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime operationTime;

    @Column(name = "target_id", nullable = false, length = 64)
    private String targetId;

    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    @Column(name = "operation_status", nullable = false)
    private Integer operationStatus;

    @Column(name = "error_msg", length = 512)
    private String errorMsg;

    @PrePersist
    public void prePersist() {
        this.operationTime = LocalDateTime.now();
    }
}
