package com.g14.medical_imaging_system.service;

import com.g14.medical_imaging_system.dto.caseapi.CaseCreateReq;
import com.g14.medical_imaging_system.dto.caseapi.CaseCreateRes;
import com.g14.medical_imaging_system.dto.caseapi.CaseDto;
import com.g14.medical_imaging_system.dto.caseapi.CaseUpdateReq;
import com.g14.medical_imaging_system.dto.caseapi.StudyCreateReq;
import com.g14.medical_imaging_system.dto.caseapi.StudyCreateRes;
import com.g14.medical_imaging_system.dto.caseapi.StudyDto;
import com.g14.medical_imaging_system.dto.caseapi.StudyPayload;
import com.g14.medical_imaging_system.dto.caseapi.StudyUpdateReq;
import com.g14.medical_imaging_system.dto.commentapi.CommentCreateReq;
import com.g14.medical_imaging_system.dto.commentapi.CommentCreateRes;
import com.g14.medical_imaging_system.dto.imageapi.ImageDto;
import com.g14.medical_imaging_system.dto.imageapi.UploadImageRes;
import com.g14.medical_imaging_system.dto.inferapi.CommentDto;
import com.g14.medical_imaging_system.dto.inferapi.InferImgReq;
import com.g14.medical_imaging_system.dto.inferapi.InferImgRes;
import com.g14.medical_imaging_system.dto.inferapi.InferenceResultDto;
import com.g14.medical_imaging_system.entity.DoctorComment;
import com.g14.medical_imaging_system.entity.ImageAsset;
import com.g14.medical_imaging_system.entity.InferenceResult;
import com.g14.medical_imaging_system.entity.InferenceTask;
import com.g14.medical_imaging_system.entity.PatientCase;
import com.g14.medical_imaging_system.entity.Study;
import com.g14.medical_imaging_system.entity.TaskStatus;
import com.g14.medical_imaging_system.repository.DoctorCommentRepository;
import com.g14.medical_imaging_system.repository.ImageAssetRepository;
import com.g14.medical_imaging_system.repository.InferenceResultRepository;
import com.g14.medical_imaging_system.repository.InferenceTaskRepository;
import com.g14.medical_imaging_system.repository.PatientCaseRepository;
import com.g14.medical_imaging_system.repository.StudyRepository;
import com.g14.medical_imaging_system.service.mq.InferenceQueueProducer;
import com.g14.medical_imaging_system.dto.inferapi.InferBatchReq;
import com.g14.medical_imaging_system.dto.inferapi.BatchStatusRes;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MedicalPlatformService {
    private static final String ACTION_CREATE_CASE = "create_case";
    private static final String ACTION_UPDATE_CASE = "update_case";
    private static final String ACTION_DELETE_CASE = "delete_case";
    private static final String ACTION_CREATE_STUDY = "create_study";
    private static final String ACTION_UPDATE_STUDY = "update_study";
    private static final String ACTION_DELETE_STUDY = "delete_study";
    private static final String ACTION_UPLOAD_IMAGE = "upload_image";
    private static final String ACTION_DELETE_IMAGE = "delete_image";
    private static final String ACTION_INFER_IMAGE = "infer_image";
    private static final String ACTION_CREATE_COMMENT = "create_comment";
    private static final String ACTION_DELETE_COMMENT = "delete_comment";

    private final PatientCaseRepository patientCaseRepository;
    private final StudyRepository studyRepository;
    private final ImageAssetRepository imageAssetRepository;
    private final InferenceTaskRepository inferenceTaskRepository;
    private final InferenceResultRepository inferenceResultRepository;
    private final DoctorCommentRepository doctorCommentRepository;
    private final com.g14.medical_imaging_system.repository.AppUserRepository appUserRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final InferenceQueueProducer inferenceQueueProducer;
    private final Path uploadRoot = Paths.get("uploads");

    @Value("${medical.ai.service.url}")
    private String aiServiceUrl;

    @Autowired
    private org.springframework.core.env.Environment env;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private com.g14.medical_imaging_system.repository.CustomAiModelRepository customAiModelRepository;

    private String resolveAiUrl(String modelName) {
        if (modelName == null || modelName.trim().isEmpty()) {
            return this.aiServiceUrl;
        }
        
        try {
            Long modelId = Long.parseLong(modelName.trim());
            com.g14.medical_imaging_system.entity.CustomAiModel model = customAiModelRepository.findById(modelId).orElse(null);
            if (model != null) {
                String baseUrl = this.aiServiceUrl.endsWith("/") ? this.aiServiceUrl.substring(0, this.aiServiceUrl.length() - 1) : this.aiServiceUrl;
                return baseUrl + "/predict/" + model.getId() + 
                       "?algo_type=" + model.getAlgorithmType() +
                       "&weights_path=" + model.getFilePath();
            }
        } catch (Exception e) {
            // Fallback for non-numeric model names
        }

        String dynamicUrl = env.getProperty("medical.ai.models.routing." + modelName.trim());
        if (dynamicUrl != null && !dynamicUrl.trim().isEmpty()) {
            return dynamicUrl.trim();
        }
        return this.aiServiceUrl;
    }

    public MedicalPlatformService(PatientCaseRepository patientCaseRepository,
                                  StudyRepository studyRepository,
                                  ImageAssetRepository imageAssetRepository,
                                  InferenceTaskRepository inferenceTaskRepository,
                                  InferenceResultRepository inferenceResultRepository,
                                  DoctorCommentRepository doctorCommentRepository,
                                  com.g14.medical_imaging_system.repository.AppUserRepository appUserRepository,
                                  AuditLogService auditLogService,
                                  ObjectMapper objectMapper,
                                  InferenceQueueProducer inferenceQueueProducer) {
        this.patientCaseRepository = patientCaseRepository;
        this.studyRepository = studyRepository;
        this.imageAssetRepository = imageAssetRepository;
        this.inferenceTaskRepository = inferenceTaskRepository;
        this.inferenceResultRepository = inferenceResultRepository;
        this.doctorCommentRepository = doctorCommentRepository;
        this.appUserRepository = appUserRepository;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
        this.inferenceQueueProducer = inferenceQueueProducer;
    }

    @Transactional
    public CaseCreateRes createCase(CaseCreateReq req, String token) {
        String targetId = "N/A";
        try {
            Long currentUserId = com.g14.medical_imaging_system.common.TokenGuard.getUserId(token);
            PatientCase patientCase = new PatientCase();
            patientCase.setName(req.getName());
            patientCase.setGender(req.getGender());
            patientCase.setAge(req.getAge());
            patientCase.setIdNumber(req.getIdNumber());
            patientCase.setContact(req.getContact());
            patientCase.setMedicalHistory(req.getMedicalHistory());
            patientCase.setCaseDesc(req.getCaseDesc());
            patientCase.setCreatorId(currentUserId);
            patientCase.setCaseCode(UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase());

            patientCase = patientCaseRepository.save(patientCase);
            targetId = patientCase.getCaseCode();

            if (req.getStudys() != null) {
                for (StudyPayload payload : req.getStudys()) {
                    createStudyInternal(patientCase, payload);
                }
            }
            writeAudit(token, ACTION_CREATE_CASE, "case", patientCase.getCaseCode(), null);
            return CaseCreateRes.builder().caseId(patientCase.getCaseCode()).build();
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_CREATE_CASE, "case", targetId, e);
            throw e;
        }
    }

    public List<CaseDto> getCases(Optional<String> caseId, Optional<LocalDate> startDate, Optional<LocalDate> endDate, String token) {
        Long currentUserId = com.g14.medical_imaging_system.common.TokenGuard.getUserId(token);
        String currentRole = com.g14.medical_imaging_system.common.TokenGuard.getRole(token);

        return patientCaseRepository.findAll().stream()
                .filter(pc -> caseId.map(id -> id.equals(pc.getCaseCode()) || id.equals(pc.getId().toString())).orElse(true))
                .filter(pc -> startDate.map(start -> !pc.getCreatedTime().toLocalDate().isBefore(start)).orElse(true))
                .filter(pc -> endDate.map(end -> !pc.getCreatedTime().toLocalDate().isAfter(end)).orElse(true))
                .filter(pc -> {
                    if ("tech".equals(currentRole) || "admin".equals(currentRole)) {
                        return true;
                    }
                    if ("doctor".equals(currentRole)) {
                        return currentUserId != null && currentUserId.equals(pc.getCreatorId());
                    }
                    return false;
                })
                .map(this::toCaseDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateCase(String caseId, CaseUpdateReq req, String token) {
        String targetId = caseId;
        try {
            PatientCase patientCase = resolveCase(caseId);
            targetId = patientCase.getCaseCode();
            if (req.getName() != null) {
                patientCase.setName(req.getName());
            }
            if (req.getGender() != null) {
                patientCase.setGender(req.getGender());
            }
            if (req.getAge() != null) {
                patientCase.setAge(req.getAge());
            }
            if (req.getIdNumber() != null) {
                patientCase.setIdNumber(req.getIdNumber());
            }
            if (req.getContact() != null) {
                patientCase.setContact(req.getContact());
            }
            if (req.getMedicalHistory() != null) {
                patientCase.setMedicalHistory(req.getMedicalHistory());
            }
            if (req.getCaseDesc() != null) {
                patientCase.setCaseDesc(req.getCaseDesc());
            }
            patientCase.setUpdatedTime(LocalDateTime.now());
            patientCaseRepository.save(patientCase);

            if (req.getStudys() != null && !req.getStudys().isEmpty()) {
                for (StudyPayload payload : req.getStudys()) {
                    createStudyInternal(patientCase, payload);
                }
            }
            writeAudit(token, ACTION_UPDATE_CASE, "case", patientCase.getCaseCode(), null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_UPDATE_CASE, "case", targetId, e);
            throw e;
        }
    }

    @Transactional
    public void deleteCase(String caseId, String token) {
        String targetId = caseId;
        try {
            PatientCase patientCase = resolveCase(caseId);
            targetId = patientCase.getCaseCode();
            boolean hasRunning = inferenceTaskRepository.existsByImageAssetStudyCaseEntityIdAndStatus(patientCase.getId(), TaskStatus.RUNNING);
            if (hasRunning) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "AI inference task is running, please retry later");
            }
            patientCase.setIsDeleted(true);
            patientCaseRepository.save(patientCase);
            for (Study study : patientCase.getStudies()) {
                study.setIsDeleted(true);
                studyRepository.save(study);
                for (ImageAsset img : study.getImages()) {
                    img.setDeleted(true);
                    imageAssetRepository.save(img);
                }
            }
            writeAudit(token, ACTION_DELETE_CASE, "case", patientCase.getCaseCode(), null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_DELETE_CASE, "case", targetId, e);
            throw e;
        }
    }

    @Transactional
    public void softDeleteAllCases(String token) {
        try {
            List<PatientCase> allCases = patientCaseRepository.findAll();
            for (PatientCase patientCase : allCases) {
                patientCase.setIsDeleted(true);
                patientCaseRepository.save(patientCase);
                for (Study study : patientCase.getStudies()) {
                    study.setIsDeleted(true);
                    studyRepository.save(study);
                    for (ImageAsset img : study.getImages()) {
                        img.setDeleted(true);
                        imageAssetRepository.save(img);
                    }
                }
            }
            writeAudit(token, "clear_all_case", "system", "ALL_CASES", null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, "clear_all_case", "system", "ALL_CASES", e);
            throw e;
        }
    }

    @Transactional
    public StudyCreateRes createStudy(String caseId, StudyCreateReq req, String token) {
        String targetId = caseId;
        try {
            PatientCase patientCase = resolveCase(caseId);
            targetId = patientCase.getCaseCode();
            if (req.getStudys() == null || req.getStudys().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "studys is required");
            }
            List<StudyDto> result = new ArrayList<>();
            for (StudyPayload payload : req.getStudys()) {
                Study study = createStudyInternal(patientCase, payload);
                result.add(toStudyDto(study));
            }
            writeAudit(token, ACTION_CREATE_STUDY, "case", patientCase.getCaseCode(), null);
            return StudyCreateRes.builder().study(result).build();
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_CREATE_STUDY, "case", targetId, e);
            throw e;
        }
    }

    @Transactional
    public void updateStudy(String caseId, String studyId, StudyUpdateReq req, String token) {
        String targetId = studyId;
        try {
            PatientCase patientCase = resolveCase(caseId);
            Study study = resolveStudy(studyId);
            targetId = study.getStudyCode();
            if (!study.getCaseEntity().getId().equals(patientCase.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "study does not belong to case");
            }
            StudyPayload payload = req.getStudy();
            if (payload.getStudyTime() != null) {
                study.setStudyTime(payload.getStudyTime());
            }
            if (payload.getStudyType() != null) {
                study.setStudyType(payload.getStudyType());
            }
            if (payload.getStudyDesc() != null) {
                study.setStudyDesc(payload.getStudyDesc());
            }
            study.setUpdatedTime(LocalDateTime.now());
            studyRepository.save(study);
            writeAudit(token, ACTION_UPDATE_STUDY, "study", study.getStudyCode(), null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_UPDATE_STUDY, "study", targetId, e);
            throw e;
        }
    }

    @Transactional
    public void deleteStudy(String caseId, String studyId, String token) {
        String targetId = studyId;
        try {
            PatientCase patientCase = resolveCase(caseId);
            Study study = resolveStudy(studyId);
            targetId = study.getStudyCode();
            if (!study.getCaseEntity().getId().equals(patientCase.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "study does not belong to case");
            }
            boolean hasRunning = inferenceTaskRepository.existsByImageAssetStudyIdAndStatus(study.getId(), TaskStatus.RUNNING);
            if (hasRunning) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "AI inference task is running, please retry later");
            }

            study.setIsDeleted(true);
            studyRepository.save(study);
            for (ImageAsset img : study.getImages()) {
                img.setDeleted(true);
                imageAssetRepository.save(img);
            }
            writeAudit(token, ACTION_DELETE_STUDY, "study", study.getStudyCode(), null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_DELETE_STUDY, "study", targetId, e);
            throw e;
        }
    }

    @Transactional
    public UploadImageRes uploadImages(String caseId, String studyId, MultipartFile[] images, String token) {
        String targetId = studyId;
        try {
            PatientCase patientCase = resolveCase(caseId);
            Study study = resolveStudy(studyId);
            targetId = study.getStudyCode();
            if (!study.getCaseEntity().getId().equals(patientCase.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "study does not belong to case");
            }
            if (images == null || images.length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "images is required");
            }
            // 检查总大小不超过 50MB，单张不超过 5MB
            long totalSize = 0;
            for (MultipartFile file : images) {
                totalSize += file.getSize();
                if (file.getSize() > 5 * 1024 * 1024) {
                    throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "单张图片不超过5MB");
                }
            }
            if (totalSize > 50 * 1024 * 1024) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "批量上传总量不超过50MB");
            }
            ensureUploadDir();
            List<String> imageIds = new ArrayList<>();
            for (MultipartFile file : images) {
                String originalName = file.getOriginalFilename() == null ? "unknown" : file.getOriginalFilename();
                String ext = getExtension(originalName);
                if (!isAllowedFormat(ext)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PNG/JPG/DICOM formats are supported");
                }
                
                boolean isDicom = ext.toLowerCase(Locale.ROOT).equals("dcm") || ext.toLowerCase(Locale.ROOT).equals("dicom");
                String finalExt = isDicom ? "jpg" : ext;
                String storedName = UUID.randomUUID() + "." + finalExt;
                Path target = uploadRoot.resolve(storedName);
                
                try {
                    if (isDicom) {
                        try (java.io.InputStream is = file.getInputStream();
                             javax.imageio.stream.ImageInputStream iis = javax.imageio.ImageIO.createImageInputStream(is)) {
                            java.util.Iterator<javax.imageio.ImageReader> iter = javax.imageio.ImageIO.getImageReadersByFormatName("DICOM");
                            if (!iter.hasNext()) {
                                throw new UnsupportedOperationException("No DICOM Reader found.");
                            }
                            javax.imageio.ImageReader reader = iter.next();
                            reader.setInput(iis, false);
                            java.awt.image.BufferedImage bi = reader.read(0);
                            if (bi == null) {
                                throw new RuntimeException("Failed to decode DICOM image");
                            }
                            java.awt.image.BufferedImage rgb = new java.awt.image.BufferedImage(
                                bi.getWidth(), bi.getHeight(), java.awt.image.BufferedImage.TYPE_3BYTE_BGR);
                            rgb.getGraphics().drawImage(bi, 0, 0, null);
                            rgb.getGraphics().dispose();
                            javax.imageio.ImageIO.write(rgb, "JPEG", target.toFile());
                        }
                    } else {
                        file.transferTo(target);
                    }
                } catch (Exception e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Image upload or conversion failed: " + e.getMessage());
                }

                ImageAsset imageAsset = new ImageAsset();
                imageAsset.setCaseEntity(patientCase);
                imageAsset.setStudy(study);
                
                // If it was DCM, we've converted it and stored it as JPG
                if (isDicom) {
                    String nameWithoutExt = originalName;
                    int lastDot = originalName.lastIndexOf('.');
                    if (lastDot > 0) {
                        nameWithoutExt = originalName.substring(0, lastDot);
                    }
                    imageAsset.setFileName(nameWithoutExt + ".jpg");
                    imageAsset.setFileFormat("JPG");
                } else {
                    imageAsset.setFileName(originalName);
                    imageAsset.setFileFormat(ext.toUpperCase(Locale.ROOT));
                }
                
                imageAsset.setFilePath(target.toString());
                imageAsset.setFileSize(file.getSize());
                imageAsset.setImageCode("IMG" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
                imageAsset = imageAssetRepository.save(imageAsset);
                imageIds.add(imageAsset.getImageCode());
            }
            writeAudit(token, ACTION_UPLOAD_IMAGE, "study", study.getStudyCode(), null);
            return UploadImageRes.builder().imageIds(imageIds).build();
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_UPLOAD_IMAGE, "study", targetId, e);
            throw e;
        }
    }

    public ImageDto getImage(String imageId) {
        return toImageDto(resolveImage(imageId));
    }

    public String getImageJpegFormat(String imageId) {
        ImageAsset imageAsset = resolveImage(imageId);
        String originalFileUrl = "/" + imageAsset.getFilePath().replace("\\", "/");
        if (originalFileUrl.startsWith("//")) {
            originalFileUrl = originalFileUrl.substring(1);
        }
        return originalFileUrl;
    }

    public List<ImageDto> getAllImages() {
        return imageAssetRepository.findByDeletedFalse().stream()
                .map(this::toImageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteImage(String imageId, String token) {
        String targetId = imageId;
        try {
            ImageAsset imageAsset = resolveImage(imageId);
            targetId = imageAsset.getImageCode();
            Collection<TaskStatus> processing = List.of(TaskStatus.PENDING, TaskStatus.RUNNING);
            boolean busy = inferenceTaskRepository.existsByImageAssetIdAndStatusIn(imageAsset.getId(), processing);
            if (busy) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Image is being processed and cannot be deleted");
            }
            imageAsset.setDeleted(true);
            imageAssetRepository.save(imageAsset);
            writeAudit(token, ACTION_DELETE_IMAGE, "image", imageAsset.getImageCode(), null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_DELETE_IMAGE, "image", targetId, e);
            throw e;
        }
    }

    @Transactional
    public InferImgRes inferImage(String imageId, InferImgReq req, String token) {
        String targetId = imageId;
        try {
            ImageAsset imageAsset = resolveImage(imageId);
            targetId = imageAsset.getImageCode();
            
            // 构造 Redis 缓存 Key: infer:{imageId}:{modelName}:{threshold}
            String thresholdStr = "default";
            if (req.getParameter() != null && req.getParameter().containsKey("threshold")) {
                thresholdStr = String.valueOf(req.getParameter().get("threshold"));
            }
            String cacheKey = "infer:cache:" + imageAsset.getId() + ":" + req.getModel() + ":" + thresholdStr;

            // 1. 判断是否能命中缓存
            String cachedResultJson = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cachedResultJson != null) {
                // 缓存命中！记录日志并直接返回
                writeAudit(token, ACTION_INFER_IMAGE, "image", imageAsset.getImageCode(), "{\"cached\":true}");
                InferenceResultDto cachedDto = objectMapper.readValue(cachedResultJson, InferenceResultDto.class);
                return InferImgRes.builder().inferResult(cachedDto).build();
            }

            Collection<TaskStatus> processing = List.of(TaskStatus.PENDING, TaskStatus.RUNNING);
            if (inferenceTaskRepository.existsByImageAssetIdAndStatusIn(imageAsset.getId(), processing)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The image is already being processed, please do not resubmit.");
            }

            InferenceTask task = new InferenceTask();
            task.setImageAsset(imageAsset);
            task.setModel(req.getModel());
            task.setParameterJson(toJson(req.getParameter()));
            task.setStatus(TaskStatus.PENDING);
            task.setTaskCode("TASK" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
            task.setStartedTime(LocalDateTime.now());
            task.setStatus(TaskStatus.RUNNING);
            task = inferenceTaskRepository.save(task);

            double confidence = 0.0;
            String label = "Normal";
            String bboxStr = "{}";

            try {
                org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
                requestFactory.setConnectTimeout(60000);
                requestFactory.setReadTimeout(300000);
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate(requestFactory);
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

                org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
                body.add("file", new org.springframework.core.io.FileSystemResource(new java.io.File(imageAsset.getFilePath())));

                org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(body, headers);

                String aiUrl = resolveAiUrl(req.getModel());
                if (req.getParameter() != null && req.getParameter().containsKey("threshold")) {
                    aiUrl += (aiUrl.contains("?") ? "&" : "?") + "threshold=" + req.getParameter().get("threshold");
                }

                org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity(aiUrl, requestEntity, String.class);
                Map<String, Object> responseMap = objectMapper.readValue(response.getBody(), new TypeReference<Map<String, Object>>() {});
                List<Map<String, Object>> predictions = (List<Map<String, Object>>) responseMap.get("predictions");

                if (predictions != null && !predictions.isEmpty()) {
                    Map<String, Object> bestPred = predictions.get(0);
                    confidence = ((Number) bestPred.get("probability")).doubleValue();
                    label = (String) bestPred.get("class");

                    List<Map<String, Double>> allBboxes = new ArrayList<>();
                    for (Map<String, Object> pred : predictions) {
                        List<Number> boxList = (List<Number>) pred.get("bbox");
                        if (boxList != null && boxList.size() >= 4) {
                            Map<String, Double> boxMap = new HashMap<>();
                            boxMap.put("x1", boxList.get(0).doubleValue());
                            boxMap.put("y1", boxList.get(1).doubleValue());
                            boxMap.put("x2", boxList.get(2).doubleValue());
                            boxMap.put("y2", boxList.get(3).doubleValue());
                            allBboxes.add(boxMap);
                        }
                    }
                    bboxStr = toJson(allBboxes);
                }
                task.setStatus(TaskStatus.SUCCESS);
            } catch (Exception e) {
                e.printStackTrace();
                task.setStatus(TaskStatus.FAILED);
                String msg = e.getMessage();
                task.setErrorMessage(msg != null && msg.length() > 250 ? msg.substring(0, 250) : msg);
                label = "Error";
                bboxStr = "{}";
            }

            InferenceResult result = new InferenceResult();
            result.setTask(task);
            result.setImageAsset(imageAsset);
            result.setLabel(label);
            result.setConfidenceScore(confidence);
            result.setBboxJson(bboxStr);

            String originalFileUrl = "/" + imageAsset.getFilePath().replace("\\", "/");
            if (originalFileUrl.startsWith("//")) {
                originalFileUrl = originalFileUrl.substring(1);
            }
            result.setAnnotatedImgPath(originalFileUrl);
            result.setResultCode("RES" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
            result = inferenceResultRepository.save(result);

            task.setFinishedTime(LocalDateTime.now());
            task.setDurationMs(Math.max(100L, java.time.Duration.between(task.getStartedTime(), task.getFinishedTime()).toMillis()));
            inferenceTaskRepository.save(task);

            if (TaskStatus.SUCCESS.equals(task.getStatus())) {
                writeAudit(token, ACTION_INFER_IMAGE, "image", imageAsset.getImageCode(), null);
                
                // 将成功的结果存入 Redis，设置 7 天有效期
                InferenceResultDto dtoToCache = toInferenceResultDto(result);
                stringRedisTemplate.opsForValue().set(cacheKey, toJson(dtoToCache), 7, java.util.concurrent.TimeUnit.DAYS);
            } else {
                String errorMsg = task.getErrorMessage() == null ? "inference failed" : task.getErrorMessage();
                writeAuditFailure(token, ACTION_INFER_IMAGE, "image", imageAsset.getImageCode(), new RuntimeException(errorMsg));
            }
            return InferImgRes.builder().inferResult(toInferenceResultDto(result)).build();
        } catch (Exception e) {
            writeAuditFailure(token, ACTION_INFER_IMAGE, "image", targetId, new RuntimeException(e));
            throw new RuntimeException(e);
        }
    }

    @Transactional
    public void updateDocBbox(String resultId, com.g14.medical_imaging_system.dto.inferapi.InferResultUpdateReq req, String token) {
        try {
            Long userId = com.g14.medical_imaging_system.common.TokenGuard.getUserId(token);
            com.g14.medical_imaging_system.entity.AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

            InferenceResult result = inferenceResultRepository.findByResultCode(resultId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inference result not found"));

            if (req.getDocBbox() == null) {
                result.setModifiedBboxJson(null);
                result.setIsModified(false);
            } else {
                result.setModifiedBboxJson(toJson(req.getDocBbox()));
                result.setIsModified(true);
            }
            
            result.setModifiedBy(user);
            result.setModifiedTime(LocalDateTime.now());
            
            inferenceResultRepository.save(result);
            
            writeAudit(token, "update_doc_bbox", "image", result.getImageAsset().getImageCode(), "{\"resultCode\":\"" + resultId + "\"}");

        } catch (RuntimeException e) {
            writeAuditFailure(token, "update_doc_bbox", "result", resultId, e);
            throw e;
        }
    }

    @Transactional
    public BatchStatusRes inferBatch(InferBatchReq req, String token) {
        String batchId = UUID.randomUUID().toString();
        List<Long> taskIdsToQueue = new ArrayList<>();
        for (String imageId : req.getImageIds()) {
            ImageAsset imageAsset;
            try {
                imageAsset = resolveImage(imageId);
            } catch (Exception e) {
                continue;
            }
            if (imageAsset == null || imageAsset.getDeleted()) continue;
            
            InferenceTask task = new InferenceTask();
            task.setImageAsset(imageAsset);
            task.setModel(req.getModel());
            task.setParameterJson(toJson(req.getParameter()));
            task.setStatus(TaskStatus.PENDING);
            task.setTaskCode("TASK" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
            task.setBatchId(batchId);
            task.setOperatorToken(token); // 记录发起者的 Token
            task.setCreatedTime(LocalDateTime.now());
            task = inferenceTaskRepository.save(task);
            
            taskIdsToQueue.add(task.getId());
        }
        
        if (taskIdsToQueue.isEmpty()) {
            return getBatchStatus(batchId);
        }

        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
            new org.springframework.transaction.support.TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (Long taskId : taskIdsToQueue) {
                        inferenceQueueProducer.sendBatchTask(batchId, taskId);
                    }
                }
            }
        );
        
        return getBatchStatus(batchId);
    }

    public BatchStatusRes getBatchStatus(String batchId) {
        List<InferenceTask> tasks = inferenceTaskRepository.findByBatchId(batchId);
        BatchStatusRes res = new BatchStatusRes();
        res.setBatchId(batchId);
        
        BatchStatusRes.Progress progress = new BatchStatusRes.Progress();
        progress.setTotal(tasks.size());
        
        List<BatchStatusRes.TaskDetail> details = new ArrayList<>();
        
        Long minStartedTimeMillis = null;
        Long maxFinishedTimeMillis = null;
        long totalExactDuration = 0L;

        for (InferenceTask task : tasks) {
            if (task.getDurationMs() != null) {
                totalExactDuration += task.getDurationMs();
            }
            if (task.getStatus() == TaskStatus.SUCCESS || task.getStatus() == TaskStatus.FAILED) {
                progress.setCompleted(progress.getCompleted() + 1);
            }
            if (task.getStatus() == TaskStatus.SUCCESS) progress.setSuccess(progress.getSuccess() + 1);
            if (task.getStatus() == TaskStatus.FAILED) progress.setFailed(progress.getFailed() + 1);
            if (task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.RUNNING) progress.setPending(progress.getPending() + 1);
            
            // 计算总体耗时逻辑 (从任务创建到当前/最后一张图结束，实现 PENDING 状态也实时计秒)
            if (task.getCreatedTime() != null) {
                long createMs = task.getCreatedTime().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
                if (minStartedTimeMillis == null || createMs < minStartedTimeMillis) minStartedTimeMillis = createMs;
            }
            
            if (task.getFinishedTime() != null) {
                long endMs = task.getFinishedTime().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
                if (maxFinishedTimeMillis == null || endMs > maxFinishedTimeMillis) maxFinishedTimeMillis = endMs;
            } else {
                // 还在运行或排队中，使用当前时间计算已用耗时
                long currentMs = System.currentTimeMillis();
                if (maxFinishedTimeMillis == null || currentMs > maxFinishedTimeMillis) maxFinishedTimeMillis = currentMs;
            }

            BatchStatusRes.TaskDetail detail = new BatchStatusRes.TaskDetail();
            detail.setTaskId(task.getId());
            detail.setImageId(task.getImageAsset() != null ? task.getImageAsset().getId() : null);
            detail.setStatus(task.getStatus().name());
            detail.setErrorMessage(task.getErrorMessage());
            details.add(detail);
        }
        res.setProgress(progress);
        res.setTasksDetail(details);
        
        if (progress.getCompleted() == progress.getTotal() && progress.getTotal() > 0) {
            res.setOverallStatus("COMPLETED");
            res.setDuration(totalExactDuration > 0 ? totalExactDuration : 0L);
        } else if (progress.getPending() == progress.getTotal()) {
            res.setOverallStatus("PENDING");
            res.setDuration(0L);
        } else {
            res.setOverallStatus("PROCESSING");
            // 计算正在执行的墙上耗时区间 (受数据库 datetime 精度的限制，可能只会跳秒)
            if (minStartedTimeMillis != null) {
                long duration = (maxFinishedTimeMillis != null ? maxFinishedTimeMillis : System.currentTimeMillis()) - minStartedTimeMillis;
                res.setDuration(duration > 0 ? duration : 0L);
            } else {
                res.setDuration(0L);
            }
        }

        return res;
    }

    @Transactional
    public void executeAsyncInference(Long taskId) {
        InferenceTask task = inferenceTaskRepository.findById(taskId).orElse(null);
        if (task == null || task.getStatus() != TaskStatus.PENDING) return;
        
        try {
            task.setStartedTime(LocalDateTime.now());
            task.setStatus(TaskStatus.RUNNING);
            inferenceTaskRepository.save(task);
            
            ImageAsset imageAsset = task.getImageAsset();
            double confidence = 0.0;
            String label = "Normal";
            String bboxStr = "{}";

            Map<String, Object> paramMap = null;
            if (task.getParameterJson() != null && !task.getParameterJson().isEmpty()) {
                paramMap = objectMapper.readValue(task.getParameterJson(), new TypeReference<Map<String, Object>>() {});
            }
            String thresholdStr = "default";
            if (paramMap != null && paramMap.containsKey("threshold")) {
                thresholdStr = String.valueOf(paramMap.get("threshold"));
            }
            String cacheKey = "infer:cache:" + imageAsset.getId() + ":" + task.getModel() + ":" + thresholdStr;

            // Check Redis cache before calling AI
            String cachedResultJson = stringRedisTemplate.opsForValue().get(cacheKey);
            boolean cacheHit = false;
            if (cachedResultJson != null) {
                try {
                    Map<String, Object> cachedMap = objectMapper.readValue(cachedResultJson, new TypeReference<Map<String, Object>>() {});
                    if (cachedMap.get("confidenceScore") != null) {
                        confidence = ((Number) cachedMap.get("confidenceScore")).doubleValue();
                    }
                    if (cachedMap.get("label") != null) {
                        label = (String) cachedMap.get("label");
                    }
                    if (cachedMap.get("bbox") != null) {
                        bboxStr = toJson(cachedMap.get("bbox"));
                    }
                    cacheHit = true;
                } catch (Exception ignored) {
                    cacheHit = false;
                }
            }

            if (!cacheHit) {
                try {
                    org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
                    requestFactory.setConnectTimeout(60000);
                    requestFactory.setReadTimeout(300000);
                    org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate(requestFactory);
                    org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                    headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

                    org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
                    body.add("file", new org.springframework.core.io.FileSystemResource(new java.io.File(imageAsset.getFilePath())));

                    org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(body, headers);

                    String aiUrl = resolveAiUrl(task.getModel());
                    if (paramMap != null && paramMap.containsKey("threshold")) {
                        aiUrl += (aiUrl.contains("?") ? "&" : "?") + "threshold=" + paramMap.get("threshold");
                    }

                    org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity(aiUrl, requestEntity, String.class);
                    Map<String, Object> responseMap = objectMapper.readValue(response.getBody(), new TypeReference<Map<String, Object>>() {});
                    List<Map<String, Object>> predictions = (List<Map<String, Object>>) responseMap.get("predictions");

                    if (predictions != null && !predictions.isEmpty()) {
                        Map<String, Object> bestPred = predictions.get(0);
                        confidence = ((Number) bestPred.get("probability")).doubleValue();
                        label = (String) bestPred.get("class");

                        List<Map<String, Double>> allBboxes = new ArrayList<>();
                        for (Map<String, Object> pred : predictions) {
                            List<Number> boxList = (List<Number>) pred.get("bbox");
                            if (boxList != null && boxList.size() >= 4) {
                                Map<String, Double> boxMap = new HashMap<>();
                                boxMap.put("x1", boxList.get(0).doubleValue());
                                boxMap.put("y1", boxList.get(1).doubleValue());
                                boxMap.put("x2", boxList.get(2).doubleValue());
                                boxMap.put("y2", boxList.get(3).doubleValue());
                                allBboxes.add(boxMap);
                            }
                        }
                        bboxStr = toJson(allBboxes);
                    }
                    task.setStatus(TaskStatus.SUCCESS);
                } catch (Exception e) {
                    e.printStackTrace();
                    task.setStatus(TaskStatus.FAILED);
                    String msg = e.getMessage();
                    task.setErrorMessage(msg != null && msg.length() > 250 ? msg.substring(0, 250) : msg);
                    label = "Error";
                    bboxStr = "{}";
                }
            } else {
                task.setStatus(TaskStatus.SUCCESS);
            }

            InferenceResult result = new InferenceResult();
            result.setTask(task);
            result.setImageAsset(imageAsset);
            result.setLabel(label);
            result.setConfidenceScore(confidence);
            result.setBboxJson(bboxStr);

            String originalFileUrl = "/" + imageAsset.getFilePath().replace("\\", "/");
            if (originalFileUrl.startsWith("//")) {
                originalFileUrl = originalFileUrl.substring(1);
            }
            result.setAnnotatedImgPath(originalFileUrl);
            result.setResultCode("RES" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
            result = inferenceResultRepository.save(result);

            task.setFinishedTime(LocalDateTime.now());
            task.setDurationMs(Math.max(100L, java.time.Duration.between(task.getStartedTime(), task.getFinishedTime()).toMillis()));
            inferenceTaskRepository.save(task);

            if (task.getStatus() == TaskStatus.SUCCESS) {
                writeAudit(task.getOperatorToken() != null ? task.getOperatorToken() : "system", ACTION_INFER_IMAGE, "image", imageAsset.getImageCode(), null);
                InferenceResultDto dtoToCache = toInferenceResultDto(result);
                stringRedisTemplate.opsForValue().set(cacheKey, toJson(dtoToCache), 7, java.util.concurrent.TimeUnit.DAYS);
            } else {
                writeAuditFailure(task.getOperatorToken() != null ? task.getOperatorToken() : "system", ACTION_INFER_IMAGE, "image", imageAsset.getImageCode(), new RuntimeException(task.getErrorMessage()));
            }
        } catch (Throwable t) {
            t.printStackTrace(); // 在控制台强行打印未知错误
            // 保底降级策略：必须把状态写回，防止假死 PENDING
            try {
                task.setStatus(TaskStatus.FAILED);
                task.setErrorMessage("System/Database Fatal Error: " + t.getClass().getSimpleName());
                task.setFinishedTime(LocalDateTime.now());
                inferenceTaskRepository.save(task);
            } catch (Exception ignored) {
            }
        }
    }

    public InferenceResultDto getInferResult(String resultId) {
        return toInferenceResultDto(resolveResult(resultId));
    }

    public List<InferenceResultDto> getAllInferResults() {
        return inferenceResultRepository.findAll().stream()
                .map(this::toInferenceResultDto)
                .collect(Collectors.toList());
    }

    public com.g14.medical_imaging_system.dto.inferapi.BatchResultRes getBatchInferResults(String batchId) {
        List<InferenceTask> tasks = inferenceTaskRepository.findByBatchId(batchId);
        LocalDateTime minCreatedTime = null;
        LocalDateTime maxFinishedTime = null;

        for (InferenceTask task : tasks) {
            if (minCreatedTime == null || (task.getCreatedTime() != null && task.getCreatedTime().isBefore(minCreatedTime))) {
                minCreatedTime = task.getCreatedTime();
            }
            if (task.getFinishedTime() != null) {
                if (maxFinishedTime == null || task.getFinishedTime().isAfter(maxFinishedTime)) {
                    maxFinishedTime = task.getFinishedTime();
                }
            }
        }

        Long totalDuration = 0L;
        if (minCreatedTime != null && maxFinishedTime != null) {
            totalDuration = java.time.Duration.between(minCreatedTime, maxFinishedTime).toMillis();
        }

        List<InferenceResultDto> results = inferenceResultRepository.findByTaskBatchId(batchId).stream()
                .map(this::toInferenceResultDto)
                .collect(Collectors.toList());

        com.g14.medical_imaging_system.dto.inferapi.BatchResultRes response = new com.g14.medical_imaging_system.dto.inferapi.BatchResultRes();
        response.setBatchId(batchId);
        response.setDuration(totalDuration);
        response.setResults(results);
        return response;
    }

    @Transactional
    public CommentCreateRes createComment(String resultId, CommentCreateReq req, String token) {
        String targetId = resultId;
        try {
            InferenceResult result = resolveResult(resultId);
            targetId = result.getResultCode();
            DoctorComment comment = new DoctorComment();
            comment.setResult(result);
            comment.setSatisfaction(req.getComment().getSatisfaction());
            comment.setSentence(req.getComment().getSentence());
            comment = doctorCommentRepository.save(comment);
            writeAudit(token, ACTION_CREATE_COMMENT, "result", result.getResultCode(), null);
            return CommentCreateRes.builder()
                    .commentId("COM" + String.format("%06d", comment.getId()))
                    .build();
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_CREATE_COMMENT, "result", targetId, e);
            throw e;
        }
    }

    @Transactional
    public void deleteComment(String resultId, String commentId, String token) {
        String targetId = commentId;
        try {
            InferenceResult result = resolveResult(resultId);
            DoctorComment comment = resolveComment(commentId);
            if (!comment.getResult().getId().equals(result.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "comment does not belong to result");
            }
            doctorCommentRepository.delete(comment);
            writeAudit(token, ACTION_DELETE_COMMENT, "comment", commentId, null);
        } catch (RuntimeException e) {
            writeAuditFailure(token, ACTION_DELETE_COMMENT, "comment", targetId, e);
            throw e;
        }
    }

    private Study createStudyInternal(PatientCase patientCase, StudyPayload payload) {
        Study study = new Study();
        study.setCaseEntity(patientCase);
        study.setStudyTime(payload.getStudyTime());
        study.setStudyType(payload.getStudyType());
        study.setStudyDesc(payload.getStudyDesc());
        study.setStudyCode("STU" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        return studyRepository.save(study);
    }

    private PatientCase resolveCase(String caseId) {
        if (caseId == null || caseId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "case_id is required");
        }
        return patientCaseRepository.findByCaseCode(caseId)
                .or(() -> parseLong(caseId).flatMap(patientCaseRepository::findById))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "case not found"));
    }

    private Study resolveStudy(String studyId) {
        if (studyId == null || studyId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "study_id is required");
        }
        return studyRepository.findByStudyCode(studyId)
                .or(() -> parseLong(studyId).flatMap(studyRepository::findById))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "study not found"));
    }

    private ImageAsset resolveImage(String imageId) {
        if (imageId == null || imageId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "image_id is required");
        }
        return imageAssetRepository.findByImageCodeAndDeletedFalse(imageId)
                .or(() -> parseLong(imageId).flatMap(imageAssetRepository::findById))
                .filter(image -> !Boolean.TRUE.equals(image.getDeleted()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "image not found"));
    }

    private InferenceResult resolveResult(String resultId) {
        if (resultId == null || resultId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "result_id is required");
        }
        return inferenceResultRepository.findByResultCode(resultId)
                .or(() -> parseLong(resultId).flatMap(inferenceResultRepository::findById))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "result not found"));
    }

    private DoctorComment resolveComment(String commentId) {
        if (commentId == null || commentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "comment_id is required");
        }
        Optional<Long> id = parseCommentId(commentId);
        if (id.isPresent()) {
            return doctorCommentRepository.findById(id.get())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "comment not found"));
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "comment not found");
    }

    private Optional<Long> parseCommentId(String commentId) {
        if (commentId.startsWith("COM")) {
            return parseLong(commentId.substring(3));
        }
        return parseLong(commentId);
    }

    private Optional<Long> parseLong(String value) {
        try {
            return Optional.of(Long.parseLong(value));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private CaseDto toCaseDto(PatientCase patientCase) {
        List<StudyDto> studies = studyRepository.findByCaseEntityId(patientCase.getId()).stream()
                .map(this::toStudyDto)
                .collect(Collectors.toList());
        return CaseDto.builder()
                .caseId(patientCase.getCaseCode())
                .name(patientCase.getName())
                .gender(patientCase.getGender())
                .age(patientCase.getAge())
                .idNumber(maskIdNumber(patientCase.getIdNumber()))
                .contact(maskContact(patientCase.getContact()))
                .medicalHistory(patientCase.getMedicalHistory())
                .createdTime(patientCase.getCreatedTime())
                .updatedTime(patientCase.getUpdatedTime())
                .caseDesc(patientCase.getCaseDesc())
                .studys(studies)
                .build();
    }

    private StudyDto toStudyDto(Study study) {
        List<String> imageIds = imageAssetRepository.findByStudyIdAndDeletedFalse(study.getId()).stream()
                .map(ImageAsset::getImageCode)
                .collect(Collectors.toList());
        return StudyDto.builder()
                .studyId(study.getStudyCode())
                .studyTime(study.getStudyTime())
                .studyType(study.getStudyType().name())
                .studyDesc(study.getStudyDesc())
                .imageIds(imageIds)
                .build();
    }

    private ImageDto toImageDto(ImageAsset imageAsset) {
        // Convert local absolute path like `uploads/xxx.png` to URL path `/uploads/xxx.png`
        String fileUrl = "/" + imageAsset.getFilePath().replace("\\", "/");
        if (fileUrl.startsWith("//")) {
            fileUrl = fileUrl.substring(1);
        }

        return ImageDto.builder()
                .imageId(imageAsset.getImageCode())
                .caseId(imageAsset.getCaseEntity().getCaseCode())
                .studyId(imageAsset.getStudy().getStudyCode())
                .fileName(imageAsset.getFileName())
                .fileFormat(imageAsset.getFileFormat())
                .fileSize(imageAsset.getFileSize())
                .imagePath(fileUrl) // Now returning HTTP accessible URL instead of OS absolute path
                .uploadedTime(imageAsset.getUploadedTime())
                .build();
    }

    private InferenceResultDto toInferenceResultDto(InferenceResult result) {
        Object bbox = parseBBoxList(result.getBboxJson());
        DoctorComment latest = doctorCommentRepository.findByResultIdOrderByCreatedTimeDesc(result.getId())
                .stream()
                .findFirst()
                .orElse(null);
        CommentDto commentDto = latest == null ? null : CommentDto.builder()
                .commentId("COM" + String.format("%06d", latest.getId()))
                .satisfaction(latest.getSatisfaction().name())
                .sentence(latest.getSentence())
                .build();

        String originalFileUrl = null;
        String imageCode = null;
        String caseCode = null;

        try {
            ImageAsset imageAsset = result.getImageAsset();
            if (imageAsset != null) {
                // Trigger lazy loading; if EntityNotFoundException occurs, the image is soft-deleted.
                String filePath = imageAsset.getFilePath();
                originalFileUrl = "/" + filePath.replace("\\", "/");
                if (originalFileUrl.startsWith("//")) {
                    originalFileUrl = originalFileUrl.substring(1);
                }
                imageCode = imageAsset.getImageCode();
                if (imageAsset.getCaseEntity() != null) {
                    caseCode = imageAsset.getCaseEntity().getCaseCode();
                }
            }
        } catch (jakarta.persistence.EntityNotFoundException | org.hibernate.ObjectNotFoundException e) {
            // Image or case has been soft-deleted; tolerate missing reference.
        }

        Object modifiedBboxObj = null;
        if (result.getIsModified() != null && result.getIsModified() && result.getModifiedBboxJson() != null) {
            modifiedBboxObj = parseBBoxList(result.getModifiedBboxJson());
        }

        Long modelId = null;
        String modelName = null;
        Long duration = null;
        try {
            String rawModel = result.getTask().getModel();
            duration = result.getTask().getDurationMs();
            if (rawModel != null && !rawModel.trim().isEmpty()) {
                modelName = rawModel.trim();
                try {
                    modelId = Long.parseLong(modelName);
                    com.g14.medical_imaging_system.entity.CustomAiModel customModel =
                            customAiModelRepository.findById(modelId).orElse(null);
                    if (customModel != null) {
                        modelName = customModel.getModelName();
                    }
                } catch (NumberFormatException e) {
                    modelId = null;
                }
            }
        } catch (Exception e) {
            // task reference may fail to load; tolerate missing model info
        }

        return InferenceResultDto.builder()
                .resultId(result.getResultCode())
                .imageId(imageCode)
                .caseId(caseCode)
                .originalImgPath(originalFileUrl)
                .bbox(bbox)
                .confidenceScore(result.getConfidenceScore())
                .label(result.getLabel())
                .createdTime(result.getCreatedTime())
                .annotatedImgPath(result.getAnnotatedImgPath())
                .comment(commentDto)
                .isModified(result.getIsModified() != null ? result.getIsModified() : false)
                .modifiedBbox(modifiedBboxObj)
                .modifiedLabel(result.getModifiedLabel())
                .modifiedBy(result.getModifiedBy() != null ? result.getModifiedBy().getUsername() : null)
                .modifiedTime(result.getModifiedTime())
                .modelId(modelId)
                .modelName(modelName)
                .duration(duration)
                .build();
    }

    private Object parseBBoxList(String json) {
        try {
            // Try parsing as a list containing multiple boxes.
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Double>>>() {});
        } catch (Exception e) {
            // Backward compatible parsing for old data: single map or empty list.
            try {
                return objectMapper.readValue(json, new TypeReference<Map<String, Double>>() {});
            } catch (Exception ex) {
                return new java.util.ArrayList<>();
            }
        }
    }

    private String maskIdNumber(String idNumber) {
        if (idNumber == null || idNumber.length() < 8) {
            return "****";
        }
        return idNumber.substring(0, 2) + "************" + idNumber.substring(idNumber.length() - 2);
    }

    private String maskContact(String contact) {
        if (contact == null || contact.length() < 7) {
            return "****";
        }
        return contact.substring(0, 3) + "****" + contact.substring(contact.length() - 2);
    }

    private String getExtension(String fileName) {
        int idx = fileName.lastIndexOf('.');
        if (idx < 0 || idx == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(idx + 1).toLowerCase(Locale.ROOT);
    }

    private boolean isAllowedFormat(String ext) {
        return ext.equals("png") || ext.equals("jpg") || ext.equals("jpeg") || ext.equals("dcm") || ext.equals("dicom");
    }

    private void ensureUploadDir() {
        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot create upload directory");
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "JSON serialization failed");
        }
    }

    private void writeAudit(String token, String action, String targetType, String targetId, String detailJson) {
        auditLogService.logByToken(token, action, normalizeTargetType(targetType), targetId, 1, null);
    }

    private void writeAuditFailure(String token, String action, String targetType, String targetId, RuntimeException e) {
        String errorMsg = e.getMessage() == null ? "operation failed" : e.getMessage();
        if (errorMsg.length() > 500) {
            errorMsg = errorMsg.substring(0, 500);
        }
        auditLogService.logByToken(token, action, normalizeTargetType(targetType), targetId, 0, errorMsg);
    }

    private String normalizeTargetType(String targetType) {
        if (targetType == null || targetType.isBlank()) {
            return "system";
        }
        return targetType.toLowerCase(Locale.ROOT);
    }
}














