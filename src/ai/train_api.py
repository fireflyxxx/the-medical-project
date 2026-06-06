import asyncio
import uuid
import argparse
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import Manager
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# 导入训练函数
from train_fasterrcnn import train_task



# 使用 lifespan 上下文管理器来管理应用生命周期中的资源
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时创建 manager 和 executor
    manager = Manager()
    progress_dict = manager.dict()
    executor = ProcessPoolExecutor(max_workers=1)

    # 将资源存储在 app.state 中
    app.state.manager = manager
    app.state.progress_dict = progress_dict
    app.state.executor = executor

    print("Manager and Executor started.")
    yield
    # 关闭时清理
    executor.shutdown(wait=True)
    manager.shutdown()
    print("Manager and Executor shut down.")

app = FastAPI(title="RSNA Faster R-CNN Training API", lifespan=lifespan)

class TrainRequest(BaseModel):
    data_root: str
    epochs: int = 3
    batch_size: int = 12
    val_batch_size: int = 4
    lr: float = 0.005
    num_workers: int = 4
    debug: bool = False
    save_dir: str = "./checkpoints"

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    current_epoch: Optional[int] = None
    train_loss: Optional[float] = None
    val_loss: Optional[float] = None
    message: Optional[str] = None
    result: Optional[str] = None

@app.post("/train/start", response_model=TaskStatusResponse)
async def start_training(request: TrainRequest):
    """
    启动一个新的训练任务，返回任务 ID 和初始状态。
    """
    task_id = str(uuid.uuid4())
    # 从 app.state 获取共享字典
    progress_dict = app.state.progress_dict

    # 初始状态
    progress_dict[task_id] = {
        "status": "pending",
        "current_epoch": 0,
        "train_loss": None,
        "val_loss": None,
        "message": "Task created, waiting to start",
        "result": None
    }

    # 将参数转换为 Namespace
    args = argparse.Namespace(**request.dict())

    # 提交任务到进程池
    executor = app.state.executor
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, train_task, task_id, args, progress_dict)

    return TaskStatusResponse(
        task_id=task_id,
        status="pending",
        message="Training task submitted"
    )

@app.get("/train/status/{task_id}", response_model=TaskStatusResponse)
async def get_status(task_id: str):
    """
    根据任务 ID 查询训练状态和进度。
    """
    progress_dict = app.state.progress_dict
    if task_id not in progress_dict:
        raise HTTPException(status_code=404, detail="Task ID not found")
    task_info = progress_dict[task_id]
    return TaskStatusResponse(
        task_id=task_id,
        status=task_info["status"],
        current_epoch=task_info.get("current_epoch"),
        train_loss=task_info.get("train_loss"),
        val_loss=task_info.get("val_loss"),
        message=task_info.get("message"),
        result=task_info.get("result")
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)