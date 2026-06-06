package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.caseapi.CaseCreateReq;
import com.g14.medical_imaging_system.dto.caseapi.CaseCreateRes;
import com.g14.medical_imaging_system.dto.caseapi.CaseDto;
import com.g14.medical_imaging_system.dto.caseapi.CaseUpdateReq;
import com.g14.medical_imaging_system.dto.caseapi.StudyCreateReq;
import com.g14.medical_imaging_system.dto.caseapi.StudyCreateRes;
import com.g14.medical_imaging_system.dto.caseapi.StudyUpdateReq;
import com.g14.medical_imaging_system.dto.imageapi.UploadImageRes;
import com.g14.medical_imaging_system.service.MedicalPlatformService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/cases")
public class CaseController {
    private final MedicalPlatformService medicalPlatformService;

    public CaseController(MedicalPlatformService medicalPlatformService) {
        this.medicalPlatformService = medicalPlatformService;
    }

    @PostMapping("/create")
    public ApiResponse<CaseCreateRes> createCase(@RequestHeader("Authorization") String token,
                                                       @Valid @RequestBody CaseCreateReq req) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.createCase(req, token));
    }

    @GetMapping("/get")
    public ApiResponse<List<CaseDto>> getCases(@RequestHeader("Authorization") String token,
                                               @RequestParam(value = "case_id", required = false) String caseId,
                                               @RequestParam(value = "start_date", required = false) LocalDate startDate,
                                               @RequestParam(value = "end_date", required = false) LocalDate endDate) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getCases(Optional.ofNullable(caseId), Optional.ofNullable(startDate), Optional.ofNullable(endDate), token));
    }

    @PostMapping("/{case_id}/update")
    public ApiResponse<Void> updateCase(@RequestHeader("Authorization") String token,
                                        @PathVariable("case_id") String caseId,
                                        @Valid @RequestBody CaseUpdateReq req) {
        TokenGuard.requireToken(token);
        medicalPlatformService.updateCase(caseId, req, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{case_id}/delete")
    public ApiResponse<Void> deleteCase(@RequestHeader("Authorization") String token,
                                        @PathVariable("case_id") String caseId) {
        TokenGuard.requireToken(token);
        medicalPlatformService.deleteCase(caseId, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/dev/clear_all")
    public ApiResponse<Void> clearAllCases(@RequestHeader("Authorization") String token) {
        TokenGuard.requireToken(token);
        medicalPlatformService.softDeleteAllCases(token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{case_id}/study/create")
    public ApiResponse<StudyCreateRes> createStudy(@RequestHeader("Authorization") String token,
                                                        @PathVariable("case_id") String caseId,
                                                        @Valid @RequestBody StudyCreateReq req) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.createStudy(caseId, req, token));
    }

    @PostMapping("/{case_id}/study/{study_id}/delete")
    public ApiResponse<Void> deleteStudy(@RequestHeader("Authorization") String token,
                                         @PathVariable("case_id") String caseId,
                                         @PathVariable("study_id") String studyId) {
        TokenGuard.requireToken(token);
        medicalPlatformService.deleteStudy(caseId, studyId, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{case_id}/study/{study_id}/update")
    public ApiResponse<Void> updateStudy(@RequestHeader("Authorization") String token,
                                         @PathVariable("case_id") String caseId,
                                         @PathVariable("study_id") String studyId,
                                         @Valid @RequestBody StudyUpdateReq req) {
        TokenGuard.requireToken(token);
        medicalPlatformService.updateStudy(caseId, studyId, req, token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{case_id}/study/{study_id}/upload_image")
    public ApiResponse<UploadImageRes> uploadImages(@RequestHeader("Authorization") String token,
                                                    @PathVariable("case_id") String caseId,
                                                    @PathVariable("study_id") String studyId,
                                                    @RequestPart("images") MultipartFile[] images) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.uploadImages(caseId, studyId, images, token));
    }
}
