package com.g14.medical_imaging_system.dto.caseapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.validator.constraints.Length;
import lombok.Data;

import java.util.List;

@Data
public class CaseCreateReq {
    @NotBlank(message = "name is required")
    @Length(max = 20, message = "name length must not exceed 20 characters")
    private String name;

    @NotNull(message = "gender is required")
    @Min(value = 0, message = "gender must be 0 or 1")
    @Max(value = 1, message = "gender must be 0 or 1")
    private Integer gender;

    @NotNull(message = "age is required")
    @Min(value = 0, message = "age must be >= 0")
    @Max(value = 200, message = "age must be <= 200")
    private Integer age;

    @NotBlank(message = "id_number is required")
    @JsonProperty("id_number")
    private String idNumber;

    @NotBlank(message = "contact is required")
    private String contact;

    @JsonProperty("medical_history")
    private String medicalHistory;

    @JsonProperty("case_desc")
    private String caseDesc;

    @Valid
    private List<StudyPayload> studys;
}
