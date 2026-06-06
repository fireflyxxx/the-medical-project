package com.g14.medical_imaging_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "inference_result")
public class InferenceResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "result_code", nullable = false, unique = true, length = 32)
    private String resultCode;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false, unique = true)
    private InferenceTask task;

    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "image_id", nullable = false)
    private ImageAsset imageAsset;

    @Column(name = "label", nullable = false, length = 32)
    private String label;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore;

    @Column(name = "bbox_json", nullable = false, columnDefinition = "TEXT")
    private String bboxJson;

    @Column(name = "annotated_img_path", nullable = false, length = 512)
    private String annotatedImgPath;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "modified_bbox_json", columnDefinition = "TEXT")
    private String modifiedBboxJson;

    @Column(name = "modified_label", length = 32)
    private String modifiedLabel;

    @Column(name = "is_modified", nullable = false)
    private Boolean isModified = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modified_by_id")
    private AppUser modifiedBy;

    @Column(name = "modified_time")
    private LocalDateTime modifiedTime;

    @OneToMany(mappedBy = "result")
    private List<DoctorComment> comments = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.createdTime = LocalDateTime.now();
        if (this.isModified == null) {
            this.isModified = false;
        }
    }
}
