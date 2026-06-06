package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.inferapi.InferImgReq;
import com.g14.medical_imaging_system.dto.inferapi.InferImgRes;
import com.g14.medical_imaging_system.dto.inferapi.InferenceResultDto;
import com.g14.medical_imaging_system.dto.inferapi.InferBatchReq;
import com.g14.medical_imaging_system.dto.inferapi.BatchStatusRes;
import com.g14.medical_imaging_system.service.MedicalPlatformService;
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

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class InferController {
    private final MedicalPlatformService medicalPlatformService;

    public InferController(MedicalPlatformService medicalPlatformService) {
        this.medicalPlatformService = medicalPlatformService;
    }

    @PostMapping("/image/infer/{image_id}")
    public ApiResponse<InferImgRes> inferImage(@RequestHeader("Authorization") String token,
                                               @PathVariable("image_id") String imageId,
                                               @Valid @RequestBody InferImgReq req) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.inferImage(imageId, req, token));
    }

    @PostMapping({"/ai/infer", "/ai/infer/"})
    public ApiResponse<InferImgRes> inferByAiEndpoint(@RequestHeader("Authorization") String token,
                                                      @Valid @RequestBody InferImgReq req) {
        TokenGuard.requireToken(token);
        Object imageId = req.getParameter() == null ? null : req.getParameter().get("image_id");
        if (imageId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "parameter.image_id is required");
        }
        return ApiResponse.ok(medicalPlatformService.inferImage(String.valueOf(imageId), req, token));
    }

    @PostMapping("/infer_result/{result_id}/doc_bbox/update")
    public ApiResponse<String> updateDocBbox(@RequestHeader("Authorization") String token,
                                             @PathVariable("result_id") String resultId,
                                             @RequestBody com.g14.medical_imaging_system.dto.inferapi.InferResultUpdateReq req) {
        TokenGuard.requireToken(token);
        medicalPlatformService.updateDocBbox(resultId, req, token);
        return ApiResponse.ok("success");
    }

    @PostMapping("/infer_result/get/{result_id}")
    public ApiResponse<InferenceResultDto> getInferResultByPost(@RequestHeader("Authorization") String token,
                                                                @PathVariable("result_id") String resultId) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getInferResult(resultId));
    }

    @PostMapping("/infer/batch")
    public ApiResponse<BatchStatusRes> inferBatch(@RequestHeader("Authorization") String token,
                                                  @Valid @RequestBody InferBatchReq req) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.inferBatch(req, token));
    }

    @GetMapping("/infer/batch/{batchId}/status")
    public ApiResponse<BatchStatusRes> getBatchStatus(@RequestHeader("Authorization") String token,
                                                      @PathVariable("batchId") String batchId) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getBatchStatus(batchId));
    }

    @GetMapping("/infer/batch/{batchId}/result")
    public ApiResponse<com.g14.medical_imaging_system.dto.inferapi.BatchResultRes> getBatchResult(@RequestHeader("Authorization") String token,
                                                                @PathVariable("batchId") String batchId) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getBatchInferResults(batchId));
    }

    @GetMapping("/infer_result/get")
    public ApiResponse<List<InferenceResultDto>> getAllInferResult(@RequestHeader("Authorization") String token) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getAllInferResults());
    }
}
