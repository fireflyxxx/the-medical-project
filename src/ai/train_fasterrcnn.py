import argparse
import random
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
import torchvision
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torch.utils.data import Dataset, DataLoader
from torch.amp import autocast, GradScaler
import pydicom
from pathlib import Path
from sklearn.model_selection import StratifiedKFold
from tqdm.auto import tqdm
import os

# 使用：python train_fasterrcnn.py --data_root /path/to/rsna-data --epochs 5，其他参数设定参考下面

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# ---------- 全局 collate 函数 ----------
def collate_fn(batch):
    """将一批 (img, target) 打包成 (图像列表, 目标列表)"""
    return tuple(zip(*batch))

# ---------- 数据集定义 ----------
class RSNADataset(Dataset):
    def __init__(self, df, root, transforms=None):
        self.img_ids = df.patientId.unique()
        self.df = df
        self.root = Path(root)
        self.tfm = transforms

    def __getitem__(self, idx):
        pid = self.img_ids[idx]
        ds = pydicom.dcmread(self.root / f"{pid}.dcm")
        img = ds.pixel_array.astype("float32")
        img = (img - img.min()) / (img.max() - img.min() + 1e-6)
        img = torch.as_tensor(np.stack([img, img, img]), dtype=torch.float32)

        recs = self.df[self.df.patientId == pid]
        pos = recs[recs.Target == 1]

        if len(pos):
            xyxy = np.column_stack(
                [pos.x, pos.y, pos.x + pos.width, pos.y + pos.height]
            )
            boxes = torch.as_tensor(xyxy, dtype=torch.float32)
            labels = torch.ones((len(boxes),), dtype=torch.int64)
        else:
            boxes = torch.zeros((0, 4), dtype=torch.float32)
            labels = torch.zeros((0,), dtype=torch.int64)

        target = {
            "boxes": boxes,
            "labels": labels,
            "image_id": torch.tensor([idx]),
        }

        if self.tfm:
            img = self.tfm(img)
        return img, target

    def __len__(self):
        return len(self.img_ids)

# ---------- 训练一个 epoch ----------
def run_epoch(loader, model, optimizer=None, scaler=None, train=True, desc="train"):
    model.train(train)
    torch.set_grad_enabled(train)
    running_loss = 0.0
    seen = 0
    bar = tqdm(loader, desc=desc, leave=False)

    for imgs, tgts in bar:
        imgs = [img.cuda(non_blocking=True) for img in imgs]
        tgts = [{k: v.cuda(non_blocking=True) for k, v in t.items()} for t in tgts]

        with autocast(device_type="cuda"):
            loss_dict = model(imgs, tgts)
            loss = sum(loss_dict.values())

        if train:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad(set_to_none=True)

        bs = len(imgs)
        running_loss += loss.item() * bs
        seen += bs
        bar.set_postfix(loss=f"{loss.item():.3f}", avg=f"{running_loss/seen:.3f}")

    return running_loss / seen

# ---------- 主函数 ----------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_root", type=str, required=True)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=12)
    parser.add_argument("--val_batch_size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=0.005)
    parser.add_argument("--num_workers", type=int, default=4)
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--save_dir", type=str, default="./checkpoints")
    args = parser.parse_args()

    data_root = Path(args.data_root)
    train_img_dir = data_root / "stage_2_train_images"
    label_csv = data_root / "stage_2_train_labels.csv"

    if not train_img_dir.exists() or not label_csv.exists():
        raise FileNotFoundError(f"请检查 {train_img_dir} 和 {label_csv} 是否存在。")

    save_dir = Path(args.save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)

    # 加载标签
    df = pd.read_csv(label_csv)
    ids = df.groupby("patientId")["Target"].max().reset_index()

    if args.debug:
        pos_ids = ids[ids.Target == 1].sample(100, random_state=0)
        neg_ids = ids[ids.Target == 0].sample(100, random_state=0)
        ids = pd.concat([pos_ids, neg_ids]).reset_index(drop=True)

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    train_idx, val_idx = next(skf.split(ids.patientId, ids.Target))

    train_ids = ids.patientId.iloc[train_idx]
    val_ids   = ids.patientId.iloc[val_idx]

    train_df = df[df.patientId.isin(train_ids)]
    val_df   = df[df.patientId.isin(val_ids)]

    print(f"Train samples: {len(train_ids)} (pos: {train_ids.isin(train_df[train_df.Target==1].patientId).sum()})")
    print(f"Val samples:   {len(val_ids)} (pos: {val_ids.isin(val_df[val_df.Target==1].patientId).sum()})")

    # 创建数据集和 DataLoader
    train_ds = RSNADataset(train_df, train_img_dir)
    val_ds   = RSNADataset(val_df,   train_img_dir)

    train_dl = DataLoader(
        train_ds, batch_size=args.batch_size, shuffle=True,
        num_workers=args.num_workers, persistent_workers=True,
        collate_fn=collate_fn   # 使用全局函数
    )
    val_dl = DataLoader(
        val_ds, batch_size=args.val_batch_size, shuffle=False,
        num_workers=args.num_workers, persistent_workers=True,
        collate_fn=collate_fn
    )

    # 构建模型
    model = fasterrcnn_resnet50_fpn(weights="DEFAULT")
    in_ch = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_ch, num_classes=2)
    model.rpn.anchor_generator.sizes = ((16, 32, 64, 128, 256),)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    optimizer = torch.optim.SGD(
        model.parameters(), lr=args.lr, momentum=0.9, weight_decay=1e-4
    )
    lr_scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.1)
    scaler = GradScaler()

    # 训练循环
    start_epoch = 1
    for epoch in range(start_epoch, args.epochs + 1):
        train_loss = run_epoch(train_dl, model, optimizer, scaler,
                               train=True, desc=f"E{epoch:02d} Train")
        val_loss   = run_epoch(val_dl,   model, train=False, desc=f"E{epoch:02d} Val")
        lr_scheduler.step()
        print(f"Epoch {epoch:02d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        ckpt_path = save_dir / f"epoch_{epoch:03d}.pth"
        torch.save({
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scaler_state_dict": scaler.state_dict(),
            "train_loss": train_loss,
            "val_loss": val_loss,
        }, ckpt_path)
        print(f"Checkpoint saved to {ckpt_path}")

    # 保存最终模型
    final_path = save_dir / "final_model.pth"
    torch.save(model.state_dict(), final_path)
    print(f"Final model saved to {final_path}")
    
def train_task(task_id: str, args, progress_dict):
    """
    在独立进程中运行的训练任务
    args: 包含训练参数的 Namespace 或字典
    progress_dict: multiprocessing.Manager.dict，用于更新进度
    """
    # 初始化进度
    progress_dict[task_id] = {
        "status": "running",
        "current_epoch": 0,
        "train_loss": None,
        "val_loss": None,
        "message": ""
    }

    try:
        data_root = Path(args.data_root)
        train_img_dir = data_root / "stage_2_train_images"
        label_csv = data_root / "stage_2_train_labels.csv"

        if not train_img_dir.exists() or not label_csv.exists():
            raise FileNotFoundError(f"请检查 {train_img_dir} 和 {label_csv} 是否存在。")

        save_dir = Path(args.save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)

        df = pd.read_csv(label_csv)
        ids = df.groupby("patientId")["Target"].max().reset_index()

        if args.debug:
            pos_ids = ids[ids.Target == 1].sample(100, random_state=0)
            neg_ids = ids[ids.Target == 0].sample(100, random_state=0)
            ids = pd.concat([pos_ids, neg_ids]).reset_index(drop=True)

        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
        train_idx, val_idx = next(skf.split(ids.patientId, ids.Target))

        train_ids = ids.patientId.iloc[train_idx]
        val_ids   = ids.patientId.iloc[val_idx]

        train_df = df[df.patientId.isin(train_ids)]
        val_df   = df[df.patientId.isin(val_ids)]

        train_ds = RSNADataset(train_df, train_img_dir)
        val_ds   = RSNADataset(val_df,   train_img_dir)

        train_dl = DataLoader(
            train_ds, batch_size=args.batch_size, shuffle=True,
            num_workers=args.num_workers, persistent_workers=True,
            collate_fn=collate_fn
        )
        val_dl = DataLoader(
            val_ds, batch_size=args.val_batch_size, shuffle=False,
            num_workers=args.num_workers, persistent_workers=True,
            collate_fn=collate_fn
        )

        model = fasterrcnn_resnet50_fpn(weights="DEFAULT")
        in_ch = model.roi_heads.box_predictor.cls_score.in_features
        model.roi_heads.box_predictor = FastRCNNPredictor(in_ch, num_classes=2)
        model.rpn.anchor_generator.sizes = ((16, 32, 64, 128, 256),)

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)

        optimizer = torch.optim.SGD(
            model.parameters(), lr=args.lr, momentum=0.9, weight_decay=1e-4
        )
        lr_scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.1)
        scaler = GradScaler()

        start_epoch = 1
        for epoch in range(start_epoch, args.epochs + 1):
            train_loss = run_epoch(train_dl, model, optimizer, scaler,
                                   train=True, desc=f"E{epoch:02d} Train")
            val_loss   = run_epoch(val_dl,   model, train=False, desc=f"E{epoch:02d} Val")
            lr_scheduler.step()

            # 更新进度
            progress_dict[task_id]["current_epoch"] = epoch
            progress_dict[task_id]["train_loss"] = train_loss
            progress_dict[task_id]["val_loss"] = val_loss
            progress_dict[task_id]["message"] = f"Epoch {epoch} completed"

            # 保存 checkpoint
            ckpt_path = save_dir / f"epoch_{epoch:03d}.pth"
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "scaler_state_dict": scaler.state_dict(),
                "train_loss": train_loss,
                "val_loss": val_loss,
            }, ckpt_path)

        final_path = save_dir / "final_model.pth"
        torch.save(model.state_dict(), final_path)

        # 任务完成
        progress_dict[task_id]["status"] = "completed"
        progress_dict[task_id]["result"] = str(final_path)
        progress_dict[task_id]["message"] = "Training finished successfully"

    except Exception as e:
        progress_dict[task_id]["status"] = "failed"
        progress_dict[task_id]["message"] = str(e)
        raise

if __name__ == "__main__":
    main()