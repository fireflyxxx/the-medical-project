package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.commentapi.CommentCreateReq;
import com.g14.medical_imaging_system.dto.commentapi.CommentCreateRes;
import com.g14.medical_imaging_system.service.MedicalPlatformService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/infer_result")
public class CommentController {
    private final MedicalPlatformService medicalPlatformService;

    public CommentController(MedicalPlatformService medicalPlatformService) {
        this.medicalPlatformService = medicalPlatformService;
    }

    @PostMapping("/{result_id}/comment/create")
    public ApiResponse<CommentCreateRes> createComment(@RequestHeader("Authorization") String token,
                                                       @PathVariable("result_id") String resultId,
                                                       @Valid @RequestBody CommentCreateReq req) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.createComment(resultId, req, token));
    }

    @PostMapping("/{result_id}/comment/{comment_id}/delete")
    public ApiResponse<Void> deleteComment(@RequestHeader("Authorization") String token,
                                           @PathVariable("result_id") String resultId,
                                           @PathVariable("comment_id") String commentId) {
        TokenGuard.requireToken(token);
        medicalPlatformService.deleteComment(resultId, commentId, token);
        return ApiResponse.ok(null);
    }
}
