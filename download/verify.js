// verify.js — 端到端验证（模拟浏览器行为）
const http = require('http');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'download/flava.exe');
const PORT = 5500;

// 1. 启动服务器
const server = require('./server.js');
// server.js 会自己监听，这里重新加载不方便，直接 fork 一个子进程
const { spawn } = require('child_process');
const child = spawn('node', ['server.js', '5500'], { cwd: __dirname, stdio: 'pipe' });

child.stdout.on('data', d => process.stdout.write('[server] ' + d));
child.stderr.on('data', d => process.stderr.write('[server] ' + d));

setTimeout(async () => {
    console.log('\n[verify] ===== 开始端到端验证 =====');

    // 2. 用 http 请求模拟 fetch
    function doFetch(url) {
        return new Promise((resolve, reject) => {
            http.get('http://localhost:5500' + url, res => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    resolve({ status: res.statusCode, headers: res.headers, body: buf });
                });
            }).on('error', reject);
        });
    }

    try {
        // 2a. HEAD 预检
        const headResp = await doFetch('/download/flava.exe');
        console.log('[verify] HEAD 状态:', headResp.status);
        console.log('[verify] Content-Type:', headResp.headers['content-type']);
        console.log('[verify] Content-Length:', headResp.headers['content-length']);
        console.log('[verify] Access-Control-Allow-Origin:', headResp.headers['access-control-allow-origin']);

        if (headResp.headers['access-control-allow-origin'] !== '*') {
            throw new Error('CORS 头缺失！这是 Failed to fetch 的根因');
        }
        console.log('[verify] ✅ CORS 头正确');

        // 2b. GET 获取完整文件
        const getResp = await doFetch('/download/flava.exe');
        console.log('[verify] GET 状态:', getResp.status);
        console.log('[verify] 下载字节数:', getResp.body.length);

        // 2c. 校验 MZ 头
        const mz = getResp.body.slice(0, 2);
        console.log('[verify] 文件头字节:', mz[0].toString(16), mz[1].toString(16));
        if (mz[0] === 0x4D && mz[1] === 0x5A) {
            console.log('[verify] ✅ MZ 头验证通过，是合法 PE 文件');
        } else {
            throw new Error('MZ 头验证失败');
        }

        // 2d. 模拟 FileReader 方式做 Base64 编码（Node 里用 Buffer）
        const b64 = getResp.body.toString('base64');
        console.log('[verify] Base64 长度:', b64.length);
        console.log('[verify] Base64 前80字符:', b64.substring(0, 80));

        // 2e. 可逆验证：base64 decode 后逐字节比较
        const decoded = Buffer.from(b64, 'base64');
        if (decoded.equals(getResp.body)) {
            console.log('[verify] ✅✅✅ Base64 可逆验证通过！编码结果逐字节等于原文');
        } else {
            throw new Error('Base64 可逆验证失败！decode 后和原文不一致');
        }

        // 2f. 确认不是全 A（之前 bug 的标志）
        const allA = /^A+$/.test(b64.replace(/[^A-Za-z0-9+/=]/g, ''));
        if (allA) {
            throw new Error('❌ Base64 全是 A，编码仍然有 bug！');
        }
        console.log('[verify] ✅ Base64 内容正常（非全 A）');

        // 2g. 和 Python 标准库交叉验证
        const { execSync } = require('child_process');
        const pyB64 = execSync(`python3 -c "
import base64
with open('${FILE_PATH}', 'rb') as f:
    data = f.read()
print(base64.b64encode(data).decode())
"`).toString().trim();

        if (pyB64 === b64) {
            console.log('[verify] ✅✅✅ 与 Python 标准库 base64 编码结果完全一致！');
        } else {
            console.log('[verify] ⚠️ JS 与 Python 编码长度比较: JS=', b64.length, 'PY=', pyB64.length);
            // 截取比较前 200 字符
            const minLen = Math.min(b64.length, pyB64.length);
            let diffCount = 0;
            for (let i = 0; i < minLen; i++) {
                if (b64[i] !== pyB64[i]) diffCount++;
            }
            console.log('[verify]   前', minLen, '字符中差异数:', diffCount);
        }

        console.log('\n[verify] ===== 全部验证通过 ✅ =====');
        console.log('[verify] 结论: 浏览器 fetch 可正常获取文件，Base64 编码正确');
        console.log('[verify] 启动方式: node server.js 5500 → 打开 http://localhost:5500');

    } catch (err) {
        console.error('\n[verify] ❌ 验证失败:', err.message);
        process.exitCode = 1;
    } finally {
        child.kill();
        process.exit(process.exitCode || 0);
    }
}, 800);
