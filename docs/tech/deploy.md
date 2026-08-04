# 部署指南

## 环境要求

| 环境 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| 浏览器 | Chrome 90+ / Firefox 88+ / Edge 90+ |

## 部署方式

### 方式一：GitHub Pages（推荐）

1. 将项目推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. Source 选择 `main` 分支，目录选 `/`（根目录）
4. 保存后等待 1-2 分钟，即可通过 `https://<username>.github.io/<repo>` 访问

### 方式二：Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录执行
vercel
```

按提示操作即可，无需额外配置。

### 方式三：Netlify

1. 登录 [Netlify](https://app.netlify.com/)
2. 拖拽项目文件夹到部署区域
3. 自动识别为静态站点，完成部署

### 方式四：自建服务器

```bash
# 使用 nginx 托管
sudo cp -r /path/to/flava-docs/* /usr/share/nginx/html/

# 或使用 Python 快速启动
cd /path/to/flava-docs
python3 -m http.server 8080
```

## 自定义域名

在部署平台设置自定义域名后，修改 `index.html` 中的 `$docsify` 配置：

```javascript
window.$docsify = {
    name: 'Flava 文档',
    basePath: 'https://docs.yourdomain.com/',  // 添加此行
    // ...其他配置
};
```

## 持续集成

推荐使用 GitHub Actions 自动部署：

```yaml
# .github/workflows/deploy.yml
name: Deploy Docs
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

## 常见问题

> **Q: 部署后背景动画不显示？**
> A: 检查 Canvas 元素是否正确加载，确认 `bg-animation.js` 路径无误。

> **Q: docsify 搜索不工作？**
> A: 确保 `search.min.js` 插件已正确引入，且文档站运行在 HTTP 服务器上（非 file:// 协议）。

> **Q: 如何添加新文档？**
> A: 在对应目录创建 `.md` 文件，然后在 `_sidebar.md` 中添加链接即可。
