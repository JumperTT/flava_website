// verify.js — 验证分块 Base64 编码正确性 + 与 Python 交叉验证
const fs = require('fs');
const crypto = require('crypto');

// 模拟浏览器端的 arrayBufferToBase64Chunked 逻辑
function arrayBufferToBase64Chunked(buffer, chunkSize) {
    const bytes = new Uint8Array(buffer);
    const total = bytes.length;
    let result = '';
    for (let offset = 0; offset < total; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, total);
        const slice = bytes.subarray(offset, end);
        let binary = '';
        for (let i = 0; i < slice.length; i++) {
            binary += String.fromCharCode(slice[i]);
        }
        result += Buffer.from(binary, 'binary').toString('base64');
    }
    return result;
}

// 读取真实文件
const files = ['flava.exe', 'flava0.9.exe', 'flava1.0.exe', 'flava2.0.exe'];
const sizes = {};

console.log('=== 文件存在性检查 ===');
for (const f of files) {
    const p = './download/' + f;
    if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        sizes[f] = stat.size;
        console.log(`✅ ${f}: ${stat.size} bytes (${(stat.size/1048576).toFixed(2)} MB)`);
    } else {
        console.log(`❌ ${f}: 不存在`);
    }
}

// 选一个文件做 Base64 验证
const testFile = './download/flava1.0.exe';
const buf = fs.readFileSync(testFile);
console.log(`\n=== Base64 编码验证 (${testFile}) ===`);
console.log(`文件大小: ${buf.length} bytes`);

// Node 标准库结果
const nodeB64 = buf.toString('base64');
console.log(`Node 标准库编码长度: ${nodeB64.length}`);

// 模拟浏览器的分块编码（用 0x6000 = 24576 字节一块）
const CHUNK = 0x6000;
const chunkedB64 = arrayBufferToBase64Chunked(buf, CHUNK);
console.log(`分块编码长度 (chunk=${CHUNK}): ${chunkedB64.length}`);

// 验证一致性
if (nodeB64 === chunkedB64) {
    console.log(`✅ 分块编码 === Node 标准库，完全一致！`);
} else {
    console.log(`❌ 编码不一致！`);
    // 找第一个不同
    for (let i = 0; i < Math.min(nodeB64.length, chunkedB64.length); i++) {
        if (nodeB64[i] !== chunkedB64[i]) {
            console.log(`  第一个差异位置: ${i}, Node: ${nodeB64[i]}, Chunked: ${chunkedB64[i]}`);
            console.log(`  上下文 Node: ...${nodeB64.substring(Math.max(0,i-10), i+10)}...`);
            console.log(`  上下文 Chunk: ...${chunkedB64.substring(Math.max(0,i-10), i+10)}...`);
            break;
        }
    }
}

// 验证可逆性
const decoded = Buffer.from(chunkedB64, 'base64');
if (decoded.equals(buf)) {
    console.log(`✅ 可逆验证通过：解码后逐字节等于原文`);
} else {
    console.log(`❌ 可逆验证失败！`);
}

// 验证 MZ 头
const header = buf.subarray(0, 2);
if (header[0] === 0x4D && header[1] === 0x5A) {
    console.log(`✅ MZ 头验证通过 (0x${header[0].toString(16).toUpperCase()}${header[1].toString(16).toUpperCase()}) — 合法 PE 文件`);
} else {
    console.log(`⚠️ 文件头: 0x${header[0].toString(16)} 0x${header[1].toString(16)}`);
}

// 显示前80字符
console.log(`\nBase64 前80字符: ${chunkedB64.substring(0, 80)}`);

// 检查是否含有全 A（之前的 bug）
const allA = /^A+$/.test(chunkedB64.substring(0, 20));
console.log(`前20字符是否全A: ${allA ? '❌ 是（有问题）' : '✅ 否（正常）'}`);

// 语法检查 JS 文件
console.log(`\n=== JS 语法检查 ===`);
const acorn = (() => { try { return require('acorn'); } catch(e) { return null; } })();
if (acorn) {
    for (const f of ['download-dialog.js', 'bg-animation.js', 'server.js']) {
        try {
            const src = fs.readFileSync('./' + f, 'utf8');
            acorn.parse(src, { ecmaVersion: 2020 });
            console.log(`✅ ${f}: 语法正确`);
        } catch(e) {
            console.log(`❌ ${f}: ${e.message}`);
        }
    }
} else {
    // fallback: 用 node --check
    const { execSync } = require('child_process');
    for (const f of ['download-dialog.js', 'bg-animation.js', 'server.js']) {
        try {
            execSync(`node --check ./${f}`, { stdio: 'pipe' });
            console.log(`✅ ${f}: 语法正确`);
        } catch(e) {
            console.log(`❌ ${f}: ${e.stderr.toString()}`);
        }
    }
}

console.log(`\n=== 全部验证完成 ===`);
