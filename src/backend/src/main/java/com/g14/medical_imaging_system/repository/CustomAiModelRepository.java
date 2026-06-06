package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.CustomAiModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomAiModelRepository extends JpaRepository<CustomAiModel, Long> {
    
    List<CustomAiModel> findByStatusOrderByCreatedTimeDesc(String status);

    Optional<CustomAiModel> findByIdAndStatus(Long id, String status);
    
    // Allows searching by model internal name logic
    Optional<CustomAiModel> findByModelNameAndStatus(String modelName, String status);
}
