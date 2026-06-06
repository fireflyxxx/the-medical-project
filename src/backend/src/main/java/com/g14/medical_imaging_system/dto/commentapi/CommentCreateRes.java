package com.g14.medical_imaging_system.dto.commentapi;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommentCreateRes {
    private String commentId;
}
