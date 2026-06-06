# 用法：python infer.py --image /path/to/image.jpg --checkpoint /path/to/checkpoint.pth --threshold 0.3

import argparse
import json
import time
import torch
import torchvision
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
import numpy as np
import cv2
from pathlib import Path
import pydicom

# -------------------- 固定随机种子（可复现性）--------------------
SEED = 42
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# -------------------- 模型加载函数 --------------------
def load_model(checkpoint_path, device):
    """
    加载模型权重，兼容：
    - 完整训练检查点（包含 "model_state_dict" 键）
    - 直接保存的 state_dict
    - notebook 中保存的含 "model" 键的字典
    """
    # 构建模型结构（必须与训练时完全一致）
    model = fasterrcnn_resnet50_fpn(weights=None)
    in_ch = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_ch, num_classes=2)  # 背景 + 肺炎
    model.rpn.anchor_generator.sizes = ((16, 32, 64, 128, 256),)  # 与训练一致

    # 加载检查点文件
    checkpoint = torch.load(checkpoint_path, map_location="cpu")

    # 根据键名加载权重
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        # 训练脚本保存的完整检查点
        model.load_state_dict(checkpoint["model_state_dict"])
        epoch = checkpoint.get("epoch", "unknown")
        print(f"已加载训练检查点 (epoch {epoch})")
    elif isinstance(checkpoint, dict) and "model" in checkpoint:
        # 某些笔记本格式
        model.load_state_dict(checkpoint["model"])
        print("已加载模型权重 (键名 'model')")
    else:
        # 直接保存的 state_dict
        model.load_state_dict(checkpoint)
        print("已加载模型权重 (直接 state_dict)")

    model.to(device)
    model.eval()
    return model

# -------------------- 图像预处理函数 --------------------
def preprocess_image(image_path, device):
    """
    读取图片，转换为灰度图，归一化到 [0,1]，并转为模型输入格式 (1,3,H,W)
    支持 .dcm 文件（DICOM）和常见图片格式
    """
    path = Path(image_path)
    if path.suffix.lower() == '.dcm':
        # DICOM 文件
        ds = pydicom.dcmread(path)
        img = ds.pixel_array.astype(np.float32)
        print(f"读取 DICOM 图像，原始范围: min={img.min():.2f}, max={img.max():.2f}")
    else:
        # 普通图片（jpg/png等）
        img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"无法读取图片: {image_path}")
        img = img.astype(np.float32)
        print(f"读取普通图像，原始范围: min={img.min():.2f}, max={img.max():.2f}")

    # 归一化到 [0,1]（与训练时相同）
    img_min, img_max = img.min(), img.max()
    if img_max - img_min < 1e-6:
        print("图像为常量，无法归一化，设为全0")
        img = np.zeros_like(img)
    else:
        img = (img - img_min) / (img_max - img_min + 1e-6)

    # 转为 3 通道（复制三份）
    img = np.stack([img, img, img], axis=0)  # shape: (3, H, W)
    # 转为 tensor 并添加 batch 维度
    tensor = torch.from_numpy(img).unsqueeze(0).to(device)
    return tensor

# -------------------- 可视化与保存 --------------------
def visualize_and_save(original_img_path, predictions, output_img_path, threshold):
    """
    在原图上绘制检测框，并保存图片
    """
    path = Path(original_img_path)
    if path.suffix.lower() == '.dcm':
        ds = pydicom.dcmread(path)
        img = ds.pixel_array
        # 转为彩色图以便绘制彩色框
        img_color = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    else:
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"无法读取图片用于可视化: {original_img_path}")
        img_color = img.copy()

    drawn = False
    for pred in predictions:
        if pred['probability'] < threshold:
            continue
        drawn = True
        x1, y1, x2, y2 = pred['bbox']
        score = pred['probability']
        # 绘制矩形
        cv2.rectangle(img_color, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
        # 标注概率
        cv2.putText(img_color, f"{score:.2f}", (int(x1), int(y1)-5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    if not drawn:
        print("没有符合条件的检测框，输出原图（无框）")
    cv2.imwrite(str(output_img_path), img_color)
    print(f"可视化图片已保存至: {output_img_path}")

# -------------------- 主函数 --------------------
def main():
    parser = argparse.ArgumentParser(description="Faster R-CNN 肺炎检测推理")
    parser.add_argument("--image", type=str, required=True, help="输入图片路径")
    parser.add_argument("--checkpoint", type=str, required=True, help="模型权重文件 (.pth)")
    parser.add_argument("--threshold", type=float, default=0.3, help="置信度阈值")
    parser.add_argument("--output_json", type=str, default="detections.json", help="输出 JSON 文件路径")
    parser.add_argument("--output_image", type=str, default=None, help="输出图片路径（默认在原文件名后加 _detected）")
    parser.add_argument("--device", type=str, default="cuda", choices=["cuda", "cpu"], help="推理设备")
    parser.add_argument("--warmup", type=int, default=5, help="预热次数（不计时）")
    parser.add_argument("--repeat", type=int, default=1, help="重复推理次数（取平均时间）")
    args = parser.parse_args()

    # 设置设备
    device = torch.device(args.device if torch.cuda.is_available() and args.device == "cuda" else "cpu")
    print(f"使用设备: {device}")

    # 加载模型
    model = load_model(args.checkpoint, device)

    # 预处理图片
    input_tensor = preprocess_image(args.image, device)

    # -------------------- 预热（可选）--------------------
    if args.warmup > 0:
        print(f"预热 {args.warmup} 次...")
        for _ in range(args.warmup):
            _ = model(input_tensor)
        if device.type == 'cuda':
            torch.cuda.synchronize()
        print("预热完成")

    # -------------------- 推理并计时 --------------------
    total_time = 0.0
    for i in range(args.repeat):
        if device.type == 'cuda':
            torch.cuda.synchronize()
        start_time = time.time()

        with torch.no_grad(), torch.amp.autocast(device_type=device.type):
            predictions = model(input_tensor)[0]

        if device.type == 'cuda':
            torch.cuda.synchronize()
        end_time = time.time()

        iter_time = end_time - start_time
        total_time += iter_time
        if args.repeat > 1:
            print(f"  第 {i+1} 次推理时间: {iter_time:.4f} 秒")

    avg_time = total_time / args.repeat
    print(f"平均推理时间 ({args.repeat} 次): {avg_time:.4f} 秒")

    # -------------------- 后处理 --------------------
    boxes = predictions['boxes'].cpu().numpy()
    scores = predictions['scores'].cpu().numpy()
    labels = predictions['labels'].cpu().numpy()

    print(f"模型输出 {len(boxes)} 个候选框")
    if len(boxes) > 0:
        print("   分数范围:", scores.min(), "~", scores.max())
        print("   前3个框坐标:", boxes[:3])

    # 根据阈值过滤
    keep = scores > args.threshold
    boxes = boxes[keep]
    scores = scores[keep]
    labels = labels[keep]

    results = []
    for box, score, label in zip(boxes, scores, labels):
        class_name = "pneumonia" if label == 1 else f"class_{label}"
        results.append({
            "class": class_name,
            "probability": float(score),
            "bbox": box.tolist()   # [x1, y1, x2, y2]
        })

    print(f"过滤后保留 {len(results)} 个框")

    # 保存 JSON
    with open(args.output_json, "w") as f:
        json.dump({"predictions": results}, f, indent=2)
    print(f"检测结果已保存至: {args.output_json}")

    # 确定输出图片路径
    if args.output_image is None:
        input_path = Path(args.image)
        output_img_path = input_path.parent / f"{input_path.stem}_detected{input_path.suffix}"
    else:
        output_img_path = Path(args.output_image)

    # 可视化并保存图片
    visualize_and_save(args.image, results, output_img_path, args.threshold)

if __name__ == "__main__":
    main()