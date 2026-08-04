/* ============================================================
   bg-animation.js
   1. 背景动画：白色旋转网格 + 火焰光晕 + 漂浮粒子
   2. 侧边栏交互：树形折叠 / 展开 / 路由跳转
   3. 与 docsify 联动
   4. 返回主页 → 随机小写英文字母子域名.flava.woen.pics
   5. 搜索结果点击后清空搜索框 + 搜索结果显示/隐藏
   6. 路由切换复位滚动位置
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       DOM 引用
       ============================================================ */
    const fireCanvas     = document.getElementById('fireCanvas');
    const gridCanvas     = document.getElementById('gridCanvas');
    const fireCtx        = fireCanvas.getContext('2d');
    const gridCtx        = gridCanvas.getContext('2d');
    const sidebar        = document.getElementById('sidebar');
    const menuIcon       = document.getElementById('menuIcon');
    const homeBtn        = document.getElementById('homeBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    const contentBg      = document.getElementById('contentBg');

    /* ============================================================
       背景动画 — 数据
       ============================================================ */
    let redPoints = [], orangePoints = [], yellowPoints = [];
    let backgroundGlows = [], particles = [];

    function initBackgroundGlows() {
        backgroundGlows = [];
        for (let i = 0; i < 18; i++) {
            backgroundGlows.push({
                x: Math.random() * fireCanvas.width,
                y: Math.random() * fireCanvas.height * 0.8 + fireCanvas.height * 0.1,
                radius: Math.random() * fireCanvas.width * 0.25 + fireCanvas.width * 0.1,
                color: Math.random() > 0.5 ? 'rgba(255,80,0,0.10)' : 'rgba(255,150,0,0.07)',
                velocityX: (Math.random() - 0.5) * 2.0,
                velocityY: (Math.random() - 0.5) * 1.5,
                maxVelocity: 4.0, minVelocity: -4.0,
                changeCounter: 0,
                changeInterval: Math.floor(Math.random() * 30) + 15,
                accelerationRate: Math.random() * 0.3 + 0.1
            });
        }
    }

    function initFirePoints() {
        redPoints = []; orangePoints = []; yellowPoints = [];
        const numPoints = 12;
        const seg = fireCanvas.width / (numPoints - 1);

        for (let i = 0; i < numPoints; i++) {
            const x = i * seg;
            const baseY = fireCanvas.height * 0.65 - (Math.random() * 0.3 + 0.3) * fireCanvas.height * 0.5;
            redPoints.push({
                x, y: baseY, baseY,
                velocity: (Math.random() - 0.5) * 1.5,
                maxVelocity: 4.0, minVelocity: -4.0,
                changeCounter: 0, changeInterval: Math.floor(Math.random() * 80) + 40
            });
        }
        for (let i = 0; i < numPoints; i++) {
            const rp = redPoints[i];
            const oY = Math.random() * fireCanvas.height * 0.2 + fireCanvas.height * 0.15;
            const oX = Math.random() * 25 - 12;
            orangePoints.push({
                x: rp.x + oX, y: rp.baseY + oY,
                baseY: rp.baseY, baseOffsetY: oY, baseOffsetX: oX,
                offsetY: oY, offsetX: oX,
                velocityOffsetY: (Math.random() - 0.5) * 0.2,
                velocityOffsetX: (Math.random() - 0.5) * 0.1,
                maxVelocityOffset: 0.3, minVelocityOffset: -0.3,
                changeCounter: 0, changeInterval: Math.floor(Math.random() * 90) + 45
            });
        }
        for (let i = 0; i < numPoints; i++) {
            const rp = redPoints[i];
            const oY = Math.random() * fireCanvas.height * 0.25 + fireCanvas.height * 0.2;
            const oX = Math.random() * 35 - 17;
            yellowPoints.push({
                x: rp.x + oX, y: rp.baseY + oY,
                baseY: rp.baseY, baseOffsetY: oY, baseOffsetX: oX,
                offsetY: oY, offsetX: oX,
                velocityOffsetY: (Math.random() - 0.5) * 0.3,
                velocityOffsetX: (Math.random() - 0.5) * 0.2,
                maxVelocityOffset: 0.5, minVelocityOffset: -0.5,
                changeCounter: 0, changeInterval: Math.floor(Math.random() * 100) + 50
            });
        }
    }

    function initParticles() { particles = []; for (let i = 0; i < 25; i++) createParticle(); }
    function createParticle() {
        const colors = ['rgba(255,80,0,0.5)','rgba(255,100,0,0.4)','rgba(255,120,0,0.3)','rgba(255,140,0,0.25)','rgba(255,160,0,0.2)'];
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

    /* ---------- 绘制网格 ---------- */
    function drawGrid() {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        gridCtx.save();
        gridCtx.translate(gridCanvas.width / 2, gridCanvas.height / 2);
        gridCtx.rotate(30 * Math.PI / 180);
        const diag = Math.sqrt(gridCanvas.width ** 2 + gridCanvas.height ** 2);
        const s = -diag, e = diag;
        gridCtx.strokeStyle = 'rgba(255,255,255,0.06)'; gridCtx.lineWidth = 1;
        for (let x = s; x <= e; x += 20) { gridCtx.beginPath(); gridCtx.moveTo(x,s); gridCtx.lineTo(x,e); gridCtx.stroke(); }
        for (let y = s; y <= e; y += 20) { gridCtx.beginPath(); gridCtx.moveTo(s,y); gridCtx.lineTo(e,y); gridCtx.stroke(); }
        gridCtx.strokeStyle = 'rgba(255,255,255,0.15)'; gridCtx.lineWidth = 1.2;
        for (let x = s; x <= e; x += 10) { gridCtx.beginPath(); gridCtx.moveTo(x,s); gridCtx.lineTo(x,e); gridCtx.stroke(); }
        for (let y = s; y <= e; y += 10) { gridCtx.beginPath(); gridCtx.moveTo(s,y); gridCtx.lineTo(e,y); gridCtx.stroke(); }
        gridCtx.restore();
    }

    /* ---------- 更新火焰 ---------- */
    function updateFlameVelocities() {
        redPoints.forEach(p => {
            p.changeCounter++;
            if (p.changeCounter >= p.changeInterval) {
                p.changeCounter = 0; p.changeInterval = Math.floor(Math.random()*80)+40;
                p.velocity += (Math.random()-0.5)*0.8;
            }
            const minY = p.baseY-120, maxY = p.baseY+120;
            if (p.y > maxY-30) p.velocity -= 0.3;
            if (p.y < minY+30) p.velocity += 0.3;
            p.velocity = Math.max(p.minVelocity, Math.min(p.maxVelocity, p.velocity));
            p.velocity *= 0.99;
        });
        const upd = (arr, ivo, ixo, bvo, bto) => arr.forEach(p => {
            p.changeCounter++;
            if (p.changeCounter >= p.changeInterval) {
                p.changeCounter = 0; p.changeInterval = bto();
                p.velocityOffsetY += (Math.random()-0.5)*ivo;
                p.velocityOffsetX += (Math.random()-0.5)*ixo;
            }
            if (p.offsetY > p.baseOffsetY+10) p.velocityOffsetY -= 0.08;
            if (p.offsetY < p.baseOffsetY-10) p.velocityOffsetY += 0.08;
            if (p.offsetX > p.baseOffsetX+5)  p.velocityOffsetX -= 0.04;
            if (p.offsetX < p.baseOffsetX-5)  p.velocityOffsetX += 0.04;
            p.velocityOffsetY = Math.max(p.minVelocityOffset, Math.min(p.maxVelocityOffset, p.velocityOffsetY));
            p.velocityOffsetX = Math.max(p.minVelocityOffset, Math.min(p.maxVelocityOffset, p.velocityOffsetX));
            p.velocityOffsetY *= 0.98; p.velocityOffsetX *= 0.98;
        });
        upd(orangePoints, 0.15, 0.08, 0.3, ()=>Math.floor(Math.random()*90)+45);
        upd(yellowPoints, 0.2,  0.1,  0.5, ()=>Math.floor(Math.random()*100)+50);
    }
    function updateFlamePositions() {
        redPoints.forEach(p => { p.y += p.velocity; p.y = Math.max(p.baseY-120, Math.min(p.baseY+120, p.y)); });
        orangePoints.forEach((p,i) => {
            p.offsetY += p.velocityOffsetY; p.offsetX += p.velocityOffsetX;
            p.offsetY = Math.max(p.baseOffsetY-15, Math.min(p.baseOffsetY+15, p.offsetY));
            p.offsetX = Math.max(p.baseOffsetX-10, Math.min(p.baseOffsetX+10, p.offsetX));
            p.x = redPoints[i].x + p.offsetX; p.y = redPoints[i].y + p.offsetY;
        });
        yellowPoints.forEach((p,i) => {
            p.offsetY += p.velocityOffsetY; p.offsetX += p.velocityOffsetX;
            p.offsetY = Math.max(p.baseOffsetY-20, Math.min(p.baseOffsetY+20, p.offsetY));
            p.offsetX = Math.max(p.baseOffsetX-15, Math.min(p.baseOffsetX+15, p.offsetX));
            p.x = redPoints[i].x + p.offsetX; p.y = redPoints[i].y + p.offsetY;
        });
    }
    function updateGlowPositions() {
        backgroundGlows.forEach(g => {
            g.changeCounter++;
            if (g.changeCounter >= g.changeInterval) {
                g.changeCounter = 0; g.changeInterval = Math.floor(Math.random()*30)+15;
                g.velocityX += (Math.random()-0.5)*g.accelerationRate;
                g.velocityY += (Math.random()-0.5)*g.accelerationRate;
            }
            g.velocityX = Math.max(g.minVelocity, Math.min(g.maxVelocity, g.velocityX));
            g.velocityY = Math.max(g.minVelocity, Math.min(g.maxVelocity, g.velocityY));
            g.velocityX *= 0.98; g.velocityY *= 0.98;
            g.x += g.velocityX; g.y += g.velocityY;
            if (g.x<0||g.x>fireCanvas.width)  { g.velocityX*=-0.8; g.x=Math.max(0,Math.min(fireCanvas.width,g.x)); }
            if (g.y<0||g.y>fireCanvas.height) { g.velocityY*=-0.8; g.y=Math.max(0,Math.min(fireCanvas.height,g.y)); }
        });
    }
    function updateAndDrawParticles() {
        particles = particles.filter(p => p.life > 0);
        if (particles.length < 80) { const n = Math.floor(Math.random()*2)+1; for (let i=0;i<n;i++) createParticle(); }
        particles.forEach(p => {
            p.x += p.velocityX + Math.sin(Date.now()*p.wobbleSpeed)*p.wobble;
            p.y += p.velocityY; p.life -= p.decay;
            fireCtx.globalAlpha = Math.max(0, p.life);
            fireCtx.fillStyle = p.color;
            fireCtx.beginPath(); fireCtx.arc(p.x, p.y, p.size, 0, Math.PI*2); fireCtx.fill();
        });
        fireCtx.globalAlpha = 1.0;
    }

    /* ---------- 绘制火焰 ---------- */
    function drawFire() {
        fireCtx.clearRect(0, 0, fireCanvas.width, fireCanvas.height);
        backgroundGlows.forEach(g => {
            const grad = fireCtx.createRadialGradient(g.x,g.y,0,g.x,g.y,g.radius);
            grad.addColorStop(0, g.color);
            grad.addColorStop(0.5, g.color.replace('0.10','0.05').replace('0.07','0.03'));
            grad.addColorStop(1, 'transparent');
            fireCtx.fillStyle = grad;
            fireCtx.beginPath(); fireCtx.arc(g.x,g.y,g.radius,0,Math.PI*2); fireCtx.fill();
        });
        updateFlameVelocities(); updateFlamePositions(); updateGlowPositions();

        const mkGrad = (a,b,c) => { const g=fireCtx.createLinearGradient(0,0,0,fireCanvas.height); g.addColorStop(0,a); g.addColorStop(0.5,b); g.addColorStop(1,c); return g; };
        const layers = [
            { pts: redPoints,    g: mkGrad('rgba(255,40,0,0.35)','rgba(220,20,60,0.30)','rgba(180,0,0,0.25)') },
            { pts: orangePoints, g: mkGrad('rgba(255,140,0,0.28)','rgba(255,100,0,0.22)','rgba(255,80,0,0.18)') },
            { pts: yellowPoints, g: mkGrad('rgba(255,240,50,0.22)','rgba(255,200,0,0.18)','rgba(255,150,0,0.12)') }
        ];
        layers.forEach(({pts,g}) => {
            fireCtx.beginPath(); fireCtx.moveTo(pts[0].x, pts[0].y);
            for (let i=1;i<pts.length;i++) fireCtx.lineTo(pts[i].x, pts[i].y);
            fireCtx.lineTo(fireCanvas.width, fireCanvas.height);
            fireCtx.lineTo(0, fireCanvas.height); fireCtx.closePath();
            fireCtx.fillStyle = g; fireCtx.fill();
        });
        updateAndDrawParticles();
    }

    function animate() { drawFire(); requestAnimationFrame(animate); }

    /* ============================================================
       同步白色背景高度 —— 关键函数
       用 getBoundingClientRect 精确测量视口，
       确保 .content-bg 永远紧贴底部。
       ============================================================ */
    function syncBackgroundHeight() {
        if (!contentBg) return;
        // 视口高度 - 顶部62px - 底部20px = 背景可用高度
        const vh = window.innerHeight;
        const topOffset = 62;
        const bottomOffset = 20;
        const bgHeight = vh - topOffset - bottomOffset;
        contentBg.style.height = bgHeight + 'px';

        // content-wrapper 同步高度
        if (contentWrapper) {
            contentWrapper.style.height = bgHeight + 'px';
        }
    }

    function resizeCanvas() {
        fireCanvas.width = window.innerWidth;  fireCanvas.height = window.innerHeight;
        gridCanvas.width = window.innerWidth;  gridCanvas.height = window.innerHeight;
        initFirePoints(); initBackgroundGlows(); initParticles(); drawGrid();
        // 画布 resize 后同步背景高度
        syncBackgroundHeight();
    }
    window.__resizeCanvas = resizeCanvas;

    /* ============================================================
       路由切换处理
       - 复位滚动位置到顶部
       - 清空搜索框
       - 重新同步侧边栏高亮
       ============================================================ */
    function onRouteChange() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (contentWrapper) contentWrapper.scrollTop = 0;
                // 路由切换后重新同步背景高度（防止视口变化）
                syncBackgroundHeight();
            });
        });
        // 清空搜索框 + 隐藏结果面板
        const sInput = document.querySelector('.search input');
        if (sInput) {
            sInput.value = '';
            sInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const panel = document.querySelector('.search .results-panel');
        if (panel) panel.classList.remove('show');
        // 同步侧边栏
        if (window.__syncSidebar) window.__syncSidebar();
    }
    window.__onRouteChange = onRouteChange;

    /* ============================================================
       侧边栏 — 折叠 / 展开
       ============================================================ */
    function initTreeToggle() {
        document.querySelectorAll('.tree-item.has-children > .tree-label').forEach(label => {
            label.addEventListener('click', () => label.parentElement.classList.toggle('open'));
        });
    }

    /* ============================================================
       侧边栏 — 点击文档项 → 修改 hash
       ============================================================ */
    function initTreeNavigation() {
        document.querySelectorAll('.tree-item[data-route]').forEach(item => {
            item.addEventListener('click', () => {
                location.hash = '#/' + item.dataset.route;
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
       返回主页 — 随机小写英文字母子域名.flava.woen.pics
       ============================================================ */
    function getRandomSubdomain() {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const len = Math.floor(Math.random() * 8) + 3;
        let s = '';
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

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
                const target = 'https://' + getRandomSubdomain() + '.flava.woen.pics';
                window.location.href = target;
            });
        }
    }

    /* ============================================================
       搜索功能完整管理
       1. 监听 input 事件 → 有内容显示面板，无内容隐藏
       2. 点击搜索结果 → 跳转 + 清空 + 隐藏面板
       3. 点击页面其他区域 → 隐藏面板
       ============================================================ */
    function initSearch() {
        const searchContainer = document.querySelector('.search');
        const input = searchContainer ? searchContainer.querySelector('input') : null;
        const panel = searchContainer ? searchContainer.querySelector('.results-panel') : null;

        if (!input || !panel) return;

        // 1) input 事件：有内容显示面板，无内容隐藏
        input.addEventListener('input', () => {
            if (input.value.trim() === '') {
                panel.classList.remove('show');
            } else {
                // 给 docsify 搜索插件一点时间渲染结果
                setTimeout(() => {
                    if (panel.children.length > 0) {
                        panel.classList.add('show');
                    }
                }, 50);
            }
        });

        // 2) focus 时如果有内容也显示
        input.addEventListener('focus', () => {
            if (input.value.trim() !== '' && panel.children.length > 0) {
                panel.classList.add('show');
            }
        });

        // 3) 点击搜索结果 → 跳转后清空并隐藏
        document.addEventListener('click', e => {
            const link = e.target.closest('.search .results-panel a');
            if (!link) return;
            // 等 docsify 处理完路由跳转
            setTimeout(() => {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                panel.classList.remove('show');
            }, 150);
        });

        // 4) 点击页面其他区域 → 隐藏面板
        document.addEventListener('click', e => {
            if (!e.target.closest('.search')) {
                panel.classList.remove('show');
            }
        });
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
        initSearch();

        setTimeout(syncSidebar, 100);

        // resize 时同步背景高度
        window.addEventListener('resize', () => {
            resizeCanvas();
            syncBackgroundHeight();
        });

        window.addEventListener('hashchange', () => {
            syncSidebar();
            onRouteChange();
        });

        // 初始同步一次背景高度
        syncBackgroundHeight();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
