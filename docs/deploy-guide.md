# Code Stock 部署指引

## 概述

本项目是一个量化交易平台，包含以下服务：

- **backend**：Koa + TypeScript 后端服务（端口 3000）
- **frontend**：Vue 3 + Vite 前端（开发模式或静态部署）
- **python-engine**：Python 引擎（策略回测、数据处理）
- **基础设施**：MongoDB / PostgreSQL + Redis（通过 Docker Compose 部署）

---

## 一、服务器要求

| 项目 | 最低配置 |
|------|---------|
| CPU | 2 核 |
| 内存 | 4 GB |
| 磁盘 | 40 GB |
| 系统 | Ubuntu 22.04 / 24.04 LTS |

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

---

## 二、安装基础环境

### 2.1 Node.js 22

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc

nvm install 22
nvm use 22
nvm alias default 22

node -v   # v22.x.x
npm -v    # 10.x.x
```

### 2.2 Python 3

```bash
sudo apt install -y python3 python3-pip python3-venv
python3 --version
```

### 2.3 Docker & Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 重新登录使 docker 组生效，或执行：
newgrp docker

# 验证
docker --version
docker compose version
```

---

## 三、拉取代码

```bash
cd ~
git clone https://github.com/kingsonCai/code_stock.git
cd code_stock
```

---

## 四、启动基础设施（MongoDB / PostgreSQL / Redis）

```bash
cd ~/code_stock
docker compose up -d
```

等待服务就绪：

```bash
docker compose ps
# 三个服务状态应为 healthy
```

| 服务 | 端口 | 默认账号 |
|------|------|---------|
| MongoDB | 27017 | admin / admin123 |
| PostgreSQL | 5432 | admin / admin123 |
| Redis | 6379 | 无密码 |

---

## 五、启动 Backend

### 5.1 安装依赖

```bash
cd ~/code_stock/backend
npm install
```

### 5.2 配置环境变量

```bash
cp .env.example .env   # 如果没有 .env，参考下面的模板
```

编辑 `backend/.env`，生产环境注意修改以下项：

```env
# 环境配置
NODE_ENV=production

# 服务器配置
PORT=3000
HOST=0.0.0.0

# JWT 配置（务必修改为随机字符串）
JWT_SECRET=用 openssl rand -hex 32 生成
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 数据库配置 - MongoDB
MONGO_URI=mongodb://admin:admin123@localhost:27017/quant_trading?authSource=admin
MONGO_DB_NAME=quant_trading

# 数据库配置 - PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=quant_trading

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 数据库类型选择 (mongodb | postgresql)
DATABASE_TYPE=mongodb

# Python 引擎配置
PYTHON_PATH=python3
PYTHON_ENGINE_PATH=../python-engine

# 日志级别
LOG_LEVEL=warn
```

### 5.3 构建并启动

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

验证：

```bash
curl http://localhost:3000
```

---

## 六、启动 Frontend

### 6.1 安装依赖

```bash
cd ~/code_stock/frontend
npm install
```

### 6.2 配置

如需修改后端 API 地址，编辑 frontend 中的环境配置文件，将 API 地址指向 backend 服务。

### 6.3 启动

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
# 构建产物在 dist/ 目录，可用 Nginx 托管
```

---

## 七、Python 引擎

### 7.1 安装依赖

```bash
cd ~/code_stock/python-engine

# 建议使用虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 7.2 注意

`ta-lib` 依赖 C 库，需先安装：

```bash
sudo apt install -y libta-lib0-dev
```

如果安装失败，可参考：https://github.com/ta-lib/ta-lib-python

---

## 八、生产部署（推荐）

### 8.1 使用 systemd 管理 backend

```bash
cat > /tmp/code-stock-backend.service << EOF
[Unit]
Description=Code Stock Backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/home/$USER/code_stock/backend
ExecStart=/home/$USER/.nvm/versions/node/v22.22.1/bin/node dist/app.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo cp /tmp/code-stock-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable code-stock-backend
sudo systemctl start code-stock-backend
```

### 8.2 Nginx 反向代理

```bash
sudo apt install -y nginx
```

```bash
sudo cat > /etc/nginx/sites-available/code-stock << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /home/你的用户名/code_stock/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/code-stock /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 8.3 HTTPS（有域名时）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 九、一键启动 / 停止

```bash
# 启动所有服务
cd ~/code_stock
docker compose up -d                    # 基础设施
cd backend && npm run build && npm start # 后端（生产模式）
cd frontend && npm run build             # 前端构建

# 停止所有服务
docker compose down                      # 基础设施
sudo systemctl stop code-stock-backend   # 后端
```

---

## 十、常用运维命令

```bash
# 查看后端状态
sudo systemctl status code-stock-backend

# 查看后端日志
sudo journalctl -u code-stock-backend -f

# 重启后端
sudo systemctl restart code-stock-backend

# 查看 Docker 容器状态
docker compose ps

# 查看 Docker 日志
docker compose logs -f mongodb
docker compose logs -f postgres
docker compose logs -f redis

# 更新代码并重启
cd ~/code_stock
git pull
cd backend && npm install && npm run build
sudo systemctl restart code-stock-backend
cd ../frontend && npm install && npm run build
```

---

## 十一、配置文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 环境变量 | `backend/.env` | 数据库、JWT、Redis 等配置 |
| Docker Compose | `docker-compose.yml` | 基础设施服务编排 |
| systemd 服务 | `/etc/systemd/system/code-stock-backend.service` | 后端系统服务 |
| Nginx 配置 | `/etc/nginx/sites-available/code-stock` | 反向代理配置 |

---

## 十二、故障排查

### 后端启动失败

```bash
# 查看日志
sudo journalctl -u code-stock-backend -n 30

# 常见原因：
# 1. 数据库未就绪 → docker compose ps 确认容器健康
# 2. .env 配置错误 → 检查数据库连接字符串
# 3. 端口被占用 → ss -tlnp | grep 3000
```

### 数据库连接失败

```bash
# 测试 MongoDB 连接
docker exec quant_mongo mongosh -u admin -p admin123

# 测试 PostgreSQL 连接
docker exec quant_postgres psql -U admin -d quant_trading

# 测试 Redis 连接
docker exec quant_redis redis-cli ping
```

### Docker 服务异常

```bash
# 重启所有容器
docker compose restart

# 查看某个容器日志
docker compose logs mongodb --tail 50

# 重建容器
docker compose down && docker compose up -d
```
