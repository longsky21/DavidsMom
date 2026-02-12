# 媒体模块 API（看视频 / 练听力）

## 鉴权与角色

### 家长 Token（Parent Token）
- 使用 `/api/auth/login` 或 `/api/auth/register` 返回的 `access_token`
- 用途：资源库查询、学习计划管理、报表查看
- Header：

```http
Authorization: Bearer <parent_access_token>
```

### 孩子 Token（Child Token）
- 由家长 token 换取：`POST /api/auth/child-token`
- 用途：孩子端拉取可学资源、开始/结束学习会话（记录时长/完成度）
- Header：

```http
Authorization: Bearer <child_access_token>
```

## 资源库

### GET /api/media/resources
家长查询资源库（统一包含音频/视频）。

Query 参数：
- `media_type`：`video` | `audio`（可选）
- `difficulty_level`：1-4（可选）
- `directory`：目录（可选）
- `q`：关键字（可选，匹配文件名/目录/URL）
- `limit`：默认 100，最大 200
- `offset`：默认 0

响应：`MediaResourceResponse[]`

## 学习计划（家长端）

### GET /api/media/plan
Query 参数：
- `module`：`video` | `audio`（必填）
- `child_id`：不传则默认家长的第一个孩子（可选）
- `include_disabled`：默认 true
- `include_deleted`：默认 false

响应：`MediaPlanItemResponse[]`

### POST /api/media/plan/add
Body：
```json
{
  "resource_id": "uuid",
  "module": "video",
  "sync_pair": true
}
```

说明：
- `sync_pair=true` 时，会根据资源的 `pair_key` 自动尝试把对应的音频/视频一起加入计划。

响应：`MediaPlanItemResponse[]`（返回当前 module 下的计划列表）

### PATCH /api/media/plan/{plan_item_id}
Body（可按需传字段）：
```json
{
  "is_enabled": true,
  "is_deleted": false,
  "order_index": 10
}
```

响应：`MediaPlanItemResponse`

## 孩子端可学资源

### GET /api/media/child/plan
Query 参数：
- `module`：`video` | `audio`（必填）

响应：`MediaPlanItemResponse[]`

规则：
- 只返回家长已选中且 `is_enabled=true` 且未删除的资源。

## 学习会话（孩子端记录）

### POST /api/media/session/start
Body：
```json
{
  "resource_id": "uuid",
  "module": "video"
}
```

响应：`MediaLearningSessionResponse`

### POST /api/media/session/{session_id}/finish
Body：
```json
{
  "duration_seconds": 600,
  "completion_percent": 82.5,
  "completed_count": 1
}
```

说明：
- `duration_seconds`：本次学习时长（秒）\n+- `completion_percent`：完成百分比（0-100）\n+- `completed_count`：本次是否“完成”（推荐：播放到 95% 以上记 1，否则 0）\n+
响应：`MediaLearningSessionResponse`

## 报表（家长端）

### GET /api/media/report/summary
Query 参数：
- `period`：`week` | `month`
- `module`：`video` | `audio`

响应：`MediaReportSummary`

### GET /api/media/report/days
Query 参数：
- `module`：`video` | `audio`
- `period`：`week` | `month`（默认 week）

响应：`MediaReportDayItem[]`

