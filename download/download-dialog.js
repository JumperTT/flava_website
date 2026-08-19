/* ============================================================
   download-dialog.js — Flava Download 弹窗逻辑
   · 全部通过 fetch() 动态获取真实二进制文件
   · 零模拟、零假数据、零 fallback
   · 多版本：按钮 data-version / data-file / data-size 驱动
   · Base64 分块编码（兼容大文件，不爆栈）
   · 方式2 优先 showSaveFilePicker
   · 复制按钮大文本降级到 textarea + execCommand
   ============================================================ */

(function () {
    'use strict';

    // ---------- DOM 工具 ----------
    const $ = id => document.getElementById(id);

    // 关键元素（缺失就报错，不再静默失败）
    const overlay       = $('dialogOverlay');
    const closeBtn      = $('dialogClose');
    const dialogTitle   = $('dialogTitle');
    const dialogDesc    = $('dialogDesc');
    const btnDirect     = $('btnDirectDownload');
    const btnPickDir    = $('btnPickDir');
    const btnWriteFile  = $('btnWriteFile');
    const progressBar   = $('progressBar');
    const progressText  = $('progressText');
    const btnEncodeCopy = $('btnEncodeCopy');
    const btnEncodeDrag = $('btnEncodeDrag');
    const textReadonly  = $('base64Readonly');
    const textEditable  = $('base64Editable');
    const btnCopy       = $('btnCopy');

    // 缺失元素直接抛错，方便你从控制台一眼定位
    const required = { overlay, closeBtn, dialogTitle, btnDirect,
        btnPickDir, btnWriteFile, btnEncodeCopy, btnEncodeDrag,
        textReadonly, textEditable, btnCopy };
    for (const [n, el] of Object.entries(required)) {
        if (!el) console.error('[Flava] ❌ 缺失 DOM 元素:', n);
    }

    // ---------- 当前选中版本 ----------
    let currentVersion = '';
    let currentFile    = '';
    let currentSize    = '';

    // 每版本独立 ArrayBuffer 缓存
    const cacheMap = new Map();
    const inflightMap = new Map();

    console.log('[Flava] download-dialog.js 已加载');

    // ============================================================
    // Base64 分块编码（绝不爆栈）
    // ============================================================
    function arrayBufferToBase64Chunked(buffer, onProgress) {
        return new Promise((resolve, reject) => {
            try {
                const bytes = new Uint8Array(buffer);
                const total = bytes.length;
                const CHUNK = 0x6000; // 24576
                let result = '';
                let offset = 0;

                function processChunk() {
                    const end = Math.min(offset + CHUNK, total);
                    // 关键：用 apply 的边界安全写法，避免大数组爆栈
                    const slice = bytes.subarray(offset, end);
                    let binary = '';
                    for (let i = 0; i < slice.length; i++) {
                        binary += String.fromCharCode(slice[i]);
                    }
                    result += btoa(binary);
                    offset = end;
                    if (onProgress) onProgress((offset / total) * 100);
                    if (offset < total) {
                        setTimeout(processChunk, 0);
                    } else {
                        resolve(result);
                    }
                }
                processChunk();
            } catch (e) { reject(e); }
        });
    }

    // ============================================================
    // 错误提示
    // ============================================================
    function showError(title, detail) {
        console.error('[Flava]', title, detail || '');
        alert(title + (detail ? '\n\n' + detail : ''));
    }

    // 诊断 fetch 失败原因
    async function diagnoseFetchError(url, originalError) {
        const errMsg = (originalError && originalError.message) || '';

        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
            return (
                '❌ 网络请求失败 (Failed to fetch)\n\n' +
                '当前地址: ' + location.href + '\n\n' +
                '请确认:\n' +
                '  1) 文件真实存在于服务器 download/ 目录\n' +
                '  2) 浏览器能直接访问 ' + url + '\n' +
                '     （在地址栏手动输入该 URL 试试）\n' +
                '  3) 服务器允许 GET 且没被反代拦截\n' +
                '  4) 不是 file:// 打开的页面'
            );
        }

        try {
            const head = await fetch(url, { method: 'GET', cache: 'no-cache' });
            if (head.status === 404) return '❌ 文件不存在 (404): ' + url;
            if (head.status === 403) return '❌ 服务器拒绝访问 (403): ' + url;
            if (head.status === 405) return '❌ 服务器不允许 GET (405)';
            if (head.status >= 500) return '❌ 服务器内部错误 (' + head.status + ')';
            return '❌ HTTP ' + head.status + ' ' + head.statusText;
        } catch (e) {
            return '❌ 请求失败: ' + errMsg;
        }
    }

    // ============================================================
    // 核心：动态获取真实文件
    // ============================================================
    function fetchFile(onProgress) {
        const url = './download/' + encodeURIComponent(currentFile);

        // 命中缓存
        const cached = cacheMap.get(currentFile);
        if (cached) {
            console.log('[Flava]   命中缓存:', currentFile, cached.byteLength, 'bytes');
            if (onProgress) onProgress(100, cached.byteLength);
            return Promise.resolve(cached);
        }

        // 正在请求中，复用同一个 promise
        const inflight = inflightMap.get(currentFile);
        if (inflight) return inflight;

        const promise = (async () => {
            console.log('[Flava] ▶ GET', url);
            const resp = await fetch(url, {
                method: 'GET'
                // 注意：故意不传 cache/no-cache/特殊头，避免触发某些 CDN/反代的 preflight 拦截
            });

            if (!resp.ok) {
                const msg = await diagnoseFetchError(url, {
                    message: 'HTTP ' + resp.status + ' ' + resp.statusText
                });
                throw new Error(msg);
            }

            const total = Number(resp.headers.get('Content-Length')) || 0;
            console.log('[Flava]   文件大小:', total || '未知', 'bytes');

            const reader = resp.body.getReader();
            const chunks = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (onProgress && total > 0) {
                    onProgress((received / total) * 100, received);
                }
            }

            const buffer = new Uint8Array(received);
            let off = 0;
            for (const c of chunks) { buffer.set(c, off); off += c.length; }

            // 校验：至少 2 字节 + MZ 头
            if (received < 2) throw new Error('❌ 下载的文件为空（0 字节）');
            if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
                console.log('[Flava]   ✅ MZ 头验证通过，合法 PE 文件');
            } else {
                console.warn('[Flava]   ⚠️ 文件头不是 MZ:',
                    buffer[0].toString(16), buffer[1].toString(16),
                    '（可能不是 Windows exe，但继续处理）');
            }

            const ab = buffer.buffer;
            cacheMap.set(currentFile, ab);
            console.log('[Flava] ✅ 文件获取完成:', received, 'bytes');
            return ab;
        })();

        inflightMap.set(currentFile, promise);
        promise.finally(() => inflightMap.delete(currentFile));
        return promise;
    }

    // ============================================================
    // 进度条
    // ============================================================
    function setProgress(percent, text) {
        const pct = Math.max(0, Math.min(100, Math.round(percent * 10) / 10));
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.textContent = text !== undefined ? text : (pct + '%');
    }
    function resetProgress() { setProgress(0, '等待操作...'); }
    function resetTextareas() {
        if (textReadonly) textReadonly.value = '';
        if (textEditable) textEditable.value = '';
    }

    // ============================================================
    // 弹窗控制
    // ============================================================
    function openDialog(version, file, size) {
        currentVersion = version;
        currentFile    = file;
        currentSize    = size;

        if (dialogTitle) dialogTitle.textContent = '下载v' + version;
        if (dialogDesc)  dialogDesc.textContent  =
            '当前版本: v' + version + ' (' + size + ') — 由于下载可能被各种方式拦截，这里准备了多种方式下载';

        resetProgress();
        resetTextareas();

        if (btnDirect)     { btnDirect.textContent = '点击下载'; btnDirect.disabled = false; }
        if (btnEncodeCopy) { btnEncodeCopy.textContent = '开始获取并编码'; btnEncodeCopy.disabled = false; }
        if (btnEncodeDrag) { btnEncodeDrag.textContent = '开始获取并编码'; btnEncodeDrag.disabled = false; }
        if (btnPickDir)    btnPickDir.disabled = false;
        if (btnWriteFile)  btnWriteFile.disabled = true;  // 需先选位置
        if (progressBar)   progressBar.style.background = '';

        console.log('[Flava] 弹窗打开 → v' + version + ' / ' + file);
        if (overlay) overlay.classList.add('active');
    }

    function closeDialog() {
        if (overlay) overlay.classList.remove('active');
        console.log('[Flava] 弹窗关闭');
    }

    // ============================================================
    // 方式1：直接下载（Blob + 临时 a 标签）
    // ============================================================
    async function directDownload() {
        if (!btnDirect) return;
        try {
            btnDirect.disabled = true;
            btnDirect.textContent = '正在获取文件...';

            const buffer = await fetchFile(p =>
                btnDirect.textContent = '获取中 ' + Math.round(p) + '%');

            const blob = new Blob([buffer], { type: 'application/octet-stream' });
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = currentFile;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // 大文件给 5 分钟再释放，避免下载中途链接失效
            setTimeout(() => URL.revokeObjectURL(objectUrl), 300000);

            btnDirect.textContent = '✅ 下载已触发';
            setTimeout(() => { btnDirect.textContent = '点击下载'; btnDirect.disabled = false; }, 2000);
        } catch (err) {
            console.error('[Flava] 直接下载失败:', err);
            showError('下载失败:', err.message);
            btnDirect.textContent = '点击下载';
            btnDirect.disabled = false;
        }
    }

    // ============================================================
    // 方式2：File System Access API 写入文件
    // ============================================================
    let pickedDirHandle  = null;
    let pickedFileHandle = null;

    function isFSAvailable() {
        return 'showDirectoryPicker' in window || 'showSaveFilePicker' in window;
    }

    async function pickDirectory() {
        if (!isFSAvailable()) {
            showError('❌ 浏览器不支持 File System Access API',
                '要求：Chrome 86+ / Edge 86+ 桌面版\n当前: ' + location.href);
            return;
        }
        try {
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: currentFile,
                    types: [{ description: '可执行文件',
                        accept: { 'application/octet-stream': ['.exe'] } }]
                });
                pickedFileHandle = handle;
                pickedDirHandle = null;
                if (btnWriteFile) btnWriteFile.disabled = false;
                if (progressText) progressText.textContent = '已选择保存位置，点击「开始下载」';
            } else {
                pickedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                pickedFileHandle = null;
                if (btnWriteFile) btnWriteFile.disabled = false;
                if (progressText) progressText.textContent = '已选择目录: ' + pickedDirHandle.name;
            }
            setProgress(0);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[Flava] 选择位置失败:', err);
                showError('选择位置失败:', err.name + ': ' + err.message);
            }
        }
    }

    async function writeFile() {
        if (!pickedFileHandle && !pickedDirHandle) {
            showError('请先点击「选择位置」');
            return;
        }
        try {
            if (btnWriteFile) btnWriteFile.disabled = true;
            if (btnPickDir)   btnPickDir.disabled = true;
            setProgress(0, '正在获取文件...');

            const buffer = await fetchFile(p =>
                setProgress(p, '下载中 ' + Math.round(p) + '%'));

            let writable, targetName;

            if (pickedFileHandle) {
                const perm = await pickedFileHandle.requestPermission({ mode: 'readwrite' });
                if (perm !== 'granted') throw new Error('未获得文件写入权限（用户拒绝）');
                writable = await pickedFileHandle.createWritable({ keepExistingData: false });
                targetName = pickedFileHandle.name;
            } else {
                const fh = await pickedDirHandle.getFileHandle(currentFile, { create: true });
                const perm = await fh.requestPermission({ mode: 'readwrite' });
                if (perm !== 'granted') throw new Error('未获得文件写入权限（用户拒绝）');
                writable = await fh.createWritable({ keepExistingData: false });
                targetName = currentFile;
            }

            const total = buffer.byteLength;
            const bytes = new Uint8Array(buffer);
            const chunkSize = 512 * 1024;
            let written = 0;

            setProgress(0, '正在写入...');
            while (written < total) {
                const end = Math.min(written + chunkSize, total);
                await writable.write(bytes.subarray(written, end));
                written = end;
                setProgress((written / total) * 100,
                    '写入中 ' + (written / 1048576).toFixed(1) + '/' + (total / 1048576).toFixed(1) + 'MB');
                await new Promise(r => setTimeout(r, 0));
            }
            await writable.close();
            setProgress(100, '✅ 写入完成: ' + targetName + ' (' + (total / 1048576).toFixed(2) + 'MB)');
            console.log('[Flava] ✅ 写入完成:', targetName, total, 'bytes');

            setTimeout(() => { if (btnWriteFile) btnWriteFile.disabled = false;
                if (btnPickDir) btnPickDir.disabled = false; }, 1500);
        } catch (err) {
            console.error('[Flava] 写入失败:', err);
            let msg = '写入失败:\n\n' + err.message;
            if (err.name === 'SecurityError') {
                msg += '\n\nEdge 安全策略拦截。\n请确认地址栏是 http://localhost（不是 127.0.0.1）\n或关闭 Edge "增强安全模式"';
            } else if (err.message && err.message.includes('Failed to fetch')) {
                msg = await diagnoseFetchError('./download/' + currentFile, err);
            }
            showError('写入失败:', msg);
            if (progressText) progressText.textContent = '❌ 出错';
            if (btnWriteFile) btnWriteFile.disabled = false;
            if (btnPickDir)   btnPickDir.disabled = false;
        }
    }

    // ============================================================
    // 方式3 & 4：Base64 分块编码
    // ============================================================
    async function encodeToBase64(targetTextarea) {
        const isReadonly = (targetTextarea === textReadonly);
        const btn = isReadonly ? btnEncodeCopy : btnEncodeDrag;
        if (!btn) return;

        try {
            btn.disabled = true;
            btn.textContent = '正在获取文件...';

            const buffer = await fetchFile(p =>
                btn.textContent = '获取中 ' + Math.round(p) + '%');

            btn.textContent = '正在编码...';
            await new Promise(r => requestAnimationFrame(r));

            const b64 = await arrayBufferToBase64Chunked(buffer, p =>
                btn.textContent = '编码中 ' + Math.round(p) + '%');

            targetTextarea.value = b64;
            btn.textContent = '✅ 编码完成 (' + (b64.length / 1024).toFixed(1) + 'KB)';
            console.log('[Flava] Base64 完成，长度:', b64.length, '前80:', b64.substring(0, 80));

            setTimeout(() => { btn.textContent = '开始获取并编码'; btn.disabled = false; }, 2500);
        } catch (err) {
            console.error('[Flava] 编码失败:', err);
            targetTextarea.value = '';
            const msg = (err.message && err.message.includes('Failed to fetch'))
                ? await diagnoseFetchError('./download/' + currentFile, err)
                : '编码失败:\n\n' + err.message;
            showError('编码失败:', msg);
            btn.textContent = '开始获取并编码';
            btn.disabled = false;
        }
    }

    // ============================================================
    // 复制按钮（大文本降级）
    // ============================================================
    async function copyBase64() {
        if (!textReadonly) return;
        const text = textReadonly.value;
        if (!text) { showError('没有可复制的内容', '请先点击「开始获取并编码」'); return; }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try { await navigator.clipboard.writeText(text); }
                catch (e) { throw e; }
            } else { throw new Error('Clipboard API 不可用'); }

            if (btnCopy) {
                btnCopy.textContent = '✅ 已复制!';
                btnCopy.classList.add('copied');
                setTimeout(() => { btnCopy.textContent = '复制'; btnCopy.classList.remove('copied'); }, 2000);
            }
        } catch (err) {
            // 降级：textarea + execCommand
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
                document.body.appendChild(ta); ta.focus(); ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (!ok) throw new Error('execCommand 也失败');
                if (btnCopy) {
                    btnCopy.textContent = '✅ 已复制!';
                    btnCopy.classList.add('copied');
                    setTimeout(() => { btnCopy.textContent = '复制'; btnCopy.classList.remove('copied'); }, 2000);
                }
            } catch (e2) {
                showError('复制失败:', e2.message + '\n\n请手动框选并 Ctrl+C 复制');
            }
        }
    }

    // ============================================================
    // 初始化：绑定事件
    // ============================================================
    function bindEvents() {
        console.log('[Flava] 开始绑定事件...');

        // 关键：找带 data-version 的下载按钮
        const dlBtns = document.querySelectorAll('.download-btn[data-version]');
        console.log('[Flava] 找到', dlBtns.length, '个版本下载按钮');
        if (dlBtns.length === 0) {
            console.error('[Flava] ❌ 没找到任何带 data-version 的按钮！检查 index.html');
        }

        dlBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const v = btn.getAttribute('data-version');
                const f = btn.getAttribute('data-file');
                const s = btn.getAttribute('data-size') || '';
                console.log('[Flava] 点击 → v' + v + ' (' + f + ')');
                openDialog(v, f, s);
            });
        });

        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (overlay)  overlay.addEventListener('click', e => {
            if (e.target === overlay) closeDialog();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeDialog();
        });

        if (btnDirect)     btnDirect.addEventListener('click', directDownload);
        if (btnPickDir)    btnPickDir.addEventListener('click', pickDirectory);
        if (btnWriteFile)  btnWriteFile.addEventListener('click', writeFile);
        if (btnEncodeCopy) btnEncodeCopy.addEventListener('click', () => encodeToBase64(textReadonly));
        if (btnEncodeDrag) btnEncodeDrag.addEventListener('click', () => encodeToBase64(textEditable));
        if (btnCopy)       btnCopy.addEventListener('click', copyBase64);

        console.log('[Flava] ✅ 事件绑定完成');
        console.log('[Flava] showSaveFilePicker:', 'showSaveFilePicker' in window ? '✅' : '❌');
        console.log('[Flava] showDirectoryPicker:', 'showDirectoryPicker' in window ? '✅' : '❌');
        console.log('[Flava] clipboard:', navigator.clipboard ? '✅' : '❌');
        console.log('[Flava] 当前地址:', location.href);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindEvents);
    } else {
        bindEvents();
    }

    console.log('[Flava] 脚本初始化完成');
})();
