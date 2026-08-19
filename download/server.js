/* ============================================================
   server.js — Flava Download 配套服务器（Node.js）
   · 自动设置 CORS 头，彻底解决 Failed to fetch
   · 支持 .exe 等二进制文件的正确 MIME 类型
   · 启用 Range 请求支持（断点续传）
   · 使用: node server.js [端口]
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.argv[2] || 5500;
const ROOT = __dirname;

// MIME 类型映射
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.exe':  'application/octet-stream',
    '.dmg':  'application/octet-stream',
    '.appimage': 'application/octet-stream',
    '.zip':  'application/zip',
    '.txt':  'text/plain; charset=utf-8',
};

// CORS 头（允许所有来源，解决 Failed to fetch）
const CORS_HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Max-Age':       '86400',
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // 默认首页
    if (pathname === '/') pathname = '/index.html';

    const filePath = path.join(ROOT, pathname);

    // 安全检查：禁止目录遍历
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    // 处理 OPTIONS 预检请求（CORS 必需）
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
    }

    // 只允许 GET / HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('405 Method Not Allowed');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + pathname);
            console.log(`[404] ${req.method} ${pathname}`);
            return;
        }

        const fileSize = stats.size;
        const mimeType = getMimeType(filePath);
        const range = req.headers.range;

        // 支持 Range 请求（大文件断点续传）
        if (range) {
            const match = range.match(/bytes=(\d+)-(\d*)/);
            if (match) {
                const start = parseInt(match[1], 10);
                const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
                const chunkSize = end - start + 1;

                if (start >= fileSize || end >= fileSize) {
                    res.writeHead(416, {
                        'Content-Range': `bytes */${fileSize}`,
                        ...CORS_HEADERS,
                    });
                    res.end();
                    return;
                }

                const stream = fs.createReadStream(filePath, { start, end });
                res.writeHead(206, {
                    'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges':  'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type':   mimeType,
                    ...CORS_HEADERS,
                });
                stream.pipe(res);
                console.log(`[206] ${pathname} (${start}-${end}/${fileSize})`);
                return;
            }
        }

        // 普通完整响应
        const headers = {
            'Content-Type':   mimeType,
            'Content-Length': fileSize,
            'Accept-Ranges':  'bytes',
            'Cache-Control':  'no-cache',
            ...CORS_HEADERS,
        };

        if (req.method === 'HEAD') {
            res.writeHead(200, headers);
            res.end();
            console.log(`[HEAD 200] ${pathname} (${fileSize} bytes)`);
            return;
        }

        res.writeHead(200, headers);
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        console.log(`[200] ${req.method} ${pathname} (${fileSize} bytes)`);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Flava Download Server (Node.js)         ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║   http://localhost:${PORT}                    ║`);
    console.log('║                                            ║');
    console.log('║   已启用 CORS + Range 支持                ║');
    console.log('║   支持 .exe / .dmg / .appimage 下载      ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('提示: 把 flava.exe 放到 download/ 文件夹');
    console.log('按 Ctrl+C 停止服务器');
    console.log('');
});

// 优雅退出
process.on('SIGINT',  () => { console.log('\n服务器已停止'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n服务器已停止'); process.exit(0); });
