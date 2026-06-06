package com.g14.medical_imaging_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "inference_task")
public class InferenceTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_code", nullable = false, unique = true, length = 32)
    private String taskCode;
    
    @Column(name = "batch_id", length = 64)
    private String batchId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_id", nullable = false)
    private ImageAsset imageAsset;

    @Column(name = "model", nullable = false, length = 64)
    private String model;

    @Column(name = "parameter_json", nullable = false, columnDefinition = "TEXT")
    private String parameterJson;

    @Column(name = "operator_token", length = 512)
    private String operatorToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private TaskStatus status;

    @Column(name = "started_time")
    private LocalDateTime startedTime;

    @Column(name = "finished_time")
    private LocalDateTime finishedTime;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @PrePersist
    public void prePersist() {
        this.createdTime = LocalDateTime.now();
    }
}
