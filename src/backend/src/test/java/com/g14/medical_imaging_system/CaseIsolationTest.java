package com.g14.medical_imaging_system;

import com.g14.medical_imaging_system.common.JwtUtils;
import com.g14.medical_imaging_system.dto.caseapi.CaseCreateReq;
import com.g14.medical_imaging_system.dto.caseapi.CaseDto;
import com.g14.medical_imaging_system.service.MedicalPlatformService;
import com.g14.medical_imaging_system.entity.PatientCase;
import com.g14.medical_imaging_system.repository.PatientCaseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class CaseIsolationTest {

    @Autowired
    private MedicalPlatformService medicalPlatformService;

    @Autowired
    private PatientCaseRepository patientCaseRepository;

    @Test
    public void testDoctorIsolation() {
        // 1. 生成两个医生的 Token
        String tokenDoctor1 = JwtUtils.generateToken(101L, "doc1", "doctor");
        String tokenDoctor2 = JwtUtils.generateToken(102L, "doc2", "doctor");

        // 2. 医生1创建病例
        CaseCreateReq req1 = new CaseCreateReq();
        req1.setName("Patient of Doc 1");
        req1.setGender(1);
        req1.setAge(30);
        req1.setIdNumber("111111111111111111");
        req1.setContact("13800000001");
        req1.setMedicalHistory("None");
        medicalPlatformService.createCase(req1, tokenDoctor1);

        // 3. 医生2创建病例
        CaseCreateReq req2 = new CaseCreateReq();
        req2.setName("Patient of Doc 2");
        req2.setGender(0);
        req2.setAge(25);
        req2.setIdNumber("222222222222222222");
        req2.setContact("13800000002");
        req2.setMedicalHistory("None");
        medicalPlatformService.createCase(req2, tokenDoctor2);

        // 4. 断言：医生1通过 getCases 只能查到自己的病人
        List<CaseDto> doc1Cases = medicalPlatformService.getCases(Optional.empty(), Optional.empty(), Optional.empty(), tokenDoctor1);
        long doc1Count = doc1Cases.stream().filter(c -> "Patient of Doc 1".equals(c.getName())).count();
        long doc2CountInDoc1 = doc1Cases.stream().filter(c -> "Patient of Doc 2".equals(c.getName())).count();
        
        assertTrue(doc1Count > 0, "Doctor 1 应该能看到自己的病例");
        assertEquals(0, doc2CountInDoc1, "Doctor 1 不应该看到 Doctor 2 的病例");

        // 5. 断言：医生2通过 getCases 只能查到自己的病人
        List<CaseDto> doc2Cases = medicalPlatformService.getCases(Optional.empty(), Optional.empty(), Optional.empty(), tokenDoctor2);
        long doc2Count = doc2Cases.stream().filter(c -> "Patient of Doc 2".equals(c.getName())).count();
        long doc1CountInDoc2 = doc2Cases.stream().filter(c -> "Patient of Doc 1".equals(c.getName())).count();

        assertTrue(doc2Count > 0, "Doctor 2 应该能看到自己的病例");
        assertEquals(0, doc1CountInDoc2, "Doctor 2 不应该看到 Doctor 1 的病例");
    }
}
