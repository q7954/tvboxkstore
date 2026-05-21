# tvbox-kstore

> TVBox 多仓接口聚合管理工具 · 由公众号【杰翔易达】维护

[![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/haonanren118/tvbox-kstore/actions)
[![Cloudflare Pages](https://img.shields.io/badge/托管-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)

---

## 目录

1. [项目简介](#项目简介)
2. [系统架构](#系统架构)
3. [工作流程](#工作流程)
4. [文件结构](#文件结构)
5. [快速部署](#快速部署)
6. [配置参考](#配置参考)
7. [管理后台](#管理后台)
8. [API 文档](#api-文档)
9. [自动化调度](#自动化调度)
10. [维护指南](#维护指南)
11. [常见问题](#常见问题)
12. [免责声明](#免责声明)

---

## 项目简介

**tvbox-kstore** 是一个部署在 Cloudflare Pages 上的 TVBox 配置源聚合管理工具，具备以下核心能力：

- **多源聚合**：内置 13 条热门公开线路（肥猫、饭太硬、菜妮丝、盒子迷、寳盒等），支持用户通过管理后台动态添加自定义接口
- **双阶段测速**：先通过国内 API 测延迟，再对国内无信号的线路做 HTTP 连通性回退检测，自动剔除死链、按速度排序
- **自动化更新**：GitHub Actions 每 6 小时自动执行，生成最新的 `source.json` 配置文件并提交回仓库
- **管理后台**：基于密码鉴权的 Web 管理界面，支持自定义接口的增删、构建触发和日志查看
- **边缘函数**：Cloudflare Pages Functions 承载 API 逻辑，零冷启动、全球加速

**访问入口**

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页（自动跳转 QQ 群） | `/` | 面向用户的公开页面 |
| TVBox 配置源 | `/download/1/tvbox/source.json` | 直接填入 TVBox 的配置地址 |
| 管理后台 | `/admin.html` | 需要密码，管理自定义接口 |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Repository                      │
│                                                          │
│  custom_sources.json   ←──── Cloudflare Pages API 写入  │
│  generate.py           ←──── GitHub Actions 执行        │
│  download/1/tvbox/     ←──── generate.py 输出           │
│    └── source.json                                       │
│  generate.log          ←──── 执行日志                   │
└────────────────────────┬────────────────────────────────┘
                         │ GitHub Actions (每6h/手动)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   generate.py 执行流                    │
│                                                          │
│  1. 读取 custom_sources.json（用户自定义源）             │
│  2. 合并内置 CANDIDATE_SOURCES（13条公开源）             │
│  3. Phase 1：国内 API 批量测速（xxapi.cn）               │
│  4. Phase 2：对无国内信号的源做 HTTP 连通检测            │
│  5. 按延迟排序，生成 source.json                        │
└────────────────────────┬────────────────────────────────┘
                         │ 静态文件
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Cloudflare Pages (CF Pages)               │
│                                                          │
│  静态资源：index.html, admin.html, source.json 等       │
│                                                          │
│  Functions（边缘函数）：                                │
│    functions/api/admin/[[route]].js                      │
│      ├── GET  /api/admin  → 读取 custom_sources.json    │
│      └── POST /api/admin                                 │
│            ├── login    → 验证密码                       │
│            ├── add      → 添加自定义接口 → 写 GitHub    │
│            ├── delete   → 删除自定义接口 → 写 GitHub    │
│            ├── trigger  → 触发 GitHub Actions 构建      │
│            └── status   → 查询最新 Actions 运行状态     │
└─────────────────────────────────────────────────────────┘
```

---

## 工作流程

### 线路生成流程（generate.py）

```
开始
 │
 ├─ 读取 custom_sources.json（用户自定义源）
 ├─ 合并内置 CANDIDATE_SOURCES（13条）
 │
 ├─ Phase 1：国内测速（并发）
 │    └── 调用 https://v2.xxapi.cn/api/speed?url=<URL>
 │         ├── 成功 → 记录延迟（毫秒），标记为 CN_ALIVE
 │         └── 失败 → 加入待 HTTP 检测队列
 │
 ├─ Phase 2：HTTP 连通检测（对 Phase 1 失败的线路）
 │    └── 并发 GET 请求（10线程，8秒超时）
 │         ├── HTTP < 400 且响应非空 → 存活
 │         └── 否则 → 放入 backup_urls
 │
 ├─ 按延迟升序排列 alive 列表
 │
 └─ 写出 download/1/tvbox/source.json
      ├── notice: 免责声明文本
      ├── urls: [存活线路，按速度排序]
      └── backup_urls: [死链，TVBox 可忽略]
```

### 自定义接口管理流程（管理后台）

```
admin.html（浏览器）
       │
       │ Bearer Token（管理密码）
       ▼
functions/api/admin/[[route]].js（CF Pages Function）
       │
       │ GITHUB_TOKEN（CF 环境变量）
       ▼
GitHub API
  ├── 读取 custom_sources.json（raw.githubusercontent.com）
  ├── 写入（Contents API PUT）
  └── 触发 workflow_dispatch
```

---

## 文件结构

```
tvbox-kstore/
├── .github/
│   └── workflows/
│       └── generate.yml          # GitHub Actions 定时/手动触发工作流
│
├── functions/                    # Cloudflare Pages Functions
│   └── api/
│       └── admin/
│           └── [[route]].js      # Admin REST API（增删查、触发构建、查状态）
│
├── download/
│   └── 1/
│       └── tvbox/
│           └── source.json       # 自动生成的 TVBox 配置源（勿手动修改）
│
├── admin.html                    # 管理后台前端页面
├── custom_sources.json           # 用户自定义接口（由 API 维护，勿手动提交冲突）
├── generate.py                   # 线路测速、排序、生成脚本
├── generate.log                  # 最近一次构建的执行日志
├── index.html                    # 公开首页（自动跳转 QQ 群）
└── pages.config.json             # Cloudflare Pages 构建配置
```

---

## 快速部署

### 前置条件

| 需要 | 说明 |
|------|------|
| GitHub 账号 | Fork 本仓库 |
| Cloudflare 账号 | 部署 Pages |
| GitHub Personal Access Token | 需要 `repo` + `actions` 权限 |

### 步骤一：Fork 仓库

点击右上角 **Fork**，Fork 到自己的 GitHub 账号。

### 步骤二：创建 GitHub Token

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. 新建 Token，选择本仓库，勾选权限：
   - **Contents**：Read and write
   - **Actions**：Read and write
3. 生成并复制 Token

### 步骤三：部署到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages → Create application → Pages → Connect to Git**
3. 选择 Fork 后的仓库
4. 构建配置（无需构建命令，直接部署静态文件）：
   - **Build command**：（留空）
   - **Build output directory**：`/`
5. 在 **Settings → Environment variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|----|------|
| `GITHUB_TOKEN` | `ghp_xxx...` | 步骤二创建的 Token |
| `ADMIN_PASSWORD` | 自定义密码 | 管理后台登录密码 |

6. 部署完成后，访问 `https://你的域名.pages.dev/admin.html` 进入管理后台

### 步骤四：触发首次构建

进入管理后台，点击 **触发构建** 按钮，等待约 1-2 分钟，首次 `source.json` 生成完毕。

### 步骤五：配置到 TVBox

将以下地址填入 TVBox 的「多仓地址」：

```
https://你的域名.pages.dev/download/1/tvbox/source.json
```

---

## 配置参考

### custom_sources.json

用户自定义接口文件，由管理后台维护。格式为 JSON 数组：

```json
[
  {
    "id": "唯一ID（系统自动生成）",
    "name": "接口名称",
    "url": "https://example.com/tv",
    "created_at": "2026-05-15T13:13:58.122Z"
  }
]
```

**注意**：
- 不建议直接手动提交此文件，应通过管理后台操作，避免 SHA 冲突导致写入失败
- 没有 `id` 字段的旧格式条目（仅有 `name` + `url`）也兼容，但无法在管理后台删除

### generate.py 内置线路

以下线路硬编码在 `CANDIDATE_SOURCES` 中，无需额外配置：

| 名称 | 说明 |
|------|------|
| 杰翔 | 菜妮丝源 |
| 王二小 | 王二小放牛娃 |
| 肥猫2 / 肥猫3 | feimao.pro |
| 盒子迷 | 盒子迷 |
| 寳盒 | guot55/yg GitHub 源 |
| 饭太硬 1~6 | 多域名容灾 |
| 饭太硬江苏郑州 | AtomGit 镜像 |

如需增删内置线路，直接编辑 `generate.py` 中的 `CANDIDATE_SOURCES` 列表。

### 关键参数

```python
TIMEOUT = 8           # HTTP 连通检测超时（秒）
MAX_WORKERS = 10      # 并发检测线程数
CHINA_SPEED_API = "https://v2.xxapi.cn/api/speed"  # 国内测速 API
```

---

## 管理后台

访问路径：`/admin.html`

### 登录

输入在 Cloudflare Pages 环境变量 `ADMIN_PASSWORD` 中设置的密码。密码会以 `Bearer Token` 方式传递给边缘函数验证。登录态存储在 `sessionStorage`，关闭标签页后失效。

### 功能说明

| 功能 | 说明 |
|------|------|
| **自定义接口数** | 显示 `custom_sources.json` 中的接口数量 |
| **总线路数** | 读取 `source.json` 中 `urls` 数组长度（存活线路总数） |
| **上次更新** | 解析 `generate.log` 中最后一条 `Timestamp` 记录；点击可查看完整日志 |
| **触发构建** | 调用 GitHub Actions `workflow_dispatch` API，手动启动线路更新 |
| **添加接口** | 填写名称和 URL，写入 `custom_sources.json` 到 GitHub，下次构建生效 |
| **删除接口** | 按 `id` 删除，实时写回 GitHub |
| **构建日志** | 实时拉取 `generate.log`，带语法高亮（时间戳、OK/FAIL/WARN/CN_ALIVE） |

### 构建状态轮询

点击触发构建后，页面会每 15 秒自动查询一次 Actions 最新运行状态，卡片颜色变化如下：

- 青绿色（空闲）：可触发
- 橙色旋转（构建中）：等待中
- 成功/失败：显示上次结论

---

## API 文档

所有 API 均需在 `Authorization` 头中携带 Bearer Token（即管理密码）。

**Base URL**：`/api/admin`

### GET /api/admin — 获取自定义接口列表

**请求头**

```
Authorization: Bearer <ADMIN_PASSWORD>
```

**响应**

```json
{
  "success": true,
  "sources": [
    {
      "id": "mp6xuz56sqj1",
      "name": "牛二",
      "url": "https://9280.kstore.vip/wex.json",
      "created_at": "2026-05-15T13:13:58.122Z"
    }
  ],
  "storage": "github"
}
```

---

### POST /api/admin — 操作接口

请求体为 JSON，通过 `action` 字段区分操作类型。

#### action: login — 验证密码

**请求**

```json
{ "action": "login" }
```

**响应（成功）**

```json
{ "success": true, "token": "verified" }
```

---

#### action: add — 添加自定义接口

**请求**

```json
{
  "action": "add",
  "name": "我的线路",
  "url": "https://example.com/tv"
}
```

**响应（成功）**

```json
{
  "success": true,
  "source": {
    "id": "lp0abc12xy",
    "name": "我的线路",
    "url": "https://example.com/tv",
    "created_at": "2026-05-21T10:00:00.000Z"
  },
  "storage": "github"
}
```

---

#### action: delete — 删除自定义接口

**请求**

```json
{
  "action": "delete",
  "id": "mp6xuz56sqj1"
}
```

**响应（成功）**

```json
{ "success": true, "remaining": 3 }
```

---

#### action: trigger — 触发 GitHub Actions 构建

**请求**

```json
{ "action": "trigger" }
```

**响应（成功）**

```json
{
  "success": true,
  "message": "构建已触发，请等待约1-2分钟"
}
```

---

#### action: status — 查询最新构建状态

**请求**

```json
{ "action": "status" }
```

**响应**

```json
{
  "success": true,
  "running": false,
  "status": "completed",
  "conclusion": "success",
  "run_id": 15342891023,
  "updated_at": "2026-05-21T10:05:32Z"
}
```

| 字段 | 说明 |
|------|------|
| `running` | `true` 表示构建进行中（`in_progress` 或 `queued`） |
| `status` | GitHub Actions run status：`queued` / `in_progress` / `completed` |
| `conclusion` | 结论：`success` / `failure` / `cancelled` / `null`（进行中） |

---

### 错误响应格式

```json
{ "error": "错误信息描述" }
```

常见 HTTP 状态码：

| 状态码 | 含义 |
|--------|------|
| 401 | 未授权（密码错误） |
| 400 | 请求参数错误 |
| 404 | 接口 ID 不存在 |
| 500 | 服务器内部错误（通常为 GITHUB_TOKEN 未配置或权限不足） |

---

## 自动化调度

### GitHub Actions 工作流（generate.yml）

| 触发方式 | 说明 |
|----------|------|
| `schedule: '0 */6 * * *'` | 每 6 小时自动执行（UTC 0/6/12/18 点，即北京时间 8/14/20/2 点） |
| `workflow_dispatch` | 手动触发（管理后台「触发构建」按钮或 GitHub UI） |

**执行步骤**

1. `actions/checkout@v4`（完整 Git 历史，Commit 必需）
2. `actions/setup-python@v5`（Python 3.11）
3. `python generate.py`（测速 + 生成）
4. `EndBug/add-and-commit@v9`（提交 `download/*` 和 `generate.log`）

> CF Pages 监听仓库推送，Actions 提交后会自动触发重新部署，通常 1-2 分钟内生效。

---

## 维护指南

### 添加/修改内置线路

编辑 `generate.py` 中的 `CANDIDATE_SOURCES` 列表：

```python
CANDIDATE_SOURCES = [
    {"url": "https://your-new-source.com/tv", "name": "新线路名称"},
    # ...
]
```

提交后，下次 Actions 运行时生效。

### 修改更新频率

编辑 `.github/workflows/generate.yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: '0 */3 * * *'  # 改为每3小时
```

### 查看构建日志

1. 管理后台 → 点击「上次更新」卡片，弹出日志窗口
2. 直接访问 `/generate.log`
3. GitHub → Actions 标签页查看每次运行详情

### 更换管理密码

在 Cloudflare Pages **Settings → Environment variables** 中修改 `ADMIN_PASSWORD`，重新部署即可。浏览器端的 `sessionStorage` 会在关闭标签页时自动清除。

### 手动回滚 source.json

通过 GitHub 提交历史找到需要恢复的版本，手动还原 `download/1/tvbox/source.json` 文件。

---

## 常见问题

**Q: TVBox 加载失败，接口无响应？**

A: 访问管理后台，点击「触发构建」刷新线路。也可直接访问 `/generate.log` 查看上次测速结果，确认是否有存活线路。

**Q: 触发构建后很久没有更新？**

A: Actions 构建一般需要 1-2 分钟，CF Pages 重新部署又需要约 1 分钟。总计 3-5 分钟内生效。可在 GitHub Actions 标签页查看运行进度。

**Q: 管理后台提示 "GITHUB_TOKEN 未配置"？**

A: 确认 Cloudflare Pages 的环境变量 `GITHUB_TOKEN` 已正确设置，并在设置后重新部署（Pages 需要重新部署才能读取新的环境变量）。

**Q: 添加接口后，TVBox 还是看不到？**

A: 自定义接口写入 `custom_sources.json` 后，需要重新执行 `generate.py` 才会合并到 `source.json`。请在添加接口后手动点击「触发构建」。

**Q: 某些源在 source.json 中出现在 backup_urls 里？**

A: 该源在测速时国内 API 无法访问、且 GitHub Actions（美国节点）HTTP 请求也失败。可能是临时故障，下次自动构建会重新检测。

**Q: 为什么 source.json 中的 urls 顺序每次不同？**

A: 顺序由测速结果决定，延迟低的排前面。网络状况变化会导致排序变化，这是正常现象。

---

## 免责声明

本项目中的所有资源均来源于网络公开收集整理，仅供个人学习交流使用。**严禁私自售卖、二次倒卖及商用**。下载后请 24 小时内自行删除，使用所产生的一切后果均由使用者自行承担，与项目作者无关。如有侵权，请联系删除。

---

<div align="center">
  <sub>由 <a href="https://github.com/haonanren118">@haonanren118</a> 维护 · 公众号【杰翔易达】</sub>
</div>
