package com.g14.medical_imaging_system.repository;

import com.g14.medical_imaging_system.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    boolean existsByJobNumber(String jobNumber);
}
