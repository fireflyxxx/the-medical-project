package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.imageapi.ImageDto;
import com.g14.medical_imaging_system.service.MedicalPlatformService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/image")
public class ImageController {
    private final MedicalPlatformService medicalPlatformService;

    public ImageController(MedicalPlatformService medicalPlatformService) {
        this.medicalPlatformService = medicalPlatformService;
    }

    @GetMapping("/get/{image_id}")
    public ApiResponse<ImageDto> getImage(@RequestHeader("Authorization") String token,
                                          @PathVariable("image_id") String imageId) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getImage(imageId));
    }

    @GetMapping("/get")
    public ApiResponse<List<ImageDto>> getAllImages(@RequestHeader("Authorization") String token) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getAllImages());
    }

    @GetMapping("/get/{image_id}/jpeg")
    public ApiResponse<String> getImageAsJpegPath(@RequestHeader("Authorization") String token,
                                                  @PathVariable("image_id") String imageId) {
        TokenGuard.requireToken(token);
        return ApiResponse.ok(medicalPlatformService.getImageJpegFormat(imageId));
    }

    @PostMapping("/delete/{image_id}")
    public ApiResponse<Void> deleteImage(@RequestHeader("Authorization") String token,
                                         @PathVariable("image_id") String imageId) {
        TokenGuard.requireToken(token);
        medicalPlatformService.deleteImage(imageId, token);
        return ApiResponse.ok(null);
    }
}
