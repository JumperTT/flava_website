/* ============================================================
   download-dialog.js — Flava Download 弹窗逻辑（多版本支持）
   · 零 fallback、零模拟、零假数据
   · 全部通过 fetch() 动态获取真实二进制文件
   · 点击不同版本的「下载」按钮 → 弹窗标题变为「下载vX.X」
   · 四种下载方式全部指向当前选中版本的文件
   · Base64 分块编码（兼容 Edge）
   · 方式2 优先 showSaveFilePicker
   · 复制按钮大文本降级到 textarea + execCommand
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // DOM 元素获取（带防御性检查）
    // ============================================================
    function $(id) { return document.getElementById(id); }

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

    // 检查关键元素
    const required = { overlay, closeBtn, dialogTitle, btnDirect, btnPickDir, btnWriteFile, btnEncodeCopy, btnEncodeDrag, textReadonly, textEditable, btnCopy };
    for (const [name, el] of Object.entries(required)) {
        if (!el) console.error('[Flava] ❌ 找不到 DOM 元素:', name);
    }

    // ---------- 当前选中的版本信息 ----------
    let currentVersion = '';
    let currentFile    = '';
    let currentSize    = '';

    // 缓存：每个版本独立缓存 ArrayBuffer
    const cacheMap = new Map();
    const inflightMap = new Map();

    console.log('[Flava] 弹窗脚本已加载');

    // ============================================================
    // 工具函数
    // ============================================================

    /**
     * ArrayBuffer → Base64（分块处理，零栈溢出）
     */
    function arrayBufferToBase64Chunked(buffer, onProgress) {
        return new Promise((resolve, reject) => {
            try {
                const bytes = new Uint8Array(buffer);
                const total = bytes.length;
                const CHUNK = 0x6000; // 24576 字节
                let result = '';
                let offset = 0;

                function processChunk() {
                    const start = offset;
                    const end = Math.min(offset + CHUNK, total);
                    const slice = bytes.subarray(start, end);
                    let binary = '';
                    for (let i = 0; i < slice.length; i++) {
                        binary += String.fromCharCode(slice[i]);
                    }
                    result += btoa(binary);

                    offset = end;
                    const pct = (offset / total) * 100;
                    if (onProgress) onProgress(pct);

                    if (offset < total) {
                        setTimeout(processChunk, 0);
                    } else {
                        resolve(result);
                    }
                }

                processChunk();
            } catch (e) {
                reject(e);
            }
        });
    }

    function showError(title, detail) {
        console.error('[Flava]', title, detail || '');
        alert(title + (detail ? '\n\n' + detail : ''));
    }

    async function diagnoseFetchError(url, originalError) {
        const errMsg = (originalError && originalError.message) || '';

        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
            return (
                '❌ 网络请求失败 (Failed to fetch)\n\n' +
                '你当前访问的地址是:\n  ' + location.href + '\n\n' +
                '请确认:\n' +
                '  1) 服务器正在运行 (node server.js)\n' +
                '  2) 浏览器地址是 http://localhost:5500\n' +
                '  3) 不是 http://127.0.0.1 (Edge 有时不认)\n' +
                '  4) 不是 file:// 开头（双击 HTML 不行）\n' +
                '  5) 控制台 Network 面板看 ' + url + ' 的状态码'
            );
        }

        try {
            const head = await fetch(url, {
                method: 'GET',
                cache: 'no-cache',
                headers: { 'Range': 'bytes=0-0' }
            });
            if (head.status === 404) {
                return (
                    '❌ 文件不存在 (404)\n\n' +
                    '请求地址: ' + url + '\n\n' +
                    '请确认该版本文件已放在 download/ 文件夹下。'
                );
            }
            if (head.status === 405) {
                return '❌ 服务器不允许 GET 请求 (405)\n\n请确认使用的是配套的 node server.js';
            }
            if (head.status >= 500) {
                return '❌ 服务器内部错误 (' + head.status + ')\n\n请检查服务器日志。';
            }
            return '❌ HTTP ' + head.status + ' ' + head.statusText;
        } catch (e) {
            return '❌ 请求失败: ' + errMsg;
        }
    }

    // ============================================================
    // 核心：动态获取当前版本的真实文件
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
            console.log('[Flava] ▶ 开始获取文件:', url);
            const resp = await fetch(url, {
                method: 'GET',
                cache: 'no-cache',
                headers: { 'Accept': 'application/octet-stream' }
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
            let offset = 0;
            for (const c of chunks) {
                buffer.set(c, offset);
                offset += c.length;
            }

            if (received >= 2) {
                if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
                    console.log('[Flava]   ✅ MZ 头验证通过，合法 PE 文件');
                } else {
                    console.warn('[Flava]   ⚠️ 文件头不是 MZ:', buffer[0].toString(16), buffer[1].toString(16));
                }
            } else {
                throw new Error('❌ 下载的文件为空（0 字节）');
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

    function resetProgress() {
        setProgress(0, '等待操作...');
    }

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
        if (dialogDesc)  dialogDesc.textContent  = '当前版本: v' + version + ' (' + size + ') — 由于下载可能被各种方式拦截，这里准备了多种方式下载';

        // 重置状态 —— 全部启用
        resetProgress();
        resetTextareas();
        if (btnDirect)     { btnDirect.textContent = '点击下载'; btnDirect.disabled = false; }
        if (btnEncodeCopy) { btnEncodeCopy.textContent = '开始获取并编码'; btnEncodeCopy.disabled = false; }
        if (btnEncodeDrag) { btnEncodeDrag.textContent = '开始获取并编码'; btnEncodeDrag.disabled = false; }
        if (btnPickDir)    { btnPickDir.disabled = false; }
        if (btnWriteFile)  { btnWriteFile.disabled = true; }  // 只有这个需要等选位置后才启用
        if (progressBar)   { progressBar.style.background = ''; }

        console.log('[Flava] 弹窗打开 → 版本 v' + version + ', 文件: ' + file);

        if (overlay) overlay.classList.add('active');
    }

    function closeDialog() {
        if (overlay) overlay.classList.remove('active');
        console.log('[Flava] 弹窗关闭');
    }

    // ============================================================
    // 方式1：直接下载
    // ============================================================
    async function directDownload() {
        if (!btnDirect) return;
        try {
            btnDirect.disabled = true;
            btnDirect.textContent = '正在获取文件...';

            const buffer = await fetchFile(p => {
                btnDirect.textContent = '获取中 ' + Math.round(p) + '%';
            });

            const blob = new Blob([buffer], { type: 'application/octet-stream' });
            const url  = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 30000);

            btnDirect.textContent = '✅ 下载已触发';
            setTimeout(() => {
                btnDirect.textContent = '点击下载';
                btnDirect.disabled = false;
            }, 2000);
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
    let pickedDirHandle = null;
    let pickedFileHandle = null;

    function isFSAvailable() {
        return 'showDirectoryPicker' in window || 'showSaveFilePicker' in window;
    }

    async function pickDirectory() {
        if (!isFSAvailable()) {
            showError('❌ 当前浏览器不支持 File System Access API',
                '要求：Chrome 86+ / Edge 86+ 桌面版\n\n' +
                '且必须通过 http://localhost 或 https:// 访问\n' +
                '当前地址: ' + location.href);
            return;
        }

        try {
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: currentFile,
                    types: [{
                        description: '可执行文件',
                        accept: { 'application/octet-stream': ['.exe'] }
                    }]
                });
                pickedFileHandle = handle;
                pickedDirHandle = null;
                if (btnWriteFile) btnWriteFile.disabled = false;
                if (progressText) progressText.textContent = '已选择保存位置，点击「开始下载」写入文件';
            } else {
                pickedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                pickedFileHandle = null;
                if (btnWriteFile) btnWriteFile.disabled = false;
                if (progressText) progressText.textContent = '已选择目录: ' + pickedDirHandle.name + '，点击「开始下载」写入文件';
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

            const buffer = await fetchFile(p => setProgress(p, '下载中 ' + Math.round(p) + '%'));

            let writable;
            let targetName;

            if (pickedFileHandle) {
                const permission = await pickedFileHandle.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') throw new Error('未获得文件写入权限（用户拒绝）');
                writable = await pickedFileHandle.createWritable({ keepExistingData: false });
                targetName = pickedFileHandle.name;
            } else {
                const fileHandle = await pickedDirHandle.getFileHandle(currentFile, { create: true });
                const permission = await fileHandle.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') throw new Error('未获得文件写入权限（用户拒绝）');
                writable = await fileHandle.createWritable({ keepExistingData: false });
                targetName = currentFile;
            }

            const total = buffer.byteLength;
            const bytes = new Uint8Array(buffer);
            const chunkSize = 512 * 1024; // 512KB
            let written = 0;

            setProgress(0, '正在写入...');
            while (written < total) {
                const end = Math.min(written + chunkSize, total);
                await writable.write(bytes.subarray(written, end));
                written = end;
                setProgress((written / total) * 100,
                    '写入中 ' + (written / 1048576).toFixed(1) + ' / ' + (total / 1048576).toFixed(1) + ' MB');
                await new Promise(r => setTimeout(r, 0));
            }

            await writable.close();
            setProgress(100, '✅ 写入完成: ' + targetName + ' (' + (total / 1048576).toFixed(2) + ' MB)');
            console.log('[Flava] ✅ 文件写入完成:', targetName, total, 'bytes');

            setTimeout(() => {
                if (btnWriteFile) btnWriteFile.disabled = false;
                if (btnPickDir)   btnPickDir.disabled = false;
            }, 1500);
        } catch (err) {
            console.error('[Flava] 写入文件失败:', err);
            let msg = '写入失败:\n\n' + err.message;
            if (err.name === 'NotAllowedError') {
                msg += '\n\n可能原因：未获得写入权限，或文件被杀毒软件/Edge 安全策略拦截';
            } else if (err.name === 'SecurityError') {
                msg += '\n\nEdge 安全策略阻止了此操作。\n' +
                       '请确认地址栏是 http://localhost:5500（不是 http://127.0.0.1）\n' +
                       '或尝试关闭 Edge 的"增强安全模式"（设置 → 隐私 → 关闭"增强安全模式"）';
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

            const buffer = await fetchFile(p => {
                btn.textContent = '获取中 ' + Math.round(p) + '%';
            });

            btn.textContent = '正在编码...';
            await new Promise(r => requestAnimationFrame(r));

            const b64 = await arrayBufferToBase64Chunked(buffer, p => {
                btn.textContent = '编码中 ' + Math.round(p) + '%';
            });

            targetTextarea.value = b64;

            const sizeKB = (b64.length / 1024).toFixed(1);
            btn.textContent = '✅ 编码完成 (' + sizeKB + ' KB)';
            console.log('[Flava] Base64 编码完成，长度:', b64.length);
            console.log('[Flava] 前80字符:', b64.substring(0, 80));

            setTimeout(() => {
                btn.textContent = '开始获取并编码';
                btn.disabled = false;
            }, 2500);
        } catch (err) {
            console.error('[Flava] Base64 编码失败:', err);
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
    // 复制按钮（大文本降级兼容 Edge）
    // ============================================================
    async function copyBase64() {
        if (!textReadonly) return;
        const text = textReadonly.value;
        if (!text) { showError('没有可复制的内容', '请先点击「开始获取并编码」'); return; }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                } catch (clipErr) {
                    console.warn('[Flava] Clipboard API 失败，降级到 textarea:', clipErr.message);
                    throw clipErr;
                }
            } else {
                throw new Error('Clipboard API 不可用');
            }

            if (btnCopy) {
                btnCopy.textContent = '✅ 已复制!';
                btnCopy.classList.add('copied');
                setTimeout(() => {
                    btnCopy.textContent = '复制';
                    btnCopy.classList.remove('copied');
                }, 2000);
            }
        } catch (err) {
            // 降级：隐藏 textarea + execCommand
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (!ok) throw new Error('execCommand 也失败了');

                if (btnCopy) {
                    btnCopy.textContent = '✅ 已复制!';
                    btnCopy.classList.add('copied');
                    setTimeout(() => {
                        btnCopy.textContent = '复制';
                        btnCopy.classList.remove('copied');
                    }, 2000);
                }
            } catch (e2) {
                showError('复制失败:', e2.message + '\n\n请手动框选文本框内容并 Ctrl+C 复制');
            }
        }
    }

    // ============================================================
    // 初始化 —— 等 DOM 就绪后执行
    // ============================================================
    function bindEvents() {
        console.log('[Flava] 开始绑定事件...');

        // 版本下载按钮 → 动态打开弹窗
        const dlBtns = document.querySelectorAll('.download-btn[data-version]');
        console.log('[Flava] 找到', dlBtns.length, '个下载按钮');
        dlBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const version = btn.getAttribute('data-version');
                const file    = btn.getAttribute('data-file');
                const size    = btn.getAttribute('data-size') || '';
                console.log('[Flava] 用户点击下载按钮 → v' + version + ' (' + file + ')');
                openDialog(version, file, size);
            });
        });

        // 弹窗关闭
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (overlay)  overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeDialog();
        });

        // 弹窗内按钮
        if (btnDirect)     btnDirect.addEventListener('click', directDownload);
        if (btnPickDir)    btnPickDir.addEventListener('click', pickDirectory);
        if (btnWriteFile)  btnWriteFile.addEventListener('click', writeFile);
        if (btnEncodeCopy) btnEncodeCopy.addEventListener('click', () => encodeToBase64(textReadonly));
        if (btnEncodeDrag) btnEncodeDrag.addEventListener('click', () => encodeToBase64(textEditable));
        if (btnCopy)       btnCopy.addEventListener('click', copyBase64);

        console.log('[Flava] ✅ 所有事件绑定完成');
        console.log('[Flava] showSaveFilePicker:', 'showSaveFilePicker' in window ? '✅' : '❌');
        console.log('[Flava] showDirectoryPicker:', 'showDirectoryPicker' in window ? '✅' : '❌');
        console.log('[Flava] navigator.clipboard:', navigator.clipboard ? '✅' : '❌');
        console.log('[Flava] 当前地址:', location.href);
    }

    // 确保 DOM 就绪后再绑定
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindEvents);
    } else {
        bindEvents();
    }

    console.log('[Flava] 脚本初始化完成');
})();
