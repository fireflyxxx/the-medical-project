package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.PatientCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface PatientCaseRepository extends JpaRepository<PatientCase, Long> {
    Optional<PatientCase> findByCaseCode(String caseCode);
    List<PatientCase> findByCreatorId(Long creatorId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM patient_case", nativeQuery = true)
    void physicallyDeleteAllCases();
}
