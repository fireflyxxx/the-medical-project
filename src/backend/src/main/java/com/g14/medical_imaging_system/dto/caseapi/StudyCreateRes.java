package com.g14.medical_imaging_system.dto.caseapi;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class StudyCreateRes {
    private List<StudyDto> study;
}
