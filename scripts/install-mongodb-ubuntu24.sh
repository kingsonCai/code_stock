#!/bin/bash
# MongoDB 7.0 安装脚本 (Ubuntu 24.04 + libssl1.1)
set -e

echo "=== 安装 libssl1.1 ==="

# 从 Ubuntu 22.04 源下载 libssl1.1
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb -O /tmp/libssl1.1.deb

sudo dpkg -i /tmp/libssl1.1.deb

echo "=== 安装 MongoDB 7.0 ==="

# 导入公钥
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# 添加源 (使用 jammy/22.04 源)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

echo "=== 启动 MongoDB ==="
sudo systemctl start mongod
sudo systemctl enable mongod

echo ""
echo "=== 完成 ==="
echo "连接: mongosh"
