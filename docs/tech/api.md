# API 文档

## 概述

Flava 提供 RESTful API 接口，所有请求/响应均使用 JSON 格式。

## 基础信息

- **Base URL**: `https://api.flava.dev/v1`
- **认证方式**: Bearer Token
- **Content-Type**: `application/json`

## 接口列表

### 获取文档列表

```http
GET /documents
Authorization: Bearer <token>
```

**响应示例：**

```json
{
  "code": 0,
  "data": [
    {
      "id": "doc_001",
      "title": "项目介绍",
      "category": "project",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### 获取文档详情

```http
GET /documents/:id
Authorization: Bearer <token>
```

### 创建文档

```http
POST /documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "新文档",
  "category": "tech",
  "content": "# 标题\n\n正文内容..."
}
```

## 错误码

| 错误码 | 含义 |
|--------|------|
| 0 | 成功 |
| 4001 | 未认证 |
| 4003 | 无权限 |
| 4040 | 资源不存在 |
| 5000 | 服务器内部错误 |

## SDK 示例

```javascript
import FlavaClient from '@flava/sdk';

const client = new FlavaClient({
  apiKey: 'your-api-key-here'
});

// 获取文档列表
const docs = await client.documents.list();
console.log(docs);
```
