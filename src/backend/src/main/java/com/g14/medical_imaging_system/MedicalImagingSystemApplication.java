package com.g14.medical_imaging_system;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class MedicalImagingSystemApplication {

    @PostConstruct
    void init() {
        // 设置应用的默认时区为东八区 (北京时间)
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));
    }

    public static void main(String[] args) {
        SpringApplication.run(MedicalImagingSystemApplication.class, args);
    }

}
