package com.g14.medical_imaging_system.controller;

import tools.jackson.databind.ObjectMapper;
import com.g14.medical_imaging_system.common.ApiResponse;
import com.g14.medical_imaging_system.common.TokenGuard;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/v1/announcement")
public class AnnouncementController {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String ANNOUNCEMENT_KEY = "sys:announcement";

    @Data
    public static class AnnouncementReq {
        private String title;
        private String content;
    }

    @Data
    public static class AnnouncementRes {
        private String title;
        private String content;
        private String updatedTime;
    }

    @GetMapping("/latest")
    public ApiResponse<AnnouncementRes> getLatest() {
        try {
            String json = stringRedisTemplate.opsForValue().get(ANNOUNCEMENT_KEY);
            if (json == null) {
                return ApiResponse.ok(null);
            }
            return ApiResponse.ok(objectMapper.readValue(json, AnnouncementRes.class));
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.ok(null);
        }
    }

    @PostMapping("/update")
    public ApiResponse<AnnouncementRes> update(@RequestHeader("Authorization") String token,
                                               @RequestBody AnnouncementReq req) {
        // 只有管理员可以发布公告
        TokenGuard.requireRole(token, "admin");

        AnnouncementRes res = new AnnouncementRes();
        res.setTitle(req.getTitle());
        res.setContent(req.getContent());
        res.setUpdatedTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        try {
            stringRedisTemplate.opsForValue().set(ANNOUNCEMENT_KEY, objectMapper.writeValueAsString(res));
            return ApiResponse.ok(res);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save announcement");
        }
    }
}
