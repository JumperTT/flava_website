/* ============================================================
   download-dialog.js — Flava Download 弹窗交互
   · 弹窗开关
   · 方式1：直接下载（<a download>）
   · 方式2：File System Access API 写入文件 + 进度条
   · 方式3 / 4：fetch → base64 编码 → 填入文本框
   · 复制按钮
   ============================================================ */

(function () {
    'use strict';

    const FILE_URL = './download/flava.exe';

    /* ---------- DOM 获取 ---------- */
    const overlay         = document.getElementById('dialogOverlay');
    const btnOpen        = document.getElementById('openDownloadDialog');
    const btnClose       = document.getElementById('dialogClose');

    const btnDirect      = document.getElementById('btnDirectDownload');
    const btnPickDir     = document.getElementById('btnPickDir');
    const btnWriteFile   = document.getElementById('btnWriteFile');
    const progressBar    = document.getElementById('progressBar');
    const progressText   = document.getElementById('progressText');

    const btnEncodeCopy  = document.getElementById('btnEncodeCopy');
    const btnEncodeDrag  = document.getElementById('btnEncodeDrag');
    const textCopy       = document.getElementById('base64CopyText');
    const textDrag       = document.getElementById('base64DragText');
    const btnCopyB64     = document.getElementById('btnCopyBase64');

    let selectedDirHandle = null;

    /* ---------- 工具函数 ---------- */
    function setProgress(pct, text) {
        progressBar.style.width = pct + '%';
        progressText.textContent = text || (pct.toFixed(0) + '%');
    }

    async function fetchFile() {
        const resp = await fetch(FILE_URL);
        if (!resp.ok) throw new Error('文件获取失败: ' + resp.status);
        return resp;
    }

    // ArrayBuffer → Base64
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000; // 32KB 分块避免栈溢出
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    /* ---------- 弹窗开关 ---------- */
    function openDialog(e) {
        if (e) e.preventDefault();
        overlay.classList.add('active');
    }
    function closeDialog() {
        overlay.classList.remove('active');
    }

    btnOpen.addEventListener('click', openDialog);
    btnClose.addEventListener('click', closeDialog);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });

    /* ---------- 方式1：直接下载 ---------- */
    btnDirect.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = FILE_URL;
        a.download = 'flava.exe';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    /* ---------- 方式2：选择目录 ---------- */
    btnPickDir.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
            progressText.textContent = '当前浏览器不支持目录选择，请使用 Chrome / Edge 等现代浏览器';
            return;
        }
        try {
            selectedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            progressText.textContent = '已选择目录: ' + selectedDirHandle.name;
            btnWriteFile.disabled = false;
        } catch (err) {
            progressText.textContent = '取消选择或出错: ' + err.message;
        }
    });

    /* ---------- 方式2：写入文件（带进度条） ---------- */
    btnWriteFile.addEventListener('click', async () => {
        if (!selectedDirHandle) {
            progressText.textContent = '请先点击「选择位置」选择目录';
            return;
        }
        try {
            btnWriteFile.disabled = true;
            btnPickDir.disabled = true;
            setProgress(0, '开始下载...');

            const resp = await fetchFile();
            const total = resp.headers.get('content-length');
            const reader = resp.body.getReader();
            const chunks = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (total) {
                    const pct = (received / total) * 100;
                    setProgress(pct, '下载中... ' + (received / 1024 / 1024).toFixed(2) + 'MB');
                } else {
                    setProgress(Math.min((received / (7.51 * 1024 * 1024)) * 100, 99), '下载中...');
                }
            }

            // 合并到 Blob
            const blob = new Blob(chunks);
            const buffer = await blob.arrayBuffer();

            setProgress(95, '正在写入文件...');

            const fileHandle = await selectedDirHandle.getFileHandle('flava.exe', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(buffer);
            await writable.close();

            setProgress(100, '✅ 下载完成！文件已保存到 ' + selectedDirHandle.name + '/flava.exe');
        } catch (err) {
            setProgress(0, '❌ 出错: ' + err.message);
        } finally {
            btnWriteFile.disabled = false;
            btnPickDir.disabled = false;
        }
    });

    /* ---------- 方式3/4：获取并 base64 编码 ---------- */
    async function encodeToBase64() {
        const resp = await fetchFile();
        const buffer = await resp.arrayBuffer();
        return arrayBufferToBase64(buffer);
    }

    btnEncodeCopy.addEventListener('click', async () => {
        try {
            btnEncodeCopy.textContent = '编码中...';
            btnEncodeCopy.disabled = true;
            const b64 = await encodeToBase64();
            textCopy.value = b64;
            btnEncodeCopy.textContent = '开始获取并编码';
            btnEncodeCopy.disabled = false;
        } catch (err) {
            textCopy.value = '错误: ' + err.message;
            btnEncodeCopy.textContent = '开始获取并编码';
            btnEncodeCopy.disabled = false;
        }
    });

    btnEncodeDrag.addEventListener('click', async () => {
        try {
            btnEncodeDrag.textContent = '编码中...';
            btnEncodeDrag.disabled = true;
            const b64 = await encodeToBase64();
            textDrag.value = b64;
            btnEncodeDrag.textContent = '开始获取并编码';
            btnEncodeDrag.disabled = false;
        } catch (err) {
            textDrag.value = '错误: ' + err.message;
            btnEncodeDrag.textContent = '开始获取并编码';
            btnEncodeDrag.disabled = false;
        }
    });

    /* ---------- 复制按钮 ---------- */
    btnCopyB64.addEventListener('click', async () => {
        if (!textCopy.value) {
            progressText.textContent = '暂无内容可复制，请先编码';
            return;
        }
        try {
            await navigator.clipboard.writeText(textCopy.value);
            const oldText = btnCopyB64.textContent;
            btnCopyB64.textContent = '已复制!';
            setTimeout(() => { btnCopyB64.textContent = oldText; }, 1500);
        } catch {
            // 降级方案
            textCopy.removeAttribute('readonly');
            textCopy.select();
            document.execCommand('copy');
            textCopy.setAttribute('readonly', '');
            textCopy.blur();
            const oldText = btnCopyB64.textContent;
            btnCopyB64.textContent = '已复制!';
            setTimeout(() => { btnCopyB64.textContent = oldText; }, 1500);
        }
    });

})();
