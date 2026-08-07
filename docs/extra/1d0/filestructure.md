### flava extra 1.0 帮助文档 文件结构

---

flava 的拓展系统使用 `.flave` 后缀名（或任意后缀名）的 zip 压缩包作为单个拓展，目录结构如下：

```
extra.flave
│
├── scripts/         # 储存所有 lua 脚本，以源码储存，flava 自己会编译
├── ui/             # 储存所有 ui 文件
└── manifest.json   # 储存拓展信息
```

#### manifest.json 格式

```json
{
    "name": "拓展名称",
    "author": "作者",
    "version": "版本",
    "extra_loader_version": "适用的加载器版本",
    "new_window": true,
    "ui_file": {
        "插入点名称": "ui文件名称（需要后缀名）"
    }
}
```

#### 字段说明

| 字段 | 说明 |
|------|------|
| `name` | 拓展名称 |
| `author` | 作者 |
| `version` | 版本号 |
| `extra_loader_version` | 适用的加载器版本 |
| `new_window` | 是否需要新建 Dear ImGui 窗口 |
| `ui_file` | UI 文件与插入点的映射表 |

#### 插入点说明

`ui_file` 的插入点名称有两种类型：

1. **新窗口**：由 `new_window` 项控制，恒定为 `new_window`，每个拓展只能申请一个
2. **插入点**：可以打开 flava 的开发者调试查看可用的插入点名称

设置 `ui_file` 的插入点以及对应的文件，即可在指定位置插入 UI。
