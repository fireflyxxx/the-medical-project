package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.ImageAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImageAssetRepository extends JpaRepository<ImageAsset, Long> {
    List<ImageAsset> findByStudyIdAndDeletedFalse(Long studyId);

    List<ImageAsset> findByDeletedFalse();

    Optional<ImageAsset> findByImageCodeAndDeletedFalse(String imageCode);
}
