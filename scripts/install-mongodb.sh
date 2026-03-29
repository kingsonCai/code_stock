#!/bin/bash
# MongoDB 安装脚本 (Ubuntu 24.04)

set -e

echo "=== 安装 MongoDB 7.0 ==="

# 1. 导入 MongoDB 公钥
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# 2. 添加 MongoDB 源
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. 更新并安装
sudo apt update
sudo apt install -y mongodb-org

# 4. 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod

# 5. 验证
sudo systemctl status mongod

echo ""
echo "=== 安装完成 ==="
echo "连接命令: mongosh"
