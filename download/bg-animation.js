/* ============================================================
   bg-animation.js — Flava Download
   背景动画：白色旋转网格 + 火焰光晕 + 漂浮粒子
   ============================================================ */

(function () {
    'use strict';

    function initBgAnimation() {
        const fireCanvas = document.getElementById('fireCanvas');
        const gridCanvas = document.getElementById('gridCanvas');
        if (!fireCanvas || !gridCanvas) {
            console.warn('[Flava BG] 找不到画布元素，跳过背景动画');
            return;
        }

        const fireCtx = fireCanvas.getContext('2d');
        const gridCtx = gridCanvas.getContext('2d');
        if (!fireCtx || !gridCtx) {
            console.warn('[Flava BG] 无法获取 2D 上下文，跳过背景动画');
            return;
        }

        /* ---------- 背景数据 ---------- */
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
            const upd = (arr, ivo, ixo, bto) => arr.forEach(p => {
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
            upd(orangePoints, 0.15, 0.08, ()=>Math.floor(Math.random()*90)+45);
            upd(yellowPoints, 0.2,  0.1,  ()=>Math.floor(Math.random()*100)+50);
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

        function resizeCanvas() {
            fireCanvas.width = window.innerWidth;  fireCanvas.height = window.innerHeight;
            gridCanvas.width = window.innerWidth;  gridCanvas.height = window.innerHeight;
            initFirePoints(); initBackgroundGlows(); initParticles(); drawGrid();
        }

        /* ---------- 随机子域名 ---------- */
        function getRandomSubdomain() {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            const len = Math.floor(Math.random() * 8) + 3;
            let s = '';
            for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
            return s;
        }

        // ---------- 初始化 ----------
        resizeCanvas();
        animate();
        window.addEventListener('resize', resizeCanvas);

        // 返回主页按钮
        const backBtn = document.getElementById('backHomeBtn');
        if (backBtn) {
            backBtn.addEventListener('click', e => {
                e.preventDefault();
                const target = 'https://' + getRandomSubdomain() + '.flava.woen.pics';
                window.location.href = target;
            });
        }

        console.log('[Flava BG] 背景动画已启动');
    }

    // 确保 DOM 就绪后执行，且用 try-catch 包裹防止阻塞其他脚本
    function safeInit() {
        try {
            initBgAnimation();
        } catch (err) {
            console.error('[Flava BG] 背景动画初始化失败（不影响页面功能）:', err.message);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit);
    } else {
        safeInit();
    }
})();
