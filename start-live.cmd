@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GeoTrade Radar Live Data

set "BUNDLED_NODE=C:\Users\13638\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BUNDLED_NODE%" (
  set "NODE_EXE=%BUNDLED_NODE%"
) else (
  set "NODE_EXE=node"
)

rem 管理后台口令（admin.html 登录用），仅本地使用，公开部署前请修改
set "ADMIN_TOKEN=change-me-before-deploy"

rem 服务端口（4173 常被 Vite 等占用，改用较空闲端口）
set "PORT=8288"

start "" "http://127.0.0.1:%PORT%"
"%NODE_EXE%" server.js

echo.
echo GeoTrade Radar ?????????????
pause >nul
