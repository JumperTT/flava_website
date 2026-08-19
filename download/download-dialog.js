/* ============================================================
   download-dialog.js — Flava Download 弹窗逻辑
   · 零 fallback、零模拟、零假数据
   · 全部通过 fetch() 动态获取 ./download/flava.exe 真实二进制
   · Base64 编码使用 FileReader（零栈溢出，支持任意大小文件）
   · 初始化时强制预检，文件不可达则禁用全部按钮并明确报错
   ============================================================ */

(function () {
    'use strict';

    // ---------- DOM 元素 ----------
    const openBtn       = document.getElementById('openDialogBtn');
    const overlay       = document.getElementById('dialogOverlay');
    const closeBtn      = document.getElementById('dialogClose');

    const btnDirect     = document.getElementById('btnDirectDownload');
    const btnPickDir    = document.getElementById('btnPickDir');
    const btnWriteFile  = document.getElementById('btnWriteFile');
    const progressBar   = document.getElementById('progressBar');
    const progressText  = document.getElementById('progressText');

    const btnEncodeCopy = document.getElementById('btnEncodeCopy');
    const btnEncodeDrag = document.getElementById('btnEncodeDrag');
    const textReadonly  = document.getElementById('base64Readonly');
    const textEditable  = document.getElementById('base64Editable');
    const btnCopy       = document.getElementById('btnCopy');

    // ---------- 配置 ----------
    const FILE_NAME = 'flava.exe';
    const FILE_URL  = './download/flava.exe';

    // 缓存：避免重复下载
    let cachedBuffer = null;
    let fetchInFlight = null;

    // 全局状态：文件是否可达
    let fileReachable = false;

    console.log('[Flava] FILE_URL =', FILE_URL);

    // ============================================================
    // 工具函数
    // ============================================================

    /**
     * ArrayBuffer → Base64（无栈溢出风险）
     * 使用 Blob + FileReader.readAsDataURL，绕过 btoa 的长度限制
     */
    function arrayBufferToBase64(buffer) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer], { type: 'application/octet-stream' });
            const reader = new FileReader();
            reader.onload = function () {
                // result 形如 "data:application/octet-stream;base64,xxxx"
                const b64 = reader.result.split(',')[1];
                resolve(b64);
            };
            reader.onerror = function () {
                reject(new Error('FileReader 编码失败: ' + reader.error.message));
            };
            reader.readAsDataURL(blob);
        });
    }

    /**
     * 统一错误提示
     */
    function showError(title, detail) {
        console.error('[Flava]', title, detail || '');
        alert(title + (detail ? '\n\n' + detail : ''));
    }

    /**
     * 精确诊断 fetch 失败原因
     */
    async function diagnoseFetchError(url, originalError) {
        const errMsg = (originalError && originalError.message) || '';

        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
            return (
                '❌ 网络请求失败 (Failed to fetch)\n\n' +
                '你当前访问的地址是:\n  ' + location.href + '\n\n' +
                '这个错误 99% 是因为服务器没返回 CORS 头。\n\n' +
                '✅ 唯一正确的启动方式（用本项目自带的服务器）:\n' +
                '  1) 打开终端，cd 到项目目录\n' +
                '  2) 运行: node server.js\n' +
                '  3) 浏览器打开: http://localhost:5500\n\n' +
                '⚠️ 以下方式都会失败，不要再用:\n' +
                '  ✗ VS Code Live Server（无 CORS 头）\n' +
                '  ✗ python -m http.server（无 CORS 头）\n' +
                '  ✗ 双击 index.html（file:// 协议禁止 fetch）\n\n' +
                '请求地址: ' + url
            );
        }

        // 用 HEAD 做二次诊断
        try {
            const head = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
            if (head.status === 404) {
                return (
                    '❌ 文件不存在 (404)\n\n' +
                    '请求地址: ' + url + '\n\n' +
                    '请确认 download/flava.exe 已放在项目根目录的 download/ 文件夹下。\n' +
                    '当前项目根目录: ' + location.origin + '/'
                );
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
    // 核心：动态获取真实文件（唯一数据源，绝不伪造）
    // ============================================================
    async function fetchFile(onProgress) {
        if (cachedBuffer) {
            if (onProgress) onProgress(100, cachedBuffer.byteLength);
            return cachedBuffer;
        }
        if (fetchInFlight) return fetchInFlight;

        fetchInFlight = (async () => {
            console.log('[Flava] ▶ 开始动态获取文件:', FILE_URL);
            const resp = await fetch(FILE_URL, {
                method: 'GET',
                cache: 'no-cache',
                headers: { 'Accept': 'application/octet-stream' }
            });

            if (!resp.ok) {
                const msg = await diagnoseFetchError(FILE_URL, {
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

            // 校验：至少要有 MZ 头
            if (received >= 2) {
                if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
                    console.log('[Flava]   ✅ MZ 头验证通过，是合法 PE 文件');
                } else {
                    console.warn('[Flava]   ⚠️ 文件头不是 MZ:',
                        buffer[0].toString(16), buffer[1].toString(16));
                }
            } else {
                throw new Error('❌ 下载的文件为空（0 字节）');
            }

            cachedBuffer = buffer.buffer;
            console.log('[Flava] ✅ 文件获取完成:', received, 'bytes');
            return cachedBuffer;
        })();

        try {
            return await fetchInFlight;
        } finally {
            fetchInFlight = null;
        }
    }

    // ============================================================
    // 进度条
    // ============================================================
    function setProgress(percent, text) {
        const pct = Math.max(0, Math.min(100, Math.round(percent * 10) / 10));
        progressBar.style.width = pct + '%';
        progressText.textContent = text !== undefined ? text : (pct + '%');
    }

    function resetProgress() {
        setProgress(0, '等待操作...');
    }

    // ============================================================
    // 弹窗控制
    // ============================================================
    function openDialog()  { overlay.classList.add('active'); }
    function closeDialog() { overlay.classList.remove('active'); }

    // ============================================================
    // 方式1：直接下载
    // ============================================================
    async function directDownload() {
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
            a.download = FILE_NAME;
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
            btnDirect.disabled = !fileReachable;
        }
    }

    // ============================================================
    // 方式2：File System Access API 写入文件
    // ============================================================
    let pickedDirHandle = null;

    async function pickDirectory() {
        if (!window.showDirectoryPicker) {
            showError('❌ 当前浏览器不支持 File System Access API',
                '要求：Chrome 86+ / Edge 86+ 桌面版，且通过 http://localhost 或 https:// 访问');
            return;
        }
        try {
            pickedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            btnWriteFile.disabled = false;
            progressText.textContent = '已选择目录: ' + pickedDirHandle.name + '，点击「开始下载」写入文件';
            setProgress(0);
            console.log('[Flava] 已选择目录:', pickedDirHandle.name);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('[Flava] 选择目录失败:', err);
                showError('选择目录失败:', err.name + ': ' + err.message);
            }
        }
    }

    async function writeFile() {
        if (!pickedDirHandle) { showError('请先点击「选择位置」'); return; }

        try {
            btnWriteFile.disabled = true;
            btnPickDir.disabled = true;
            setProgress(0, '正在获取文件...');

            const buffer = await fetchFile(p => setProgress(p, '下载中 ' + Math.round(p) + '%'));

            const fileHandle = await pickedDirHandle.getFileHandle(FILE_NAME, { create: true });
            const permission = await fileHandle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') throw new Error('未获得文件写入权限（用户拒绝）');

            const writable = await fileHandle.createWritable({ keepExistingData: false });

            const total = buffer.byteLength;
            const bytes = new Uint8Array(buffer);
            const chunkSize = 1024 * 1024; // 1MB
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
            setProgress(100, '✅ 写入完成: ' + FILE_NAME + ' (' + (total / 1048576).toFixed(2) + ' MB)');
            console.log('[Flava] ✅ 文件写入完成:', FILE_NAME, total, 'bytes');

            setTimeout(() => {
                btnWriteFile.disabled = false;
                btnPickDir.disabled = false;
            }, 1500);
        } catch (err) {
            console.error('[Flava] 写入文件失败:', err);
            let msg = '写入失败:\n\n' + err.message;
            if (err.name === 'NotAllowedError') msg += '\n\n可能原因：未获得写入权限，或文件被其他程序占用';
            else if (err.name === 'AbortError') msg += '\n\n可能被杀毒软件拦截';
            else if (err.message.includes('Failed to fetch')) msg = await diagnoseFetchError(FILE_URL, err);
            showError('写入失败:', msg);
            progressText.textContent = '❌ 出错';
            btnWriteFile.disabled = false;
            btnPickDir.disabled = false;
        }
    }

    // ============================================================
    // 方式3 & 4：Base64 编码（使用 FileReader，零栈溢出）
    // ============================================================
    async function encodeToBase64(targetTextarea) {
        const isReadonly = (targetTextarea === textReadonly);
        const btn = isReadonly ? btnEncodeCopy : btnEncodeDrag;

        try {
            btn.disabled = true;
            btn.textContent = '正在获取文件...';

            const buffer = await fetchFile(p => {
                btn.textContent = '获取中 ' + Math.round(p) + '%';
            });

            btn.textContent = '正在编码...';
            await new Promise(r => requestAnimationFrame(r));

            const b64 = await arrayBufferToBase64(buffer);

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
            const msg = err.message.includes('Failed to fetch')
                ? await diagnoseFetchError(FILE_URL, err)
                : '编码失败:\n\n' + err.message;
            showError('编码失败:', msg);
            btn.textContent = '开始获取并编码';
            btn.disabled = !fileReachable;
        }
    }

    // ============================================================
    // 复制按钮
    // ============================================================
    async function copyBase64() {
        const text = textReadonly.value;
        if (!text) { showError('没有可复制的内容', '请先点击「开始获取并编码」'); return; }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                textReadonly.removeAttribute('readonly');
                textReadonly.select();
                const ok = document.execCommand('copy');
                textReadonly.setAttribute('readonly', '');
                textReadonly.blur();
                if (!ok) throw new Error('execCommand 复制失败');
            }
            btnCopy.textContent = '✅ 已复制!';
            btnCopy.classList.add('copied');
            setTimeout(() => {
                btnCopy.textContent = '复制';
                btnCopy.classList.remove('copied');
            }, 2000);
        } catch (err) {
            showError('复制失败:', err.message + '\n\n请手动框选文本框内容并 Ctrl+C 复制');
        }
    }

    // ============================================================
    // 初始化预检：文件不可达则禁用全部按钮
    // ============================================================
    async function initCheck() {
        console.log('[Flava] 初始化预检: 检查文件是否可访问...');
        try {
            const head = await fetch(FILE_URL, { method: 'HEAD', cache: 'no-cache' });
            if (!head.ok) throw new Error('HTTP ' + head.status + ' ' + head.statusText);

            fileReachable = true;
            const len = head.headers.get('Content-Length');
            console.log('[Flava] ✅ 文件存在，大小:', len || '未知', 'bytes');
            console.log('[Flava]   Content-Type:', head.headers.get('Content-Type'));
            console.log('[Flava] ✅ 所有下载方式已就绪');
        } catch (err) {
            fileReachable = false;
            console.error('[Flava] ❌ 预检失败:', err.message);

            // 禁用所有触发下载的按钮
            btnDirect.disabled = true;
            btnPickDir.disabled = true;
            btnEncodeCopy.disabled = true;
            btnEncodeDrag.disabled = true;

            const detail = await diagnoseFetchError(FILE_URL, err);
            console.error('[Flava] 禁用全部下载按钮，原因:\n', detail);

            // 在进度条区域显示错误
            progressText.textContent = '❌ 文件无法访问，请检查服务器';
            progressBar.style.width = '100%';
            progressBar.style.background = '#ff4444';

            // 弹窗里也提示一次
            setTimeout(() => {
                showError('⚠️ 初始化检查失败', detail + '\n\n页面上的所有下载按钮已被禁用，请修复后刷新页面。');
            }, 500);
        }
    }

    // ============================================================
    // 绑定事件
    // ============================================================
    openBtn.addEventListener('click', openDialog);
    closeBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) closeDialog();
    });

    btnDirect.addEventListener('click', directDownload);
    btnPickDir.addEventListener('click', pickDirectory);
    btnWriteFile.addEventListener('click', writeFile);
    btnEncodeCopy.addEventListener('click', () => encodeToBase64(textReadonly));
    btnEncodeDrag.addEventListener('click', () => encodeToBase64(textEditable));
    btnCopy.addEventListener('click', copyBase64);

    // 初始化
    resetProgress();
    initCheck();

    console.log('[Flava] 弹窗逻辑已就绪（零 fallback 版）');
})();
