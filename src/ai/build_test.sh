#!/bin/bash
ssh root@116.62.219.49 'docker run --rm -v /opt/ai:/app python:3.10-slim sh -c "cd /app && pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple"'
