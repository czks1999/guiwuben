// 数据存储 key
const STORAGE_KEY = 'guiwuben_items';

// 全局物品数组
let items = [];

// DOM 元素
const itemsListDiv = document.getElementById('itemsList');
const totalCountSpan = document.getElementById('totalCount');
const totalValueSpan = document.getElementById('totalValue');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const closeBtn = document.querySelector('.close');
const itemForm = document.getElementById('itemForm');
const modalTitle = document.getElementById('modalTitle');
const itemIdInput = document.getElementById('itemId');
const itemNameInput = document.getElementById('itemName');
const itemCategorySelect = document.getElementById('itemCategory');
const itemLocationInput = document.getElementById('itemLocation');
const itemPriceInput = document.getElementById('itemPrice');
const itemDateInput = document.getElementById('itemDate');
const itemImageInput = document.getElementById('itemImage');
const imagePreviewDiv = document.getElementById('imagePreview');

// 辅助函数：保存到 localStorage
function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 加载数据
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        items = JSON.parse(stored);
        items = items.map(item => {
            if (item.isActive === undefined) item.isActive = true;
            if (item.inactiveDate === undefined) item.inactiveDate = '';
            if (item.icon === undefined) item.icon = '📦';   // 默认图标
            return item;
        });
    } else {
        items = [];
    }
    saveToLocalStorage();
    renderItems();
    updateStats();
}

// 渲染物品列表
function renderItems() {
    if (items.length === 0) {
        itemsListDiv.innerHTML = '<div style="text-align:center; color:gray; padding:40px;">暂无物品，点“+ 添加物品”</div>';
        return;
    }
    itemsListDiv.innerHTML = '';
    items.forEach(item => {
        const isActive = item.isActive !== false;
        const card = document.createElement('div');
        card.className = `item-card ${isActive ? '' : 'inactive'}`;
        card.setAttribute('data-id', item.id);
        
        // 左侧显示图标或图片
        let leftHtml = '';
        if (item.imageBase64 && item.imageBase64.startsWith('data:image')) {
            leftHtml = `<img class="item-img" src="${item.imageBase64}" alt="图片">`;
        } else {
            const iconChar = (item.icon && item.icon.trim()) ? item.icon : '📦';
            leftHtml = `<div class="item-icon">${iconChar}</div>`;
        }
        
        // 失效标记
        const inactiveBadge = !isActive ? '<span class="badge-inactive">已失效</span>' : '';
        
        // 日期显示
        let dateHtml = `<div class="item-meta">📅 购买: ${item.date || '无日期'}`;
        if (!isActive && item.inactiveDate) {
            dateHtml += ` → 失效: ${item.inactiveDate}`;
        }
        dateHtml += `</div>`;
        
        // 日均计算
        let dailyHtml = '';
        const costInfo = getDailyCost(item.price, item.date, item.inactiveDate, isActive);
        if (costInfo) {
            dailyHtml = `<div class="item-daily">📅 有效使用 ${costInfo.days} 天 · 日均 ¥${costInfo.dailyPrice.toFixed(2)}</div>`;
        }
        
        card.innerHTML = `
            ${leftHtml}
            <div class="item-info">
                <div class="item-name">${escapeHtml(item.name)} ${inactiveBadge}</div>
                <div class="item-meta">📂 ${item.category} &nbsp;|&nbsp; 📍 ${item.location || '未填'}</div>
                ${dateHtml}
                <div class="item-price">💰 ¥${Number(item.price).toFixed(2)}</div>
                ${dailyHtml}
            </div>
        `;
        
        // 长按删除逻辑（防止复制菜单）
        let pressTimer = null;
        let isLongPress = false;
        
        const cancelPress = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        
        const handleLongPress = (e) => {
            e.preventDefault();
            isLongPress = true;
            cancelPress();
            if (confirm(`确定删除“${item.name}”吗？`)) {
                items = items.filter(i => i.id !== item.id);
                saveToLocalStorage();
                renderItems();
                updateStats();
            }
            // 重置标志，避免触发点击
            setTimeout(() => { isLongPress = false; }, 100);
        };
        
        // 触摸事件
        card.addEventListener('touchstart', (e) => {
            cancelPress();
            isLongPress = false;
            pressTimer = setTimeout(() => handleLongPress(e), 500);
        });
        card.addEventListener('touchend', (e) => {
            cancelPress();
            if (!isLongPress) {
                // 点击进入编辑
                openEditModal(item.id);
            }
            setTimeout(() => { isLongPress = false; }, 50);
        });
        card.addEventListener('touchmove', cancelPress);
        
        // 鼠标事件（用于调试）
        card.addEventListener('mousedown', (e) => {
            cancelPress();
            isLongPress = false;
            pressTimer = setTimeout(() => handleLongPress(e), 500);
        });
        card.addEventListener('mouseup', (e) => {
            cancelPress();
            if (!isLongPress) {
                openEditModal(item.id);
            }
            setTimeout(() => { isLongPress = false; }, 50);
        });
        card.addEventListener('mouseleave', cancelPress);
        
        itemsListDiv.appendChild(card);
    });
}

// 更新顶部统计
function updateStats() {
    const total = items.length;
    const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    totalCountSpan.innerText = total;
    totalValueSpan.innerText = totalValue.toFixed(2);
}

// 打开添加模态框
function openAddModal() {
    modalTitle.innerText = '添加物品';
    itemIdInput.value = '';
    itemNameInput.value = '';
    itemCategorySelect.value = '其他';
    itemLocationInput.value = '';
    itemPriceInput.value = '';
    itemDateInput.value = '';
    itemImageInput.value = '';
    imagePreviewDiv.innerHTML = '';
    modal.style.display = 'flex';
}

// 打开编辑模态框
function openEditModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    modalTitle.innerText = '编辑物品';
    itemIdInput.value = item.id;
    itemNameInput.value = item.name;
    itemCategorySelect.value = item.category;
    itemLocationInput.value = item.location || '';
    itemPriceInput.value = item.price;
    itemDateInput.value = item.date || '';
    
    // 加载图标
    const iconSelect = document.getElementById('itemIcon');
    if (iconSelect) iconSelect.value = item.icon || '📦';
    
    // 加载有效/失效状态
    const activeCheckbox = document.getElementById('itemActive');
    const inactiveDateGroup = document.getElementById('inactiveDateGroup');
    const inactiveDateInput = document.getElementById('itemInactiveDate');
    const activeLabel = document.getElementById('activeLabel');
    if (activeCheckbox) {
        activeCheckbox.checked = item.isActive !== false;
        if (activeCheckbox.checked) {
            inactiveDateGroup.style.display = 'none';
            activeLabel.innerText = '有效';
        } else {
            inactiveDateGroup.style.display = 'flex';
            activeLabel.innerText = '失效';
            if (inactiveDateInput) inactiveDateInput.value = item.inactiveDate || '';
        }
    }
    
    // 图片预览等原有代码...
    if (item.imageBase64) {
        imagePreviewDiv.innerHTML = `<img src="${item.imageBase64}" style="max-width:100%;border-radius:16px;">`;
    } else {
        imagePreviewDiv.innerHTML = '';
    }
    modal.style.display = 'flex';
}
// 关闭模态框
function closeModal() {
    modal.style.display = 'none';
}

// 保存物品（新增或更新）
function actuallySave(id, name, category, location, price, date, imageBase64) {
    // 获取图标
    const icon = document.getElementById('itemIcon')?.value || '📦';
    // 获取有效状态
    const isActive = document.getElementById('itemActive')?.checked ?? true;
    let inactiveDate = '';
    if (!isActive) {
        inactiveDate = document.getElementById('itemInactiveDate')?.value || '';
    }
    
    if (id) {
        // 更新
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { 
                ...items[index], 
                name, category, location, price, date, imageBase64,
                icon, isActive, inactiveDate
            };
        }
    } else {
        // 新增
        const newItem = {
            id: Date.now(),
            name,
            category,
            location,
            price,
            date,
            imageBase64,
            icon,
            isActive,
            inactiveDate
        };
        items.push(newItem);
    }
    saveToLocalStorage();
    renderItems();
    updateStats();
    closeModal();
}

// 防止XSS辅助
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 计算日均单价（传入价格和购买日期字符串 YYYY-MM-DD）
function getDailyCost(price, purchaseDateStr, inactiveDateStr = '', isActive = true) {
    if (!purchaseDateStr || !price || price <= 0) return null;
    const start = new Date(purchaseDateStr);
    start.setHours(0,0,0,0);
    let end;
    if (!isActive && inactiveDateStr) {
        end = new Date(inactiveDateStr);
    } else {
        end = new Date();
    }
    end.setHours(0,0,0,0);
    const diffDays = Math.floor((end - start) / (1000*60*60*24));
    if (diffDays <= 0) return null;
    const daily = price / diffDays;
    return { days: diffDays, dailyPrice: daily };
}

function updateStats() {
    const activeItems = items.filter(item => item.isActive !== false);
    const total = activeItems.length;
    const totalValue = activeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    totalCountSpan.innerText = total;
    totalValueSpan.innerText = totalValue.toFixed(2);
    
    // 可选：日均总花费（如果 index.html 里有 #totalDailySum 元素）
    let totalDailySum = 0;
    activeItems.forEach(item => {
        const costInfo = getDailyCost(item.price, item.date, item.inactiveDate, true);
        if (costInfo) totalDailySum += costInfo.dailyPrice;
    });
    const dailySumSpan = document.getElementById('totalDailySum');
    if (dailySumSpan) dailySumSpan.innerText = totalDailySum.toFixed(2);
}

function markInactive(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    let inactiveDate = prompt("请输入失效日期 (YYYY-MM-DD)：", new Date().toISOString().slice(0,10));
    if (!inactiveDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inactiveDate)) {
        alert("日期格式错误，请使用 YYYY-MM-DD");
        return;
    }
    item.isActive = false;
    item.inactiveDate = inactiveDate;
    saveToLocalStorage();
    renderItems();
    updateStats();
}

function recoverItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.isActive = true;
    item.inactiveDate = '';
    saveToLocalStorage();
    renderItems();
    updateStats();
}

// 事件绑定
addBtn.addEventListener('click', openAddModal);
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
itemForm.addEventListener('submit', saveItem);
itemImageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreviewDiv.innerHTML = `<img src="${e.target.result}" style="max-width:100%;border-radius:16px;">`;
        };
        reader.readAsDataURL(this.files[0]);
    } else {
        imagePreviewDiv.innerHTML = '';
    }
});

// 有效/失效切换交互（模态框内开关）
document.addEventListener('DOMContentLoaded', function() {
    const activeCheckbox = document.getElementById('itemActive');
    const inactiveDateGroup = document.getElementById('inactiveDateGroup');
    const activeLabel = document.getElementById('activeLabel');
    if (activeCheckbox && inactiveDateGroup && activeLabel) {
        const toggleInactiveDate = () => {
            if (activeCheckbox.checked) {
                inactiveDateGroup.style.display = 'none';
                activeLabel.innerText = '有效';
            } else {
                inactiveDateGroup.style.display = 'flex';
                activeLabel.innerText = '失效';
            }
        };
        toggleInactiveDate();            // 初始同步
        activeCheckbox.addEventListener('change', toggleInactiveDate);
    }
});

// 初始化
loadData();
