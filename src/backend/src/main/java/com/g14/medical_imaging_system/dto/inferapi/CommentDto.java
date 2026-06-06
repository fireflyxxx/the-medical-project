package com.g14.medical_imaging_system.dto.inferapi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDto {
    private String commentId;
    private String satisfaction;
    private String sentence;
}
