package com.g14.medical_imaging_system.dto.accountapi;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class AccLoginRes {
    private String token;
    private Long userId;
    private String username;
    private String role;
}