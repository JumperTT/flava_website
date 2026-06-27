// 获取元素
const menuIcon = document.getElementById('menuIcon');
const sidebar = document.getElementById('sidebar');
const contentArea = document.getElementById('contentArea');
const homeBtn = document.getElementById('homeBtn');
const treeItems = document.querySelectorAll('.tree-item');

// 1. 侧边栏开关
menuIcon.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// 2. 返回首页按钮
homeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadDoc('index.md');
    setActiveItem(document.querySelector('.tree-item[data-file="index.md"]'));
    location.hash = '';
});

// 3. 菜单点击事件
treeItems.forEach(item => {
    item.addEventListener('click', () => {
        const file = item.getAttribute('data-file');
        loadDoc(file);
        setActiveItem(item);
        location.hash = file; // 更新 URL
        sidebar.classList.remove('active'); // 点击后关闭侧边栏
    });
});

// 设置激活状态的菜单项
function setActiveItem(activeItem) {
    treeItems.forEach(item => item.classList.remove('active'));
    if (activeItem) activeItem.classList.add('active');
}

// 4. 加载 Markdown 文档的核心函数
async function loadDoc(filePath) {
    contentArea.innerHTML = '<p>Loading...</p>';
    try {
        const response = await fetch(`docs/${filePath}`);
        if (!response.ok) throw new Error('Not Found');
        
        const markdown = await response.text();
        // 使用 marked 库将 Markdown 转为 HTML
        contentArea.innerHTML = marked.parse(markdown);
    } catch (error) {
        contentArea.innerHTML = `
            <h1>404 - 文档未找到</h1>
            <p>抱歉，无法加载文件: <code>${filePath}</code></p>
            <p>请确保该文件存在于 <code>/docs</code> 文件夹中。</p>
        `;
    }
}

// 5. 处理页面刷新和初始加载 (路由)
window.addEventListener('load', () => {
    const hash = location.hash.substring(1); // 去掉 # 号
    if (hash) {
        loadDoc(hash);
        const activeItem = document.querySelector(`.tree-item[data-file="${hash}"]`);
        setActiveItem(activeItem);
    } else {
        loadDoc('index.md');
        setActiveItem(document.querySelector('.tree-item[data-file="index.md"]'));
    }
});

// --- 以下保留你原有的网格和光晕动画代码 ---
const gridCanvas = document.getElementById('gridCanvas');
const glowCanvas = document.getElementById('glowCanvas');
const gridCtx = gridCanvas.getContext('2d');
const glowCtx = glowCanvas.getContext('2d');
let backgroundGlows = [];

function resizeCanvas() {
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;
    glowCanvas.width = window.innerWidth;
    glowCanvas.height = window.innerHeight;
    initBackgroundGlows();
    drawGrid();
}

window.addEventListener('resize', resizeCanvas);

function drawGrid() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    gridCtx.lineWidth = 2;
    gridCtx.globalAlpha = 0.2;
    gridCtx.save();
    gridCtx.translate(gridCanvas.width / 2, gridCanvas.height / 2);
    gridCtx.rotate(30 * Math.PI / 180);
    const d = Math.sqrt(gridCanvas.width**2 + gridCanvas.height**2);
    for (let x = -d; x <= d; x += 10) { gridCtx.moveTo(x,-d); gridCtx.lineTo(x,d); gridCtx.stroke(); }
    for (let y = -d; y <= d; y += 10) { gridCtx.moveTo(-d,y); gridCtx.lineTo(d,y); gridCtx.stroke(); }
    gridCtx.restore();
    gridCtx.globalAlpha = 1.0;
}

function initBackgroundGlows() {
    backgroundGlows = [];
    for (let i = 0; i < 15; i++) {
        backgroundGlows.push({
            x: Math.random() * glowCanvas.width,
            y: Math.random() * glowCanvas.height,
            r: Math.random() * 200 + 100,
            c: Math.random() > 0.5 ? 'rgba(255, 80, 0, 0.1)' : 'rgba(255, 150, 0, 0.07)',
            vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*1.5
        });
    }
}

function drawGlows() {
    glowCtx.clearRect(0,0,glowCanvas.width,glowCanvas.height);
    backgroundGlows.forEach(g => {
        const grd = glowCtx.createRadialGradient(g.x,g.y,0,g.x,g.y,g.r);
        grd.addColorStop(0, g.c);
        grd.addColorStop(1, 'transparent');
        glowCtx.fillStyle = grd;
        glowCtx.beginPath();
        glowCtx.arc(g.x,g.y,g.r,0,Math.PI*2);
        glowCtx.fill();
        g.x += g.vx; g.y += g.vy;
        if (g.x<0||g.x>glowCanvas.width) g.vx*=-1;
        if (g.y<0||g.y>glowCanvas.height) g.vy*=-1;
    });
    requestAnimationFrame(drawGlows);
}

resizeCanvas();
drawGlows();