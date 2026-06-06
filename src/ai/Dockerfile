FROM python:3.10-slim

WORKDIR /app

# 1. 👇 暴力覆盖 APT 源文件，只用阿里云！绝不跑偏！
RUN rm -rf /etc/apt/sources.list.d/* && \
    echo "deb https://mirrors.aliyun.com/debian/ bullseye main" > /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bullseye-security main" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bullseye-updates main" >> /etc/apt/sources.list

# 2. 安装底层图形库（现在走国内阿里云内网，几秒钟搞定）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 libxcb1 libx11-xcb1 \
    libxcb-render0 libxcb-shm0 libxcb-xfixes0 \
    && rm -rf /var/lib/apt/lists/*

# 3. 配置 pip 阿里云源
ENV PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
ENV PIP_TIMEOUT=600

# 4. 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# 5. 复制代码与模型
COPY . .

EXPOSE 8000

CMD ["uvicorn", "multi_predict:app", "--host", "0.0.0.0", "--port", "8000"]
