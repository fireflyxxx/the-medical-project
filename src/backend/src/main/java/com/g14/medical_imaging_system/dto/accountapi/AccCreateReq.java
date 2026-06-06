package com.g14.medical_imaging_system.dto.accountapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccCreateReq {
    @NotBlank(message = "username cannot be blank")
    @Size(min = 1, max = 20, message = "用户名长度必须在 1 到 20 位之间")
    private String username;

    @NotBlank(message = "password cannot be blank")
    @Size(min = 9, max = 20, message = "密码长度必须在 9 到 20 位之间")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]+$", message = "密码必须同时包含字母和数字，且仅能包含字母和数字")
    private String password;
    
    @NotBlank(message = "job_number cannot be blank")
    @Pattern(regexp = "^\\d{6}$", message = "工号必须是6位数字")
    @JsonProperty("job_number")
    private String jobNumber;

    @NotBlank(message = "role cannot be blank")
    @Pattern(regexp = "^(admin|tech|doctor)$", message = "身份角色只能是 admin, tech 或 doctor")
    private String role;
}