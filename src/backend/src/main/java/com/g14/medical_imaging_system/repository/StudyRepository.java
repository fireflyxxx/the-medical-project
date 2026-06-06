package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.Study;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudyRepository extends JpaRepository<Study, Long> {
    List<Study> findByCaseEntityId(Long caseId);

    Optional<Study> findByStudyCode(String studyCode);
}
