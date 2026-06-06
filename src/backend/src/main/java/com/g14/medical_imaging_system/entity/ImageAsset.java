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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "image_asset")
@SQLRestriction("is_deleted = false")
public class ImageAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_code", nullable = false, unique = true, length = 32)
    private String imageCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "case_id", nullable = false)
    private PatientCase caseEntity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    private Study study;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", nullable = false, length = 512)
    private String filePath;

    @Column(name = "file_format", nullable = false, length = 16)
    private String fileFormat;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "uploaded_time", nullable = false)
    private LocalDateTime uploadedTime;

    @Column(name = "is_deleted", nullable = false)
    private Boolean deleted = false;

    @OneToMany(mappedBy = "imageAsset")
    private List<InferenceTask> tasks = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.uploadedTime = LocalDateTime.now();
    }
}
