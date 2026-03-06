
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  LayoutDashboard, Calendar, Users, History, Settings, LogOut, Plus, 
  Search, Bell, Trash2, CheckCircle, Smartphone, UserPlus, Sparkles,
  ArrowUpCircle, ArrowDownCircle, CreditCard, Banknote, ShieldCheck,
  ChevronLeft, ChevronRight, Info, UserCheck, X, Filter, PlayCircle, PlusCircle,
  Edit3, Download, UserCircle, ReceiptText, Clock, Wallet, Shield, PlusSquare, ChevronDown, Undo2, AlertTriangle, User, Zap, TrendingUp, UserPlus2, Eye, History as HistoryIcon,
  Minimize2, Maximize2, MousePointer2, MessageSquareText, Cake, BellOff
} from 'lucide-react';
import { Staff, Customer, Appointment, Transaction, SystemLog, Role, Promotion, CustomerCard, StaffReminder } from './types';
import { analyzeBusinessData } from './services/geminiService';

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: '概览', icon: LayoutDashboard },
  { id: 'appts', label: '预约中心', icon: Calendar },
  { id: 'customers', label: '会员', icon: Users },
  { id: 'finance', label: '财务', icon: History },
  { id: 'promotions', label: '活动', icon: Sparkles },
  { id: 'staff', label: '员工', icon: ShieldCheck },
  { id: 'logs', label: '日志', icon: Settings },
];

const safeParse = (key: string, fallback: string) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return JSON.parse(fallback);
    const parsed = JSON.parse(item);
    return parsed !== null ? parsed : JSON.parse(fallback);
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return JSON.parse(fallback);
  }
};

const App: React.FC = () => {
  // --- 核心状态 ---
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'month' | 'day'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [apptSearchTerm, setApptSearchTerm] = useState('');
  const [isApptSearchFocused, setIsApptSearchFocused] = useState(false);
  const [isNewApptSearchFocused, setIsNewApptSearchFocused] = useState(false);
  const [activeFinanceFilter, setActiveFinanceFilter] = useState<'all' | 'cash' | 'recharge' | 'consume'>('all');
  const [financeStartDate, setFinanceStartDate] = useState('');
  const [financeEndDate, setFinanceEndDate] = useState('');

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const data = safeParse('bp_customers', '[]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  const [staff, setStaff] = useState<Staff[]>(() => {
    const data = safeParse('bp_staff', '[{"id":"1","name":"admin","role":"总店长","avatar":"A","password":"admin","permissions":["all"]}]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const data = safeParse('bp_appts', '[]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const data = safeParse('bp_trans', '[]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const data = safeParse('bp_logs', '[]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const data = safeParse('bp_promotions', '[]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  const [customerCards, setCustomerCards] = useState<CustomerCard[]>(() => {
    const data = safeParse('bp_customer_cards', '[]');
    return Array.isArray(data) ? data.filter(Boolean) : [];
  });
  
  const [isModalOpen, setIsModalOpen] = useState<string | null>(null);
  const [reminders, setReminders] = useState<StaffReminder[]>(() => {
    const saved = localStorage.getItem('bp_reminders');
    return saved ? JSON.parse(saved) : [];
  });
  const [showReminders, setShowReminders] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isVoidingAppt, setIsVoidingAppt] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Staff | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiShrunk, setIsAiShrunk] = useState(true);
  const [isQuickAddCustomer, setIsQuickAddCustomer] = useState(false);
  const [revokingLog, setRevokingLog] = useState<SystemLog | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // --- 表单受控状态 (统一所有业务输入) ---
  const [formState, setFormState] = useState<any>({
    loginUser: 'admin',
    loginPass: 'admin',
    custName: '',
    custPhone: '',
    custRemarks: '',
    custGender: 'female',
    custBirthday: '',
    custSource: '',
    custTags: '',
    custAssignedStaffId: '',
    amount: '',
    itemName: '',
    note: '',
    apptCustId: '',
    apptStaffId: '',
    apptProject: '',
    apptDate: new Date().toISOString().split('T')[0],
    apptStartTime: '10',
    apptEndTime: '11',
    custSearch: '',
    staffName: '',
    staffRole: '',
    staffPass: '',
    promoName: '',
    promoDiscount: '',
    cardPromoId: '',
    cardAmount: '',
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // --- 持久化 ---
  useEffect(() => {
    localStorage.setItem('bp_customers', JSON.stringify(customers));
    localStorage.setItem('bp_staff', JSON.stringify(staff));
    localStorage.setItem('bp_appts', JSON.stringify(appointments));
    localStorage.setItem('bp_trans', JSON.stringify(transactions));
    localStorage.setItem('bp_logs', JSON.stringify(logs));
    localStorage.setItem('bp_promotions', JSON.stringify(promotions));
    localStorage.setItem('bp_customer_cards', JSON.stringify(customerCards));
    localStorage.setItem('bp_reminders', JSON.stringify(reminders));
  }, [customers, staff, appointments, transactions, logs, promotions, customerCards, reminders]);

  // --- 自动化提醒逻辑 ---
  useEffect(() => {
    if (!currentUser) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const newReminders: StaffReminder[] = [];

    // 逻辑 A: 生日提醒 (未来 7 天)
    customers.forEach(c => {
      if (c.birthday && (c.assignedStaffId === currentUser.id || currentUser.role === 'admin')) {
        const bday = new Date(c.birthday);
        const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
        
        const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          const rid = `bday_${c.id}_${nextBday.getFullYear()}`;
          if (!reminders.find(r => r.id === rid)) {
            newReminders.push({
              id: rid,
              type: 'birthday',
              content: `顾客 ${c.name} 将在 ${c.birthday.split('-').slice(1).join('-')} 过生日，请提前准备惊喜！`,
              customerId: c.id,
              staffId: currentUser.id,
              reminderDate: todayStr,
              status: 'pending',
              createdAt: today.toISOString()
            });
          }
        }
      }
    });

    // 逻辑 B: 沉睡唤醒 (60天未消费)
    customers.forEach(c => {
      if (c.assignedStaffId === currentUser.id || currentUser.role === 'admin') {
        const custTrans = transactions.filter(t => t.customerId === c.id && t.type === 'consume');
        if (custTrans.length > 0) {
          const lastTransTime = Math.max(...custTrans.map(t => new Date(t.timestamp).getTime()));
          const lastTrans = new Date(lastTransTime);
          const diffDays = Math.ceil((today.getTime() - lastTrans.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 60) {
            const rid = `dormant_${c.id}_${lastTrans.toISOString().split('T')[0]}`;
            if (!reminders.find(r => r.id === rid)) {
              newReminders.push({
                id: rid,
                type: 'dormant',
                content: `顾客 ${c.name} 已有 ${diffDays} 天未到店消费，建议进行回访。`,
                customerId: c.id,
                staffId: currentUser.id,
                reminderDate: todayStr,
                status: 'pending',
                createdAt: today.toISOString()
              });
            }
          }
        }
      }
    });

    if (newReminders.length > 0) {
      setReminders(prev => [...prev, ...newReminders]);
    }
  }, [customers, transactions, currentUser]);

  const handleMarkReminderDone = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r));
  };

  // --- 锁定背景滚动 ---
  useEffect(() => {
    if (isModalOpen || revokingLog || selectedAppt) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, revokingLog, selectedAppt]);

  // --- 统计计算 ---
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayTrans = transactions.filter(t => new Date(t.timestamp).toDateString() === todayStr);

    const cashIncome = todayTrans.reduce((sum, t) => (t.type === 'consume' && t.paymentMethod !== 'balance') ? sum + (t.amount || 0) : sum, 0);
    const rechargeIncome = todayTrans.reduce((sum, t) => t.type === 'recharge' ? sum + (t.amount || 0) : sum, 0);
    const consumption = todayTrans.reduce((sum, t) => t.type === 'consume' && t.paymentMethod === 'balance' ? sum + (t.amount || 0) : sum, 0);
    const monthlyRevenue = transactions.filter(t => new Date(t.timestamp).getMonth() === new Date().getMonth()).reduce((sum, t) => (t.type === 'recharge' || (t.type === 'consume' && t.paymentMethod !== 'balance')) ? sum + (t.amount || 0) : sum, 0);

    // 个人业绩计算
    const myTodayTrans = todayTrans.filter(t => t.staffId === currentUser?.id);
    const myCashIncome = myTodayTrans.reduce((sum, t) => (t.type === 'consume' && t.paymentMethod !== 'balance') ? sum + (t.amount || 0) : sum, 0);
    const myRechargeIncome = myTodayTrans.reduce((sum, t) => t.type === 'recharge' ? sum + (t.amount || 0) : sum, 0);
    const myConsumption = myTodayTrans.reduce((sum, t) => t.type === 'consume' && t.paymentMethod === 'balance' ? sum + (t.amount || 0) : sum, 0);

    // 员工个人业绩统计 (用于管理员查看)
    const staffStats = staff.map(s => {
      const sTrans = todayTrans.filter(t => t.staffId === s.id);
      const sCash = sTrans.reduce((sum, t) => (t.type === 'consume' && t.paymentMethod !== 'balance') ? sum + (t.amount || 0) : sum, 0);
      const sRecharge = sTrans.reduce((sum, t) => t.type === 'recharge' ? sum + (t.amount || 0) : sum, 0);
      const sConsume = sTrans.reduce((sum, t) => t.type === 'consume' && t.paymentMethod === 'balance' ? sum + (t.amount || 0) : sum, 0);
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        avatar: s.avatar,
        actual: sCash + sRecharge,
        cash: sCash,
        recharge: sRecharge,
        consume: sConsume
      };
    }).sort((a, b) => b.actual - a.actual);

    return {
      todayActual: cashIncome + rechargeIncome,
      todayCash: cashIncome,
      todayRecharge: rechargeIncome,
      todayConsumption: consumption,
      monthlyRevenue,
      totalMembers: customers.length,
      pendingAppts: appointments.filter(a => a.status === 'pending').length,
      todayAppts: appointments.filter(a => new Date(a.startTime).toDateString() === todayStr).length,
      allPendingAppts: appointments.filter(a => a.status === 'pending').sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      myTodayActual: myCashIncome + myRechargeIncome,
      myTodayConsumption: myConsumption,
      staffStats
    };
  }, [transactions, customers, appointments, currentUser, staff]);

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const income = transactions.filter(t => t && new Date(t.timestamp).toDateString() === d.toDateString()).reduce((sum, t) => (t.type === 'recharge' || (t.type === 'consume' && t.paymentMethod !== 'balance')) ? sum + (t.amount || 0) : sum, 0);
      return { name: `${d.getMonth() + 1}/${d.getDate()}`, income };
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      let typeMatch = true;
      if (activeFinanceFilter === 'recharge') typeMatch = t.type === 'recharge';
      if (activeFinanceFilter === 'consume') typeMatch = t.type === 'consume' && t.paymentMethod === 'balance';
      if (activeFinanceFilter === 'cash') typeMatch = t.type === 'consume' && t.paymentMethod !== 'balance';
      
      if (!typeMatch) return false;

      const tDate = new Date(t.timestamp);
      tDate.setHours(0, 0, 0, 0);

      if (financeStartDate) {
        const sDate = new Date(financeStartDate);
        sDate.setHours(0, 0, 0, 0);
        if (tDate < sDate) return false;
      }
      if (financeEndDate) {
        const eDate = new Date(financeEndDate);
        eDate.setHours(0, 0, 0, 0);
        if (tDate > eDate) return false;
      }

      return true;
    });
  }, [transactions, activeFinanceFilter, financeStartDate, financeEndDate]);

  const handleDownloadReport = () => {
    if (filteredTransactions.length === 0) {
      alert('当前没有可导出的数据');
      return;
    }
    
    const headers = ['单号', '时间', '类型', '客户', '项目', '金额', '支付方式'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => {
        const typeStr = t.type === 'recharge' ? '充值' : '消费';
        const dateStr = new Date(t.timestamp).toLocaleString();
        const amountStr = t.type === 'recharge' ? `+${t.amount}` : `-${t.amount}`;
        const methodStr = t.paymentMethod === 'wechat' ? '微信' : t.paymentMethod === 'alipay' ? '支付宝' : t.paymentMethod === 'cash' ? '现金' : t.paymentMethod === 'meituan' ? '美团' : '余额';
        return `${t.id},"${dateStr}",${typeStr},"${t.customerName}","${t.itemName || '-'}",${amountStr},${methodStr}`;
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `财务报表_${financeStartDate || '全部'}至${financeEndDate || '全部'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 逻辑函数 ---
  const getAvailableCards = (customerId: string) => {
    return customerCards
      .filter(card => card.customerId === customerId && card.balance > 0)
      .map(card => {
        const promo = promotions.find(p => p.id === card.promotionId);
        return {
          ...card,
          promotionName: promo?.name || '未知活动',
          discountRate: promo?.discountRate || 1,
          displayText: `${promo?.name || '未知活动'} - 余额: ¥${card.balance} (${(promo?.discountRate || 1) * 10}折)`
        };
      });
  };

  const addLog = (action: string, detail: string, undoData?: SystemLog['undoData']) => {
    setLogs(prev => [{ id: `LOG-${Date.now()}`, operator: currentUser?.name || '系统', action, detail, timestamp: new Date().toISOString(), undoData, isRevoked: false }, ...prev].slice(0, 100));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = staff.find(s => s.name === formState.loginUser && s.password === formState.loginPass);
    if (found) { setCurrentUser(found); addLog('登录', found.name); } 
    else alert('账号或密码错误');
  };

  const handleSaveStaff = () => {
    if (!formState.staffName || !formState.staffRole) return alert('请补全职员资料');
    if (editingTarget) {
      setStaff(prev => prev.map(s => s.id === editingTarget.id ? { 
        ...s, 
        name: formState.staffName, 
        role: formState.staffRole, 
        password: formState.staffPass || s.password,
        avatar: formState.staffName[0]
      } : s));
      addLog('修改职员资料', formState.staffName);
    } else {
      if (!formState.staffPass) return alert('请设置登录密码');
      setStaff(prev => [...prev, {
        id: `STF-${Date.now()}`,
        name: formState.staffName,
        role: formState.staffRole,
        password: formState.staffPass,
        avatar: formState.staffName[0],
        permissions: ['all']
      }]);
      addLog('职员入职', formState.staffName);
    }
    setIsModalOpen(null);
    setEditingTarget(null);
  };

  const handleAddPromotion = () => {
    if (!formState.promoName || !formState.promoDiscount) return alert('请填写完整信息');
    const discount = parseFloat(formState.promoDiscount);
    if (isNaN(discount) || discount <= 0 || discount > 1) return alert('折扣必须是 0 到 1 之间的小数');
    
    const newPromo: Promotion = {
      id: Date.now().toString(),
      name: formState.promoName,
      discountRate: discount,
      createdAt: new Date().toISOString()
    };
    setPromotions([...promotions, newPromo]);
    addLog('创建活动', newPromo.name);
    setFormState({...formState, promoName: '', promoDiscount: ''});
    setIsModalOpen(null);
  };

  const handleDeletePromotion = (id: string) => {
    if (!confirm('确认删除该活动？')) return;
    const promo = promotions.find(p => p.id === id);
    if (promo) {
      setPromotions(promotions.filter(p => p.id !== id));
      addLog('删除活动', promo.name);
    }
  };

  const handleAddCustomerCard = (customerId: string) => {
    if (!formState.cardPromoId || !formState.cardAmount) return alert('请填写完整信息');
    const amount = parseFloat(formState.cardAmount);
    if (isNaN(amount) || amount <= 0) return alert('金额必须大于 0');
    
    const promo = promotions.find(p => p.id === formState.cardPromoId);
    if (!promo) return alert('活动不存在');

    const newCard: CustomerCard = {
      id: Date.now().toString(),
      customerId,
      promotionId: promo.id,
      balance: amount,
      createdAt: new Date().toISOString()
    };
    
    setCustomerCards([...customerCards, newCard]);
    
    // Create recharge transaction
    const customer = customers.find(c => c.id === customerId);
    const newTrans: Transaction = {
      id: Date.now().toString(),
      type: 'recharge',
      customerId,
      customerName: customer?.name || '未知',
      amount,
      paymentMethod: 'wechat', // Default to wechat for simplicity, or add to form
      itemName: `办理活动卡: ${promo.name}`,
      staffId: currentUser?.id,
      timestamp: new Date().toISOString()
    };
    setTransactions([...transactions, newTrans]);
    
    addLog('办理活动卡', `${customer?.name} - ${promo.name} (¥${amount})`, { type: 'add_customer_card', targetId: newCard.id, amount, secondaryId: newTrans.id });
    setFormState({...formState, cardPromoId: '', cardAmount: ''});
    setIsModalOpen(null);
  };

  const handleSaveCustomer = () => {
    if (!formState.custName || !formState.custPhone) return alert('请补全会员资料');
    
    if (editingTarget && 'phone' in editingTarget) {
      // Edit existing customer
      setCustomers(prev => prev.map(c => c.id === editingTarget.id ? {
        ...c,
        name: formState.custName,
        phone: formState.custPhone,
        remarks: formState.custRemarks,
        gender: formState.custGender,
        birthday: formState.custBirthday,
        source: formState.custSource,
        tags: formState.custTags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
        assignedStaffId: formState.custAssignedStaffId
      } : c));
      addLog('修改会员资料', formState.custName);
    } else {
      // Add new customer
      const amount = parseFloat(formState.amount) || 0;
      const newCust: Customer = {
        id: `C-${Date.now()}`,
        name: formState.custName,
        phone: formState.custPhone,
        balance: amount,
        remarks: formState.custRemarks || '',
        gender: formState.custGender,
        birthday: formState.custBirthday,
        source: formState.custSource,
        tags: formState.custTags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
        assignedStaffId: formState.custAssignedStaffId,
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [...prev, newCust]);
      if (amount > 0) {
        const transId = `TRX-${Date.now()}`;
        setTransactions(prev => [{ 
          id: transId, 
          type: 'recharge', 
          customerId: newCust.id, 
          customerName: newCust.name, 
          amount: amount, 
          paymentMethod: 'cash', 
          itemName: '开卡充值', 
          staffId: currentUser?.id,
          timestamp: new Date().toISOString() 
        }, ...prev]);
      }
      addLog('录入会员', newCust.name);
    }
    setFormState({
      ...formState,
      custName: '',
      custPhone: '',
      custRemarks: '',
      custGender: 'female',
      custBirthday: '',
      custSource: '',
      custTags: '',
      custAssignedStaffId: '',
      amount: ''
    });
    setIsModalOpen(null);
    setEditingTarget(null);
  };

  const handleRecharge = (custId: string, amountStr: string, method: 'cash' | 'wechat' | 'alipay' | 'meituan' = 'cash') => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('请输入有效的充值金额');
    
    setCustomers(prev => prev.map(c => c.id === custId ? { ...c, balance: c.balance + amount } : c));
    const cust = customers.find(c => c.id === custId);
    const transId = `TRX-${Date.now()}`;
    setTransactions(prev => [{ id: transId, type: 'recharge', customerId: custId, customerName: cust?.name || '未知', amount, paymentMethod: method, itemName: '充值', staffId: currentUser?.id, timestamp: new Date().toISOString() }, ...prev]);
    addLog('充值', `${cust?.name} ¥${amount}`, { type: 'recharge', targetId: transId, secondaryId: custId, amount, paymentMethod: method });
    setIsModalOpen(null);
  };

  const handleConsume = (custId: string, amountStr: string, itemName: string, method: 'balance' | 'cash' | 'promotion_card' | 'meituan' | 'wechat' | 'alipay', apptId?: string, cardId?: string) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('请输入有效的结算金额');
    if (!itemName) return alert('请输入服务项目');

    const cust = customers.find(c => c.id === custId);
    
    let actualAmount = amount;
    let originalAmount = amount;

    if (method === 'balance') {
      if ((cust?.balance || 0) < amount) { alert('余额不足'); return; }
      setCustomers(prev => prev.map(c => c.id === custId ? { ...c, balance: c.balance - amount } : c));
    } else if (method === 'promotion_card' && cardId) {
      const card = customerCards.find(c => c.id === cardId);
      if (!card) return alert('未找到该活动卡');
      const promo = promotions.find(p => p.id === card.promotionId);
      if (!promo) return alert('未找到该活动规则');
      
      actualAmount = amount * promo.discountRate;
      if (card.balance < actualAmount) { alert(`卡内余额不足，需要扣除 ${actualAmount.toFixed(2)}，当前余额 ${card.balance.toFixed(2)}`); return; }
      
      setCustomerCards(prev => prev.map(c => c.id === cardId ? { ...c, balance: c.balance - actualAmount } : c));
    }

    const transId = `TRX-${Date.now()}`;
    setTransactions(prev => [{ 
      id: transId, 
      type: 'consume', 
      customerId: custId, 
      customerName: cust?.name || '未知', 
      amount: actualAmount, 
      originalAmount: method === 'promotion_card' ? originalAmount : undefined,
      customerCardId: cardId,
      paymentMethod: method, 
      itemName, 
      staffId: currentUser?.id, 
      timestamp: new Date().toISOString() 
    }, ...prev]);
    
    if (apptId) setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: 'completed' } : a));
    addLog('消费结算', `${cust?.name} ${itemName} ¥${actualAmount}`, { type: 'consume', targetId: transId, secondaryId: custId, amount: actualAmount, originalAmount, paymentMethod: method, prevStatus: apptId, customerCardId: cardId });
    setIsModalOpen(null);
  };

  const handleVoidAppt = (appt: Appointment) => {
    if (!appt) return;
    setAppointments(prev => prev.filter(a => a.id !== appt.id));
    addLog('作废预约', appt.customerName || '未知客户');
    setSelectedAppt(null);
    setIsVoidingAppt(false);
  };

  const handleDeleteTransaction = (id: string) => {
    if (!confirm('确定要作废这条流水记录吗？注意：此操作不会自动退回会员余额，如需退款请手动操作。')) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    addLog('作废流水', `单号: ${id.slice(-6)}`);
  };

  const handleRevokeConfirm = () => {
    if (!revokingLog || !revokingLog.undoData) return;
    const { type, targetId, secondaryId, amount, prevStatus, paymentMethod, customerCardId } = revokingLog.undoData;
    if (type === 'recharge') {
      setTransactions(prev => prev.filter(t => t.id !== targetId));
      if (secondaryId) setCustomers(prev => prev.map(c => c.id === secondaryId ? { ...c, balance: Math.max(0, c.balance - (amount || 0)) } : c));
    } else if (type === 'consume') {
      setTransactions(prev => prev.filter(t => t.id !== targetId));
      if (secondaryId && paymentMethod === 'balance') setCustomers(prev => prev.map(c => c.id === secondaryId ? { ...c, balance: c.balance + (amount || 0) } : c));
      if (customerCardId && paymentMethod === 'promotion_card') setCustomerCards(prev => prev.map(c => c.id === customerCardId ? { ...c, balance: c.balance + (amount || 0) } : c));
      if (prevStatus) setAppointments(prev => prev.map(a => a.id === prevStatus ? { ...a, status: 'confirmed' } : a));
    } else if (type === 'add_customer_card') {
      setCustomerCards(prev => prev.filter(c => c.id !== targetId));
      if (secondaryId) setTransactions(prev => prev.filter(t => t.id !== secondaryId)); // Remove the recharge transaction
    }
    setLogs(prev => prev.map(l => l.id === revokingLog.id ? { ...l, isRevoked: true } : l));
    addLog('撤销', revokingLog.action);
    setRevokingLog(null);
  };

  const handleAiAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeBusinessData({ summary: stats });
      setAiAnalysis(result);
      setIsAiShrunk(false);
    } catch (e) { setAiAnalysis("AI 分析服务暂时不可用。"); } finally { setIsAnalyzing(false); }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - scrollContainerRef.current.offsetLeft - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleResetSystem = () => {
    if (confirm('确定要重置所有系统数据吗？这将清除所有会员、预约和流水记录。')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-w-4xl w-full">
          <div className="md:w-1/2 bg-indigo-600 p-8 md:p-12 text-white flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight uppercase">BeautyPro</h1>
            <p className="opacity-70 font-bold mb-6 md:mb-8 italic text-sm md:text-base">专业的店务管理专家</p>
            <div className="space-y-3 md:space-y-4 text-sm md:text-base">
              <div className="flex items-center gap-2 md:gap-3 font-bold"><CheckCircle size={18} className="md:w-5 md:h-5"/> 智能预约排班</div>
              <div className="flex items-center gap-2 md:gap-3 font-bold"><Users size={18} className="md:w-5 md:h-5"/> 会员精细管理</div>
              <div className="flex items-center gap-2 md:gap-3 font-bold"><History size={18} className="md:w-5 md:h-5"/> 资金全量监控</div>
            </div>
          </div>
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 text-slate-800">职员登录</h2>
            <form onSubmit={handleLogin} className="space-y-3 md:space-y-4">
              <input value={formState.loginUser} onChange={e=>setFormState({...formState, loginUser: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl md:rounded-2xl outline-none font-bold text-sm md:text-base text-slate-900" placeholder="职员账号" required />
              <input type="password" value={formState.loginPass} onChange={e=>setFormState({...formState, loginPass: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl md:rounded-2xl outline-none font-bold text-sm md:text-base text-slate-900" placeholder="安全密码" required />
              <button type="submit" className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-black transition-all">确认进入系统</button>
            </form>
            <div className="mt-6 md:mt-8 text-center">
              <button onClick={handleResetSystem} className="text-[9px] md:text-[10px] font-black uppercase text-slate-300 hover:text-red-500 transition-all tracking-widest">重置系统数据</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <aside className="hidden md:flex w-20 lg:w-64 bg-white border-r flex-col shrink-0 transition-all duration-300">
        <div className="h-20 flex items-center px-6 border-b">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-100"><Sparkles size={20}/></div>
          <span className="hidden lg:block font-black text-xl uppercase tracking-tighter">BeautyPro</span>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2">
          {AVAILABLE_PERMISSIONS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>
              <item.icon size={22} className="shrink-0" /> <span className="hidden lg:block ml-3">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all"><LogOut size={22}/></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 md:h-20 bg-white border-b px-4 md:px-8 flex items-center justify-between shrink-0">
          <h2 className="text-base md:text-xl font-black uppercase tracking-widest">{AVAILABLE_PERMISSIONS.find(p=>p.id===activeTab)?.label}</h2>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setCurrentUser(null)} className="md:hidden p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <LogOut size={16} />
            </button>
            <div className="relative" ref={notificationRef}>
              <div className="p-1.5 md:p-2 hover:bg-slate-50 rounded-xl cursor-pointer relative" onClick={() => setShowReminders(!showReminders)}>
                {(stats.pendingAppts > 0 || reminders.filter(r => r.status === 'pending').length > 0) && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                    {stats.pendingAppts + reminders.filter(r => r.status === 'pending').length}
                  </span>
                )}
                <Bell size={18} className="text-slate-400 md:w-5 md:h-5"/>
              </div>
              {showReminders && (
                <div className="absolute right-0 mt-3 w-72 md:w-80 bg-white rounded-2xl md:rounded-3xl shadow-2xl border z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 md:p-4 bg-slate-50 text-[10px] font-black uppercase border-b tracking-widest flex justify-between items-center">
                    <span>通知中心</span>
                    <button onClick={() => setShowReminders(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scroll">
                    {/* 员工提醒 */}
                    {reminders.filter(r => r.status === 'pending').length > 0 && (
                      <div className="bg-indigo-50/30">
                        <div className="px-4 py-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-100">员工提醒</div>
                        {reminders.filter(r => r.status === 'pending').map(r => (
                          <div key={r.id} className="p-4 border-b border-indigo-50 hover:bg-indigo-50 transition-colors group">
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'birthday' ? 'bg-pink-100 text-pink-500' : 'bg-amber-100 text-amber-500'}`}>
                                {r.type === 'birthday' ? <Cake size={14} /> : <Zap size={14} />}
                              </div>
                              <div className="flex-1">
                                <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{r.content}</p>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(r.createdAt).toLocaleDateString()}</span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleMarkReminderDone(r.id); }}
                                    className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-tighter"
                                  >
                                    标记已处理
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 待确认预约 */}
                    {stats.pendingAppts > 0 && (
                      <div>
                        <div className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">待确认预约</div>
                        {stats.allPendingAppts.map(a => (
                          <div key={a.id} className="p-4 border-b hover:bg-slate-50 transition-all cursor-pointer" onClick={() => { setActiveTab('appts'); setSelectedAppt(a); setShowReminders(false); }}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{a.customerName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{a.projectName} · {a.startHour}:00</p>
                              </div>
                              <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><Clock size={12}/></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {stats.pendingAppts === 0 && reminders.filter(r => r.status === 'pending').length === 0 && (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BellOff size={20} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 italic">暂无新通知</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => { setFormState({...formState, apptCustId: '', apptProject: '', apptNote: ''}); setIsModalOpen('new_appt'); }} className="bg-indigo-600 text-white p-1.5 px-3 md:px-6 md:py-2.5 rounded-lg md:rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center gap-1.5 md:gap-2 hover:bg-indigo-700 transition-all text-[9px] md:text-xs">
              <Plus size={12} className="md:w-[18px] md:h-[18px]"/> <span className="hidden md:inline">新增预约</span><span className="md:hidden">新增</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-8 custom-scroll">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 md:space-y-8 animate-in fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                  { label: '今日实收', val: stats.todayActual, icon: Wallet, color: 'text-indigo-600', tab: 'finance', filter: 'all' },
                  { label: '今日现金', val: stats.todayCash, icon: Banknote, color: 'text-green-500', tab: 'finance', filter: 'cash' },
                  { label: '今日充值', val: stats.todayRecharge, icon: ArrowUpCircle, color: 'text-blue-500', tab: 'finance', filter: 'recharge' },
                  { label: '今日耗卡', val: stats.todayConsumption, icon: CreditCard, color: 'text-amber-500', tab: 'finance', filter: 'consume' },
                  { label: '本月营收', val: stats.monthlyRevenue, icon: TrendingUp, color: 'text-rose-500', tab: 'finance', filter: 'all' },
                  { label: '待受理预约', val: stats.pendingAppts, icon: Clock, color: 'text-orange-400', tab: 'appts' },
                  { label: '今日总预约', val: stats.todayAppts, icon: Calendar, color: 'text-cyan-500', tab: 'appts' },
                  { label: '会员总数', val: stats.totalMembers, icon: Users, color: 'text-indigo-400', tab: 'customers' },
                ].map((s, i) => (
                  <div key={i} onClick={() => { setActiveTab(s.tab); if(s.filter) setActiveFinanceFilter(s.filter as any); }} className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2rem] border shadow-sm hover:scale-[1.03] transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-1 md:mb-2 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest">{s.label}<s.icon size={14} className={`md:w-4 md:h-4 ${s.color}`}/></div>
                    <h3 className="text-sm md:text-2xl font-black text-slate-900">{typeof s.val === 'number' && !s.label.includes('总') && !s.label.includes('预约') ? `¥${s.val.toLocaleString()}` : s.val}</h3>
                  </div>
                ))}
              </div>

              {/* 生日提醒卡片 */}
              {reminders.filter(r => r.type === 'birthday' && r.status === 'pending').length > 0 && (
                <div className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border shadow-sm border-pink-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <Cake size={16} className="text-pink-500"/> 生日提醒
                    </h3>
                    <span className="text-[10px] font-bold text-pink-500 bg-pink-50 px-2 py-1 rounded-full">
                      {reminders.filter(r => r.type === 'birthday' && r.status === 'pending').length} 位会员
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
                    {reminders.filter(r => r.type === 'birthday' && r.status === 'pending').map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => handleMarkReminderDone(r.id)}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-pink-50 hover:border-pink-200 transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-pink-500 shadow-sm group-hover:scale-110 transition-transform">
                          <Cake size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{r.content.split(' ')[0]}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">{r.content.split(' ').slice(1).join(' ')}</p>
                        </div>
                        <CheckCircle size={14} className="text-slate-300 group-hover:text-pink-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 个人业绩概览 */}
              <div className="bg-gradient-to-br from-indigo-50 to-white p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-indigo-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                    {currentUser?.name?.[0] || '我'}
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-800">我的今日业绩</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">个人专属数据面板</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-3 md:p-4 rounded-2xl border border-indigo-50 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">今日实收</p>
                    <p className="text-lg md:text-xl font-black text-indigo-600">¥{stats.myTodayActual.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-3 md:p-4 rounded-2xl border border-indigo-50 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">今日耗卡</p>
                    <p className="text-lg md:text-xl font-black text-amber-500">¥{stats.myTodayConsumption.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 店长/管理员可见的员工排行榜 */}
              {currentUser?.permissions.includes('all') && (
                <div className="bg-white p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border shadow-sm">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                      <TrendingUp size={16} className="text-rose-500"/> 员工今日业绩榜
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {stats.staffStats.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 font-black shadow-sm">
                            {s.avatar}
                          </div>
                          <div>
                            <p className="text-xs md:text-sm font-bold text-slate-800">{s.name}</p>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm font-black text-indigo-600">¥{s.actual.toLocaleString()}</p>
                          <div className="flex items-center justify-end gap-2 mt-0.5">
                            <p className="text-[9px] md:text-[10px] font-bold text-green-500">现金 ¥{s.cash.toLocaleString()}</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-blue-500">充值 ¥{s.recharge.toLocaleString()}</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-amber-500">耗卡 ¥{s.consume.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 bg-white p-4 md:p-8 rounded-3xl md:rounded-[2.5rem] border shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">近七日趋势分析</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600"><div className="w-2 h-2 bg-indigo-600 rounded-full"></div> 营收额</div>
                  </div>
                  <div className="h-64 w-full" style={{ minWidth: 1, minHeight: 1 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:10,fontWeight:700,fill:'#94a3b8'}}/>
                        <YAxis hide/>
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'1rem',border:'none',boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                        <Bar dataKey="income" radius={[8,8,8,8]} barSize={32}>
                          {chartData.map((_,idx)=><Cell key={idx} fill={idx===6?'#4f46e5':'#e2e8f0'}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {!isAiShrunk && (
                  <div className="bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[3rem] shadow-xl text-white flex flex-col relative overflow-hidden h-80 lg:h-auto min-h-[350px] animate-in zoom-in-95">
                    <Zap className="absolute -top-6 -right-6 text-white/5 w-40 h-40"/>
                    <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
                      <div className="flex items-center gap-2"><Sparkles className="text-indigo-400 md:w-[18px] md:h-[18px]" size={16}/><span className="text-[10px] md:text-xs font-black uppercase tracking-widest tracking-tighter">AI 智能经营顾问</span></div>
                      <button onClick={()=>setIsAiShrunk(true)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"><Minimize2 size={14} className="md:w-4 md:h-4"/></button>
                    </div>
                    <div className="flex-1 text-[10px] md:text-xs leading-relaxed text-indigo-100 font-medium overflow-y-auto custom-scroll pr-2 mb-4 md:mb-6 relative z-10 whitespace-pre-wrap">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 md:gap-3 opacity-60">
                          <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                          深度分析中...
                        </div>
                      ) : (aiAnalysis || '点击下方按钮，开始 AI 店务诊断报告。')}
                    </div>
                    <button onClick={handleAiAnalyze} className="w-full py-3 md:py-4 bg-white text-slate-900 rounded-xl font-black text-[9px] md:text-[10px] uppercase shadow-lg relative z-10 hover:bg-indigo-50 transition-all">重新诊断数据</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'appts' && (
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] border shadow-sm flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom-8">
              <div className="p-2 md:p-6 border-b flex justify-between items-center bg-slate-50/50 flex-wrap gap-2 md:gap-4">
                <div className="relative w-full md:w-auto md:min-w-[240px]">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm w-full">
                    <Search size={14} className="text-slate-400"/>
                    <input 
                      value={apptSearchTerm} 
                      onChange={e=>setApptSearchTerm(e.target.value)} 
                      onFocus={() => setIsApptSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsApptSearchFocused(false), 200)}
                      placeholder="搜索会员或手机..." 
                      className="bg-transparent outline-none w-full text-[10px] md:text-xs font-bold text-slate-900" 
                    />
                  </div>
                  {isApptSearchFocused && apptSearchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto custom-scroll">
                      {customers.filter(c => c.name.toLowerCase().includes(apptSearchTerm.toLowerCase()) || (c.phone || '').includes(apptSearchTerm)).map(c => (
                        <div 
                          key={c.id} 
                          className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-[10px] md:text-xs font-bold text-slate-800 flex justify-between items-center border-b last:border-0 border-slate-50"
                          onClick={() => {
                            setApptSearchTerm(c.name);
                            setIsApptSearchFocused(false);
                          }}
                        >
                          <span>{c.name}</span>
                          <span className="text-[9px] text-slate-400 font-normal">{c.phone}</span>
                        </div>
                      ))}
                      {customers.filter(c => c.name.toLowerCase().includes(apptSearchTerm.toLowerCase()) || (c.phone || '').includes(apptSearchTerm)).length === 0 && (
                        <div className="px-3 py-3 text-center text-[10px] text-slate-400 italic">未找到匹配的会员</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex bg-slate-200/50 p-1 rounded-lg md:rounded-xl">
                  <button onClick={()=>setViewMode('day')} className={`px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[9px] md:text-xs font-bold transition-all ${viewMode==='day'?'bg-white shadow-sm text-indigo-600':'text-slate-500'}`}>日排班</button>
                  <button onClick={()=>setViewMode('month')} className={`px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-lg text-[9px] md:text-xs font-bold transition-all ${viewMode==='month'?'bg-white shadow-sm text-indigo-600':'text-slate-500'}`}>月历</button>
                </div>
                <div className="flex items-center gap-1 md:gap-3 font-black text-[9px] md:text-xs uppercase tracking-widest">
                  <button onClick={()=>{
                    const d = new Date(selectedDate);
                    d.setMonth(d.getMonth() - 1);
                    setSelectedDate(d);
                  }} className="p-1 hover:bg-slate-200 rounded-lg transition-all"><ChevronLeft size={14} className="md:w-[18px] md:h-[18px]"/></button>
                  {selectedDate.getMonth()+1}月{viewMode==='day'&&`${selectedDate.getDate()}日`}
                  <button onClick={()=>{
                    const d = new Date(selectedDate);
                    d.setMonth(d.getMonth() + 1);
                    setSelectedDate(d);
                  }} className="p-1 hover:bg-slate-200 rounded-lg transition-all"><ChevronRight size={14} className="md:w-[18px] md:h-[18px]"/></button>
                </div>
              </div>
              <div className="flex-1 overflow-auto py-2 md:py-4 custom-scroll select-none" ref={scrollContainerRef} onMouseDown={handleMouseDown} onMouseUp={()=>setIsDragging(false)} onMouseLeave={()=>setIsDragging(false)} onMouseMove={onMouseMove} style={{cursor: isDragging ? 'grabbing' : 'default'}}>
                {viewMode==='day' ? (
                  <div className="h-full flex flex-col overflow-hidden">
                    {/* Desktop Vertical Grid View */}
                    <div className="hidden md:block h-full overflow-auto custom-scroll">
                      <div className="min-w-max">
                        <div className="flex border-b sticky top-0 bg-white z-30 shadow-sm">
                          <div className="w-20 border-r bg-slate-50/50 sticky left-0 z-40"></div>
                          <div className="flex">
                            {staff.map(s => (
                              <div key={s.id} className="w-48 p-3 border-r last:border-r-0 text-center flex flex-col items-center gap-1.5 shrink-0">
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center font-black text-indigo-600 border border-indigo-100 text-[10px]">{s.avatar}</div>
                                <div>
                                  <div className="text-[11px] font-black text-slate-900 leading-none">{s.name}</div>
                                  <div className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">{s.role}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex">
                          <div className="w-20 border-r bg-slate-50/50 flex flex-col shrink-0 sticky left-0 z-20">
                            {Array.from({length:14}).map((_,i)=>(
                              <div key={i} className="h-32 border-b border-slate-100 text-center text-[10px] font-black text-slate-400 flex items-center justify-center uppercase tracking-widest bg-slate-50/50">{i+8}:00</div>
                            ))}
                          </div>
                          <div className="flex relative bg-slate-50/20">
                            {staff.map(s => (
                              <div key={s.id} className="w-48 border-r last:border-r-0 relative shrink-0">
                                {Array.from({length:14}).map((_,i)=>(
                                  <div 
                                    key={i} 
                                    className="h-32 border-b border-slate-100 hover:bg-indigo-50/50 cursor-crosshair transition-colors"
                                    onClick={() => {
                                      setFormState({ 
                                        ...formState, 
                                        apptStaffId: s.id, 
                                        apptStartTime: (i + 8).toString(),
                                        apptEndTime: (i + 9).toString(),
                                        apptNote: ''
                                      });
                                      setIsModalOpen('new_appt');
                                    }}
                                  ></div>
                                ))}
                                {appointments.filter(a=>a.staffId===s.id && new Date(a.startTime).toDateString()===selectedDate.toDateString() && (!apptSearchTerm || a.customerName.toLowerCase().includes(apptSearchTerm.toLowerCase()) || (customers.find(c => c.id === a.customerId)?.phone || '').includes(apptSearchTerm))).map(a=>(
                                  <div 
                                    key={a.id} 
                                    onClick={(e)=>{e.stopPropagation();setSelectedAppt(a);}} 
                                    className={`absolute left-1 right-1 rounded-xl p-3 shadow-sm border-l-4 flex flex-col gap-1.5 transition-all cursor-pointer z-10 hover:shadow-md hover:z-20 ${a.status==='pending'?'bg-amber-50 border-amber-500':a.status==='confirmed'?'bg-indigo-50 border-indigo-500':a.status==='completed'?'bg-emerald-50 border-emerald-500':'bg-slate-100 border-slate-400 opacity-60'}`}
                                    style={{
                                      top: `${(a.startHour - 8) * 128 + 4}px`,
                                      height: `${a.duration * 128 - 8}px`
                                    }}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-900 leading-none">{a.customerName}</span>
                                        <span className="text-[9px] text-slate-400 font-bold mt-0.5">{customers.find(c => c.id === a.customerId)?.phone}</span>
                                      </div>
                                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-100/50 px-1.5 py-0.5 rounded uppercase">{a.startHour}:00</span>
                                    </div>
                                    
                                    <div className="bg-white/60 rounded-lg p-2 border border-black/5">
                                      <div className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{a.projectName}</div>
                                      {a.note && (
                                        <div className="text-[9px] text-slate-500 font-medium mt-1 line-clamp-2 italic leading-tight">
                                          "{a.note}"
                                        </div>
                                      )}
                                    </div>

                                    <div className="mt-auto flex justify-between items-center">
                                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${a.status==='pending'?'bg-amber-100 text-amber-700':a.status==='confirmed'?'bg-indigo-100 text-indigo-700':a.status==='completed'?'bg-emerald-100 text-emerald-700':'bg-slate-200 text-slate-600'}`}>
                                        {a.status==='pending'?'待确认':a.status==='confirmed'?'已确认':a.status==='completed'?'已完成':'已取消'}
                                      </span>
                                      {a.duration > 1 && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{a.duration}小时</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Vertical View */}
                    <div className="md:hidden flex flex-col h-full overflow-hidden">
                      <div className="flex-1 overflow-auto relative bg-white custom-scroll">
                        <div className="min-w-max min-h-full flex flex-col">
                          <div className="flex border-b bg-slate-50 sticky top-0 z-30">
                            <div className="w-12 shrink-0 border-r bg-slate-50 sticky left-0 z-40"></div>
                            <div className="flex">
                              {staff.map(s => (
                                <div key={s.id} className="w-24 shrink-0 p-2 text-center border-r last:border-r-0 flex flex-col items-center gap-1">
                                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 border text-[8px]">{s.avatar}</div>
                                  <div className="text-[9px] font-bold truncate w-full">{s.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-1">
                            {/* Time Column */}
                            <div className="w-12 shrink-0 bg-slate-50 border-r sticky left-0 z-20">
                              {Array.from({length:15}).map((_,i) => (
                                <div key={i} className="h-24 border-b text-[8px] font-black text-slate-400 flex items-center justify-center uppercase bg-slate-50">{i+8}:00</div>
                              ))}
                            </div>
                            {/* Staff Columns Grid */}
                            <div className="flex">
                              {staff.map(s => (
                                <div key={s.id} className="w-24 shrink-0 relative border-r last:border-r-0">
                                  {Array.from({length:15}).map((_,i) => (
                                    <div 
                                      key={i} 
                                      className="h-24 border-b border-slate-50 w-full hover:bg-indigo-50/30 transition-colors"
                                      onClick={() => {
                                        setFormState({ 
                                          ...formState, 
                                          apptStaffId: s.id, 
                                          apptStartTime: (i + 8).toString(),
                                          apptEndTime: (i + 9).toString(),
                                          apptNote: ''
                                        });
                                        setIsModalOpen('new_appt');
                                      }}
                                    ></div>
                                  ))}
                                  {appointments.filter(a=>a.staffId===s.id && new Date(a.startTime).toDateString()===selectedDate.toDateString() && (!apptSearchTerm || a.customerName.toLowerCase().includes(apptSearchTerm.toLowerCase()) || (customers.find(c => c.id === a.customerId)?.phone || '').includes(apptSearchTerm))).map(a => (
                                    <div 
                                      key={a.id} 
                                      onClick={(e)=>{e.stopPropagation();setSelectedAppt(a);}}
                                      className={`absolute left-0.5 right-0.5 rounded-lg p-1.5 shadow-sm border-l-2 flex flex-col gap-1 transition-all cursor-pointer z-10 ${a.status==='pending'?'bg-amber-50 border-amber-500':a.status==='confirmed'?'bg-indigo-50 border-indigo-500':a.status==='completed'?'bg-emerald-50 border-emerald-500':'bg-slate-100 border-slate-400 opacity-60'} active:scale-95`}
                                      style={{top: `${(a.startHour - 8) * 96 + 2}px`, height: `${a.duration * 96 - 4}px` }}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-black text-slate-900 leading-none truncate max-w-[40px]">{a.customerName}</span>
                                          <span className="text-[7px] text-slate-400 font-bold mt-0.5">{a.startHour}:00</span>
                                        </div>
                                      </div>
                                      <div className="bg-white/40 rounded p-1 border border-black/5 mt-auto">
                                        <div className="text-[7px] font-black text-slate-700 uppercase truncate">{a.projectName}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5 md:gap-4 px-2 md:px-4">
                    {['日','一','二','三','四','五','六'].map(d=><div key={d} className="py-1 md:py-2 text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase">{d}</div>)}
                    {Array.from({length: new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate()}, (_,i)=>(
                      <div key={i} onClick={()=>{setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i+1)); setViewMode('day');}} className="bg-white border rounded-xl md:rounded-2xl p-2 md:p-3 min-h-[60px] md:min-h-[80px] hover:bg-indigo-50 transition-all cursor-pointer shadow-sm group">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-300 group-hover:text-indigo-600">{i+1}</span>
                        <div className="mt-1 flex flex-wrap gap-0.5 md:gap-1">
                          {appointments.filter(a=>new Date(a.startTime).getDate()===i+1 && new Date(a.startTime).getMonth()===selectedDate.getMonth()).slice(0,3).map(a=>(
                            <div key={a.id} className="w-1 h-1 md:w-1.5 md:h-1.5 bg-indigo-500 rounded-full"></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 bg-white px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl w-full max-w-md border shadow-sm transition-all focus-within:border-indigo-400">
                  <Search size={16} className="text-slate-400 md:w-[18px] md:h-[18px]"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="搜索姓名或手机..." className="bg-transparent outline-none w-full text-xs md:text-sm font-bold text-slate-900" />
                </div>
                <button onClick={()=>{setFormState({...formState, custName:'', custPhone:'', custRemarks:'', amount:''}); setIsModalOpen('new_customer');}} className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-xl flex items-center justify-center gap-2 md:gap-3 hover:bg-black transition-all">
                  <UserPlus size={16} className="md:w-[18px] md:h-[18px]"/> <span className="tracking-widest">录入尊贵会员</span>
                </button>
              </div>
              <div className="bg-white rounded-2xl md:rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto custom-scroll">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr className="border-b"><th className="px-4 md:px-8 py-3 md:py-5">客户姓名</th><th className="px-4 md:px-8 py-3 md:py-5">联系手机</th><th className="px-4 md:px-8 py-3 md:py-5">卡内余额</th><th className="px-4 md:px-8 py-3 md:py-5">会员备注</th><th className="px-4 md:px-8 py-3 md:py-5 text-right hidden md:table-cell">档案管理</th></tr></thead>
                  <tbody className="divide-y text-xs md:text-sm">
                    {customers.filter(c=>(c.name||'').toLowerCase().includes(searchTerm.toLowerCase())||(c.phone||'').includes(searchTerm)).map(c=>(
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer md:cursor-default" onClick={() => { if (window.innerWidth < 768) setIsModalOpen(`customer_actions_${c.id}`); }}>
                        <td className="px-4 md:px-8 py-3 md:py-5 font-bold text-slate-800">{c.name || '未命名'}</td>
                        <td className="px-4 md:px-8 py-3 md:py-5 font-bold text-slate-500 tracking-wider italic">{c.phone || '无号码'}</td>
                        <td className="px-4 md:px-8 py-3 md:py-5 font-black text-indigo-600">¥{(c.balance || 0).toLocaleString()}</td>
                        <td className="px-4 md:px-8 py-3 md:py-5">
                          {c.remarks ? (
                            <button onClick={(e)=>{e.stopPropagation(); setIsModalOpen(`customer_profile_${c.id}`);}} className="text-[10px] md:text-xs text-slate-500 hover:text-indigo-600 transition-colors truncate max-w-[120px] md:max-w-[200px] block text-left" title={c.remarks}>
                              {c.remarks}
                            </button>
                          ) : (
                            <span></span>
                          )}
                        </td>
                        <td className="px-4 md:px-8 py-3 md:py-5 text-right hidden md:flex justify-end gap-3 md:gap-5">
                          <button onClick={(e)=>{e.stopPropagation(); setEditingTarget(c as any); setFormState({...formState, custName:c.name, custPhone:c.phone, custRemarks:c.remarks, custGender:c.gender||'female', custBirthday:c.birthday||'', custSource:c.source||'', custTags:(c.tags||[]).join(', '), custAssignedStaffId: c.assignedStaffId || '', amount:''}); setIsModalOpen('new_customer');}} className="text-[9px] md:text-[10px] font-bold uppercase underline text-slate-400 hover:text-indigo-600">编辑</button>
                          <button onClick={(e)=>{e.stopPropagation(); setIsModalOpen(`customer_profile_${c.id}`);}} className="text-[9px] md:text-[10px] font-bold uppercase underline text-slate-400 hover:text-indigo-600">轨迹档案</button>
                          <button onClick={(e)=>{e.stopPropagation(); setFormState({...formState, amount:'', itemName:'', note:''}); setIsModalOpen(`consume_${c.id}`);}} className="text-[9px] md:text-[10px] font-bold uppercase underline text-indigo-600">结算</button>
                          <button onClick={(e)=>{e.stopPropagation(); setFormState({...formState, amount:''}); setIsModalOpen(`recharge_${c.id}`);}} className="text-[9px] md:text-[10px] font-bold uppercase text-slate-400 hover:text-slate-900">充值</button>
                          <button onClick={(e)=>{e.stopPropagation(); setFormState({...formState, cardPromoId:'', cardAmount:''}); setIsModalOpen(`add_card_${c.id}`);}} className="text-[9px] md:text-[10px] font-bold uppercase text-purple-600 hover:text-purple-800">办卡</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border shadow-sm flex items-center justify-between">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">职员档案与权限</h3>
                <button onClick={()=>{setEditingTarget(null); setFormState({...formState, staffName:'', staffRole:'', staffPass:''}); setIsModalOpen('new_staff');}} className="px-4 md:px-6 py-2.5 md:py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] shadow-lg uppercase tracking-widest transition-all hover:bg-indigo-700">入职登记</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {staff.map(s=>(
                  <div key={s.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border shadow-sm flex items-center gap-3 md:gap-4 hover:scale-[1.03] transition-all group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-indigo-600 border uppercase transition-colors group-hover:bg-indigo-600 group-hover:text-white text-xs md:text-base">{s.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-xs md:text-sm truncate">{s.name}</div>
                      <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase truncate tracking-tighter">{s.role}</div>
                    </div>
                    <div className="flex gap-1 md:gap-2">
                      <button onClick={()=>{setEditingTarget(s); setFormState({...formState, staffName:s.name, staffRole:s.role, staffPass:''}); setIsModalOpen('edit_staff');}} className="p-1.5 md:p-2 text-slate-300 hover:text-indigo-600 transition-all"><Edit3 size={14} className="md:w-4 md:h-4"/></button>
                      <button onClick={()=>{if(s.id==='1')return alert('超级管理不可移除'); if(confirm('确认移除该职员？')){setStaff(prev=>prev.filter(x=>x.id!==s.id)); addLog('移除职员',s.name);}}} className="p-1.5 md:p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} className="md:w-4 md:h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in">
              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">开始日期</label>
                  <input type="date" value={financeStartDate} onChange={e => setFinanceStartDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">结束日期</label>
                  <input type="date" value={financeEndDate} onChange={e => setFinanceEndDate(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button onClick={handleDownloadReport} className="w-full md:w-auto px-5 md:px-6 py-2.5 md:py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 md:gap-2">
                  <Download size={14} className="md:w-4 md:h-4"/>
                  <span>下载报表</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="flex bg-white p-1 rounded-xl md:rounded-2xl border shadow-sm overflow-x-auto custom-scroll">
                  {[{id:'all',label:'全部'},{id:'cash',label:'收入'},{id:'consume',label:'卡耗'},{id:'recharge',label:'充值'}].map(f=>(
                    <button key={f.id} onClick={()=>setActiveFinanceFilter(f.id as any)} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeFinanceFilter===f.id?'bg-indigo-600 text-white shadow-lg':'text-slate-400 hover:text-slate-600'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl md:rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto custom-scroll">
                <table className="w-full text-left min-w-full md:min-w-[700px]">
                  <thead className="bg-slate-50 text-[9px] md:text-[10px] font-black text-slate-400 uppercase border-b"><tr className="border-b"><th className="px-0.5 md:px-6 py-2 md:py-5">单号</th><th className="px-0.5 md:px-6 py-2 md:py-5">分类</th><th className="px-0.5 md:px-6 py-2 md:py-5">姓名</th><th className="px-0.5 md:px-6 py-2 md:py-5">金额</th><th className="px-0.5 md:px-6 py-2 md:py-5">时间</th><th className="px-0.5 md:px-6 py-2 md:py-5 text-right">操作</th></tr></thead>
                  <tbody className="divide-y text-[10px] md:text-sm">
                    {filteredTransactions.map(t=>(
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-0.5 md:px-6 py-1.5 md:py-5 font-mono text-[8px] md:text-[9px] text-slate-300 uppercase">{t.id.slice(-6)}</td>
                        <td className="px-0.5 md:px-6 py-1.5 md:py-5">
                          <span className={`text-[7px] md:text-[8px] font-black px-1 md:px-1.5 py-0.5 rounded uppercase ${t.type==='recharge'?'bg-blue-100 text-blue-700':(t.paymentMethod==='balance'?'bg-amber-100 text-amber-700':t.paymentMethod==='promotion_card'?'bg-purple-100 text-purple-700':'bg-indigo-100 text-indigo-700')}`}>
                            {t.type==='recharge'?'充值':(t.paymentMethod==='balance'?'卡耗':t.paymentMethod==='promotion_card'?'活动卡':'实收')}
                          </span>
                        </td>
                        <td className="px-0.5 md:px-6 py-1.5 md:py-5 font-bold text-[9px] md:text-xs text-slate-800 truncate max-w-[50px] md:max-w-none">{t.customerName || '未知客户'}</td>
                        <td className={`px-0.5 md:px-6 py-1.5 md:py-5 font-black text-[9px] md:text-sm ${t.type==='recharge'?'text-green-600':'text-slate-900'}`}>¥{(t.amount || 0).toLocaleString()}</td>
                        <td className="px-0.5 md:px-6 py-1.5 md:py-5 text-[8px] md:text-[10px] text-slate-400 font-bold whitespace-nowrap">{new Date(t.timestamp).toLocaleString().slice(5,16)}</td>
                        <td className="px-0.5 md:px-6 py-1.5 md:py-5 text-right">
                          <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 md:p-2 text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 size={12} className="md:w-4 md:h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'promotions' && (
            <div className="space-y-4 md:space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">活动管理</h2>
                <button onClick={() => setIsModalOpen('new_promotion')} className="bg-indigo-600 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5 md:gap-2">
                  <Plus size={16} className="md:w-[18px] md:h-[18px]"/>
                  <span>新建活动</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {promotions.map(promo => (
                  <div key={promo.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-full -z-10 opacity-50"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-800">{promo.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">创建于 {new Date(promo.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-black text-xs">
                        {promo.discountRate * 10}折
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 pt-4 border-t border-slate-50">
                      <button onClick={() => handleDeletePromotion(promo.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {promotions.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm">
                    暂无活动，点击右上角新建
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto custom-scroll animate-in fade-in">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b"><tr><th className="px-4 md:px-8 py-3 md:py-5">操作员</th><th className="px-4 md:px-8 py-3 md:py-5">行为</th><th className="px-4 md:px-8 py-3 md:py-5">内容</th><th className="px-4 md:px-8 py-3 md:py-5 text-right">撤销</th></tr></thead>
                <tbody className="divide-y text-xs md:text-sm">
                  {logs.map(l=>(
                    <tr key={l.id} className={`hover:bg-slate-50/50 transition-colors ${l.isRevoked?'opacity-30 line-through':''}`}>
                      <td className="px-4 md:px-8 py-3 md:py-5 font-bold text-[10px] md:text-xs text-slate-800">{l.operator}</td>
                      <td className="px-4 md:px-8 py-3 md:py-5 font-black text-indigo-600 text-[9px] md:text-[10px] uppercase">{l.action}</td>
                      <td className="px-4 md:px-8 py-3 md:py-5 text-[10px] md:text-xs text-slate-500 font-medium">
                        {l.detail} <span className="block text-[7px] md:text-[8px] text-slate-300 mt-1">{new Date(l.timestamp).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-4 md:px-8 py-3 md:py-5 text-right">
                        {l.undoData && !l.isRevoked && (
                          <button onClick={()=>setRevokingLog(l)} className="p-1.5 md:p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"><Undo2 size={14} className="md:w-4 md:h-4"/></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <nav className="md:hidden h-16 bg-white border-t flex items-center justify-around px-1 shrink-0 z-[140] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {AVAILABLE_PERMISSIONS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all w-14 ${activeTab === item.id ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>

        {isAiShrunk && (
          <button onClick={() => setIsAiShrunk(false)} className="fixed bottom-20 md:bottom-10 right-4 md:right-6 w-12 h-12 md:w-14 md:h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[150] group border-4 border-white overflow-hidden animate-in fade-in zoom-in">
            <div className="absolute inset-0 bg-indigo-400 animate-ping opacity-20"></div>
            <Sparkles size={20} className="md:w-6 md:h-6 group-hover:rotate-12 transition-transform"/>
          </button>
        )}
      </main>

      {(isModalOpen || revokingLog || selectedAppt) && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => { 
            if(!revokingLog && !isModalOpen?.startsWith('consume_')) { 
              setIsModalOpen(null); 
              setEditingTarget(null); 
            } 
            setSelectedAppt(null); 
            setIsVoidingAppt(false);
          }}></div>
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 bg-white w-full max-w-lg rounded-t-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scroll animate-in slide-in-from-bottom-10 md:zoom-in-95 text-slate-900">
            <button 
              onClick={() => { 
                setIsModalOpen(null); 
                setEditingTarget(null); 
                setSelectedAppt(null); 
                setIsVoidingAppt(false);
              }} 
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-20"
            >
              <X size={20} />
            </button>
            
            {/* 员工新增/编辑弹窗 */}
            {(isModalOpen === 'new_staff' || isModalOpen === 'edit_staff') && (
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase text-center tracking-widest">{editingTarget ? '职员档案调整' : '职员入职登记'}</h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">职员姓名 *</label>
                    <input value={formState.staffName} onChange={e=>setFormState({...formState, staffName: e.target.value})} placeholder="输入姓名" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">职能角色 *</label>
                    <select value={formState.staffRole} onChange={e=>setFormState({...formState, staffRole: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm border-2 border-transparent focus:border-indigo-400 outline-none text-slate-900">
                      <option value="">选择角色...</option>
                      <option value="店长">店长</option>
                      <option value="技术总监">技术总监</option>
                      <option value="高级技师">高级技师</option>
                      <option value="普通技师">普通技师</option>
                      <option value="前台顾问">前台顾问</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">登录密码 {editingTarget ? '(留空不修改)' : '*'}</label>
                    <input type="password" value={formState.staffPass} onChange={e=>setFormState({...formState, staffPass: e.target.value})} placeholder="设置安全密码" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                  </div>
                </div>
                <button onClick={handleSaveStaff} className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg tracking-widest active:scale-95 transition-all">保存档案记录</button>
              </div>
            )}

            {isModalOpen === 'new_promotion' && (
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase text-center tracking-widest">新建活动</h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">活动名称 *</label>
                    <input value={formState.promoName} onChange={e=>setFormState({...formState, promoName: e.target.value})} placeholder="活动名称" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">折扣率 (0-1之间) *</label>
                    <input type="number" step="0.01" min="0.01" max="1" value={formState.promoDiscount} onChange={e=>setFormState({...formState, promoDiscount: e.target.value})} placeholder="0.8 代表 8折" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                  </div>
                </div>
                <button onClick={handleAddPromotion} className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg tracking-widest active:scale-95 transition-all">创建活动</button>
              </div>
            )}

            {/* 会员录入/编辑弹窗 */}
            {isModalOpen === 'new_customer' && (
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase text-center tracking-widest">{editingTarget && 'phone' in editingTarget ? '编辑会员资料' : '尊贵会员录入'}</h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">会员姓名 *</label>
                      <input value={formState.custName} onChange={e=>setFormState({...formState, custName: e.target.value})} placeholder="输入姓名" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">联系手机 *</label>
                      <input value={formState.custPhone} onChange={e=>setFormState({...formState, custPhone: e.target.value})} placeholder="手机号" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">性别</label>
                      <select value={formState.custGender} onChange={e=>setFormState({...formState, custGender: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900">
                        <option value="female">女</option>
                        <option value="male">男</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">生日</label>
                      <div className="flex gap-1 md:gap-2">
                        <select 
                          value={formState.custBirthday ? formState.custBirthday.split('-')[0] : ''} 
                          onChange={e => {
                            const parts = (formState.custBirthday || '1990-01-01').split('-');
                            setFormState({...formState, custBirthday: `${e.target.value}-${parts[1]}-${parts[2]}`});
                          }}
                          className="flex-1 p-2 md:p-3 bg-slate-50 rounded-xl font-bold text-[10px] md:text-xs outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900"
                        >
                          <option value="">年</option>
                          {Array.from({length: 80}).map((_, i) => {
                            const year = new Date().getFullYear() - i;
                            return <option key={year} value={year}>{year}</option>;
                          })}
                        </select>
                        <select 
                          value={formState.custBirthday ? formState.custBirthday.split('-')[1] : ''} 
                          onChange={e => {
                            const parts = (formState.custBirthday || '1990-01-01').split('-');
                            setFormState({...formState, custBirthday: `${parts[0]}-${e.target.value}-${parts[2]}`});
                          }}
                          className="w-16 md:w-20 p-2 md:p-3 bg-slate-50 rounded-xl font-bold text-[10px] md:text-xs outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900"
                        >
                          <option value="">月</option>
                          {Array.from({length: 12}).map((_, i) => {
                            const month = (i + 1).toString().padStart(2, '0');
                            return <option key={month} value={month}>{month}</option>;
                          })}
                        </select>
                        <select 
                          value={formState.custBirthday ? formState.custBirthday.split('-')[2] : ''} 
                          onChange={e => {
                            const parts = (formState.custBirthday || '1990-01-01').split('-');
                            setFormState({...formState, custBirthday: `${parts[0]}-${parts[1]}-${e.target.value}`});
                          }}
                          className="w-16 md:w-20 p-2 md:p-3 bg-slate-50 rounded-xl font-bold text-[10px] md:text-xs outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900"
                        >
                          <option value="">日</option>
                          {Array.from({length: 31}).map((_, i) => {
                            const day = (i + 1).toString().padStart(2, '0');
                            return <option key={day} value={day}>{day}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">来源渠道</label>
                      <select value={formState.custSource} onChange={e=>setFormState({...formState, custSource: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900">
                        <option value="">选择来源...</option>
                        <option value="老客介绍">老客介绍</option>
                        <option value="小红书">小红书</option>
                        <option value="美团">美团</option>
                        <option value="大众点评">大众点评</option>
                        <option value="抖音">抖音</option>
                        <option value="路过">路过</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    {(!editingTarget || !('phone' in editingTarget)) && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">初始充值 (¥)</label>
                        <input type="number" value={formState.amount} onChange={e=>setFormState({...formState, amount: e.target.value})} placeholder="0.00" className="w-full p-3 md:p-4 bg-indigo-50/50 rounded-xl md:rounded-2xl font-black text-indigo-600 border-2 border-transparent focus:border-indigo-400 outline-none" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">专属标签 (逗号分隔)</label>
                      <input value={formState.custTags} onChange={e=>setFormState({...formState, custTags: e.target.value})} placeholder="干性皮肤, 喜欢安静" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">专属客服</label>
                      <select value={formState.custAssignedStaffId} onChange={e=>setFormState({...formState, custAssignedStaffId: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900">
                        <option value="">未分配</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">备注信息</label>
                    <input value={formState.custRemarks} onChange={e=>setFormState({...formState, custRemarks: e.target.value})} placeholder="对某产品过敏" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                  </div>
                </div>
                <button onClick={handleSaveCustomer} className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg tracking-widest active:scale-95 transition-all">{editingTarget && 'phone' in editingTarget ? '保存修改' : '确认录入系统'}</button>
              </div>
            )}

            {isModalOpen?.startsWith('add_card_') && (
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase text-center tracking-widest">办理活动卡</h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">选择活动 *</label>
                    <select value={formState.cardPromoId} onChange={e=>setFormState({...formState, cardPromoId: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900">
                      <option value="">请选择活动...</option>
                      {promotions.map(p => <option key={p.id} value={p.id}>{p.name} ({p.discountRate * 10}折)</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">充值金额 (¥) *</label>
                    <input type="number" value={formState.cardAmount} onChange={e=>setFormState({...formState, cardAmount: e.target.value})} placeholder="0.00" className="w-full p-3 md:p-4 bg-indigo-50/50 rounded-xl md:rounded-2xl font-black text-indigo-600 border-2 border-transparent focus:border-indigo-400 outline-none" />
                  </div>
                </div>
                <button onClick={() => handleAddCustomerCard(isModalOpen.split('_')[2])} className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg tracking-widest active:scale-95 transition-all">确认办理</button>
              </div>
            )}

            {/* 充值弹窗 */}
            {isModalOpen?.startsWith('recharge_') && (
              <div className="space-y-4 md:space-y-6 text-center">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-green-50 rounded-xl md:rounded-2xl flex items-center justify-center text-green-600 mx-auto shadow-inner"><Wallet size={20} className="md:w-6 md:h-6"/></div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-widest">会员充值</h3>
                <div className="p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl text-left border">
                  <p className="text-[9px] font-black uppercase text-slate-400 mb-1">正在为会员充值</p>
                  <p className="text-base md:text-lg font-bold text-slate-800">{customers.find(c=>c.id===isModalOpen.split('_')[1])?.name}</p>
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">充值金额 (¥) *</label>
                  <input value={formState.amount} onChange={e=>setFormState({...formState, amount: e.target.value})} type="number" placeholder="0.00" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-black text-lg md:text-xl text-slate-900 outline-none border-2 border-transparent focus:border-indigo-400" />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">支付方式 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cash', label: '现金', color: 'bg-slate-900' },
                      { id: 'wechat', label: '微信', color: 'bg-green-600' },
                      { id: 'alipay', label: '支付宝', color: 'bg-blue-600' },
                      { id: 'meituan', label: '美团', color: 'bg-orange-500' }
                    ].map(m => (
                      <button 
                        key={m.id}
                        onClick={() => handleRecharge(isModalOpen.split('_')[1], formState.amount, m.id as any)}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase text-white shadow-lg active:scale-95 transition-all ${m.color}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isModalOpen?.startsWith('customer_actions_') && (() => {
               const custId = isModalOpen.split('_')[2];
               const c = customers.find(x => x.id === custId);
               if (!c) return null;
               return (
                 <div className="space-y-4">
                   <div className="text-center pb-4 border-b">
                     <h3 className="text-xl font-black text-slate-900">{c.name}</h3>
                     <p className="text-sm text-slate-500 font-bold mt-1">{c.phone}</p>
                     <p className="text-lg font-black text-indigo-600 mt-2">¥{(c.balance || 0).toLocaleString()}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={()=>{setEditingTarget(c as any); setFormState({...formState, custName:c.name, custPhone:c.phone, custRemarks:c.remarks, custGender:c.gender||'female', custBirthday:c.birthday||'', custSource:c.source||'', custTags:(c.tags||[]).join(', '), custAssignedStaffId: c.assignedStaffId || '', amount:''}); setIsModalOpen('new_customer');}} className="p-4 bg-slate-50 rounded-xl font-bold text-slate-700 flex flex-col items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all">
                       <Edit3 size={20} className="text-slate-400"/> 编辑资料
                     </button>
                     <button onClick={()=>setIsModalOpen(`customer_profile_${c.id}`)} className="p-4 bg-slate-50 rounded-xl font-bold text-slate-700 flex flex-col items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all">
                       <HistoryIcon size={20} className="text-indigo-400"/> 轨迹档案
                     </button>
                     <button onClick={()=>{setFormState({...formState, amount:'', itemName:'', note:''}); setIsModalOpen(`consume_${c.id}`);}} className="p-4 bg-slate-50 rounded-xl font-bold text-slate-700 flex flex-col items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all">
                       <ReceiptText size={20} className="text-amber-500"/> 结算
                     </button>
                     <button onClick={()=>{setFormState({...formState, amount:''}); setIsModalOpen(`recharge_${c.id}`);}} className="p-4 bg-slate-50 rounded-xl font-bold text-slate-700 flex flex-col items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all">
                       <Wallet size={20} className="text-green-500"/> 充值
                     </button>
                     <button onClick={()=>{setFormState({...formState, cardPromoId:'', cardAmount:''}); setIsModalOpen(`add_card_${c.id}`);}} className="p-4 bg-slate-50 rounded-xl font-bold text-slate-700 flex flex-col items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all col-span-2">
                       <Sparkles size={20} className="text-purple-500"/> 办卡
                     </button>
                   </div>
                 </div>
               );
            })()}

            {isModalOpen?.startsWith('customer_profile_') && (() => {
               const custId = isModalOpen.split('_')[2];
               const cust = customers.find(c => c.id === custId);
               if (!cust) return null;
               const histTrans = transactions.filter(t => t.customerId === custId).sort((a,b)=>new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
               return (
                  <div className="space-y-6 md:space-y-8">
                     <div className="flex justify-between items-start">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 text-xl md:text-2xl font-black shadow-inner">{cust.name[0]}</div>
                        <button onClick={()=>setIsModalOpen(null)} className="p-2 md:p-3 bg-slate-50 rounded-lg md:rounded-xl text-slate-400 hover:text-red-500 transition-all active:scale-90"><X size={16} className="md:w-[18px] md:h-[18px]"/></button>
                     </div>
                     <div><h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{cust.name}</h3><p className="text-slate-400 font-bold mt-1 tracking-widest text-xs md:text-sm italic">{cust.phone}</p></div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">性别</p>
                          <p className="text-xs font-bold text-slate-700">{cust.gender === 'male' ? '男' : cust.gender === 'female' ? '女' : '其他'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">生日</p>
                          <p className="text-xs font-bold text-slate-700">{cust.birthday || '未设置'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">来源渠道</p>
                          <p className="text-xs font-bold text-slate-700">{cust.source || '未知'}</p>
                        </div>
                      </div>

                      {cust.tags && cust.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {cust.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">{tag}</span>
                          ))}
                        </div>
                      )}
                     
                     {cust.remarks && (
                       <div className="bg-amber-50 border border-amber-100 p-3 md:p-4 rounded-xl md:rounded-2xl">
                         <h4 className="font-black uppercase tracking-widest text-[9px] md:text-[10px] text-amber-600 flex items-center gap-2 mb-1.5 md:mb-2"><MessageSquareText size={12} className="md:w-3.5 md:h-3.5"/> 会员备注</h4>
                         <p className="text-[10px] md:text-xs text-amber-800 font-medium leading-relaxed whitespace-pre-wrap">{cust.remarks}</p>
                       </div>
                     )}

                     {getAvailableCards(custId).length > 0 && (
                       <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t">
                          <h4 className="font-black uppercase tracking-widest text-[9px] md:text-[10px] text-purple-600 flex items-center gap-2"><Sparkles size={12} className="md:w-3.5 md:h-3.5"/> 活动卡包 ({getAvailableCards(custId).length})</h4>
                          <div className="grid grid-cols-1 gap-2">
                             {getAvailableCards(custId).map(card => (
                                <div key={card.id} className="p-3 md:p-4 bg-purple-50 border border-purple-100 rounded-xl md:rounded-2xl flex justify-between items-center text-[10px] md:text-xs">
                                   <div className="truncate pr-2">
                                     <p className="font-bold text-purple-900 truncate">{card.displayText.split(' - ')[0]}</p>
                                     <p className="text-[9px] md:text-[10px] text-purple-500 font-bold mt-0.5">剩余: ¥{card.balance.toLocaleString()}</p>
                                   </div>
                                   <div className="bg-purple-200 text-purple-800 px-2 py-1 rounded font-black text-[9px]">
                                     {card.discountRate * 10}折
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                     )}

                     <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t">
                        <h4 className="font-black uppercase tracking-widest text-[9px] md:text-[10px] text-indigo-600 flex items-center gap-2"><HistoryIcon size={12} className="md:w-3.5 md:h-3.5"/> 消费轨迹 ({histTrans.length})</h4>
                        <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto custom-scroll pr-1">
                           {histTrans.length > 0 ? histTrans.map(t=>(
                              <div key={t.id} className="p-3 md:p-4 bg-white border border-slate-100 rounded-xl md:rounded-2xl flex justify-between items-center text-[10px] md:text-xs">
                                 <div className="truncate pr-2">
                                    <p className="font-bold text-slate-800 truncate">{t.itemName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-[9px] md:text-[10px] text-slate-300 font-bold">{new Date(t.timestamp).toLocaleDateString()}</p>
                                      {t.staffId && (
                                        <span className="text-[8px] md:text-[9px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded font-bold">服务: {staff.find(s => s.id === t.staffId)?.name || '未知'}</span>
                                      )}
                                    </div>
                                  </div>
                                 <div className="text-right shrink-0">
                                   <p className={`font-black ${t.type==='recharge'?'text-green-600':'text-slate-900'}`}>{t.type==='recharge'?'+':'-'}¥{t.amount}</p>
                                   {t.paymentMethod === 'promotion_card' && t.originalAmount && (
                                     <p className="text-[8px] text-slate-400 line-through">原价: ¥{t.originalAmount}</p>
                                   )}
                                 </div>
                              </div>
                           )) : <p className="text-center py-6 md:py-8 text-slate-300 font-bold italic">暂无流水记录</p>}
                        </div>
                     </div>
                  </div>
               );
            })()}

            {isModalOpen?.startsWith('consume_') && (() => {
               const custId = isModalOpen.split('_')[1];
               const customer = customers.find(c => c.id === custId);
               const amount = parseFloat(formState.amount) || 0;
               let isInsufficient = amount > (customer?.balance || 0);
               let actualAmount = amount;
               
               if (formState.cardId) {
                 const card = customerCards.find(c => c.id === formState.cardId);
                 const promo = promotions.find(p => p.id === card?.promotionId);
                 if (card && promo) {
                   actualAmount = amount * promo.discountRate;
                   isInsufficient = actualAmount > card.balance;
                 }
               }
               
               const apptId = isModalOpen.split('_')[3];

               return (
               <div className="space-y-4 md:space-y-6 text-center">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 mx-auto shadow-inner"><ReceiptText size={20} className="md:w-6 md:h-6"/></div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-widest">单据结算</h3>
                  
                  <div className="p-4 md:p-5 bg-slate-50 rounded-2xl md:rounded-3xl text-left border flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">正在核算客户</p>
                      <p className="text-base md:text-lg font-bold text-slate-800">{customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{formState.cardId ? '活动卡余额' : '当前余额'}</p>
                      <p className={`text-base md:text-lg font-black ${isInsufficient ? 'text-red-500' : 'text-indigo-600'}`}>
                        ¥{formState.cardId ? (customerCards.find(c => c.id === formState.cardId)?.balance || 0).toLocaleString() : (customer?.balance || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {isInsufficient && amount > 0 && !formState.cardId && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 text-left animate-in slide-in-from-top-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-red-700">余额不足</p>
                          <p className="text-[10px] text-red-500 mt-0.5">当前余额不足以支付本次消费，请充值或使用现金收款。</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <input 
                          type="number" 
                          placeholder="输入充值金额" 
                          id="quick-recharge-input"
                          className="flex-1 p-2 bg-white rounded-lg text-xs font-bold border border-red-200 focus:border-red-400 outline-none"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('quick-recharge-input') as HTMLInputElement;
                            if (input && input.value) {
                              const rechargeAmount = parseFloat(input.value);
                              if (!isNaN(rechargeAmount) && rechargeAmount > 0) {
                                setCustomers(prev => prev.map(c => c.id === custId ? { ...c, balance: c.balance + rechargeAmount } : c));
                                const transId = `TRX-${Date.now()}`;
                                setTransactions(prev => [{ id: transId, type: 'recharge', customerId: custId, customerName: customer?.name || '未知', amount: rechargeAmount, paymentMethod: 'cash', itemName: '充值', staffId: currentUser?.id, timestamp: new Date().toISOString() }, ...prev]);
                                addLog('充值', `${customer?.name} ¥${rechargeAmount}`, { type: 'recharge', targetId: transId, secondaryId: custId, amount: rechargeAmount });
                                input.value = '';
                              } else {
                                alert('请输入有效的充值金额');
                              }
                            }
                          }}
                          className="shrink-0 bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition-colors shadow-sm"
                        >
                          立即充值
                        </button>
                      </div>
                    </div>
                  )}

                  {isInsufficient && amount > 0 && formState.cardId && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 text-left animate-in slide-in-from-top-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-red-700">活动卡余额不足</p>
                          <p className="text-[10px] text-red-500 mt-0.5">折后需要扣除 ¥{actualAmount.toFixed(2)}，但卡内余额仅剩 ¥{(customerCards.find(c => c.id === formState.cardId)?.balance || 0).toLocaleString()}。</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1 text-left">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">结算金额 (¥) *</label>
                       <input value={formState.amount} onChange={e=>setFormState({...formState, amount: e.target.value})} type="number" placeholder="0.00" className={`w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-black text-lg md:text-xl text-slate-900 outline-none border-2 transition-colors ${isInsufficient && amount > 0 ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-indigo-400'}`} />
                    </div>
                    <div className="space-y-1 text-left">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">服务项目 *</label>
                       <input value={formState.itemName} onChange={e=>setFormState({...formState, itemName: e.target.value})} placeholder="输入服务项目" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm text-slate-900 outline-none border-2 border-transparent focus:border-indigo-400" />
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-2">业务备注</label>
                     <input value={formState.note} onChange={e=>setFormState({...formState, note: e.target.value})} placeholder="添加核销备注 (选填)" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm text-slate-900 outline-none border-2 border-transparent focus:border-indigo-400" />
                  </div>
                  {getAvailableCards(custId).length > 0 && (
                    <div className="space-y-1 text-left">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">使用活动卡</label>
                       <select value={formState.cardId || ''} onChange={e=>setFormState({...formState, cardId: e.target.value})} className="w-full p-3 md:p-4 bg-purple-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm text-purple-900 outline-none border-2 border-transparent focus:border-purple-400">
                         <option value="">不使用活动卡</option>
                         {getAvailableCards(custId).map(card => (
                           <option key={card.id} value={card.id}>{card.displayText}</option>
                         ))}
                       </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 md:gap-4 pt-2 md:pt-4">
                     <div className="flex gap-3 md:gap-4">
                       <button onClick={()=>handleConsume(custId, formState.amount, formState.itemName, 'balance', apptId)} disabled={isInsufficient && amount > 0 && !formState.cardId} className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg transition-all ${isInsufficient && amount > 0 && !formState.cardId ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white shadow-indigo-100 active:scale-95'}`}>余额核销</button>
                       <button onClick={()=>handleConsume(custId, formState.amount, formState.itemName, 'cash', apptId)} className="flex-1 py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">现金收款</button>
                      </div>
                      <div className="flex gap-3 md:gap-4">
                        <button onClick={()=>handleConsume(custId, formState.amount, formState.itemName, 'wechat', apptId)} className="flex-1 py-3 md:py-4 bg-green-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">微信</button>
                        <button onClick={()=>handleConsume(custId, formState.amount, formState.itemName, 'alipay', apptId)} className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">支付宝</button>
                        <button onClick={()=>handleConsume(custId, formState.amount, formState.itemName, 'meituan', apptId)} className="flex-1 py-3 md:py-4 bg-orange-500 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">美团</button>
                     </div>
                     {formState.cardId && (
                       <button onClick={()=>handleConsume(custId, formState.amount, formState.itemName, 'promotion_card', apptId, formState.cardId)} disabled={isInsufficient && amount > 0} className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg transition-all ${isInsufficient && amount > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-purple-600 text-white shadow-purple-200 active:scale-95'}`}>活动卡划扣</button>
                     )}
                  </div>
               </div>
               );
            })()}

            {isModalOpen === 'new_appt' && (
               <div className="space-y-4 md:space-y-6">
                 <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase text-center tracking-widest">预约中心</h3>
                 <div className="flex p-1 bg-slate-100 rounded-xl md:rounded-2xl">
                    <button onClick={()=>setIsQuickAddCustomer(false)} className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase transition-all ${!isQuickAddCustomer?'bg-white shadow-sm text-indigo-600':'text-slate-400'}`}>常客库</button>
                    <button onClick={()=>setIsQuickAddCustomer(true)} className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase transition-all ${isQuickAddCustomer?'bg-white shadow-sm text-indigo-600':'text-slate-400'}`}>极速录入</button>
                 </div>
                 <div className="space-y-3 md:space-y-4">
                    {isQuickAddCustomer ? (
                      <div className="grid grid-cols-2 gap-3 md:gap-4 animate-in slide-in-from-top-2">
                        <input value={formState.custName} onChange={e=>setFormState({...formState, custName: e.target.value})} placeholder="新客姓名 *" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                        <input value={formState.custPhone} onChange={e=>setFormState({...formState, custPhone: e.target.value})} placeholder="联系手机 *" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                        <div className="col-span-2"><input value={formState.amount} onChange={e=>setFormState({...formState, amount: e.target.value})} type="number" placeholder="初始充值金额 (选填)" className="w-full p-3 md:p-4 bg-indigo-50/50 rounded-xl md:rounded-2xl font-black text-indigo-600 border-2 border-transparent focus:border-indigo-400 outline-none" /></div>
                      </div>
                    ) : (
                      <div className="space-y-2 relative">
                        <input 
                          value={formState.custSearch || ''} 
                          onChange={e=>{
                            setFormState({...formState, custSearch: e.target.value, apptCustId: ''});
                            setIsNewApptSearchFocused(true);
                          }} 
                          onFocus={() => setIsNewApptSearchFocused(true)}
                          onBlur={() => setTimeout(() => setIsNewApptSearchFocused(false), 200)}
                          placeholder="搜索会员姓名或手机号..." 
                          className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" 
                        />
                        {isNewApptSearchFocused && formState.custSearch && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto custom-scroll">
                            {customers.filter(c => c.name.toLowerCase().includes((formState.custSearch || '').toLowerCase()) || (c.phone || '').includes(formState.custSearch || '')).map(c => (
                              <div 
                                key={c.id} 
                                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer text-xs font-bold text-slate-800 flex justify-between items-center border-b last:border-0 border-slate-50"
                                onClick={() => {
                                  setFormState({...formState, custSearch: c.name, apptCustId: c.id});
                                  setIsNewApptSearchFocused(false);
                                }}
                              >
                                <span>{c.name}</span>
                                <span className="text-[10px] text-slate-400 font-normal">{c.phone}</span>
                              </div>
                            ))}
                            {customers.filter(c => c.name.toLowerCase().includes((formState.custSearch || '').toLowerCase()) || (c.phone || '').includes(formState.custSearch || '')).length === 0 && (
                              <div className="px-4 py-4 text-center text-xs text-slate-400 italic">未找到匹配的会员</div>
                            )}
                          </div>
                        )}
                        {formState.apptCustId && (
                          <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-between">
                            <span>已选择: {customers.find(c => c.id === formState.apptCustId)?.name}</span>
                            <button onClick={() => setFormState({...formState, apptCustId: '', custSearch: ''})} className="text-indigo-400 hover:text-indigo-600">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">开始时间 *</label>
                        <select value={formState.apptStartTime} onChange={e=>setFormState({...formState, apptStartTime: e.target.value, apptEndTime: (parseInt(e.target.value) + 1).toString()})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm border-2 border-transparent focus:border-indigo-400 outline-none text-slate-900">
                          {Array.from({length:15}).map((_,i)=><option key={i} value={i+8}>{i+8}:00</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">结束时间 *</label>
                        <select value={formState.apptEndTime} onChange={e=>setFormState({...formState, apptEndTime: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm border-2 border-transparent focus:border-indigo-400 outline-none text-slate-900">
                          {Array.from({length:16}).map((_,i)=>(
                            <option key={i} value={i+8} disabled={i+8 <= parseInt(formState.apptStartTime)}>{i+8}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">指派技师 *</label>
                      <select value={formState.apptStaffId} onChange={e=>setFormState({...formState, apptStaffId: e.target.value})} className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm border-2 border-transparent focus:border-indigo-400 outline-none text-slate-900">
                        <option value="">选择技师...</option>
                        {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">预定项目 *</label>
                      <input value={formState.apptProject} onChange={e=>setFormState({...formState, apptProject: e.target.value})} placeholder="输入预定项目" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">预约备注 (选填)</label>
                      <input value={formState.apptNote || ''} onChange={e=>setFormState({...formState, apptNote: e.target.value})} placeholder="输入预约备注" className="w-full p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm outline-none border-2 border-transparent focus:border-indigo-400 text-slate-900" />
                    </div>
                  </div>
                  <button onClick={()=>{
                    let finalCustId = formState.apptCustId;
                    let finalCustName = customers.find(c=>c.id===finalCustId)?.name || '';
                    if(isQuickAddCustomer){
                      if(!formState.custName || !formState.custPhone) return alert('请补全会员资料');
                      finalCustId=`C-${Date.now()}`; finalCustName=formState.custName;
                      setCustomers(prev=>[...prev,{id:finalCustId, name:finalCustName, phone:formState.custPhone, balance:0, remarks:'极速录入', createdAt:new Date().toISOString()}]);
                      if(parseFloat(formState.amount)>0) handleRecharge(finalCustId, formState.amount);
                    }
                    const startH = parseInt(formState.apptStartTime);
                    const endH = parseInt(formState.apptEndTime);
                    if(finalCustId && formState.apptStaffId && formState.apptProject && endH > startH){
                      const apptDateTime = new Date(formState.apptDate);
                      apptDateTime.setHours(startH);
                      setAppointments(prev=>[...prev,{id:`APT-${Date.now()}`, customerId:finalCustId, customerName:finalCustName, staffId:formState.apptStaffId, projectName:formState.apptProject, startTime:apptDateTime.toISOString(), startHour:startH, duration: endH - startH, status:'pending', note: formState.apptNote}]);
                      setIsModalOpen(null); addLog('新增预约', finalCustName);
                    } else {
                      alert('请补全预约信息，并确保结束时间晚于开始时间');
                    }
                 }} className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg tracking-widest active:scale-95 transition-all">发布任务指令</button>
               </div>
            )}

            {selectedAppt && !revokingLog && (
               <div className="space-y-6 md:space-y-8 animate-in fade-in">
                  {!isVoidingAppt ? (
                    <>
                      <div className="flex justify-between items-start">
                         <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Clock size={20} className="md:w-6 md:h-6"/></div>
                         <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${selectedAppt.status==='pending'?'bg-amber-100 text-amber-600':selectedAppt.status==='confirmed'?'bg-indigo-100 text-indigo-600':selectedAppt.status==='completed'?'bg-emerald-100 text-emerald-600':'bg-slate-100 text-slate-600'}`}>
                            {selectedAppt.status === 'pending' ? '待确认' : selectedAppt.status === 'confirmed' ? '已确认' : selectedAppt.status === 'completed' ? '已完成' : '已取消'}
                         </span>
                      </div>
                      <div>
                         <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{selectedAppt.customerName}</h4>
                         <p className="text-xs md:text-sm font-bold text-indigo-500 uppercase tracking-widest mt-1 italic">{selectedAppt.projectName}</p>
                         <div className="mt-3 md:mt-4 space-y-2">
                           <p className="text-[10px] md:text-xs text-slate-500 font-bold flex items-center gap-2"><Calendar size={12} className="md:w-3.5 md:h-3.5"/> 时间: <span className="text-slate-800 font-bold">{new Date(selectedAppt.startTime).toLocaleDateString()} {selectedAppt.startHour}:00 - {selectedAppt.startHour + selectedAppt.duration}:00</span></p>
                           <p className="text-[10px] md:text-xs text-slate-500 font-bold flex items-center gap-2"><User size={12} className="md:w-3.5 md:h-3.5"/> 技师: <span className="text-slate-800 font-bold">{staff.find(s=>s.id===selectedAppt.staffId)?.name}</span></p>
                           {selectedAppt.note && <p className="text-[10px] md:text-xs text-slate-500 font-bold flex items-start gap-2"><MessageSquareText size={12} className="md:w-3.5 md:h-3.5 shrink-0 mt-0.5"/> 备注: <span className="text-slate-800 font-bold">{selectedAppt.note}</span></p>}
                         </div>
                      </div>
                      <div className="space-y-2 md:space-y-3">
                         {selectedAppt.status==='pending' && <button onClick={()=>{setAppointments(prev=>prev.map(a=>a.id===selectedAppt.id?{...a,status:'confirmed'}:a));setSelectedAppt(null);addLog('开始受理',selectedAppt.customerName);}} className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">确认开始受理</button>}
                         {selectedAppt.status==='confirmed' && <button onClick={()=>{setFormState({...formState, itemName: selectedAppt.projectName, amount:''}); setIsModalOpen(`consume_${selectedAppt.customerId}_appt_${selectedAppt.id}`); setSelectedAppt(null);}} className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">完工结算指令</button>}
                         
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsVoidingAppt(true);
                            }} 
                            className="w-full py-3 md:py-4 bg-red-50 text-red-600 font-black text-[10px] md:text-xs uppercase rounded-xl md:rounded-2xl hover:bg-red-100 transition-all cursor-pointer active:scale-95 border border-red-200 flex items-center justify-center gap-2"
                          >
                            <Trash2 size={14} className="md:w-4 md:h-4"/>
                            <span>作废并删除预约单</span>
                          </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 md:py-6 text-center space-y-4 md:space-y-6 animate-in zoom-in-95">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto border-4 border-white shadow-xl shadow-red-100/50">
                        <AlertTriangle size={32} className="md:w-10 md:h-10 animate-pulse"/>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl md:text-2xl font-black text-slate-900">确认作废删除？</h3>
                        <p className="text-xs md:text-sm text-slate-500 font-bold leading-relaxed px-2 md:px-4">
                          您正在尝试彻底删除 <span className="text-red-600 underline decoration-2 underline-offset-4">{selectedAppt.customerName}</span> 的预约单。此操作将从排班表中永久移除，且无法撤销。
                        </p>
                      </div>
                      <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                        <button 
                          onClick={() => setIsVoidingAppt(false)} 
                          className="flex-1 py-3 md:py-4 bg-slate-100 text-slate-500 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase hover:bg-slate-200 transition-all active:scale-95"
                        >
                          返回
                        </button>
                        <button 
                          onClick={() => handleVoidAppt(selectedAppt)} 
                          className="flex-1 py-3 md:py-4 bg-red-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                        >
                          确认作废
                        </button>
                      </div>
                    </div>
                  )}
               </div>
            )}

            {!isAiShrunk && (
               <div className="space-y-4 md:space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-indigo-600"><Sparkles size={18} className="md:w-5 md:h-5"/><h3 className="text-lg md:text-xl font-black uppercase tracking-widest">智能经营诊断报告</h3></div>
                     <button onClick={()=>setIsAiShrunk(true)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg md:rounded-xl transition-all"><Maximize2 size={14} className="md:w-4 md:h-4"/></button>
                  </div>
                  <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border max-h-80 overflow-y-auto custom-scroll">
                     <p className="text-[10px] md:text-xs leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{isAnalyzing ? '大数据模型诊断中...' : (aiAnalysis || '点击下方按钮，激活 AI 报告。')}</p>
                  </div>
                  <button onClick={handleAiAnalyze} className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">重新分析数据</button>
               </div>
            )}

            {revokingLog && (
               <div className="space-y-4 md:space-y-6 text-center animate-in zoom-in-95">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto"><AlertTriangle size={24} className="md:w-7 md:h-7"/></div>
                  <div><h3 className="text-lg md:text-xl font-black text-slate-900 mb-1 md:mb-2">确认撤销流水？</h3><p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4 md:px-8">撤销后对应的财务与预约状态将强制回滚，请谨慎操作。</p></div>
                  <div className="flex gap-3 md:gap-4"><button onClick={()=>setRevokingLog(null)} className="flex-1 py-3 md:py-4 bg-slate-50 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase text-slate-400">放弃</button><button onClick={handleRevokeConfirm} className="flex-1 py-3 md:py-4 bg-red-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 transition-all">立即执行</button></div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
