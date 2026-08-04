/* ============================================================
   bg-animation.js
   ─────────────────────────────────────────────────
   1. 背景动画：白色旋转网格 + 火焰光晕 + 漂浮粒子
   2. 侧边栏交互：树形折叠 / 展开 / 路由跳转
   3. 与 docsify 联动：点击侧边栏 → 修改 hash → docsify 加载对应 .md
   4. 内容区背景：fixed 钉在视口，永远铺满可视区
   5. 返回主页 → 跳转随机子域名.flava.woen.pics
   6. 搜索结果点击后清空搜索框
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       DOM 引用
       ============================================================ */
    const fireCanvas = document.getElementById('fireCanvas');
    const gridCanvas = document.getElementById('gridCanvas');
    const fireCtx = fireCanvas.getContext('2d');
    const gridCtx = gridCanvas.getContext('2d');
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.getElementById('menuIcon');
    const homeBtn = document.getElementById('homeBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    const contentBg = document.getElementById('contentBg');

    /* ============================================================
       背景动画 — 数据
       ============================================================ */
    let redPoints = [];
    let orangePoints = [];
    let yellowPoints = [];
    let backgroundGlows = [];
    let particles = [];

    /* ---------- 初始化光晕 ---------- */
    function initBackgroundGlows() {
        backgroundGlows = [];
        const glowCount = 18;
        for (let i = 0; i < glowCount; i++) {
            backgroundGlows.push({
                x: Math.random() * fireCanvas.width,
                y: Math.random() * fireCanvas.height * 0.8 + fireCanvas.height * 0.1,
                radius: Math.random() * fireCanvas.width * 0.25 + fireCanvas.width * 0.1,
                color: Math.random() > 0.5
                    ? 'rgba(255, 80, 0, 0.10)'
                    : 'rgba(255, 150, 0, 0.07)',
                velocityX: (Math.random() - 0.5) * 2.0,
                velocityY: (Math.random() - 0.5) * 1.5,
                maxVelocity: 4.0,
                minVelocity: -4.0,
                changeCounter: 0,
                changeInterval: Math.floor(Math.random() * 30) + 15,
                accelerationRate: Math.random() * 0.3 + 0.1
            });
        }
    }

    /* ---------- 初始化火焰点 ---------- */
    function initFirePoints() {
        redPoints = [];
        orangePoints = [];
        yellowPoints = [];

        const numPoints = 12;
        const segmentWidth = fireCanvas.width / (numPoints - 1);

        for (let i = 0; i < numPoints; i++) {
            const x = i * segmentWidth;
            const baseHeight = fireCanvas.height * 0.65;
            const randomFactor = Math.random() * 0.3 + 0.3;
            const y = baseHeight - randomFactor * fireCanvas.height * 0.5;
            redPoints.push({
                x, y,
                baseY: y,
                velocity: (Math.random() - 0.5) * 1.5,
                maxVelocity: 4.0,
                minVelocity: -4.0,
                changeCounter: 0,
                changeInterval: Math.floor(Math.random() * 80) + 40
            });
        }

        for (let i = 0; i < numPoints; i++) {
            const rp = redPoints[i];
            const bOffY = Math.random() * fireCanvas.height * 0.2 + fireCanvas.height * 0.15;
            const bOffX = Math.random() * 25 - 12;
            orangePoints.push({
                x: rp.x + bOffX, y: rp.baseY + bOffY,
                baseY: rp.baseY, baseOffsetY: bOffY, baseOffsetX: bOffX,
                offsetY: bOffY, offsetX: bOffX,
                velocityOffsetY: (Math.random() - 0.5) * 0.2,
                velocityOffsetX: (Math.random() - 0.5) * 0.1,
                maxVelocityOffset: 0.3, minVelocityOffset: -0.3,
                changeCounter: 0,
                changeInterval: Math.floor(Math.random() * 90) + 45
            });
        }

        for (let i = 0; i < numPoints; i++) {
            const rp = redPoints[i];
            const bOffY = Math.random() * fireCanvas.height * 0.25 + fireCanvas.height * 0.2;
            const bOffX = Math.random() * 35 - 17;
            yellowPoints.push({
                x: rp.x + bOffX, y: rp.baseY + bOffY,
                baseY: rp.baseY, baseOffsetY: bOffY, baseOffsetX: bOffX,
                offsetY: bOffY, offsetX: bOffX,
                velocityOffsetY: (Math.random() - 0.5) * 0.3,
                velocityOffsetX: (Math.random() - 0.5) * 0.2,
                maxVelocityOffset: 0.5, minVelocityOffset: -0.5,
                changeCounter: 0,
                changeInterval: Math.floor(Math.random() * 100) + 50
            });
        }
    }

    /* ---------- 粒子 ---------- */
    function initParticles() {
        particles = [];
        for (let i = 0; i < 25; i++) createParticle();
    }

    function createParticle() {
        const colors = [
            'rgba(255, 80, 0, 0.5)', 'rgba(255, 100, 0, 0.4)',
            'rgba(255, 120, 0, 0.3)', 'rgba(255, 140, 0, 0.25)',
            'rgba(255, 160, 0, 0.2)'
        ];
        particles.push({
            x: Math.random() * fireCanvas.width,
            y: fireCanvas.height + Math.random() * 50,
            size: Math.random() * 4 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            velocityY: -(Math.random() * 3 + 1.5),
            velocityX: (Math.random() - 0.5) * 1.0,
            life: 1.0,
            decay: Math.random() * 0.008 + 0.003,
            wobble: Math.random() * 0.1,
            wobbleSpeed: Math.random() * 0.05 + 0.02
        });
    }

    /* ============================================================
       绘制：网格
       ============================================================ */
    function drawGrid() {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        gridCtx.save();
        gridCtx.translate(gridCanvas.width / 2, gridCanvas.height / 2);
        gridCtx.rotate(30 * Math.PI / 180);

        const diag = Math.sqrt(gridCanvas.width ** 2 + gridCanvas.height ** 2);
        const s = -diag, e = diag;

        // 20px 暗网
        gridCtx.strokeStyle = 'rgba(255,255,255,0.06)';
        gridCtx.lineWidth = 1;
        for (let x = s; x <= e; x += 20) { gridCtx.beginPath(); gridCtx.moveTo(x, s); gridCtx.lineTo(x, e); gridCtx.stroke(); }
        for (let y = s; y <= e; y += 20) { gridCtx.beginPath(); gridCtx.moveTo(s, y); gridCtx.lineTo(e, y); gridCtx.stroke(); }

        // 10px 亮网
        gridCtx.strokeStyle = 'rgba(255,255,255,0.15)';
        gridCtx.lineWidth = 1.2;
        for (let x = s; x <= e; x += 10) { gridCtx.beginPath(); gridCtx.moveTo(x, s); gridCtx.lineTo(x, e); gridCtx.stroke(); }
        for (let y = s; y <= e; y += 10) { gridCtx.beginPath(); gridCtx.moveTo(s, y); gridCtx.lineTo(e, y); gridCtx.stroke(); }

        gridCtx.restore();
    }

    /* ============================================================
       更新逻辑
       ============================================================ */
    function updateFlameVelocities() {
        redPoints.forEach(p => {
            p.changeCounter++;
            if (p.changeCounter >= p.changeInterval) {
                p.changeCounter = 0;
                p.changeInterval = Math.floor(Math.random() * 80) + 40;
                p.velocity += (Math.random() - 0.5) * 0.8;
            }
            const minY = p.baseY - 120, maxY = p.baseY + 120;
            if (p.y > maxY - 30) p.velocity -= 0.3;
            if (p.y < minY + 30) p.velocity += 0.3;
            p.velocity = Math.max(p.minVelocity, Math.min(p.maxVelocity, p.velocity));
            p.velocity *= 0.99;
        });

        orangePoints.forEach(p => {
            p.changeCounter++;
            if (p.changeCounter >= p.changeInterval) {
                p.changeCounter = 0;
                p.changeInterval = Math.floor(Math.random() * 90) + 45;
                p.velocityOffsetY += (Math.random() - 0.5) * 0.15;
                p.velocityOffsetX += (Math.random() - 0.5) * 0.08;
            }
            if (p.offsetY > p.baseOffsetY + 10) p.velocityOffsetY -= 0.08;
            if (p.offsetY < p.baseOffsetY - 10) p.velocityOffsetY += 0.08;
            if (p.offsetX > p.baseOffsetX + 5) p.velocityOffsetX -= 0.04;
            if (p.offsetX < p.baseOffsetX - 5) p.velocityOffsetX += 0.04;
            p.velocityOffsetY = Math.max(p.minVelocityOffset, Math.min(p.maxVelocityOffset, p.velocityOffsetY));
            p.velocityOffsetX = Math.max(p.minVelocityOffset, Math.min(p.maxVelocityOffset, p.velocityOffsetX));
            p.velocityOffsetY *= 0.98;
            p.velocityOffsetX *= 0.98;
        });

        yellowPoints.forEach(p => {
            p.changeCounter++;
            if (p.changeCounter >= p.changeInterval) {
                p.changeCounter = 0;
                p.changeInterval = Math.floor(Math.random() * 100) + 50;
                p.velocityOffsetY += (Math.random() - 0.5) * 0.2;
                p.velocityOffsetX += (Math.random() - 0.5) * 0.1;
            }
            if (p.offsetY > p.baseOffsetY + 15) p.velocityOffsetY -= 0.1;
            if (p.offsetY < p.baseOffsetY - 15) p.velocityOffsetY += 0.1;
            if (p.offsetX > p.baseOffsetX + 10) p.velocityOffsetX -= 0.05;
            if (p.offsetX < p.baseOffsetX - 10) p.velocityOffsetX += 0.05;
            p.velocityOffsetY = Math.max(p.minVelocityOffset, Math.min(p.maxVelocityOffset, p.velocityOffsetY));
            p.velocityOffsetX = Math.max(p.minVelocityOffset, Math.min(p.minVelocityOffset, p.velocityOffsetX));
            p.velocityOffsetY *= 0.98;
            p.velocityOffsetX *= 0.98;
        });
    }

    function updateFlamePositions() {
        redPoints.forEach(p => {
            p.y += p.velocity;
            p.y = Math.max(p.baseY - 120, Math.min(p.baseY + 120, p.y));
        });
        orangePoints.forEach((p, i) => {
            p.offsetY += p.velocityOffsetY;
            p.offsetX += p.velocityOffsetX;
            p.offsetY = Math.max(p.baseOffsetY - 15, Math.min(p.baseOffsetY + 15, p.offsetY));
            p.offsetX = Math.max(p.baseOffsetX - 10, Math.min(p.baseOffsetX + 10, p.offsetX));
            p.x = redPoints[i].x + p.offsetX;
            p.y = redPoints[i].y + p.offsetY;
        });
        yellowPoints.forEach((p, i) => {
            p.offsetY += p.velocityOffsetY;
            p.offsetX += p.velocityOffsetX;
            p.offsetY = Math.max(p.baseOffsetY - 20, Math.min(p.baseOffsetY + 20, p.offsetY));
            p.offsetX = Math.max(p.baseOffsetX - 15, Math.min(p.baseOffsetX + 15, p.offsetX));
            p.x = redPoints[i].x + p.offsetX;
            p.y = redPoints[i].y + p.offsetY;
        });
    }

    function updateGlowPositions() {
        backgroundGlows.forEach(g => {
            g.changeCounter++;
            if (g.changeCounter >= g.changeInterval) {
                g.changeCounter = 0;
                g.changeInterval = Math.floor(Math.random() * 30) + 15;
                g.velocityX += (Math.random() - 0.5) * g.accelerationRate;
                g.velocityY += (Math.random() - 0.5) * g.accelerationRate;
            }
            g.velocityX = Math.max(g.minVelocity, Math.min(g.maxVelocity, g.velocityX));
            g.velocityY = Math.max(g.minVelocity, Math.min(g.maxVelocity, g.velocityY));
            g.velocityX *= 0.98;
            g.velocityY *= 0.98;
            g.x += g.velocityX;
            g.y += g.velocityY;
            if (g.x < 0 || g.x > fireCanvas.width) { g.velocityX *= -0.8; g.x = Math.max(0, Math.min(fireCanvas.width, g.x)); }
            if (g.y < 0 || g.y > fireCanvas.height) { g.velocityY *= -0.8; g.y = Math.max(0, Math.min(fireCanvas.height, g.y)); }
        });
    }

    function updateAndDrawParticles() {
        particles = particles.filter(p => p.life > 0);
        if (particles.length < 80) {
            const n = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < n; i++) createParticle();
        }
        particles.forEach(p => {
            p.x += p.velocityX + Math.sin(Date.now() * p.wobbleSpeed) * p.wobble;
            p.y += p.velocityY;
            p.life -= p.decay;
            fireCtx.globalAlpha = Math.max(0, p.life);
            fireCtx.fillStyle = p.color;
            fireCtx.beginPath();
            fireCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            fireCtx.fill();
        });
        fireCtx.globalAlpha = 1.0;
    }

    /* ============================================================
       绘制：火焰层
       ============================================================ */
    function drawFire() {
        fireCtx.clearRect(0, 0, fireCanvas.width, fireCanvas.height);

        backgroundGlows.forEach(g => {
            const grad = fireCtx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
            grad.addColorStop(0, g.color);
            grad.addColorStop(0.5, g.color.replace('0.10', '0.05').replace('0.07', '0.03'));
            grad.addColorStop(1, 'transparent');
            fireCtx.fillStyle = grad;
            fireCtx.beginPath();
            fireCtx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
            fireCtx.fill();
        });

        updateFlameVelocities();
        updateFlamePositions();
        updateGlowPositions();

        // 红色火焰
        fireCtx.beginPath();
        fireCtx.moveTo(redPoints[0].x, redPoints[0].y);
        for (let i = 1; i < redPoints.length; i++) fireCtx.lineTo(redPoints[i].x, redPoints[i].y);
        fireCtx.lineTo(fireCanvas.width, fireCanvas.height);
        fireCtx.lineTo(0, fireCanvas.height);
        fireCtx.closePath();
        const rg = fireCtx.createLinearGradient(0, 0, 0, fireCanvas.height);
        rg.addColorStop(0, 'rgba(255,40,0,0.35)');
        rg.addColorStop(0.5, 'rgba(220,20,60,0.30)');
        rg.addColorStop(1, 'rgba(180,0,0,0.25)');
        fireCtx.fillStyle = rg;
        fireCtx.fill();

        // 橙色火焰
        fireCtx.beginPath();
        fireCtx.moveTo(orangePoints[0].x, orangePoints[0].y);
        for (let i = 1; i < orangePoints.length; i++) fireCtx.lineTo(orangePoints[i].x, orangePoints[i].y);
        fireCtx.lineTo(fireCanvas.width, fireCanvas.height);
        fireCtx.lineTo(0, fireCanvas.height);
        fireCtx.closePath();
        const og = fireCtx.createLinearGradient(0, 0, 0, fireCanvas.height);
        og.addColorStop(0, 'rgba(255,140,0,0.28)');
        og.addColorStop(0.5, 'rgba(255,100,0,0.22)');
        og.addColorStop(1, 'rgba(255,80,0,0.18)');
        fireCtx.fillStyle = og;
        fireCtx.fill();

        // 黄色火焰
        fireCtx.beginPath();
        fireCtx.moveTo(yellowPoints[0].x, yellowPoints[0].y);
        for (let i = 1; i < yellowPoints.length; i++) fireCtx.lineTo(yellowPoints[i].x, yellowPoints[i].y);
        fireCtx.lineTo(fireCanvas.width, fireCanvas.height);
        fireCtx.lineTo(0, fireCanvas.height);
        fireCtx.closePath();
        const yg = fireCtx.createLinearGradient(0, 0, 0, fireCanvas.height);
        yg.addColorStop(0, 'rgba(255,240,50,0.22)');
        yg.addColorStop(0.5, 'rgba(255,200,0,0.18)');
        yg.addColorStop(1, 'rgba(255,150,0,0.12)');
        fireCtx.fillStyle = yg;
        fireCtx.fill();

        updateAndDrawParticles();
    }

    /* ============================================================
       动画循环 & 画布适配
       ============================================================ */
    function animate() {
        drawFire();
        requestAnimationFrame(animate);
    }

    function resizeCanvas() {
        fireCanvas.width = window.innerWidth;
        fireCanvas.height = window.innerHeight;
        gridCanvas.width = window.innerWidth;
        gridCanvas.height = window.innerHeight;
        initFirePoints();
        initBackgroundGlows();
        initParticles();
        drawGrid();
    }

    // 暴露给 docsify 插件
    window.__resizeCanvas = resizeCanvas;

    /* ============================================================
       内容区背景 — 复位滚动位置
       因为 .content-bg 是 position:fixed 钉在视口上，
       它永远铺满可视区域，无需手动设高度。
       这里只负责路由切换后让内容滚回顶部。
       ============================================================ */
    function adjustContentBg() {
        if (!contentWrapper) return;
        // 双重 rAF 确保 docsify 渲染完成后再复位
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                contentWrapper.scrollTop = 0;
            });
        });
    }

    window.__adjustContentBg = adjustContentBg;

    /* ============================================================
       随机子域名生成
       规则：小写英文字母，长度随机（4~10）
       ============================================================ */
    function generateRandomSubdomain() {
        const len = Math.floor(Math.random() * 7) + 4; // 4~10
        let s = '';
        for (let i = 0; i < len; i++) {
            s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
        }
        return s;
    }

    /* ============================================================
       搜索结果点击 → 清空搜索框
       ============================================================ */
    function bindSearchResultClear() {
        // docsify 搜索结果渲染在 .search .results-panel 里
        const panel = document.querySelector('.search .results-panel');
        if (!panel) return;

        // 用事件委托：点击任意结果链接
        panel.addEventListener('click', function handler(e) {
            const link = e.target.closest('a');
            if (!link) return;

            // 等 docsify 完成路由跳转后再清空
            setTimeout(() => {
                const input = document.querySelector('.search input');
                if (input) {
                    input.value = '';
                    // 触发 input 事件让搜索插件刷新结果面板（隐藏它）
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, 50);
        }, true); // 捕获阶段，确保在 docsify 处理之前绑定
    }

    window.__bindSearchResultClear = bindSearchResultClear;

    /* ============================================================
       侧边栏 — 菜单折叠 / 展开
       ============================================================ */
    function initTreeToggle() {
        document.querySelectorAll('.tree-item.has-children > .tree-label').forEach(label => {
            label.addEventListener('click', () => {
                label.parentElement.classList.toggle('open');
            });
        });
    }

    /* ============================================================
       侧边栏 — 点击文档项 → 修改 hash → docsify 自动加载
       ============================================================ */
    function initTreeNavigation() {
        document.querySelectorAll('.tree-item[data-route]').forEach(item => {
            item.addEventListener('click', () => {
                const route = item.dataset.route;
                location.hash = '#/' + route;
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('active');
                    document.body.classList.remove('sidebar-open');
                }
            });
        });
    }

    /* ============================================================
       侧边栏 — 同步当前路由高亮
       ============================================================ */
    function syncSidebar() {
        const hash = location.hash.replace('#/', '').replace('#', '').trim();
        document.querySelectorAll('.tree-item[data-route]').forEach(item => {
            item.classList.remove('active');
            const route = item.dataset.route;
            if ((hash === '' || hash === 'README') && route === 'README') {
                item.classList.add('active');
            } else if (hash && route === hash) {
                item.classList.add('active');
                const parent = item.closest('.tree-children');
                if (parent) parent.parentElement.classList.add('open');
            }
        });
    }

    window.__syncSidebar = syncSidebar;

    /* ============================================================
       侧边栏 — 菜单按钮 & 返回主页
       返回主页 → 跳转 随机小写英文字母.flava.woen.pics
       ============================================================ */
    function initSidebarControls() {
        if (menuIcon) {
            menuIcon.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                document.body.classList.toggle('sidebar-open');
            });
        }
        if (homeBtn) {
            homeBtn.addEventListener('click', e => {
                e.preventDefault();
                // 生成随机子域名并跳转
                const sub = generateRandomSubdomain();
                const target = 'https://' + sub + '.flava.woen.pics';
                // 如果当前就在该域名下，则用 hash 回到首页
                if (location.hostname.endsWith('flava.woen.pics')) {
                    location.hash = '#/';
                } else {
                    location.href = target;
                }
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            });
        }
    }

    /* ============================================================
       初始化
       ============================================================ */
    function init() {
        resizeCanvas();
        animate();
        initSidebarControls();
        initTreeToggle();
        initTreeNavigation();

        // 初始高亮
        setTimeout(syncSidebar, 100);
        // 初始滚动复位
        setTimeout(adjustContentBg, 200);
        // 初始绑定搜索结果清空
        setTimeout(bindSearchResultClear, 300);

        // 窗口缩放
        window.addEventListener('resize', () => resizeCanvas());

        // hash 变化 → 同步高亮 + 复位
        window.addEventListener('hashchange', () => {
            syncSidebar();
            adjustContentBg();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
