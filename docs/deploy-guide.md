# OpenClaw + fenxi-service 部署指引

## 概述

本文档介绍如何在云服务器（Ubuntu 22.04/24.04）上部署以下服务：

- **OpenClaw Gateway**：AI Agent 网关，提供 Dashboard 和对话功能
- **fenxi-service**：自定义 MCP 服务，提供考试数据分析工具
- **模型**：DeepSeek（deepseek-chat）

---

## 一、云服务器准备

### 1.1 服务器要求

| 项目 | 最低配置 |
|------|---------|
| CPU | 2 核 |
| 内存 | 4 GB |
| 磁盘 | 40 GB |
| 系统 | Ubuntu 22.04 / 24.04 LTS |

### 1.2 系统更新

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

---

## 二、安装 Node.js 22

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc

# 安装 Node 22
nvm install 22
nvm use 22
nvm alias default 22

# 验证
node -v   # 应显示 v22.x.x
npm -v    # 应显示 10.x.x
```

---

## 三、安装 OpenClaw

```bash
npm install -g openclaw

# 验证
openclaw --version
```

### 3.1 初始化配置

```bash
openclaw setup
```

按提示完成初始化。或手动创建配置文件：

```bash
mkdir -p ~/.openclaw/agents/main/agent
```

### 3.2 配置 openclaw.json

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "你的token（openssl rand -hex 24 生成）"
    }
  },
  "auth": {
    "profiles": {
      "deepseek:default": {
        "provider": "deepseek",
        "mode": "api_key"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "deepseek/deepseek-chat"
      },
      "models": {
        "deepseek/deepseek-chat": {}
      },
      "compaction": {
        "mode": "safeguard"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  },
  "messages": {
    "ackReactionScope": "group-mentions"
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  }
}
```

### 3.3 配置 DeepSeek API Key

编辑 `~/.openclaw/agents/main/agent/auth-profiles.json`：

```json
{
  "version": 1,
  "profiles": {
    "deepseek:default": {
      "type": "api_key",
      "provider": "deepseek",
      "key": "你的DeepSeek API Key"
    }
  },
  "lastGood": {
    "deepseek": "deepseek:default"
  }
}
```

> DeepSeek API Key 获取地址：https://platform.deepseek.com

### 3.4 配置 Gemini 模型（可选）

如果想使用 Google Gemini 模型（有免费额度），：

**1) 获取 API Key**

访问 https://aistudio.google.com/apikey ，登录 Google 账号，点击 **Create API Key**。

**2) 修改 openclaw.json**

在 `auth.profiles` 中添加 Google 配置，将 `agents.defaults.model.primary` 改为 Gemini 模型：

```json
{
  "auth": {
    "profiles": {
      "google:default": {
        "provider": "google",
        "mode": "api_key"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-2.5-flash"
      },
      "models": {
        "google/gemini-2.5-flash": {}
      },
      "compaction": {
        "mode": "safeguard"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  }
}
```

**3) 配置 API Key**

编辑 `~/.openclaw/agents/main/agent/auth-profiles.json`：

```json
{
  "version": 1,
  "profiles": {
    "google:default": {
      "type": "api_key",
      "provider": "google",
      "key": "你的Gemini API Key"
    }
  },
  "lastGood": {
    "google": "google:default"
  }
}
```

> **注意**：
> - `gemini-2.5-flash` 免费额度较大，推荐使用
> - `gemini-2.5-pro` 功能更强但免费额度较少，容易触发配额限制
> - 免费层有每分钟请求数限制，如果遇到 429 错误，稍后重试即可

---

## 四、部署 fenxi-service（MCP 服务）

### 4.1 拉取代码

```bash
cd ~
git clone https://github.com/kingsonCai/code_stock.git
cd code_stock
```

> MCP 服务代码位于仓库中的 `my-mcp-server/` 目录（根据实际路径调整）

### 4.2 安装依赖

```bash
cd /path/to/my-mcp-server
npm install
```

### 4.3 验证 MCP 服务

```bash
node server.js
# 应无报错，按 Ctrl+C 退出
```

### 4.4 注册 MCP 服务到 OpenClaw

```bash
openclaw mcp set fenxi-service '{"command":"node","args":["/home/你的用户名/code/path/to/my-mcp-server/server.js"]}'
```

> **注意**：args 里的路径必须是**绝对路径**

验证：

```bash
openclaw mcp list
# 应显示：fenxi-service
```

---

## 五、配置 OpenClaw 为系统服务

### 5.1 创建 systemd 服务

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/openclaw-gateway.service << 'EOF'
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/home/你的用户名/.nvm/versions/node/v22.22.1/bin/node /home/你的用户名/.nvm/versions/node/v22.22.1/lib/node_modules/openclaw/dist/index.js gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group
Environment=HOME=/home/你的用户名
Environment=TMPDIR=/tmp
Environment=NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
Environment=PATH=/home/你的用户名/.nvm/versions/node/v22.22.1/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
EOF
```

> **注意**：将 `你的用户名` 和 Node 版本号替换为实际值
>
> 如果云服务器在中国大陆，需要加代理环境变量：
> ```
> Environment=HTTP_PROXY=http://你的代理地址:端口
> Environment=HTTPS_PROXY=http://你的代理地址:端口
> ```

### 5.2 启用 linger（让用户服务在退出登录后继续运行）

```bash
sudo loginctl enable-linger $(whoami)
```

### 5.3 启动服务

```bash
systemctl --user daemon-reload
systemctl --user enable openclaw-gateway.service
systemctl --user start openclaw-gateway.service
```

### 5.4 检查状态

```bash
systemctl --user status openclaw-gateway.service
# 应显示 Active: active (running)

ss -tlnp | grep 18789
# 应显示 LISTEN
```

---

## 六、配置 Nginx 反向代理（可选，推荐）

如果需要通过域名或 HTTPS 访问 Dashboard：

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 6.1 创建 Nginx 配置

```bash
sudo cat > /etc/nginx/sites-available/openclaw << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6.2 配置 HTTPS（有域名时）

```bash
sudo certbot --nginx -d your-domain.com
```

### 6.3 配置防火墙

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 七、验证部署

### 7.1 本地验证

```bash
curl http://127.0.0.1:18789
# 应返回 HTML 内容
```

### 7.2 浏览器访问

```
http://你的服务器IP/#token=你的gateway-token
```

或配置了域名后：

```
https://your-domain.com/#token=你的gateway-token
```

### 7.3 检查 MCP 服务

在 Dashboard 对话中发送消息，确认：
- DeepSeek 模型正常回复
- fenxi-service 的工具可用

---

## 八、常用运维命令

```bash
# 查看服务状态
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -f

# 重启服务
systemctl --user restart openclaw-gateway.service

# 停止服务
systemctl --user stop openclaw-gateway.service

# 更新 OpenClaw
npm update -g openclaw
systemctl --user restart openclaw-gateway.service

# 更新 fenxi-service 代码
cd /path/to/my-mcp-server
git pull
npm install
systemctl --user restart openclaw-gateway.service

# 查看 MCP 服务列表
openclaw mcp list

# 健康检查
openclaw doctor
```

---

## 九、配置文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 主配置 | `~/.openclaw/openclaw.json` | Gateway、模型、MCP 等配置 |
| API Key | `~/.openclaw/agents/main/agent/auth-profiles.json` | DeepSeek API Key |
| systemd 服务 | `~/.config/systemd/user/openclaw-gateway.service` | 系统服务配置 |

---

## 十、故障排查

### Gateway 启动失败

```bash
# 查看日志
journalctl --user -u openclaw-gateway.service -n 30

# 常见原因：
# 1. gateway.mode 未设置 → 在 openclaw.json 中添加 "gateway.mode": "local"
# 2. Node 版本过低 → 需要 Node 22+
# 3. 端口被占用 → ss -tlnp | grep 18789
```

### 模型调用失败（网络错误）

```bash
# DeepSeek
curl -s https://api.deepseek.com/v1/models

# Gemini
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=你的API Key"

# 如果需要代理，在 systemd 服务中添加：
# Environment=HTTP_PROXY=http://代理地址:端口
# Environment=HTTPS_PROXY=http://代理地址:端口
```

### Gemini 配额不足（429 错误）

```
API rate limit reached. Please try again later.
```

- 免费层有请求频率限制，等待几分钟后重试
- 考虑切换到 `gemini-2.5-flash`（免费额度更大）
- 或升级为付费计划：https://ai.google.dev/pricing

### MCP 服务未加载

```bash
# 确认路径正确
node /path/to/my-mcp-server/server.js

# 确认已注册
openclaw mcp list
```
