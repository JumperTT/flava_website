/* ============================================================
   download.js — Flava Download（修复版 v2）
   核心改动：自动探测文件真实 URL，不再硬编码路径
   ============================================================ */

(function () {
    'use strict';

    // ---------- 自动探测文件 URL ----------
    function detectFileUrl() {
        const candidates = [
            '/download/download/flava.exe',
            '/download/flava.exe',
            './download/flava.exe',
            '../download/flava.exe',
            'download/flava.exe',
            'flava.exe',
        ];

        // 根据当前页面路径智能生成候选
        const pagePath = location.pathname;
        const dir = pagePath.substring(0, pagePath.lastIndexOf('/') + 1);
        candidates.push(dir + 'download/flava.exe');
        candidates.push(dir + 'flava.exe');
        candidates.push(dir + '../download/flava.exe');

        // 去重
        return [...new Set(candidates)];
    }

    // ---------- 日志 ----------
    const logEl = document.getElementById('diagLog');
    function log(msg, type = 'info') {
        if (!logEl) { console.log(`[Flava] ${msg}`); return; }
        const colors = { ok: '#0f0', err: '#f55', info: '#5cf', warn: '#fa0' };
        logEl.innerHTML += `<span style="color:${colors[type]||'#fff'}">${msg}</span>\n`;
        logEl.scrollTop = logEl.scrollHeight;
    }

    // ---------- 状态指示器 ----------
    const statusEl = document.getElementById('fileStatus');
    function setStatus(text, cls) {
        if (statusEl) { statusEl.textContent = text; statusEl.className = 'file-status ' + cls; }
    }

    // ---------- 探测可用 URL ----------
    async function findWorkingUrl() {
        const candidates = detectFileUrl();
        log(`页面地址: ${location.href}`, 'info');
        log(`开始探测 ${candidates.length} 个候选路径...`, 'info');

        for (const url of candidates) {
            try {
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) {
                    const size = res.headers.get('content-length');
                    log(`✅ 找到可用路径: ${url} (${size ? (size/1024/1024).toFixed(2)+'MB' : '未知大小'})`, 'ok');
                    return { url, size: size ? parseInt(size) : 0 };
                } else {
                    log(`  ❌ ${url} → ${res.status}`, 'err');
                }
            } catch(e) {
                log(`  💥 ${url} → ${e.message}`, 'err');
            }
        }
        return null;
    }

    // ---------- 进度条 ----------
    function setProgress(pct, text) {
        const bar = document.getElementById('downloadProgress');
        const label = document.getElementById('progressLabel');
        if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
        if (label) label.textContent = text || (pct.toFixed(1) + '%');
    }

    // ---------- 读取文件（带进度）----------
    async function fetchWithProgress(url, onProgress) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const total = parseInt(res.headers.get('content-length') || '0');
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (total > 0 && onProgress) onProgress(received / total * 100, received, total);
        }
        // 合并
        const buf = new Uint8Array(received);
        let pos = 0;
        for (const c of chunks) { buf.set(c, pos); pos += c.length; }
        return buf;
    }

    // ---------- ArrayBuffer → Base64（分块防栈溢出）----------
    function arrayBufferToBase64(buf) {
        const bytes = new Uint8Array(buf);
        const chunkSize = 0x8000; // 32KB
        let result = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            result += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(result);
    }

    // ---------- 复制到剪贴板 ----------
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // 降级方案
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); document.body.removeChild(ta); return true; }
            catch { document.body.removeChild(ta); return false; }
        }
    }

    // ---------- 文件写入 API（方式2）----------
    async function writeFileToDisk(buffer, suggestedName) {
        // 优先使用 File System Access API
        if (window.showDirectoryPicker) {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            const fileHandle = await dirHandle.getFileHandle(suggestedName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(buffer);
            await writable.close();
            return { success: true, path: dirHandle.name + '/' + suggestedName };
        }
        // 降级：直接下载
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = suggestedName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { success: true, path: '下载文件夹/' + suggestedName, fallback: true };
    }

    // ---------- 弹窗控制 ----------
    const modal = document.getElementById('downloadModal');
    function openModal() { if (modal) modal.classList.add('show'); }
    function closeModal() { if (modal) modal.classList.remove('show'); }

    document.getElementById('openDownload')?.addEventListener('click', openModal);
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ---------- 全局状态 ----------
    let WORKING_URL = null;
    let FILE_SIZE = 0;
    let cachedBase64 = '';

    // ---------- 初始化探测 ----------
    async function init() {
        setStatus('正在检测文件...', 'checking');
        const result = await findWorkingUrl();
        if (result) {
            WORKING_URL = result.url;
            FILE_SIZE = result.size;
            setStatus(`✅ 文件可访问 (${result.size ? (result.size/1024/1024).toFixed(2)+' MB' : '未知大小'})`, 'ok');
            log(`🎯 全局使用路径: ${WORKING_URL}`, 'ok');
        } else {
            setStatus('❌ 所有路径均不可访问', 'error');
            log('💡 排查建议：\n  1. 确认 download/download/flava.exe 文件存在\n  2. 确认 Live Server 根目录是 flava_website\n  3. 浏览器访问 http://localhost:5500/download/download/flava.exe 看能否下载', 'warn');
        }
    }

    // ==================== 按钮绑定 ====================

    // 方式1：直接下载
    document.getElementById('btnDirectDownload')?.addEventListener('click', () => {
        if (!WORKING_URL) return showError('文件未就绪，请等待检测完成');
        const a = document.createElement('a');
        a.href = WORKING_URL;
        a.download = 'flava.exe';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        log('方式1：触发直接下载', 'ok');
    });

    // 方式2：选择位置
    let selectedDir = null;
    document.getElementById('btnSelectDir')?.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
            return showError('当前浏览器不支持目录选择（推荐 Chrome / Edge）\n将自动降级为普通下载');
        }
        try {
            selectedDir = await window.showDirectoryPicker({ mode: 'readwrite' });
            document.getElementById('selectedDirText').textContent = '已选: ' + selectedDir.name;
            log(`已选择目录: ${selectedDir.name}`, 'ok');
        } catch(e) {
            log(`目录选择取消: ${e.message}`, 'warn');
        }
    });

    // 方式2：开始下载（写入文件）
    document.getElementById('btnWriteFile')?.addEventListener('click', async () => {
        if (!WORKING_URL) return showError('文件未就绪');
        if (!selectedDir && window.showDirectoryPicker) return showError('请先点击「选择位置」');
        try {
            setProgress(0, '开始下载...');
            const buf = await fetchWithProgress(WORKING_URL, (pct) => {
                setProgress(pct, `下载中... ${pct.toFixed(1)}%`);
            });
            setProgress(100, '写入文件中...');
            const result = await writeFileToDisk(buf, 'flava.exe');
            setProgress(100, '✅ 完成!');
            log(`✅ 文件已保存: ${result.path}`, 'ok');
            if (result.fallback) log('⚠️ 使用了降级方案（直接下载）', 'warn');
        } catch(e) {
            setProgress(0, '失败');
            showError('写入失败: ' + e.message);
            log(`❌ ${e.message}`, 'err');
        }
    });

    // 方式3/4：获取并编码 base64
    async function encodeToBase64() {
        if (!WORKING_URL) return showError('文件未就绪');
        try {
            setProgress(0, '获取文件中...');
            const buf = await fetchWithProgress(WORKING_URL, (pct) => {
                setProgress(pct, `编码中... ${pct.toFixed(1)}%`);
            });
            setProgress(100, '正在转换为 Base64...');
            log(`开始 Base64 编码 (${buf.byteLength} 字节)...`, 'info');
            // 用 setTimeout 让 UI 先更新
            await new Promise(r => setTimeout(r, 50));
            cachedBase64 = arrayBufferToBase64(buf);
            setProgress(100, '✅ 编码完成');
            log(`✅ Base64 编码完成 (${cachedBase64.length} 字符)`, 'ok');
            return cachedBase64;
        } catch(e) {
            setProgress(0, '失败');
            showError('编码失败: ' + e.message);
            log(`❌ ${e.message}`, 'err');
            return null;
        }
    }

    document.getElementById('btnEncodeCopy')?.addEventListener('click', async () => {
        const b64 = await encodeToBase64();
        if (b64) {
            document.getElementById('base64Output').value = b64;
            log(`已填入不可选文本框 (${b64.length} 字符)`, 'ok');
        }
    });

    document.getElementById('btnEncodeDrag')?.addEventListener('click', async () => {
        const b64 = await encodeToBase64();
        if (b64) {
            document.getElementById('base64OutputDrag').value = b64;
            log(`已填入可拖拽文本框 (${b64.length} 字符)`, 'ok');
        }
    });

    // 复制按钮
    document.getElementById('btnCopy')?.addEventListener('click', async () => {
        const text = document.getElementById('base64Output').value;
        if (!text) return showError('文本框为空，请先编码');
        const ok = await copyText(text);
        if (ok) { log('✅ 已复制到剪贴板', 'ok'); showSuccess('已复制到剪贴板！'); }
        else { showError('复制失败，请手动复制'); }
    });

    // 教程链接
    document.querySelectorAll('.tutorial-link').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            window.open('https://www.baidu.com/s?wd=base64%E8%A7%A3%E7%A0%81%E6%95%99%E7%A8%8B', '_blank');
        });
    });

    // 返回主页
    const backBtn = document.getElementById('backHomeBtn');
    if (backBtn) {
        backBtn.addEventListener('click', e => {
            e.preventDefault();
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            let s = ''; const len = Math.floor(Math.random()*8)+3;
            for (let i=0;i<len;i++) s += chars[Math.floor(Math.random()*26)];
            window.location.href = 'https://' + s + '.flava.woen.pics';
        });
    }

    // 错误/成功提示
    function showError(msg) {
        const el = document.getElementById('toast');
        if (!el) return alert(msg);
        el.textContent = '⚠️ ' + msg;
        el.className = 'toast error show';
        setTimeout(() => el.className = 'toast', 4000);
    }
    function showSuccess(msg) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = '✅ ' + msg;
        el.className = 'toast success show';
        setTimeout(() => el.className = 'toast', 3000);
    }

    // ---------- 启动 ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
