package com.g14.medical_imaging_system.dto.accountapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccChangePwdReq {
    @NotBlank(message = "old_password cannot be blank")
    @JsonProperty("old_password")
    private String oldPassword;

    @NotBlank(message = "new_password cannot be blank")
    @Size(min = 9, max = 20, message = "密码长度必须在 9 到 20 位之间")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]+$", message = "密码必须同时包含字母和数字，且仅能包含字母和数字")
    @JsonProperty("new_password")
    private String newPassword;
}