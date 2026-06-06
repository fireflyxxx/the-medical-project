package com.g14.medical_imaging_system.config;

import com.g14.medical_imaging_system.entity.AppUser;
import com.g14.medical_imaging_system.repository.AppUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AdminUserInitializer implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserInitializer(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (appUserRepository.findByUsername("admin").isEmpty() && !appUserRepository.existsByJobNumber("000000")) {
            AppUser admin = new AppUser();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin12345"));
            admin.setJobNumber("000000");
            admin.setRole("admin");
            appUserRepository.save(admin);
            System.out.println("====== 默认管理员账户创建成功: admin / admin12345 / 工号: 000000 ======");
        }
    }
}
