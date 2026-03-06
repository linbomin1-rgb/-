/**
 * 美业门店管理系统 - 极速版 (Vanilla JS)
 * 核心逻辑与 UI 渲染
 */

// --- 1. 状态管理 ---
let state = {
    currentUser: null,
    activeTab: 'dashboard',
    customers: [],
    appointments: [],
    transactions: [],
    staff: [],
    reminders: [],
    promotions: [],
    logs: [],
    isModalOpen: false,
    selectedDate: new Date()
};

// --- 2. 初始化 ---
let supabase = null;

document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    initApp();
    lucide.createIcons();
});

function initSupabase() {
    // 预留 Supabase 配置，用户可在此填入自己的 URL 和 Key
    const SUPABASE_URL = ''; 
    const SUPABASE_KEY = '';
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase 客户端已就绪');
    }
}

function initApp() {
    const savedUser = localStorage.getItem('salon_user');
    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showLogin();
    }

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// --- 3. 登录逻辑 ---
function handleLogin() {
    const username = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    if (!username || !pass) {
        alert('请输入姓名和密码');
        return;
    }

    // 模拟登录 (实际应校验数据库)
    state.currentUser = { name: username, role: '管理员' };
    localStorage.setItem('salon_user', JSON.stringify(state.currentUser));
    showApp();
}

function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem('salon_user');
    showLogin();
}

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('current-user-display').textContent = `${state.currentUser.name} • ${state.currentUser.role}`;
    
    loadData();
    render();
}

// --- 4. 数据加载 ---
function loadData() {
    // 从 localStorage 加载数据 (或 Supabase)
    const keys = ['customers', 'appointments', 'transactions', 'staff', 'promotions', 'logs'];
    keys.forEach(key => {
        const data = localStorage.getItem(`salon_${key}`);
        state[key] = data ? JSON.parse(data) : [];
    });

    // 如果没有职员，添加默认职员
    if (state.staff.length === 0) {
        state.staff = [
            { id: '1', name: '店长小美', role: '店长', avatar: '👩‍💼' },
            { id: '2', name: '阿强', role: '高级技师', avatar: '💇‍♂️' }
        ];
        saveData('staff');
    }
}

function saveData(key) {
    localStorage.setItem(`salon_${key}`, JSON.stringify(state[key]));
}

// --- 5. 路由/标签页切换 ---
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // 更新导航样式
    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.dataset.tab === tabId) {
            el.classList.add('tab-active');
            el.classList.remove('tab-inactive');
        } else {
            el.classList.remove('tab-active');
            el.classList.add('tab-inactive');
        }
    });

    render();
}

// --- 6. UI 渲染引擎 ---
function render() {
    const container = document.getElementById('content-area');
    container.innerHTML = ''; // 清空

    switch (state.activeTab) {
        case 'dashboard':
            renderDashboard(container);
            break;
        case 'appointments':
            renderAppointments(container);
            break;
        case 'customers':
            renderCustomers(container);
            break;
        case 'finance':
            renderFinance(container);
            break;
        case 'settings':
            renderSettings(container);
            break;
    }
    
    // 重新初始化图标
    lucide.createIcons();
}

// --- 7. 各模块渲染函数 ---

function renderDashboard(container) {
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-white p-6 rounded-[2rem] border shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-1">今日营收</p>
                <h3 class="text-2xl font-black text-slate-900">¥0</h3>
            </div>
            <div class="bg-white p-6 rounded-[2rem] border shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-1">待办预约</p>
                <h3 class="text-2xl font-black text-indigo-600">0</h3>
            </div>
            <div class="bg-white p-6 rounded-[2rem] border shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-1">新增会员</p>
                <h3 class="text-2xl font-black text-slate-900">0</h3>
            </div>
            <div class="bg-white p-6 rounded-[2rem] border shadow-sm">
                <p class="text-[10px] font-black text-slate-400 uppercase mb-1">活跃提醒</p>
                <h3 class="text-2xl font-black text-amber-500">0</h3>
            </div>
        </div>
        
        <div class="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">智能经营提醒</h3>
                <button onclick="autoGenerateReminders()" class="text-[10px] font-black text-indigo-600 uppercase underline">刷新扫描</button>
            </div>
            <div id="reminder-list" class="space-y-4">
                <p class="text-center py-8 text-slate-300 font-bold italic">暂无待办提醒</p>
            </div>
        </div>
    `;
}

function renderAppointments(container) {
    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">预约中心</h2>
            <button onclick="openApptModal()" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">新增预约</button>
        </div>
        <div class="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <div class="p-6 border-b bg-slate-50 flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">今日排班表</span>
                <input type="date" value="${state.selectedDate.toISOString().split('T')[0]}" class="bg-transparent font-bold text-sm outline-none">
            </div>
            <div class="p-8 text-center text-slate-300 font-bold italic">
                排班视图加载中...
            </div>
        </div>
    `;
}

function renderCustomers(container) {
    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">会员档案</h2>
            <button onclick="openCustomerModal()" class="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">录入会员</button>
        </div>
        <div class="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-slate-50 border-b">
                    <tr>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">姓名</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">手机</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase">余额</th>
                        <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase text-right">操作</th>
                    </tr>
                </thead>
                <tbody id="customer-table-body">
                    ${state.customers.length > 0 ? state.customers.map(c => `
                        <tr class="border-b hover:bg-slate-50 transition-colors">
                            <td class="px-8 py-4 font-bold text-slate-900">${c.name}</td>
                            <td class="px-8 py-4 text-slate-500 font-medium">${c.phone}</td>
                            <td class="px-8 py-4 font-black text-indigo-600">¥${c.balance}</td>
                            <td class="px-8 py-4 text-right">
                                <button onclick="openRechargeModal('${c.id}')" class="text-[10px] font-black text-indigo-600 uppercase mr-4">充值</button>
                                <button onclick="openConsumeModal('${c.id}')" class="text-[10px] font-black text-slate-900 uppercase">消费</button>
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" class="px-8 py-12 text-center text-slate-300 font-bold italic">暂无会员数据</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function openCustomerModal() {
    openModal(`
        <div class="space-y-6">
            <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">录入新会员</h3>
            <div class="space-y-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2">姓名 *</label>
                    <input type="text" id="cust-name" class="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-400">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2">手机号 *</label>
                    <input type="tel" id="cust-phone" class="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-400">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2">初始余额</label>
                    <input type="number" id="cust-balance" value="0" class="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-400">
                </div>
                <button onclick="saveCustomer()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">确认保存</button>
            </div>
        </div>
    `);
}

function saveCustomer() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const balance = parseFloat(document.getElementById('cust-balance').value) || 0;

    if (!name || !phone) {
        alert('请填写姓名和手机号');
        return;
    }

    const newCust = {
        id: Date.now().toString(),
        name,
        phone,
        balance,
        createdAt: new Date().toISOString()
    };

    state.customers.push(newCust);
    saveData('customers');
    closeModal();
    render();
}

function openRechargeModal(custId) {
    const cust = state.customers.find(c => c.id === custId);
    openModal(`
        <div class="space-y-6">
            <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tight">会员充值</h3>
            <p class="text-sm font-bold text-slate-400 uppercase">会员：${cust.name} (${cust.phone})</p>
            <div class="space-y-4">
                <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2">充值金额 *</label>
                    <input type="number" id="recharge-amount" class="w-full p-4 bg-slate-50 rounded-2xl font-black text-xl outline-none border-2 border-transparent focus:border-indigo-400">
                </div>
                <button onclick="handleRecharge('${custId}')" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">确认充值</button>
            </div>
        </div>
    `);
}

function handleRecharge(custId) {
    const amount = parseFloat(document.getElementById('recharge-amount').value);
    if (!amount || amount <= 0) return;

    const custIndex = state.customers.findIndex(c => c.id === custId);
    state.customers[custIndex].balance += amount;
    
    // 记录流水
    state.transactions.push({
        id: Date.now().toString(),
        custId,
        custName: state.customers[custIndex].name,
        type: 'recharge',
        amount,
        method: 'cash',
        date: new Date().toISOString()
    });

    saveData('customers');
    saveData('transactions');
    closeModal();
    render();
}

function renderFinance(container) {
    container.innerHTML = `
        <h2 class="text-2xl font-black text-slate-800 tracking-tight mb-6">财务流水</h2>
        <div class="bg-white rounded-[2.5rem] border shadow-sm p-8">
            <p class="text-center text-slate-300 font-bold italic">流水报表加载中...</p>
        </div>
    `;
}

function renderSettings(container) {
    container.innerHTML = `
        <h2 class="text-2xl font-black text-slate-800 tracking-tight mb-6">系统设置</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <h3 class="font-black text-slate-800 uppercase tracking-widest text-sm">数据同步</h3>
                <button onclick="syncToCloud()" class="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all">同步到 Supabase 云端</button>
            </div>
            <div class="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                <h3 class="font-black text-red-600 uppercase tracking-widest text-sm">危险区域</h3>
                <button onclick="resetSystem()" class="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all">重置所有本地数据</button>
            </div>
        </div>
    `;
}

// --- 8. 弹窗控制 ---
function openModal(contentHtml) {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    content.innerHTML = contentHtml;
    modal.classList.remove('hidden');
    state.isModalOpen = true;
    lucide.createIcons();
}

function closeModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('hidden');
    state.isModalOpen = false;
}

// --- 9. 业务操作示例 ---
function resetSystem() {
    if (confirm('确定要清空所有本地数据吗？此操作不可撤销。')) {
        localStorage.clear();
        location.reload();
    }
}

function syncToCloud() {
    alert('正在连接 Supabase... 请确保已在 index.html 中配置正确的 API Key');
}

// 暴露给全局调用
window.switchTab = switchTab;
window.closeModal = closeModal;
window.resetSystem = resetSystem;
window.syncToCloud = syncToCloud;
