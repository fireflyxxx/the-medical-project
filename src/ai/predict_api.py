import io
import json
import logging
import os
from pathlib import Path

import cv2
import numpy as np
import pydicom
import torch
import torchvision
from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Response
from fastapi.responses import JSONResponse
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 常量设置
SEED = 42
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# 模型检查点路径，后期可修改添加多模型
CHECKPOINT_PATH = os.getenv("CHECKPOINT_PATH", "./001.pth")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = FastAPI(title="肺炎检测 API", description="上传胸部 X 光片（JPEG/PNG/DICOM），返回肺炎检测框")

# 全局变量，存储加载后的模型
model = None

def load_model(checkpoint_path: str, device: torch.device):
    """加载模型权重（与训练时结构一致）"""
    logger.info(f"正在从 {checkpoint_path} 加载模型到 {device} ...")
    # 构建模型结构
    model = fasterrcnn_resnet50_fpn(weights=None)
    in_ch = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_ch, num_classes=2)
    model.rpn.anchor_generator.sizes = ((16, 32, 64, 128, 256),)

    # 加载检查点
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(f"加载完成，epoch: {checkpoint.get('epoch', 'unknown')}")
    elif isinstance(checkpoint, dict) and "model" in checkpoint:
        model.load_state_dict(checkpoint["model"])
    else:
        model.load_state_dict(checkpoint)

    model.to(device).to(torch.float32)
    model.eval()
    logger.info("模型加载成功")
    return model

@app.on_event("startup")
async def startup_event():
    """服务启动时加载模型"""
    global model
    if not Path(CHECKPOINT_PATH).exists():
        logger.error(f"模型检查点文件不存在：{CHECKPOINT_PATH}")
        raise RuntimeError(f"模型文件未找到：{CHECKPOINT_PATH}")
    model = load_model(CHECKPOINT_PATH, DEVICE)

def preprocess_image_from_bytes(file_bytes: bytes, filename: str, device: torch.device):
    """
    从字节数据读取图像，预处理为模型输入张量
    支持 DICOM 和常见图像格式（通过 OpenCV 解码）
    """
    suffix = Path(filename).suffix.lower()
    if suffix == '.dcm':
        # DICOM 文件处理
        with io.BytesIO(file_bytes) as f:
            ds = pydicom.dcmread(f)
            img = ds.pixel_array.astype(np.float32)
    else:
        # 普通图像格式（jpg/png 等）
        # 使用 OpenCV 解码（imdecode 从内存读取）
        np_arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("无法解码图像，可能是不支持的格式或损坏文件")
        img = img.astype(np.float32)

    # 归一化到 [0, 1]
    img_min, img_max = img.min(), img.max()
    if img_max - img_min > 1e-6:
        img = (img - img_min) / (img_max - img_min)
    else:
        img = np.zeros_like(img)  # 全零图像处理

    # 转为 3 通道
    img = np.stack([img, img, img], axis=0)  # (3, H, W)
    tensor = torch.from_numpy(img).unsqueeze(0).to(device).to(torch.float32)
    return tensor

@app.post("/predict")
async def predict(
    file: UploadFile = File(..., description="图片文件，支持 jpg/png/dcm"),
    threshold: float = Query(0.3, description="置信度阈值，低于该值的框将被过滤")
):
    """
    上传图片进行肺炎检测
    返回 JSON 格式：{"predictions": [{"class": "pneumonia", "probability": 0.95, "bbox": [x1,y1,x2,y2]}, ...]}
    """
    if model is None:
        raise HTTPException(status_code=503, detail="模型尚未加载完成")

    # 检查文件类型
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.dcm'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式：{file_ext}，仅支持 {allowed_extensions}"
        )

    try:
        # 读取上传的文件内容
        contents = await file.read()

        # 预处理
        input_tensor = preprocess_image_from_bytes(contents, file.filename, DEVICE)

        # 推理
        with torch.no_grad(), torch.autocast(device_type=DEVICE.type, enabled=False):
            predictions = model(input_tensor)[0]

        # 过滤低置信度预测
        keep = predictions['scores'] > threshold
        boxes = predictions['boxes'][keep].cpu().numpy()
        scores = predictions['scores'][keep].cpu().numpy()
        labels = predictions['labels'][keep].cpu().numpy()

        results = []
        for box, score, label in zip(boxes, scores, labels):
            class_name = "pneumonia" if label == 1 else f"class_{label}"
            results.append({
                "class": class_name,
                "probability": float(score),
                "bbox": box.tolist()  # [x1, y1, x2, y2]
            })

        return JSONResponse(content={"predictions": results})

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("推理过程中发生意外错误")
        raise HTTPException(status_code=500, detail=f"服务器内部错误：{str(e)}")

@app.get("/health")
async def health():
    """健康检查端点"""
    return {"status": "ok", "device": str(DEVICE), "model_loaded": model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)