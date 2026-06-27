const menuIcon = document.getElementById('menuIcon');
const sidebar = document.getElementById('sidebar');
const contentArea = document.getElementById('contentArea');
const homeBtn = document.getElementById('homeBtn');

/* 侧边栏开关 */
menuIcon.onclick = () => sidebar.classList.toggle('active');

/* 返回首页 */
homeBtn.onclick = e => {
    e.preventDefault();
    loadDoc('index.md');
    setActive('index.md');
    location.hash = '';
};

/* 文档加载 */
function loadDoc(file) {
    contentArea.innerHTML = '<p>Loading...</p>';
    fetch('docs/' + file)
        .then(r => r.text())
        .then(marked.parse)
        .then(html => contentArea.innerHTML = html)
        .catch(() => contentArea.innerHTML = '<h1>404</h1>');
}

/* 激活状态 */
function setActive(file) {
    document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-file="${file}"]`)?.classList.add('active');
}

/* 树形展开 / 收起（✅ 正确） */
document.querySelectorAll('.tree-item.has-children').forEach(parent => {
    parent.querySelector('.tree-label').onclick = e => {
        e.stopPropagation();
        parent.classList.toggle('open');
    };
});

/* 子项点击加载文档 */
document.querySelectorAll('.tree-item[data-file]').forEach(item => {
    item.onclick = () => {
        const file = item.dataset.file;
        loadDoc(file);
        setActive(file);
        location.hash = file;
        sidebar.classList.remove('active');
    };
});

/* 初始加载 */
window.onload = () => {
    const hash = location.hash.slice(1);
    hash ? loadDoc(hash) : loadDoc('index.md');
};
