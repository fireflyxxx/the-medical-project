package com.g14.medical_imaging_system.service;

import com.g14.medical_imaging_system.common.JwtUtils;
import com.g14.medical_imaging_system.dto.modelapi.ModelDto;
import com.g14.medical_imaging_system.entity.CustomAiModel;
import com.g14.medical_imaging_system.repository.CustomAiModelRepository;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CustomAiModelService {

    private final CustomAiModelRepository modelRepository;

    @Value("${medical.ai.models.upload-dir:/data/medical/models/}")
    private String uploadDir;

    public CustomAiModelService(CustomAiModelRepository modelRepository) {
        this.modelRepository = modelRepository;
    }

    public List<ModelDto> getActiveModels() {
        return modelRepository.findByStatusOrderByCreatedTimeDesc("ACTIVE").stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ModelDto> getAllModels() {
        return modelRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public ModelDto updateModelStatus(Long modelId, String status) {
        CustomAiModel model = modelRepository.findById(modelId)
                .orElseThrow(() -> new RuntimeException("模型不存在: " + modelId));
        
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new RuntimeException("非法的状态值，只允许更改为 ACTIVE 或 INACTIVE: " + status);
        }
        
        if ("PENDING".equals(status)) {
            throw new RuntimeException("模型不能手动退回待审批状态");
        }
        
        model.setStatus(status);
        return convertToDto(modelRepository.save(model));
    }

    public ModelDto uploadCustomModel(MultipartFile file,
                                      String modelName,
                                      String modelVersion,
                                      String description,
                                      String algorithmType,
                                      String labelsMapping,
                                      BigDecimal defaultThreshold,
                                      String token) {
        
        Claims claims = JwtUtils.parseToken(token);
        Long uploaderId = claims.get("userId", Number.class).longValue();

        if (file.isEmpty()) {
            throw new RuntimeException("上传的模型文件不能为空");
        }

        // 验证只支持部分算法 (可以去掉或者扩展)
        if (!"faster_rcnn".equalsIgnoreCase(algorithmType) &&
            !"yolov8".equalsIgnoreCase(algorithmType) &&
            !"torchscript".equalsIgnoreCase(algorithmType)) {
            throw new RuntimeException("不支持的算法类型: " + algorithmType);
        }

        try {
            // 建文件夹
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            // 保存文件
            String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
            String safeFileName = UUID.randomUUID().toString() + (ext != null ? "." + ext : ".pt");
            Path targetPath = dirPath.resolve(safeFileName).toAbsolutePath();
            file.transferTo(new File(targetPath.toUri()));

            // 存入数据库
            CustomAiModel model = new CustomAiModel();
            model.setModelName(modelName);
            model.setModelVersion(modelVersion);
            model.setDescription(description);
            model.setAlgorithmType(algorithmType);
            model.setFilePath(targetPath.toString());
            model.setUploaderId(uploaderId);
            model.setLabelsMapping(labelsMapping);
            model.setDefaultThreshold(defaultThreshold);
            model.setStatus("PENDING"); // 默认进入待审批

            CustomAiModel saved = modelRepository.save(model);
            return convertToDto(saved);

        } catch (IOException e) {
            throw new RuntimeException("保存模型文件失败", e);
        }
    }

    private ModelDto convertToDto(CustomAiModel entity) {
        ModelDto dto = new ModelDto();
        dto.setId(entity.getId());
        dto.setModelName(entity.getModelName());
        dto.setModelVersion(entity.getModelVersion());
        dto.setDescription(entity.getDescription());
        dto.setAlgorithmType(entity.getAlgorithmType());
        dto.setLabelsMapping(entity.getLabelsMapping());
        dto.setDefaultThreshold(entity.getDefaultThreshold());
        dto.setStatus(entity.getStatus());
        dto.setCreatedTime(entity.getCreatedTime());
        return dto;
    }
}
