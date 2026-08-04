/* ============================================================
   Flava Docs — 背景动画 + 侧边栏交互
   · 旋转网格画布（黑色背景 + 火焰配色网格线）
   · 火焰粒子系统
   · 侧边栏展开/收起 + 树形菜单
   · 返回主页按钮 → 随机域名跳转
   · 搜索框清空
   · 背景高度自适应
   ============================================================ */

(function () {
    'use strict';

    // ---------- 工具函数 ----------
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

    // 生成随机小写英文字母串（长度 3-12）
    function randomSubdomain() {
        var len = Math.floor(Math.random() * 10) + 3; // 3~12
        var chars = 'abcdefghijklmnopqrstuvwxyz';
        var out = '';
        for (var i = 0; i < len; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return out;
    }

    // 给 docsify 渲染后的所有标题元素强制设置颜色
    function recolorHeadings() {
        var headings = $all('.markdown-section h1, .markdown-section h2, .markdown-section h3, .markdown-section h4');
        headings.forEach(function (h) {
            h.style.color = 'rgb(190, 200, 255)';
        });
    }

    // ---------- 背景高度自适应 ----------
    function adjustContentBg() {
        // 背景现在是 position: fixed 钉在视口上，不需要动态算高度
        // 但我们需要确保内容区的 margin 和 padding 正确
        var wrapper = $('#contentWrapper');
        if (!wrapper) return;

        // 确保内容区足够高，让滚动自然发生
        var app = $('#app');
        if (app) {
            // 内容区最小高度 = 视口高度 - 导航栏 - 上下间距
            var minH = window.innerHeight - 42 - 20 - 20;
            if (app.offsetHeight < minH) {
                app.style.minHeight = minH + 'px';
            }
        }

        // 强制标题颜色
        recolorHeadings();
    }

    // ---------- 清空搜索框 ----------
    function clearSearch() {
        var searchInput = $('.search input');
        if (searchInput) {
            searchInput.value = '';
            // 触发 input 事件让 docsify 搜索插件更新结果
            var event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
        }
        // 隐藏结果面板
        var results = $('.search .results-panel');
        if (results) {
            results.style.display = 'none';
        }
    }

    // ---------- 画布尺寸重置 ----------
    function resizeCanvas() {
        var grid = $('#gridCanvas');
        var fire = $('#fireCanvas');
        if (grid) {
            grid.width = window.innerWidth;
            grid.height = window.innerHeight;
        }
        if (fire) {
            fire.width = window.innerWidth;
            fire.height = window.innerHeight;
        }
    }

    // ---------- 旋转网格背景 ----------
    var gridAngle = 0;
    function drawGrid(ctx, w, h) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(gridAngle);
        ctx.translate(-w / 2, -h / 2);

        var spacing = 60;
        var grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        grad.addColorStop(0, 'rgba(255, 69, 0, 0.18)');
        grad.addColorStop(0.5, 'rgba(255, 69, 0, 0.06)');
        grad.addColorStop(1, 'rgba(255, 69, 0, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;

        // 竖线
        for (var x = -w; x < w * 2; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, -h);
            ctx.lineTo(x, h * 2);
            ctx.stroke();
        }
        // 横线
        for (var y = -h; y < h * 2; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(-w, y);
            ctx.lineTo(w * 2, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ---------- 火焰粒子 ----------
    var particles = [];
    var PARTICLE_COUNT = 80;

    function initParticles(w, h) {
        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: h + Math.random() * 100,
                r: Math.random() * 3 + 1,
                vy: -(Math.random() * 1.5 + 0.5),
                vx: (Math.random() - 0.5) * 0.4,
                life: Math.random() * 200 + 100,
                age: 0,
                hue: Math.random() * 20 + 10  // 橙红色系
            });
        }
    }

    function drawParticles(ctx, w, h) {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.age++;
            p.y += p.vy;
            p.x += p.vx + Math.sin(p.age * 0.03) * 0.3;

            var alpha = 1 - p.age / p.life;
            if (alpha <= 0) {
                p.x = Math.random() * w;
                p.y = h + Math.random() * 50;
                p.age = 0;
                alpha = 1;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
            var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
            grad.addColorStop(0, 'rgba(255, 100, 30, ' + alpha * 0.8 + ')');
            grad.addColorStop(0.5, 'rgba(255, 60, 0, ' + alpha * 0.3 + ')');
            grad.addColorStop(1, 'rgba(255, 30, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    // ---------- 主动画循环 ----------
    function animate() {
        var grid = $('#gridCanvas');
        var fire = $('#fireCanvas');
        if (!grid || !fire) return;

        var gctx = grid.getContext('2d');
        var fctx = fire.getContext('2d');
        var w = grid.width;
        var h = grid.height;

        // 网格层
        gctx.fillStyle = '#000';
        gctx.fillRect(0, 0, w, h);
        gridAngle += 0.001;
        drawGrid(gctx, w, h);

        // 火焰层
        fctx.clearRect(0, 0, w, h);
        drawParticles(fctx, w, h);

        requestAnimationFrame(animate);
    }

    // ---------- 侧边栏交互 ----------
    function initSidebar() {
        var menuIcon = $('#menuIcon');
        var sidebar = $('#sidebar');
        var body = document.body;

        if (menuIcon && sidebar) {
            menuIcon.addEventListener('click', function () {
                sidebar.classList.toggle('active');
                body.classList.toggle('sidebar-open');
            });
        }

        // 树形菜单展开/收起
        $all('.tree-item.has-children > .tree-label').forEach(function (label) {
            label.addEventListener('click', function (e) {
                e.stopPropagation();
                label.parentElement.classList.toggle('open');
            });
        });

        // 点击文档项 → 路由跳转 + 高亮
        $all('.tree-item[data-route]').forEach(function (item) {
            item.addEventListener('click', function () {
                var route = item.getAttribute('data-route');
                if (route) {
                    // 用 docsify 的路由
                    if (window.location.hash !== '#/' + route) {
                        window.location.hash = '#/' + route;
                    }
                    // 高亮
                    $all('.tree-item[data-route].active').forEach(function (el) {
                        el.classList.remove('active');
                    });
                    item.classList.add('active');
                }
                // 移动端点击后自动收起侧边栏
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    body.classList.remove('sidebar-open');
                }
            });
        });

        // 返回主页按钮 → 跳转到随机域名
        var homeBtn = $('#homeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                var sub = randomSubdomain();
                var url = 'https://' + sub + '.flava.woen.pics';
                window.location.href = url;
            });
        }
    }

    // ---------- 同步侧边栏高亮 ----------
    function syncSidebar() {
        var hash = window.location.hash.replace('#/', '').replace('#', '');
        if (!hash) hash = 'README';

        $all('.tree-item[data-route]').forEach(function (item) {
            var route = item.getAttribute('data-route');
            if (route === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // ---------- 初始化 ----------
    function init() {
        resizeCanvas();
        var grid = $('#gridCanvas');
        var fire = $('#fireCanvas');
        if (grid && fire) {
            initParticles(grid.width, grid.height);
            animate();
        }

        initSidebar();
        syncSidebar();
        adjustContentBg();

        // 监听窗口变化
        window.addEventListener('resize', function () {
            resizeCanvas();
            adjustContentBg();
        });

        // 监听 hash 变化（路由切换）
        window.addEventListener('hashchange', function () {
            // 双重 rAF 确保 docsify 渲染完成后再操作
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    var wrapper = $('#contentWrapper');
                    if (wrapper) wrapper.scrollTop = 0;
                    syncSidebar();
                    adjustContentBg();
                    clearSearch();
                });
            });
        });

        // 监听 docsify 搜索结果点击 → 清空搜索框
        document.addEventListener('click', function (e) {
            // 点击搜索结果项
            if (e.target && e.target.closest('.search .results-panel a')) {
                setTimeout(clearSearch, 50);
            }
        });

        // MutationObserver 监听 DOM 变化，确保标题颜色始终正确
        var app = $('#app');
        if (app && window.MutationObserver) {
            var observer = new MutationObserver(function () {
                recolorHeadings();
            });
            observer.observe(app, { childList: true, subtree: true });
        }
    }

    // ---------- 暴露全局接口给 docsify 插件 ----------
    window.__resizeCanvas = resizeCanvas;
    window.__syncSidebar = syncSidebar;
    window.__adjustContentBg = adjustContentBg;
    window.__clearSearch = clearSearch;

    // ---------- DOM 就绪后启动 ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
