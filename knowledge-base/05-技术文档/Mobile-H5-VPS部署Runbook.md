---
tags: [技术文档, Mobile-H5, VPS, Docker, Nginx, 部署]
created: 2026-04-29
updated: 2026-05-06
---

# Mobile H5 VPS 部署 Runbook

## 当前线上拓扑

线上入口：

```text
https://starlight.escapemobius.cc/
```

VPS：

```text
root@65.75.220.11
```

服务链路：

```text
Cloudflare / 外层 HTTPS
  → VPS host nginx:80, server_name starlight.escapemobius.cc
  → proxy_pass http://127.0.0.1:4173
  → Docker container starlight-literacy-mobile-h5-1:80
  → /usr/share/nginx/html/src/clients/mobile-h5/
```

> [!warning] 443 前置说明
> 2026-04-29 部署时观察到 VPS 本机 `*:443` 由 `sing-box` 监听，host nginx 当前主要监听 `80`；公网 `https://starlight.escapemobius.cc/` 由 Cloudflare / 现有前置链路进入源站。不要在未确认现有前置规则前直接把 host nginx 改成监听 443，也不要挪动 `/etc/sing-box/config.json`。

## 部署文件

本地仓库新增部署文件：

- `.dockerignore`
- `docker/Dockerfile.mobile-h5`
- `docker/docker-compose.yml`
- `docker/nginx-mobile-h5.conf`
- `deploy/nginx/starlight.escapemobius.cc.conf`

VPS 目标目录：

```text
/opt/apps/starlight-literacy/
```

VPS 关键文件：

```text
/opt/apps/starlight-literacy/docker/docker-compose.yml
/opt/apps/starlight-literacy/docker/Dockerfile.mobile-h5
/opt/apps/starlight-literacy/docker/nginx-mobile-h5.conf
/opt/apps/starlight-literacy/deploy/nginx/starlight.escapemobius.cc.conf
/etc/nginx/sites-available/starlight.escapemobius.cc
/etc/nginx/sites-enabled/starlight.escapemobius.cc
```

容器固定绑定：

```text
127.0.0.1:4173 -> 80
```

这里特意只绑定 `127.0.0.1`，公网流量必须经 host nginx 进入，不直接暴露容器端口。

## 首次部署步骤

从本地项目根目录同步必要文件：

```bash
rsync -aR .dockerignore package.json docker deploy src/clients/mobile-h5 src/shared images root@65.75.220.11:/opt/apps/starlight-literacy/
```

进入 VPS 构建和启动：

```bash
ssh root@65.75.220.11
cd /opt/apps/starlight-literacy
npm run check:h5
docker compose -f docker/docker-compose.yml up -d --build mobile-h5
```

启用 host nginx 站点：

```bash
cp deploy/nginx/starlight.escapemobius.cc.conf /etc/nginx/sites-available/starlight.escapemobius.cc
ln -sfn /etc/nginx/sites-available/starlight.escapemobius.cc /etc/nginx/sites-enabled/starlight.escapemobius.cc
nginx -t
systemctl reload nginx
```

## 日常更新步骤

如果只是更新 H5 代码、共享内容、校验脚本或图片：

```bash
rsync -aR package.json docker deploy src/clients/mobile-h5 src/shared images scripts/check-unit-01-course-model.mjs scripts/check-mobile-h5-speech.mjs root@65.75.220.11:/opt/apps/starlight-literacy/
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && npm run check:h5 && docker compose -f docker/docker-compose.yml up -d --build mobile-h5'
```

> [!warning] 静态资源版本
> 生产域名经过 Cloudflare，`.js / .css / 图片` 当前会长缓存。每次更新 `app.js` 或 `styles.css` 后，必须同步提升 `index.html` 里的查询版本（例如 `app.js?v=19`）以及相关 import 版本；否则公网可能继续命中旧资源。

如果改了 `deploy/nginx/starlight.escapemobius.cc.conf`：

```bash
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && cp deploy/nginx/starlight.escapemobius.cc.conf /etc/nginx/sites-available/starlight.escapemobius.cc && nginx -t && systemctl reload nginx'
```

## 验证命令

VPS 内部验证：

```bash
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && docker compose -f docker/docker-compose.yml ps'
ssh root@65.75.220.11 'curl -I -s http://127.0.0.1:4173/src/clients/mobile-h5/ | sed -n "1,12p"'
ssh root@65.75.220.11 'curl -I -s -H "Host: starlight.escapemobius.cc" http://127.0.0.1/src/clients/mobile-h5/ | sed -n "1,12p"'
```

公网验证：

```bash
curl -L -s -o /dev/null -w 'public_root=%{http_code} %{url_effective}\n' https://starlight.escapemobius.cc/
curl -I -s 'https://starlight.escapemobius.cc/src/clients/mobile-h5/app.js?v=19'
curl -L --http1.1 -sS -o /tmp/starlight-app.js 'https://starlight.escapemobius.cc/src/clients/mobile-h5/app.js?v=19'
rg 'SPEECH_STYLE_PRESETS|speakSegments|SPEECH_PAUSE_MS' /tmp/starlight-app.js
curl -I -s 'https://starlight.escapemobius.cc/src/shared/unit-01.js?v=19'
curl -I -s 'https://starlight.escapemobius.cc/src/shared/unit-01-lessons.js?v=19'
curl -I -s https://starlight.escapemobius.cc/src/clients/mobile-h5/manifest.webmanifest
curl -I -s https://starlight.escapemobius.cc/images/p01-bg-redraw-road-centered-20260426.png
```

2026-04-29 部署后验证结果：

```text
public_root=200 https://starlight.escapemobius.cc/src/clients/mobile-h5/
starlight-literacy-mobile-h5-1 Up, 127.0.0.1:4173->80/tcp
manifest.webmanifest: 200 application/manifest+json
app.js / unit-01.js / P01 背景图: 200
```

## 关键实现约束

- 线上根路径 `/` 由 host nginx 返回 `302 https://$host/src/clients/mobile-h5/`。
- 不让容器负责公网根路径跳转，否则 nginx 可能生成 `http://...` 的绝对 Location，导致 HTTPS 入口降级。
- `docker/nginx-mobile-h5.conf` 只负责静态资源服务和 MIME。
- `manifest.webmanifest` 必须返回 `application/manifest+json`。
- Service Worker 在生产域名注册；localhost / 127.0.0.1 会自动 unregister，避免本地验收被旧缓存干扰。
- Docker build 只需要 `src/clients/mobile-h5`、`src/shared` 和 `images`。

## 排障记录

### Cloudflare 520

2026-04-29 首次访问 `https://starlight.escapemobius.cc/` 返回 520。根因是源站服务和 host nginx 的 `starlight.escapemobius.cc` 站点块尚未建立。

检查顺序：

```bash
ssh root@65.75.220.11 'docker ps --filter name=starlight-literacy'
ssh root@65.75.220.11 'curl -I -s http://127.0.0.1:4173/src/clients/mobile-h5/'
ssh root@65.75.220.11 'nginx -T 2>/dev/null | grep -n "starlight.escapemobius.cc"'
ssh root@65.75.220.11 'curl -I -s -H "Host: starlight.escapemobius.cc" http://127.0.0.1/src/clients/mobile-h5/'
```

### 根路径跳到 http

现象：

```text
Location: http://starlight.escapemobius.cc/src/clients/mobile-h5/
```

处理：

- 不依赖容器内 `/` 的相对跳转。
- 在 host nginx 的 `location = /` 显式写：

```nginx
return 302 https://$host/src/clients/mobile-h5/;
```

### rsync 路径错位

首次同步曾把 `mobile-h5`、`shared`、`nginx-mobile-h5.conf` 放到 VPS 项目根目录。正确做法是使用 `rsync -aR` 保留相对路径。

已清理的误同步副本：

```text
/opt/apps/starlight-literacy/mobile-h5
/opt/apps/starlight-literacy/shared
/opt/apps/starlight-literacy/nginx-mobile-h5.conf
```

### 端口冲突

当前占用端口可查：

```bash
ssh root@65.75.220.11 'ss -ltnp | sed -n "1,180p"'
```

如果 `4173` 被占用：

1. 修改 `docker/docker-compose.yml` 的 host 端口。
2. 修改 `deploy/nginx/starlight.escapemobius.cc.conf` 的 `proxy_pass`。
3. 重新 `docker compose up -d --build`、`nginx -t`、`systemctl reload nginx`。

## 运维命令

查看服务：

```bash
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && docker compose -f docker/docker-compose.yml ps'
```

查看日志：

```bash
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && docker compose -f docker/docker-compose.yml logs --tail=120 mobile-h5'
```

重启：

```bash
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && docker compose -f docker/docker-compose.yml restart mobile-h5'
```

停服务：

```bash
ssh root@65.75.220.11 'cd /opt/apps/starlight-literacy && docker compose -f docker/docker-compose.yml down'
```

## 后续建议

- 为容器补 `HEALTHCHECK`，让 `docker ps` 能直接显示健康状态。
- 增加一个轻量 `/healthz` 静态响应或 nginx location，便于监控。
- 明确 Cloudflare / 前置 443 规则，把域名、源站协议、缓存策略写入独立运维文档。
- 后续若引入真实后端，保留当前 H5 静态容器，新增 backend 服务和 `/api/` 反代，不把 API 逻辑混进 H5 nginx 容器。

## 相关记录

- [[03-开发日志/2026-04-29-Mobile-H5验证版落地|2026-04-29 Mobile H5 验证版落地]]
- [[02-技术架构/技术选型|技术选型]]
- `docker/docker-compose.yml`
- `deploy/nginx/starlight.escapemobius.cc.conf`
