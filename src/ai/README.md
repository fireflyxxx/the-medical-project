## 模型权重文件过大上传不了，下载链接为`https://www.kaggle.com/code/shubhamd13/fasterrcnn/output`，文件名001.pth

## train_api使用

1. `pip install -r requirements.txt`
2. `python train_api.py`
3. 向`/train/start`发送POST请求，
   ```Body:{ "data_root": "数据集上级目录", "epochs": 5, "batch_size": 12, "lr": 0.005 }```
   响应返回格式：
   ```
   {
       "task_id": "cddcdb17-769f-4eb8-b6e3-cf27923c0724",
       "status": "pending",
       "current_epoch": null,
       "train_loss": null,
       "val_loss": null,
       "message": "Training task submitted",
       "result": null
   }
   ```
4. 向`/train/status/task_id`发送GET请求，
   响应返回格式：
   ```
   {
       "task_id": "cddcdb17-769f-4eb8-b6e3-cf27923c0724",
       "status": "running",
       "current_epoch": 0,
       "train_loss": null,
       "val_loss": null,
       "message": "",
       "result": null
   }
   ```

## predict_api使用

1. `pip install -r requirements.txt`
2. `python pridict_api.py`
3. 向`/pridict?threshold=0.5`发送POST请求，`threshold为置信度阈值参数（可选，默认0.3）`
   `response = requests.post(api_url, params=params, files=files)`
   文件应为jpg/png/dcm格式的512*512的医学影像图片
4. 响应返回格式：
   ```
   {
       "predictions": [
           {
               "class": "pneumonia",
               "probability": 0.95,
               "bbox": [120, 80, 300, 250]
           }
       ]
   }
   ```
