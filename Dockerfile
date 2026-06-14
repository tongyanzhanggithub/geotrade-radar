# GeoTrade Radar — 零依赖 Node 服务（内置 node:sqlite，需 Node ≥ 22.5）
FROM node:24-slim

WORKDIR /app

# 复制项目（依据 .dockerignore 排除密钥/备份/开发脚本）
COPY . .

# 运行配置
#  HOST=0.0.0.0  对外监听
#  DATA_DIR=/data 用户库与缓存写入持久磁盘（托管平台把磁盘挂到 /data）
#  PORT 由平台注入；这里给本地 docker run 一个默认值
ENV HOST=0.0.0.0 \
    DATA_DIR=/data \
    PORT=8080 \
    NODE_ENV=production

RUN mkdir -p /data
EXPOSE 8080

# 健康检查：命中 /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
