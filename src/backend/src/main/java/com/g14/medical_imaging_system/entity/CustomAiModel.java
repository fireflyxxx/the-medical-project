package com.g14.medical_imaging_system.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "custom_ai_model")
public class CustomAiModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false, length = 128)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 64)
    private String modelVersion;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "algorithm_type", nullable = false, length = 64)
    private String algorithmType;

    @Column(name = "file_path", nullable = false, length = 255)
    private String filePath;

    @Column(name = "uploader_id", nullable = false)
    private Long uploaderId;

    @Column(name = "labels_mapping", columnDefinition = "TEXT")
    private String labelsMapping;

    @Column(name = "default_threshold", precision = 5, scale = 4)
    private BigDecimal defaultThreshold;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING"; // 状态：PENDING(待审批), ACTIVE(启用), INACTIVE(停用)

    @Column(name = "created_time", nullable = false, updatable = false)
    private LocalDateTime createdTime;

    @Column(name = "updated_time", nullable = false)
    private LocalDateTime updatedTime;

    @PrePersist
    protected void onCreate() {
        this.createdTime = LocalDateTime.now();
        this.updatedTime = LocalDateTime.now();
        if (this.status == null) {
            this.status = "PENDING";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedTime = LocalDateTime.now();
    }

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAlgorithmType() { return algorithmType; }
    public void setAlgorithmType(String algorithmType) { this.algorithmType = algorithmType; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public Long getUploaderId() { return uploaderId; }
    public void setUploaderId(Long uploaderId) { this.uploaderId = uploaderId; }

    public String getLabelsMapping() { return labelsMapping; }
    public void setLabelsMapping(String labelsMapping) { this.labelsMapping = labelsMapping; }

    public BigDecimal getDefaultThreshold() { return defaultThreshold; }
    public void setDefaultThreshold(BigDecimal defaultThreshold) { this.defaultThreshold = defaultThreshold; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedTime() { return createdTime; }
    public void setCreatedTime(LocalDateTime createdTime) { this.createdTime = createdTime; }

    public LocalDateTime getUpdatedTime() { return updatedTime; }
    public void setUpdatedTime(LocalDateTime updatedTime) { this.updatedTime = updatedTime; }
}
