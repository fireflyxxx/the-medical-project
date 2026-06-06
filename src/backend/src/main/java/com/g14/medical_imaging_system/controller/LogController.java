package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.logapi.LogGetReq;
import com.g14.medical_imaging_system.dto.logapi.LogGetRes;
import com.g14.medical_imaging_system.service.LogService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/log")
public class LogController {
    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    @PostMapping("/get")
    public ApiResponse<LogGetRes> getLogs(@RequestHeader("Authorization") String token,
                                          @Valid @RequestBody(required = false) LogGetReq req) {
        TokenGuard.requireRole(token, "admin");
        LogGetReq safeReq = req == null ? new LogGetReq() : req;
        return ApiResponse.ok(logService.getLogs(safeReq));
    }
}
