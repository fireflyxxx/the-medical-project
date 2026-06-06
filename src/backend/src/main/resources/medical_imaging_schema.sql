CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    job_number VARCHAR(6) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_case (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    case_code VARCHAR(6) NOT NULL UNIQUE,
    creator_id BIGINT NOT NULL COMMENT '创建该病例的医生ID',
    name VARCHAR(64) NOT NULL,
    gender INT NOT NULL,
    age INT NOT NULL,
    id_number VARCHAR(32) NOT NULL,
    contact VARCHAR(64) NOT NULL,
    medical_history TEXT NOT NULL,
    case_desc TEXT NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) DEFAULT 0 NOT NULL,
    CHECK (age > 0 AND age < 200),
    CONSTRAINT fk_case_creator FOREIGN KEY (creator_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    study_code VARCHAR(32) NOT NULL UNIQUE,
    case_id BIGINT NOT NULL,
    study_time DATE NOT NULL,
    study_type VARCHAR(32) NOT NULL,
    study_desc TEXT NOT NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) DEFAULT 0 NOT NULL,
    CONSTRAINT fk_study_case FOREIGN KEY (case_id) REFERENCES patient_case(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS image_asset (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    image_code VARCHAR(32) NOT NULL UNIQUE,
    case_id BIGINT NOT NULL,
    study_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_format VARCHAR(16) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_image_case FOREIGN KEY (case_id) REFERENCES patient_case(id) ON DELETE CASCADE,
    CONSTRAINT fk_image_study FOREIGN KEY (study_id) REFERENCES study(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inference_task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_code VARCHAR(32) NOT NULL UNIQUE,
    image_id BIGINT NOT NULL,
    model VARCHAR(64) NOT NULL,
    parameter_json TEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    started_time DATETIME NULL,
    finished_time DATETIME NULL,
    duration_ms BIGINT NULL,
    error_code VARCHAR(64) NULL,
    error_message VARCHAR(255) NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_image FOREIGN KEY (image_id) REFERENCES image_asset(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inference_result (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    result_code VARCHAR(32) NOT NULL UNIQUE,
    task_id BIGINT NOT NULL UNIQUE,
    image_id BIGINT NOT NULL,
    label VARCHAR(32) NOT NULL,
    confidence_score DECIMAL(5, 4) NOT NULL,
    bbox_json TEXT NOT NULL,
    annotated_img_path VARCHAR(512) NOT NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_result_task FOREIGN KEY (task_id) REFERENCES inference_task(id) ON DELETE CASCADE,
    CONSTRAINT fk_result_image FOREIGN KEY (image_id) REFERENCES image_asset(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_comment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    result_id BIGINT NOT NULL,
    satisfaction VARCHAR(16) NOT NULL,
    sentence VARCHAR(512) NOT NULL,
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_result FOREIGN KEY (result_id) REFERENCES inference_result(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS audit_log;

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator VARCHAR(64) NOT NULL,
    operation_type VARCHAR(64) NOT NULL,
    operation_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    target_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    operation_status TINYINT NOT NULL,
    error_msg VARCHAR(512) NULL
);

CREATE INDEX idx_case_created_time ON patient_case(created_time);
CREATE INDEX idx_study_case_id ON study(case_id);
CREATE INDEX idx_image_study_id ON image_asset(study_id);
CREATE INDEX idx_task_image_status ON inference_task(image_id, status);
CREATE INDEX idx_result_image_id ON inference_result(image_id);
CREATE INDEX idx_comment_result_id ON doctor_comment(result_id);
CREATE INDEX idx_audit_time ON audit_log(operation_time);
CREATE INDEX idx_audit_operator_time ON audit_log(operator, operation_time);
CREATE INDEX idx_audit_type_time ON audit_log(operation_type, operation_time);
CREATE INDEX idx_audit_target ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_status_time ON audit_log(operation_status, operation_time);

CREATE TABLE IF NOT EXISTS custom_ai_model (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    model_name VARCHAR(128) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    description TEXT,
    algorithm_type VARCHAR(64) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploader_id BIGINT NOT NULL,
    labels_mapping TEXT NULL,
    default_threshold DECIMAL(5, 4) NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL COMMENT '状态：PENDING(待审批), ACTIVE(启用), INACTIVE(停用)',
    created_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_custom_model_uploader FOREIGN KEY (uploader_id) REFERENCES app_user(id) ON DELETE CASCADE
);

