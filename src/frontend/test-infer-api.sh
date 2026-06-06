#!/bin/bash
# 测试推理结果API
TOKEN="Bearer test-token-123"
echo "Testing /api/v1/infer_result/get endpoint..."
curl -s -H "Authorization: $TOKEN" http://localhost:8080/api/v1/infer_result/get | jq '.' | head -100
