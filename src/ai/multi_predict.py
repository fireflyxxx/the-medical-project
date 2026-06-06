import io
import json
import logging
import os
from pathlib import Path
from collections import OrderedDict

import cv2
import numpy as np
import pydicom
import torch
import torchvision
from fastapi import FastAPI, File, UploadFile, Query, Form, HTTPException
from fastapi.responses import JSONResponse, Response
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

try:
    from cachetools import LRUCache
except ImportError:
    pass  # Allow fallback if not installed

# YOLOv8 相关
try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 常量设置
SEED = 42
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# 路径设置：优先读取环境变量，适配 Docker 部署
MODELS_DIR = os.getenv("MODELS_DIR", "/opt/medical/models/")
CHECKPOINT_PATH = os.getenv("CHECKPOINT_PATH", "/opt/medical/models/001.pth")
YOLO_CHECKPOINT_PATH = os.getenv("YOLO_CHECKPOINT_PATH", "/opt/medical/models/best.pt")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = FastAPI(title="肺炎检测 API", description="支持 Faster R‑CNN 和 YOLOv8 及动态上传模型的混合推理系统")

# -------------------- 模型缓存 (LRU) --------------------
class ModelLRUCache:
    """带显存清理的 LRU 缓存"""
    def __init__(self, maxsize=3):
        self.cache = OrderedDict()
        self.maxsize = maxsize

    def get(self, key):
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, model):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = model
        if len(self.cache) > self.maxsize:
            evicted_key, evicted_model = self.cache.popitem(last=False)
            logger.info(f"LRU 缓存满了，动态释放模型: {evicted_key}")
            del evicted_model
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

MODEL_CACHE = ModelLRUCache(maxsize=3)

# -------------------- 模型加载 --------------------
def load_faster_rcnn(checkpoint_path: str, device: torch.device):
    logger.info(f"加载 Faster R‑CNN 模型: {checkpoint_path}")
    model = fasterrcnn_resnet50_fpn(weights=None)
    in_ch = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_ch, num_classes=2)
    model.rpn.anchor_generator.sizes = ((16, 32, 64, 128, 256),)

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"权重文件不存在: {checkpoint_path}")

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
    elif isinstance(checkpoint, dict) and "model" in checkpoint:
        model.load_state_dict(checkpoint["model"])
    else:
        model.load_state_dict(checkpoint)

    model.to(device).to(torch.float32)
    model.eval()
    return model

def load_yolo(checkpoint_path: str, device: torch.device):
    if YOLO is None:
        raise ImportError("ultralytics library not found")
    logger.info(f"加载 YOLOv8 模型: {checkpoint_path}")
    model = YOLO(checkpoint_path)
    model.model.eval()
    return model

def get_model_instance(model_id: str, algo_type: str, file_path: str):
    """动态获取模型，命中 LRU 缓存则直接返回，否则加载"""
    model = MODEL_CACHE.get(model_id)
    if model is not None:
        return model
        
    logger.info(f"触发新模型加载 -> ID: {model_id}, 算法: {algo_type}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"权重文件不存在: {file_path}")
        
    if algo_type.lower() == "yolov8":
        model = load_yolo(file_path, DEVICE)
    elif algo_type.lower() == "faster_rcnn":
        model = load_faster_rcnn(file_path, DEVICE)
    elif algo_type.lower() == "torchscript":
        model = torch.jit.load(file_path, map_location=DEVICE)
        model.eval()
    else:
        raise ValueError(f"不支持的算法类型: {algo_type}")
        
    MODEL_CACHE.put(model_id, model)
    return model

@app.on_event("startup")
async def startup_event():
    """服务启动时，预热默认模型"""
    try:
        if Path(CHECKPOINT_PATH).exists():
            get_model_instance("default_faster", "faster_rcnn", CHECKPOINT_PATH)
        if Path(YOLO_CHECKPOINT_PATH).exists():
            get_model_instance("default_yolo", "yolov8", YOLO_CHECKPOINT_PATH)
        logger.info("模型预热成功")
    except Exception as e:
        logger.error(f"启动预热失败: {e}")

# -------------------- 图像预处理 --------------------
def preprocess_image_from_bytes(file_bytes: bytes, filename: str):
    """
    从字节数据读取图像，返回预处理后的图像张量（用于 Faster R‑CNN）
    同时返回原始图像尺寸 (H, W) 用于坐标转换
    """
    suffix = Path(filename).suffix.lower()
    if suffix == '.dcm':
        with io.BytesIO(file_bytes) as f:
            ds = pydicom.dcmread(f)
            img = ds.pixel_array.astype(np.float32)
    else:
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
        img = np.zeros_like(img)

    # 转为 3 通道
    img_3ch = np.stack([img, img, img], axis=0)  # (3, H, W)
    tensor = torch.from_numpy(img_3ch).unsqueeze(0).to(DEVICE).to(torch.float32)
    return tensor, img.shape

def load_image_for_yolo(file_bytes: bytes, filename: str):
    """
    为 YOLOv8 加载图像（返回 BGR 格式的 numpy 数组，尺寸 (H, W, 3)）
    """
    suffix = Path(filename).suffix.lower()
    if suffix == '.dcm':
        with io.BytesIO(file_bytes) as f:
            ds = pydicom.dcmread(f)
            img = ds.pixel_array
            # 简单归一化到 0-255
            img_min, img_max = img.min(), img.max()
            if img_max > img_min:
                img = ((img - img_min) / (img_max - img_min) * 255).astype(np.uint8)
            else:
                img = np.zeros_like(img, dtype=np.uint8)
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    else:
        np_arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("无法解码图像")
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    return img

# -------------------- 动态推理端点 --------------------
@app.post("/predict/{model_id}")
async def predict_dynamic(
    model_id: str,
    algo_type: str = Query(..., description="算法类型: yolov8, faster_rcnn, torchscript"),
    threshold: float = Query(0.3, description="置信度阈值"),
    weights_path: str = Query(..., description="模型的物理加载路径"),
    file: UploadFile = File(..., description="图片文件")
):
    """科研人员上传的自定义模型动态推理接口"""
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.dcm'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"不支持格式：{file_ext}")

    try:
        model = get_model_instance(model_id, algo_type, weights_path)
        contents = await file.read()
        results_list = []

        if algo_type.lower() == "yolov8":
            img = load_image_for_yolo(contents, file.filename)
            results = model.predict(source=img, conf=threshold, verbose=False, device=DEVICE.type)
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                scores = results[0].boxes.conf.cpu().numpy()
                classes = results[0].boxes.cls.cpu().numpy().astype(int)
                for box, score, cls_id in zip(boxes, scores, classes):
                    class_name = "pneumonia" if cls_id == 0 else f"class_{cls_id}"
                    results_list.append({"class": class_name, "probability": float(score), "bbox": box.tolist()})

        elif algo_type.lower() == "faster_rcnn":
            input_tensor, _ = preprocess_image_from_bytes(contents, file.filename)
            with torch.no_grad():
                predictions = model(input_tensor)[0]
            keep = predictions['scores'] > threshold
            boxes = predictions['boxes'][keep].cpu().numpy()
            scores = predictions['scores'][keep].cpu().numpy()
            labels = predictions['labels'][keep].cpu().numpy()
            for box, score, label in zip(boxes, scores, labels):
                class_name = "pneumonia" if label == 1 else f"class_{label}"
                results_list.append({"class": class_name, "probability": float(score), "bbox": box.tolist()})
        
        else: # torchscript
            input_tensor, _ = preprocess_image_from_bytes(contents, file.filename)
            with torch.no_grad():
                preds = model(input_tensor)
                # 兼容性解析
                if isinstance(preds, dict):
                    keep = preds.get('scores', torch.tensor([])).cpu() > threshold
                    for box, score, label in zip(preds['boxes'][keep], preds['scores'][keep], preds['labels'][keep]):
                        results_list.append({"class": f"class_{label}", "probability": float(score), "bbox": box.tolist()})

        return JSONResponse(content={"predictions": results_list})

    except Exception as e:
        logger.exception("动态推理失败")
        raise HTTPException(status_code=500, detail=str(e))

# -------------------- 兼容遗留固化端点 --------------------
@app.post("/predict")
async def predict_faster_rcnn(
    file: UploadFile = File(..., description="图片文件"),
    threshold: float = Query(0.3, description="置信度阈值")
):
    """使用 Faster R‑CNN 模型进行肺炎检测"""
    # 👇 【关键修复点】：确保不再报 NameError
    try:
        faster_rcnn_model = get_model_instance("default_faster", "faster_rcnn", CHECKPOINT_PATH)
    except Exception as e:
        logger.error(f"模型自动加载失败: {e}")
        faster_rcnn_model = None

    if faster_rcnn_model is None:
        raise HTTPException(status_code=503, detail="Faster R‑CNN 模型尚未加载完成")

    allowed_extensions = {'.jpg', '.jpeg', '.png', '.dcm'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"不支持格式：{file_ext}")

    try:
        contents = await file.read()
        input_tensor, _ = preprocess_image_from_bytes(contents, file.filename)
        with torch.no_grad(), torch.autocast(device_type=DEVICE.type, enabled=False):
            predictions = faster_rcnn_model(input_tensor)[0]

        keep = predictions['scores'] > threshold
        boxes = predictions['boxes'][keep].cpu().numpy()
        scores = predictions['scores'][keep].cpu().numpy()
        labels = predictions['labels'][keep].cpu().numpy()

        results = []
        for box, score, label in zip(boxes, scores, labels):
            results.append({
                "class": "pneumonia" if label == 1 else f"class_{label}",
                "probability": float(score),
                "bbox": box.tolist()
            })
        return JSONResponse(content={"predictions": results})
    except Exception as e:
        logger.exception("推理发生异常")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_yolo")
async def predict_yolo(
    file: UploadFile = File(..., description="图片文件"),
    threshold: float = Query(0.08, description="置信度阈值"),
    iou_threshold: float = Query(0.45, description="IoU 阈值")
):
    """使用 YOLOv8 模型进行肺炎检测"""
    try:
        yolo_model = get_model_instance("default_yolo", "yolov8", YOLO_CHECKPOINT_PATH)
    except:
        yolo_model = None

    if yolo_model is None:
        raise HTTPException(status_code=503, detail="YOLOv8 模型尚未加载完成")

    allowed_extensions = {'.jpg', '.jpeg', '.png', '.dcm'}
    if Path(file.filename).suffix.lower() not in allowed_extensions:
        raise HTTPException(status_code=400, detail="不支持格式")

    try:
        contents = await file.read()
        img = load_image_for_yolo(contents, file.filename)
        results = yolo_model.predict(source=img, conf=threshold, iou=iou_threshold, verbose=False, device=DEVICE.type)
        predictions = []
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            scores = results[0].boxes.conf.cpu().numpy()
            classes = results[0].boxes.cls.cpu().numpy().astype(int)
            for box, score, cls_id in zip(boxes, scores, classes):
                predictions.append({
                    "class": "pneumonia" if cls_id == 0 else f"class_{cls_id}",
                    "probability": float(score),
                    "bbox": box.tolist()
                })
        return JSONResponse(content={"predictions": predictions})
    except Exception as e:
        logger.exception("YOLO 推理异常")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dicom_to_jpg")
async def dicom_to_jpg(file: UploadFile = File(...)):
    """DICOM 转 JPEG — 不预测，只转换"""
    try:
        contents = await file.read()
        ds = pydicom.dcmread(io.BytesIO(contents))
        img = ds.pixel_array
        # 归一化到 0-255
        if img.dtype != np.uint8:
            img = ((img - img.min()) / (img.max() - img.min() + 1e-8) * 255).astype(np.uint8)
        # RGB 处理
        if len(img.shape) == 3 and img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        _, buf = cv2.imencode(".jpg", img)
        return Response(content=buf.tobytes(), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    """健康检查端点"""
    return {
        "status": "ok",
        "device": str(DEVICE),
        "cached_models_count": len(MODEL_CACHE.cache),
        "cached_models": list(MODEL_CACHE.cache.keys())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)