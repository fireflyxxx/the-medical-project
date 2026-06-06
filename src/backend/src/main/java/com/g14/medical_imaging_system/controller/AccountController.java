package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.accountapi.AccCreateReq;
import com.g14.medical_imaging_system.dto.accountapi.AccCreateRes;
import com.g14.medical_imaging_system.dto.accountapi.AccGetRes;
import com.g14.medical_imaging_system.dto.accountapi.AccLoginReq;
import com.g14.medical_imaging_system.dto.accountapi.AccLoginRes;
import com.g14.medical_imaging_system.service.AccountService;
import com.g14.medical_imaging_system.service.AuditLogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/account")
public class AccountController {

    private final AccountService accountService;
    private final AuditLogService auditLogService;

    public AccountController(AccountService accountService, AuditLogService auditLogService) {
        this.accountService = accountService;
        this.auditLogService = auditLogService;
    }

    @PostMapping("/create")
    public ApiResponse<AccCreateRes> createAccount(@RequestHeader(value = "Authorization", required = false) String token,
                                                   @Valid @RequestBody AccCreateReq req) {
        if (token == null || token.isBlank()) {
            auditLogService.log("unknown", "create_user", "user", req.getUsername(), 0, "Missing Authorization Header");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Authorization Header");
        }
        try {
            TokenGuard.requireRole(token, "admin");
        } catch (ResponseStatusException e) {
            auditLogService.logByToken(token, "create_user", "user", req.getUsername(), 0, e.getReason());
            throw e;
        }
        return ApiResponse.ok(accountService.createUser(req, token));
    }

    @PostMapping("/login")
    public ApiResponse<AccLoginRes> login(@Valid @RequestBody AccLoginReq req) {
        return ApiResponse.ok(accountService.login(req));
    }

    @GetMapping("/get")
    public ApiResponse<AccGetRes> getAccounts(@RequestHeader("Authorization") String token) {
        TokenGuard.requireRole(token, "admin");
        return ApiResponse.ok(accountService.getAllUsers());
    }

    @PostMapping("/{user_id}/ban")
    public ApiResponse<Void> banUser(@RequestHeader("Authorization") String token,
                                     @PathVariable("user_id") String userIdStr) {
        try {
            TokenGuard.requireRole(token, "admin");
        } catch (ResponseStatusException e) {
            auditLogService.logByToken(token, "ban_user", "user", userIdStr, 0, e.getReason());
            throw e;
        }

        if (userIdStr == null || !userIdStr.matches("^\\d{6}$")) {
            auditLogService.logByToken(token, "ban_user", "user", userIdStr, 0, "user_id must be 6 digits");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user_id must be 6 digits");
        }

        Long userId = Long.parseLong(userIdStr);
        Long currentUserId = ((Number) com.g14.medical_imaging_system.common.JwtUtils.parseToken(token).get("userId")).longValue();
        if (userId.equals(currentUserId)) {
            auditLogService.logByToken(token, "ban_user", "user", userIdStr, 0, "admin cannot ban self");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin cannot ban self");
        }

        accountService.banUser(userId, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{user_id}/unban")
    public ApiResponse<Void> unbanUser(@RequestHeader("Authorization") String token,
                                       @PathVariable("user_id") String userIdStr) {
        try {
            TokenGuard.requireRole(token, "admin");
        } catch (ResponseStatusException e) {
            auditLogService.logByToken(token, "unban_user", "user", userIdStr, 0, e.getReason());
            throw e;
        }

        if (userIdStr == null || !userIdStr.matches("^\\d{6}$")) {
            auditLogService.logByToken(token, "unban_user", "user", userIdStr, 0, "user_id must be 6 digits");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user_id must be 6 digits");
        }

        Long userId = Long.parseLong(userIdStr);
        Long currentUserId = ((Number) com.g14.medical_imaging_system.common.JwtUtils.parseToken(token).get("userId")).longValue();
        if (userId.equals(currentUserId)) {
            auditLogService.logByToken(token, "unban_user", "user", userIdStr, 0, "admin cannot unban self");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin cannot unban self");
        }

        accountService.unbanUser(userId, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{user_id}/delete")
    public ApiResponse<Void> deleteUser(@RequestHeader("Authorization") String token,
                                        @PathVariable("user_id") String userIdStr) {
        try {
            TokenGuard.requireRole(token, "admin");
        } catch (ResponseStatusException e) {
            auditLogService.logByToken(token, "delete_user", "user", userIdStr, 0, e.getReason());
            throw e;
        }

        if (userIdStr == null || !userIdStr.matches("^\\d{6}$")) {
            auditLogService.logByToken(token, "delete_user", "user", userIdStr, 0, "user_id must be 6 digits");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user_id must be 6 digits");
        }

        Long userId = Long.parseLong(userIdStr);
        Long currentUserId = ((Number) com.g14.medical_imaging_system.common.JwtUtils.parseToken(token).get("userId")).longValue();
        if (userId.equals(currentUserId)) {
            auditLogService.logByToken(token, "delete_user", "user", userIdStr, 0, "admin cannot delete self");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin cannot delete self");
        }

        accountService.deleteUser(userId, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/change_password")
    public ApiResponse<Void> changePassword(@RequestHeader("Authorization") String token,
                                            @Valid @RequestBody com.g14.medical_imaging_system.dto.accountapi.AccChangePwdReq req) {
        TokenGuard.requireToken(token); // Require valid token but any role can change their own password
        Long currentUserId = ((Number) com.g14.medical_imaging_system.common.JwtUtils.parseToken(token).get("userId")).longValue();
        accountService.changePassword(currentUserId, req, token);
        return ApiResponse.ok(null);
    }
}
