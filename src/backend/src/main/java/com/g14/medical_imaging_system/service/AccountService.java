package com.g14.medical_imaging_system.service;

import com.g14.medical_imaging_system.common.JwtUtils;
import com.g14.medical_imaging_system.dto.accountapi.AccCreateReq;
import com.g14.medical_imaging_system.dto.accountapi.AccCreateRes;
import com.g14.medical_imaging_system.dto.accountapi.AccGetRes;
import com.g14.medical_imaging_system.dto.accountapi.AccLoginReq;
import com.g14.medical_imaging_system.dto.accountapi.AccLoginRes;
import com.g14.medical_imaging_system.entity.AppUser;
import com.g14.medical_imaging_system.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AccountService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AccountService(AppUserRepository appUserRepository,
                          PasswordEncoder passwordEncoder,
                          AuditLogService auditLogService) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    public AccCreateRes createUser(AccCreateReq req, String token) {
        try {
            if (appUserRepository.findByUsername(req.getUsername()).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
            }

            if (appUserRepository.existsByJobNumber(req.getJobNumber())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "job_number already exists");
            }

            AppUser user = new AppUser();
            user.setUsername(req.getUsername());
            user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
            user.setJobNumber(req.getJobNumber());
            user.setRole(req.getRole());
            user.setStatus("ACTIVE");

            user = appUserRepository.save(user);
            auditLogService.logByToken(token, "create_user", "user", String.valueOf(user.getId()), 1, null);
            return AccCreateRes.builder().userId(user.getId()).build();
        } catch (RuntimeException e) {
            auditLogService.logByToken(token, "create_user", "user", req.getUsername(), 0, e.getMessage());
            throw e;
        }
    }

    public AccLoginRes login(AccLoginReq req) {
        try {
            AppUser user = appUserRepository.findByUsername(req.getUsername())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

            if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
            }

            if ("BANNED".equalsIgnoreCase(user.getStatus())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is banned");
            }

            String token = JwtUtils.generateToken(user.getId(), user.getUsername(), user.getRole());
            auditLogService.log(user.getUsername(), "login", "user", String.valueOf(user.getId()), 1, null);

            return AccLoginRes.builder()
                    .token(token)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .role(user.getRole())
                    .build();
        } catch (RuntimeException e) {
            auditLogService.log(req.getUsername(), "login", "user", req.getUsername(), 0, e.getMessage());
            throw e;
        }
    }

    public AccGetRes getAllUsers() {
        List<AccGetRes.UserDto> users = appUserRepository.findAll().stream()
                .map(user -> AccGetRes.UserDto.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .role(user.getRole())
                        .status(user.getStatus())
                        .createdTime(user.getCreatedTime() != null ? user.getCreatedTime().toString() : null)
                        .build())
                .collect(Collectors.toList());

        return AccGetRes.builder().users(users).build();
    }

    public void banUser(Long userId, String token) {
        try {
            AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            user.setStatus("BANNED");
            appUserRepository.save(user);
            auditLogService.logByToken(token, "ban_user", "user", String.valueOf(userId), 1, null);
        } catch (RuntimeException e) {
            auditLogService.logByToken(token, "ban_user", "user", String.valueOf(userId), 0, e.getMessage());
            throw e;
        }
    }

    public void unbanUser(Long userId, String token) {
        try {
            AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            user.setStatus("ACTIVE");
            appUserRepository.save(user);
            auditLogService.logByToken(token, "unban_user", "user", String.valueOf(userId), 1, null);
        } catch (RuntimeException e) {
            auditLogService.logByToken(token, "unban_user", "user", String.valueOf(userId), 0, e.getMessage());
            throw e;
        }
    }

    public void deleteUser(Long userId, String token) {
        try {
            AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            
            if ("admin".equalsIgnoreCase(user.getRole())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin accounts cannot be deleted");
            }
            
            appUserRepository.delete(user);
            auditLogService.logByToken(token, "delete_user", "user", String.valueOf(userId), 1, null);
        } catch (RuntimeException e) {
            auditLogService.logByToken(token, "delete_user", "user", String.valueOf(userId), 0, e.getMessage());
            throw e;
        }
    }

    public void changePassword(Long userId, com.g14.medical_imaging_system.dto.accountapi.AccChangePwdReq req, String token) {
        try {
            AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "旧密码错误 / Incorrect old password");
            }

            if (req.getOldPassword().equals(req.getNewPassword())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "新密码不能与旧密码相同 / New password cannot be the same as old");
            }

            user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
            appUserRepository.save(user);
            auditLogService.logByToken(token, "change_password", "user", String.valueOf(userId), 1, null);
        } catch (RuntimeException e) {
            auditLogService.logByToken(token, "change_password", "user", String.valueOf(userId), 0, e.getMessage());
            throw e;
        }
    }
}
