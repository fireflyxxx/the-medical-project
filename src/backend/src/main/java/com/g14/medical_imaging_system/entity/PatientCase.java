package com.g14.medical_imaging_system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
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
@Table(name = "patient_case")
@SQLRestriction("is_deleted = false")
public class PatientCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @Column(name = "case_code", nullable = false, unique = true, length = 6)
    private String caseCode;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false)
    private Integer gender;

    @Column(nullable = false)
    private Integer age;

    @Column(name = "id_number", nullable = false, length = 32)
    private String idNumber;

    @Column(nullable = false, length = 64)
    private String contact;

    @Column(name = "medical_history", nullable = false, columnDefinition = "TEXT")
    private String medicalHistory;

    @Column(name = "case_desc", columnDefinition = "TEXT")
    private String caseDesc;

    @Column(name = "created_time", nullable = false)
    private LocalDateTime createdTime;

    @Column(name = "updated_time", nullable = false)
    private LocalDateTime updatedTime;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @OneToMany(mappedBy = "caseEntity")
    private List<Study> studies = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdTime = now;
        this.updatedTime = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedTime = LocalDateTime.now();
    }
}
