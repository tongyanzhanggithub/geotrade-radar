#!/usr/bin/env bash
# =====================================================================
# GeoTrade Radar 一键部署脚本（Ubuntu / Debian 轻量服务器，公网IP直连）
#
# 用法：先把项目上传到服务器，然后在项目目录里以 root 运行：
#   cd /opt/geotrade
#   sudo PORT=80 ADMIN_TOKEN='改成你的强口令' bash deploy/setup.sh
#
# 说明：
#   - 自动安装 Node.js 24（项目用到内置 node:sqlite，需要 Node ≥ 22.5）
#   - 用 systemd 守护进程，崩溃自动重启、开机自启
#   - 设置 HOST=0.0.0.0 让外网可访问，PORT/ADMIN_TOKEN 可自定义
# =====================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-80}"
ADMIN_TOKEN="${ADMIN_TOKEN:-test123}"
SERVICE=/etc/systemd/system/geotrade.service

echo "==> 项目目录: $APP_DIR"
echo "==> 端口: $PORT"

if [ "$(id -u)" != "0" ]; then
  echo "请用 root 运行：sudo PORT=$PORT ADMIN_TOKEN='...' bash deploy/setup.sh"
  exit 1
fi

# 1) 基础工具
apt-get update -y
apt-get install -y curl ca-certificates

# 2) 确保 Node 可用且支持 node:sqlite（探测失败就装 Node 24）
if ! command -v node >/dev/null 2>&1 || ! node -e "require('node:sqlite')" >/dev/null 2>&1; then
  echo "==> 安装 Node.js 24 ..."
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
echo "==> Node 版本: $(node -v)"

# 3) 写 systemd 服务
cat > "$SERVICE" <<EOF
[Unit]
Description=GeoTrade Radar
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$(command -v node) $APP_DIR/server.js
Environment=HOST=0.0.0.0
Environment=PORT=$PORT
Environment=ADMIN_TOKEN=$ADMIN_TOKEN
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 4) 启动并设为开机自启
systemctl daemon-reload
systemctl enable geotrade >/dev/null 2>&1 || true
systemctl restart geotrade
sleep 1
systemctl --no-pager --full status geotrade | head -n 15 || true

IP="$(curl -fsS https://api.ipify.org 2>/dev/null || echo '<你的公网IP>')"
echo
echo "================= 部署完成 ================="
if [ "$PORT" = "80" ]; then
  echo " 网站:  http://$IP"
  echo " 后台:  http://$IP/admin.html   （口令：$ADMIN_TOKEN）"
else
  echo " 网站:  http://$IP:$PORT"
  echo " 后台:  http://$IP:$PORT/admin.html   （口令：$ADMIN_TOKEN）"
fi
echo
echo " ⚠️ 别忘了：在云控制台『防火墙 / 安全组』放行 TCP $PORT 端口，否则外网打不开！"
echo " 常用命令："
echo "   journalctl -u geotrade -f      # 看实时日志"
echo "   systemctl restart geotrade     # 重启"
echo "   systemctl stop geotrade        # 停止"
echo "==========================================="
