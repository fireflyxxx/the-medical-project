package com.g14.medical_imaging_system.dto.modelapi;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ModelDto {
    private Long id;
    private String modelName;
    private String modelVersion;
    private String description;
    private String algorithmType;
    private String labelsMapping;
    private BigDecimal defaultThreshold;
    private String status; // 'PENDING', 'ACTIVE', 'INACTIVE'
    private LocalDateTime createdTime;

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

    public String getLabelsMapping() { return labelsMapping; }
    public void setLabelsMapping(String labelsMapping) { this.labelsMapping = labelsMapping; }

    public BigDecimal getDefaultThreshold() { return defaultThreshold; }
    public void setDefaultThreshold(BigDecimal defaultThreshold) { this.defaultThreshold = defaultThreshold; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedTime() { return createdTime; }
    public void setCreatedTime(LocalDateTime createdTime) { this.createdTime = createdTime; }
}
