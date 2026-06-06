package com.g14.medical_imaging_system.dto.accountapi;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class AccGetRes {
    private List<UserDto> users;

    @Getter
    @Setter
    @Builder
    public static class UserDto {
        private Long id;
        private String username;
        private String role;
        private String status;
        private String createdTime;
    }
}