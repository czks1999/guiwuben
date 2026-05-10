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
    } else {
        // 添加几条示例数据
        items = [
            {
                id: Date.now() + 1,
                name: 'MacBook Pro',
                category: '数码',
                location: '书桌抽屉',
                price: 12999,
                date: '2025-01-15',
                imageBase64: ''
            },
            {
                id: Date.now() + 2,
                name: '羊毛大衣',
                category: '衣物',
                location: '主卧衣柜',
                price: 899,
                date: '2025-02-10',
                imageBase64: ''
            }
        ];
        saveToLocalStorage();
    }
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
        const card = document.createElement('div');
        card.className = 'item-card';
        // 图片部分
        let imgHtml = '';
        if (item.imageBase64 && item.imageBase64.startsWith('data:image')) {
            imgHtml = `<img class="item-img" src="${item.imageBase64}" alt="图片">`;
        } else {
            imgHtml = `<div class="item-img" style="background:#e2e8f0; display:flex; align-items:center; justify-content:center;">📷</div>`;
        }
        card.innerHTML = `
            ${imgHtml}
            <div class="item-info">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-meta">📂 ${item.category} &nbsp;|&nbsp; 📍 ${item.location || '未填'}</div>
                <div class="item-meta">📅 ${item.date || '无日期'}</div>
                <div class="item-price">💰 ¥${Number(item.price).toFixed(2)}</div>
${ (() => {
    const costInfo = getDailyCost(item.price, item.date);
    if (costInfo) {
        return `<div class="item-daily">📅 已用${costInfo.days}天 · 日均 ¥${costInfo.dailyPrice.toFixed(2)}</div>`;
    }
    return '';
})() }
            </div>
            <div class="item-actions">
                <button class="edit-btn" data-id="${item.id}">✏️</button>
                <button class="delete-btn" data-id="${item.id}">🗑️</button>
            </div>
        `;
        itemsListDiv.appendChild(card);
    });
    // 绑定编辑删除事件
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            openEditModal(id);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            if (confirm('确定删除此物品吗？')) {
                items = items.filter(i => i.id !== id);
                saveToLocalStorage();
                renderItems();
                updateStats();
            }
        });
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
    // 显示已有图片预览
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
    // 处理图片
    let imageBase64 = '';
    if (itemImageInput.files && itemImageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageBase64 = e.target.result;
            actuallySave(id, name, category, location, price, date, imageBase64);
        };
        reader.readAsDataURL(itemImageInput.files[0]);
    } else {
        // 如果没有新选图片，保留原图片（编辑时）
        if (id) {
            const oldItem = items.find(i => i.id === id);
            if (oldItem && oldItem.imageBase64) imageBase64 = oldItem.imageBase64;
        }
        actuallySave(id, name, category, location, price, date, imageBase64);
    }
}

function actuallySave(id, name, category, location, price, date, imageBase64) {
    if (id) {
        // 更新
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], name, category, location, price, date, imageBase64 };
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
            imageBase64
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
function getDailyCost(price, dateStr) {
    if (!dateStr || !price || price <= 0) return null;
    const purchaseDate = new Date(dateStr);
    const today = new Date();
    // 重置时间为当天0点，避免时区影响
    purchaseDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return null; // 今天买的或未来，不计日均
    const daily = price / diffDays;
    return { days: diffDays, dailyPrice: daily };
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

// 初始化
loadData();
