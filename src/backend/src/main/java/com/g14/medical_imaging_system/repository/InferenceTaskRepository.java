package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.InferenceTask;
import com.g14.medical_imaging_system.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface InferenceTaskRepository extends JpaRepository<InferenceTask, Long> {
    List<InferenceTask> findByBatchId(String batchId);
    boolean existsByImageAssetStudyCaseEntityIdAndStatus(Long caseId, TaskStatus status);

    boolean existsByImageAssetStudyIdAndStatus(Long studyId, TaskStatus status);

    boolean existsByImageAssetIdAndStatusIn(Long imageId, Collection<TaskStatus> statuses);
}
