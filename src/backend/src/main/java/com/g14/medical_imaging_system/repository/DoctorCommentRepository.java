package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.DoctorComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorCommentRepository extends JpaRepository<DoctorComment, Long> {
    List<DoctorComment> findByResultIdOrderByCreatedTimeDesc(Long resultId);
}
