package com.g14.medical_imaging_system.controller;

import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import com.g14.medical_imaging_system.dto.modelapi.ModelDto;
import com.g14.medical_imaging_system.service.CustomAiModelService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/model")
public class ModelController {

    private final CustomAiModelService customAiModelService;

    public ModelController(CustomAiModelService customAiModelService) {
        this.customAiModelService = customAiModelService;
    }

    /**
     * 获取当前所有可用的 AI 模型列表 (用于前端下拉框)
     */
    @GetMapping("/list")
    public ApiResponse<List<ModelDto>> getModelList(@RequestHeader("Authorization") String token) {
        TokenGuard.requireToken(token);
        
        List<ModelDto> activeModels = customAiModelService.getActiveModels();
        return ApiResponse.ok(activeModels);
    }

    /**
     * 获取系统所有的 AI 模型列表 (包括已停用的，用于后台管理)
     */
    @GetMapping("/all")
    public ApiResponse<List<ModelDto>> getAllModels(@RequestHeader("Authorization") String token) {
        TokenGuard.requireToken(token);
        
        List<ModelDto> allModels = customAiModelService.getAllModels();
        return ApiResponse.ok(allModels);
    }

    /**
     * 修改系统 AI 模型状态（启用/停用/审批）
     */
    @PostMapping("/{modelId}/status")
    public ApiResponse<ModelDto> updateModelStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable("modelId") Long modelId,
            @RequestParam("status") String status) {
        TokenGuard.requireRole(token, "admin"); // 限制只有管理员可以改状态
        
        ModelDto dto = customAiModelService.updateModelStatus(modelId, status);
        return ApiResponse.ok(dto);
    }

    /**
     * 科研人员上传自定义 AI 模型文件及配置
     */
    @PostMapping("/upload")
    public ApiResponse<ModelDto> uploadModel(
            @RequestHeader("Authorization") String token,
            @RequestParam("file") MultipartFile file,
            @RequestParam("model_name") String modelName,
            @RequestParam("model_version") String modelVersion,
            @RequestParam("algorithm_type") String algorithmType,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "labels_mapping", required = false) String labelsMapping,
            @RequestParam(value = "default_threshold", required = false) BigDecimal defaultThreshold
    ) {
        TokenGuard.requireRole(token, "tech");
        
        ModelDto dto = customAiModelService.uploadCustomModel(
                file, modelName, modelVersion, description,
                algorithmType, labelsMapping, defaultThreshold, token
        );
        return ApiResponse.ok(dto);
    }
}
