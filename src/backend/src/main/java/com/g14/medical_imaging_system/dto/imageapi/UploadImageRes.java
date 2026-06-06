package com.g14.medical_imaging_system.dto.imageapi;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UploadImageRes {
    private List<String> imageIds;
}
