// 获取元素
const menuIcon = document.getElementById('menuIcon');
const sidebar = document.getElementById('sidebar');
const contentArea = document.getElementById('contentArea');
const homeBtn = document.getElementById('homeBtn');
const treeItems = document.querySelectorAll('.tree-item');

// 1. 侧边栏开关 (保持你原来的交互)
menuIcon.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// 2. 返回首页
homeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadDoc('index.md');
    setActiveItem(document.querySelector('.tree-item[data-file="index.md"]'));
    location.hash = '';
});

// 3. 菜单点击
treeItems.forEach(item => {
    item.addEventListener('click', () => {
        const file = item.getAttribute('data-file');
        loadDoc(file);
        setActiveItem(item);
        location.hash = file;
        sidebar.classList.remove('active'); // 点击后关闭菜单
    });
});

// 设置激活状态
function setActiveItem(activeItem) {
    treeItems.forEach(item => item.classList.remove('active'));
    if (activeItem) activeItem.classList.add('active');
}

// 4. 核心：加载 Markdown 文档
async function loadDoc(filePath) {
    contentArea.innerHTML = '<p>Loading...</p>';
    try {
        const response = await fetch(`docs/${filePath}`);
        if (!response.ok) throw new Error('Not Found');
        const markdown = await response.text();
        // 将 Markdown 转为 HTML 并显示
        contentArea.innerHTML = marked.parse(markdown);
    } catch (error) {
        contentArea.innerHTML = `<h1>404</h1><p>文件 ${filePath} 不存在。</p>`;
    }
}

// 5. 页面刷新时恢复文档
window.addEventListener('load', () => {
    const hash = location.hash.substring(1);
    if (hash) {
        loadDoc(hash);
        const activeItem = document.querySelector(`.tree-item[data-file="${hash}"]`);
        setActiveItem(activeItem);
    } else {
        loadDoc('index.md');
        setActiveItem(document.querySelector('.tree-item[data-file="index.md"]'));
    }
});

// --- 以下完全是你原来的动画代码，一个字没改 ---
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
    const diagonal = Math.sqrt(gridCanvas.width * gridCanvas.width + gridCanvas.height * gridCanvas.height);
    const start = -diagonal;
    const end = diagonal;
    for (let x = start; x <= end; x += 10) { gridCtx.beginPath(); gridCtx.moveTo(x, start); gridCtx.lineTo(x, end); gridCtx.stroke(); }
    for (let y = start; y <= end; y += 10) { gridCtx.beginPath(); gridCtx.moveTo(start, y); gridCtx.lineTo(end, y); gridCtx.stroke(); }
    gridCtx.restore();
    gridCtx.globalAlpha = 1.0;
}

function initBackgroundGlows() {
    backgroundGlows = [];
    const glowCount = 15;
    for (let i = 0; i < glowCount; i++) {
        backgroundGlows.push({
            x: Math.random() * glowCanvas.width,
            y: Math.random() * glowCanvas.height * 0.8 + glowCanvas.height * 0.1,
            radius: Math.random() * glowCanvas.width * 0.25 + glowCanvas.width * 0.1,
            color: Math.random() > 0.5 ? 'rgba(255, 80, 0, 0.12)' : 'rgba(255, 150, 0, 0.08)',
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

function drawGlows() {
    glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
    backgroundGlows.forEach(glow => {
        const gradient = glowCtx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.radius);
        gradient.addColorStop(0, glow.color);
        gradient.addColorStop(0.5, glow.color.replace('0.12', '0.06').replace('0.08', '0.04'));
        gradient.addColorStop(1, 'transparent');
        glowCtx.fillStyle = gradient;
        glowCtx.beginPath();
        glowCtx.arc(glow.x, glow.y, glow.radius, 0, Math.PI * 2);
        glowCtx.fill();
    });
    updateGlowPositions();
}

function updateGlowPositions() {
    backgroundGlows.forEach(glow => {
        glow.changeCounter++;
        if (glow.changeCounter >= glow.changeInterval) {
            glow.changeCounter = 0;
            glow.changeInterval = Math.floor(Math.random() * 30) + 15;
            const accelX = (Math.random() - 0.5) * glow.accelerationRate;
            const accelY = (Math.random() - 0.5) * glow.accelerationRate;
            glow.velocityX += accelX;
            glow.velocityY += accelY;
        }
        glow.velocityX = Math.max(glow.minVelocity, Math.min(glow.maxVelocity, glow.velocityX));
        glow.velocityY = Math.max(glow.minVelocity, Math.min(glow.maxVelocity, glow.velocityY));
        glow.velocityX *= 0.98;
        glow.velocityY *= 0.98;
        glow.x += glow.velocityX;
        glow.y += glow.velocityY;
        if (glow.x < 0 || glow.x > glowCanvas.width) { glow.velocityX *= -0.8; glow.x = Math.max(0, Math.min(glowCanvas.width, glow.x)); }
        if (glow.y < 0 || glow.y > glowCanvas.height) { glow.velocityY *= -0.8; glow.y = Math.max(0, Math.min(glowCanvas.height, glow.y)); }
    });
}

function animate() {
    drawGlows();
    requestAnimationFrame(animate);
}

resizeCanvas();
animate();
