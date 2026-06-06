package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.InferenceResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InferenceResultRepository extends JpaRepository<InferenceResult, Long> {
    Optional<InferenceResult> findByResultCode(String resultCode);
    List<InferenceResult> findByTaskBatchId(String batchId);
}
