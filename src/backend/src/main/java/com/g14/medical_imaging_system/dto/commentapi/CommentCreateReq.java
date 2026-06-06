package com.g14.medical_imaging_system.dto.commentapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CommentCreateReq {
    @Valid
    @NotNull(message = "comment is required")
    private CommentPayload comment;
}
