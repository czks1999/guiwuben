// 数据存储 key
const STORAGE_KEY = 'guiwuben_items';

// 全局物品数组
let items = [];

// DOM 元素（增加安全获取，并在缺失时在控制台报错）
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

// 检查关键容器
if (!itemsListDiv) console.error('❌ 找不到 id="itemsList" 的元素，请检查 index.html');
if (!addBtn) console.error('❌ 找不到 id="addBtn" 的元素');
if (!modal) console.error('❌ 找不到 id="modal" 的元素');

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
            if (item.icon === undefined) item.icon = '📦';
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
    if (!itemsListDiv) {
        console.error('itemsListDiv 不存在，无法渲染');
        return;
    }
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
        
        const inactiveBadge = !isActive ? '<span class="badge-inactive">已失效</span>' : '';
        
        let dateHtml = `<div class="item-meta">📅 购买: ${item.date || '无日期'}`;
        if (!isActive && item.inactiveDate) {
            dateHtml += ` → 失效: ${item.inactiveDate}`;
        }
        dateHtml += `</div>`;
        
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
        
        // 长按删除逻辑
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
            setTimeout(() => { isLongPress = false; }, 100);
        };
        
        card.addEventListener('touchstart', (e) => {
            cancelPress();
            isLongPress = false;
            pressTimer = setTimeout(() => handleLongPress(e), 500);
        });
        card.addEventListener('touchend', (e) => {
            cancelPress();
            if (!isLongPress) {
                openEditModal(item.id);
            }
            setTimeout(() => { isLongPress = false; }, 50);
        });
        card.addEventListener('touchmove', cancelPress);
        
        // 鼠标事件（便于调试）
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

// 更新统计（只统计有效物品）
function updateStats() {
    const activeItems = items.filter(item => item.isActive !== false);
    const total = activeItems.length;
    const totalValue = activeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    if (totalCountSpan) totalCountSpan.innerText = total;
    if (totalValueSpan) totalValueSpan.innerText = totalValue.toFixed(2);
    
    let totalDailySum = 0;
    activeItems.forEach(item => {
        const costInfo = getDailyCost(item.price, item.date, item.inactiveDate, true);
        if (costInfo) totalDailySum += costInfo.dailyPrice;
    });
    const dailySumSpan = document.getElementById('totalDailySum');
    if (dailySumSpan) dailySumSpan.innerText = totalDailySum.toFixed(2);
}

// 打开添加模态框
function openAddModal() {
    if (!modal) return;
    modalTitle.innerText = '添加物品';
    itemIdInput.value = '';
    itemNameInput.value = '';
    itemCategorySelect.value = '其他';
    itemLocationInput.value = '';
    itemPriceInput.value = '';
    itemDateInput.value = '';
    itemImageInput.value = '';
    imagePreviewDiv.innerHTML = '';
    
    const iconSelect = document.getElementById('itemIcon');
    if (iconSelect) iconSelect.value = '📦';
    const activeCheckbox = document.getElementById('itemActive');
    if (activeCheckbox) activeCheckbox.checked = true;
    const inactiveDateGroup = document.getElementById('inactiveDateGroup');
    if (inactiveDateGroup) inactiveDateGroup.style.display = 'none';
    const activeLabel = document.getElementById('activeLabel');
    if (activeLabel) activeLabel.innerText = '有效';
    const inactiveDateInput = document.getElementById('itemInactiveDate');
    if (inactiveDateInput) inactiveDateInput.value = '';
    
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
    
    const iconSelect = document.getElementById('itemIcon');
    if (iconSelect) iconSelect.value = item.icon || '📦';
    
    const activeCheckbox = document.getElementById('itemActive');
    const inactiveDateGroup = document.getElementById('inactiveDateGroup');
    const inactiveDateInput = document.getElementById('itemInactiveDate');
    const activeLabel = document.getElementById('activeLabel');
    if (activeCheckbox) {
        activeCheckbox.checked = item.isActive !== false;
        if (activeCheckbox.checked) {
            if (inactiveDateGroup) inactiveDateGroup.style.display = 'none';
            if (activeLabel) activeLabel.innerText = '有效';
        } else {
            if (inactiveDateGroup) inactiveDateGroup.style.display = 'flex';
            if (activeLabel) activeLabel.innerText = '失效';
            if (inactiveDateInput) inactiveDateInput.value = item.inactiveDate || '';
        }
    }
    
    if (item.imageBase64) {
        imagePreviewDiv.innerHTML = `<img src="${item.imageBase64}" style="max-width:100%;border-radius:16px;">`;
    } else {
        imagePreviewDiv.innerHTML = '';
    }
    modal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
    if (modal) modal.style.display = 'none';
}

// 保存物品（新增或更新）
function saveItem(event) {
    event.preventDefault();
    const id = itemIdInput.value ? parseInt(itemIdInput.value) : null;
    const name = itemNameInput.value.trim();
    if (!name) {
        alert('请填写物品名称');
        return;
    }
    const category = itemCategorySelect.value;
    const location = itemLocationInput.value.trim();
    const price = parseFloat(itemPriceInput.value) || 0;
    const date = itemDateInput.value;
    const icon = document.getElementById('itemIcon')?.value || '📦';
    const isActive = document.getElementById('itemActive')?.checked ?? true;
    let inactiveDate = '';
    if (!isActive) {
        inactiveDate = document.getElementById('itemInactiveDate')?.value || '';
    }
    
    if (itemImageInput.files && itemImageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            actuallySave(id, name, category, location, price, date, icon, isActive, inactiveDate, e.target.result);
        };
        reader.readAsDataURL(itemImageInput.files[0]);
    } else {
        let imageBase64 = '';
        if (id) {
            const existing = items.find(i => i.id === id);
            if (existing && existing.imageBase64) imageBase64 = existing.imageBase64;
        }
        actuallySave(id, name, category, location, price, date, icon, isActive, inactiveDate, imageBase64);
    }
}

// 实际执行保存
function actuallySave(id, name, category, location, price, date, icon, isActive, inactiveDate, imageBase64) {
    if (id) {
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = {
                ...items[index],
                name, category, location, price, date, icon, isActive, inactiveDate, imageBase64
            };
        }
    } else {
        const newItem = {
            id: Date.now(),
            name, category, location, price, date, icon, isActive, inactiveDate, imageBase64
        };
        items.push(newItem);
    }
    saveToLocalStorage();
    renderItems();
    updateStats();
    closeModal();
}

// 防止XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 计算日均单价
function getDailyCost(price, purchaseDateStr, inactiveDateStr = '', isActive = true) {
    if (!purchaseDateStr || !price || price <= 0) return null;
    const start = new Date(purchaseDateStr);
    if (isNaN(start.getTime())) return null; // 日期无效
    start.setHours(0,0,0,0);
    let end;
    if (!isActive && inactiveDateStr) {
        end = new Date(inactiveDateStr);
        if (isNaN(end.getTime())) return null;
    } else {
        end = new Date();
    }
    end.setHours(0,0,0,0);
    const diffDays = Math.floor((end - start) / (1000*60*60*24));
    if (diffDays <= 0) return null;
    const daily = price / diffDays;
    return { days: diffDays, dailyPrice: daily };
}

// 事件绑定（增加对 modal 等元素的保护）
if (addBtn) addBtn.addEventListener('click', openAddModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (window) window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
if (itemForm) itemForm.addEventListener('submit', saveItem);
if (itemImageInput) itemImageInput.addEventListener('change', function() {
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

// 有效/失效切换交互
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
        toggleInactiveDate();
        activeCheckbox.addEventListener('change', toggleInactiveDate);
    }
});

// 初始化
loadData();
