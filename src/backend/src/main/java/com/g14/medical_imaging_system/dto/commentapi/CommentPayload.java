package com.g14.medical_imaging_system.dto.commentapi;

import com.g14.medical_imaging_system.entity.Satisfaction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CommentPayload {
    private String commentId;

    @NotNull(message = "satisfaction is required")
    private Satisfaction satisfaction;

    @NotBlank(message = "sentence is required")
    private String sentence;
}
