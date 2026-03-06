/**
 * @file models/transaction.js
 * @description 财务流水模块 —— 数据结构、业务逻辑与 Supabase CRUD（纯 ES6+ JavaScript）
 *
 * 功能说明：
 *  - 充值：现金/微信/支付宝/美团 充值到会员余额
 *  - 消费结算：余额扣款 / 现金 / 微信 / 支付宝 / 美团 / 活动卡折扣
 *  - 美团支付：专项处理美团平台订单，支持原价记录与实收金额分离
 *  - 客户画像：基于流水数据分析客户消费习惯、偏好项目、价值等级
 *  - 流水撤销：回滚充值/消费对余额和活动卡的影响
 *  - 报表导出：生成 CSV 格式财务报表
 *  - Supabase CRUD：增删改查完整实现
 *
 * 可直接在浏览器 <script type="module"> 中引入使用。
 */

import {
  createTransaction,
  createCustomer,
  PAYMENT_METHOD,
  UNDO_TYPE,
} from '../types.js';

// ─────────────────────────────────────────────
// 充值逻辑
// ─────────────────────────────────────────────

/**
 * 执行充值操作，返回更新后的客户列表和新交易记录
 *
 * @param {import('../types.js').Customer[]} customers    - 全部会员列表
 * @param {string}  custId                               - 会员 ID
 * @param {string}  amountStr                            - 充值金额字符串（来自表单输入）
 * @param {string}  [method='cash']                      - 支付方式，参见 PAYMENT_METHOD 枚举
 * @param {string}  [staffId]                            - 操作职员 ID
 * @param {string}  [itemName='充值']                    - 充值说明
 * @returns {{ success: boolean, customers: import('../types.js').Customer[], transaction: import('../types.js').Transaction|null, error: string|null }}
 */
export function recharge(customers, custId, amountStr, method = PAYMENT_METHOD.CASH, staffId, itemName = '充值') {
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, customers, transaction: null, error: '请输入有效的充值金额' };
  }

  const cust = customers.find(c => c.id === custId);
  if (!cust) {
    return { success: false, customers, transaction: null, error: '未找到该会员' };
  }

  // 更新余额
  const updatedCustomers = customers.map(c =>
    c.id === custId ? { ...c, balance: c.balance + amount } : c
  );

  const transaction = createTransaction({
    type:          'recharge',
    customerId:    custId,
    customerName:  cust.name,
    amount,
    paymentMethod: method,
    itemName,
    staffId,
  });

  return { success: true, customers: updatedCustomers, transaction, error: null };
}

// ─────────────────────────────────────────────
// 消费结算逻辑
// ─────────────────────────────────────────────

/**
 * 执行消费结算，支持余额/现金/微信/支付宝/美团/活动卡多种支付方式
 *
 * @param {import('../types.js').Customer[]}     customers     - 全部会员列表
 * @param {import('../types.js').CustomerCard[]} customerCards - 全部活动卡列表
 * @param {import('../types.js').Promotion[]}    promotions    - 全部活动列表
 * @param {string}  custId      - 会员 ID
 * @param {string}  amountStr   - 消费金额字符串（原价）
 * @param {string}  itemName    - 服务项目名称
 * @param {string}  method      - 支付方式，参见 PAYMENT_METHOD 枚举
 * @param {string}  [staffId]   - 操作职员 ID
 * @param {string}  [apptId]    - 关联预约 ID（结算时同步完成预约）
 * @param {string}  [cardId]    - 活动卡 ID（method 为 promotion_card 时必填）
 * @returns {{
 *   success:      boolean,
 *   customers:    import('../types.js').Customer[],
 *   customerCards:import('../types.js').CustomerCard[],
 *   transaction:  import('../types.js').Transaction|null,
 *   error:        string|null
 * }}
 */
export function consume(
  customers,
  customerCards,
  promotions,
  custId,
  amountStr,
  itemName,
  method,
  staffId,
  apptId,
  cardId
) {
  const originalAmount = parseFloat(amountStr);
  if (isNaN(originalAmount) || originalAmount <= 0) {
    return { success: false, customers, customerCards, transaction: null, error: '请输入有效的结算金额' };
  }
  if (!itemName || !itemName.trim()) {
    return { success: false, customers, customerCards, transaction: null, error: '请填写服务项目' };
  }

  const cust = customers.find(c => c.id === custId);
  if (!cust) {
    return { success: false, customers, customerCards, transaction: null, error: '未找到该会员' };
  }

  let actualAmount = originalAmount;
  let updatedCustomers = customers;
  let updatedCards = customerCards;

  // ── 余额支付 ──
  if (method === PAYMENT_METHOD.BALANCE) {
    if ((cust.balance || 0) < originalAmount) {
      return { success: false, customers, customerCards, transaction: null, error: `余额不足，当前余额 ¥${cust.balance.toFixed(2)}` };
    }
    updatedCustomers = customers.map(c =>
      c.id === custId ? { ...c, balance: c.balance - originalAmount } : c
    );
  }

  // ── 活动卡折扣支付 ──
  else if (method === PAYMENT_METHOD.PROMOTION_CARD && cardId) {
    const card = customerCards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, customers, customerCards, transaction: null, error: '未找到该活动卡' };
    }
    const promo = promotions.find(p => p.id === card.promotionId);
    if (!promo) {
      return { success: false, customers, customerCards, transaction: null, error: '未找到该活动规则' };
    }

    actualAmount = parseFloat((originalAmount * promo.discountRate).toFixed(2));

    if (card.balance < actualAmount) {
      return {
        success:      false,
        customers,
        customerCards,
        transaction:  null,
        error:        `卡内余额不足，需扣 ¥${actualAmount.toFixed(2)}，当前余额 ¥${card.balance.toFixed(2)}`,
      };
    }

    updatedCards = customerCards.map(c =>
      c.id === cardId ? { ...c, balance: c.balance - actualAmount } : c
    );
  }

  // ── 美团支付 ──
  // 美团支付：实收金额即为 originalAmount（美团已结算），不扣会员余额
  // 但需记录 paymentMethod = 'meituan' 以便报表区分
  else if (method === PAYMENT_METHOD.MEITUAN) {
    actualAmount = originalAmount; // 美团实收即为原价，无额外折扣
    // 不操作余额，不操作活动卡
  }

  // ── 现金/微信/支付宝 ──
  // 直接现金支付，不操作余额，不操作活动卡
  // actualAmount 保持 originalAmount

  const transaction = createTransaction({
    type:           'consume',
    customerId:     custId,
    customerName:   cust.name,
    amount:         actualAmount,
    originalAmount: method === PAYMENT_METHOD.PROMOTION_CARD ? originalAmount : undefined,
    customerCardId: cardId ?? undefined,
    paymentMethod:  method,
    itemName:       itemName.trim(),
    staffId,
  });

  return {
    success:      true,
    customers:    updatedCustomers,
    customerCards: updatedCards,
    transaction,
    error:        null,
  };
}

// ─────────────────────────────────────────────
// 美团支付专项处理
// ─────────────────────────────────────────────

/**
 * 处理美团平台订单（专项函数）
 * 美团订单特点：平台已预收款，门店实收为扣除平台佣金后的金额
 *
 * @param {import('../types.js').Customer[]} customers   - 全部会员列表
 * @param {string}  custId           - 会员 ID（散客传 null）
 * @param {string}  customerName     - 客户姓名（散客直接填写）
 * @param {string}  itemName         - 美团套餐/项目名称
 * @param {number}  meituanPrice     - 美团平台标价（消费者支付金额）
 * @param {number}  actualIncome     - 门店实收金额（扣除佣金后）
 * @param {string}  [staffId]        - 操作职员 ID
 * @param {string}  [meituanOrderNo] - 美团订单号（可选，存入 itemName 备注）
 * @returns {{ success: boolean, transaction: import('../types.js').Transaction|null, error: string|null }}
 */
export function processMeituanOrder(
  customers,
  custId,
  customerName,
  itemName,
  meituanPrice,
  actualIncome,
  staffId,
  meituanOrderNo
) {
  if (!itemName || !itemName.trim()) {
    return { success: false, transaction: null, error: '请填写美团项目名称' };
  }
  if (isNaN(meituanPrice) || meituanPrice <= 0) {
    return { success: false, transaction: null, error: '请输入有效的美团标价' };
  }
  if (isNaN(actualIncome) || actualIncome < 0) {
    return { success: false, transaction: null, error: '请输入有效的门店实收金额' };
  }

  const cust = custId ? customers.find(c => c.id === custId) : null;
  const resolvedName = cust ? cust.name : (customerName || '美团散客');

  // 构建备注：包含美团标价与实收差异信息
  const orderNote = meituanOrderNo
    ? `${itemName.trim()}（美团标价¥${meituanPrice}，订单号:${meituanOrderNo}）`
    : `${itemName.trim()}（美团标价¥${meituanPrice}）`;

  const transaction = createTransaction({
    type:           'consume',
    customerId:     custId ?? null,
    customerName:   resolvedName,
    amount:         actualIncome,          // 门店实收
    originalAmount: meituanPrice,          // 美团标价（原价记录）
    paymentMethod:  PAYMENT_METHOD.MEITUAN,
    itemName:       orderNote,
    staffId,
  });

  return { success: true, transaction, error: null };
}

// ─────────────────────────────────────────────
// 客户画像分析
// ─────────────────────────────────────────────

/**
 * 客户价值等级枚举
 * @readonly
 * @enum {string}
 */
export const CUSTOMER_VALUE_LEVEL = {
  VIP:     'VIP',      // 高价值：月均消费 ≥ 500
  REGULAR: 'REGULAR',  // 稳定客：月均消费 100~499
  CASUAL:  'CASUAL',   // 偶发客：月均消费 < 100
  DORMANT: 'DORMANT',  // 沉睡客：60 天未消费
  NEW:     'NEW',      // 新客户：首次消费不足 30 天
};

/**
 * 分析单个客户的消费画像
 *
 * @param {import('../types.js').Customer} customer          - 会员对象
 * @param {import('../types.js').Transaction[]} transactions - 全部流水（会自动过滤该客户）
 * @returns {{
 *   customerId:        string,
 *   customerName:      string,
 *   totalConsumed:     number,   // 累计消费总额
 *   totalRecharged:    number,   // 累计充值总额
 *   visitCount:        number,   // 消费次数
 *   avgPerVisit:       number,   // 客单价
 *   lastVisitDate:     string|null, // 最近消费日期
 *   daysSinceLastVisit:number,   // 距上次消费天数
 *   favoriteProject:   string|null, // 最常消费项目
 *   favoritePayment:   string|null, // 最常用支付方式
 *   valueLevel:        string,   // 客户价值等级
 *   monthlyAvg:        number,   // 月均消费
 *   preferredStaffId:  string|null, // 最常服务技师
 * }}
 */
export function analyzeCustomerProfile(customer, transactions) {
  const custTrans = transactions.filter(t => t.customerId === customer.id);
  const consumeTrans = custTrans.filter(t => t.type === 'consume');
  const rechargeTrans = custTrans.filter(t => t.type === 'recharge');

  const totalConsumed  = consumeTrans.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRecharged = rechargeTrans.reduce((sum, t) => sum + (t.amount || 0), 0);
  const visitCount     = consumeTrans.length;
  const avgPerVisit    = visitCount > 0 ? totalConsumed / visitCount : 0;

  // 最近消费日期
  let lastVisitDate = null;
  let daysSinceLastVisit = Infinity;
  if (consumeTrans.length > 0) {
    const lastTime = Math.max(...consumeTrans.map(t => new Date(t.timestamp).getTime()));
    const lastDate = new Date(lastTime);
    lastVisitDate = lastDate.toISOString().split('T')[0];
    daysSinceLastVisit = Math.ceil(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // 最常消费项目（按出现次数统计）
  const projectCount = {};
  consumeTrans.forEach(t => {
    if (t.itemName) {
      projectCount[t.itemName] = (projectCount[t.itemName] || 0) + 1;
    }
  });
  const favoriteProject = Object.keys(projectCount).length > 0
    ? Object.keys(projectCount).reduce((a, b) => projectCount[a] > projectCount[b] ? a : b)
    : null;

  // 最常用支付方式
  const paymentCount = {};
  consumeTrans.forEach(t => {
    if (t.paymentMethod) {
      paymentCount[t.paymentMethod] = (paymentCount[t.paymentMethod] || 0) + 1;
    }
  });
  const favoritePayment = Object.keys(paymentCount).length > 0
    ? Object.keys(paymentCount).reduce((a, b) => paymentCount[a] > paymentCount[b] ? a : b)
    : null;

  // 最常服务技师
  const staffCount = {};
  consumeTrans.forEach(t => {
    if (t.staffId) {
      staffCount[t.staffId] = (staffCount[t.staffId] || 0) + 1;
    }
  });
  const preferredStaffId = Object.keys(staffCount).length > 0
    ? Object.keys(staffCount).reduce((a, b) => staffCount[a] > staffCount[b] ? a : b)
    : null;

  // 月均消费（基于首次消费到现在的月数）
  let monthlyAvg = 0;
  if (consumeTrans.length > 0) {
    const firstTime = Math.min(...consumeTrans.map(t => new Date(t.timestamp).getTime()));
    const monthsElapsed = Math.max(
      1,
      (Date.now() - firstTime) / (1000 * 60 * 60 * 24 * 30)
    );
    monthlyAvg = totalConsumed / monthsElapsed;
  }

  // 客户价值等级判断
  let valueLevel;
  const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
  const daysSinceCreated = createdAt
    ? Math.ceil((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  if (visitCount === 0 || daysSinceCreated <= 30) {
    valueLevel = CUSTOMER_VALUE_LEVEL.NEW;
  } else if (daysSinceLastVisit >= 60) {
    valueLevel = CUSTOMER_VALUE_LEVEL.DORMANT;
  } else if (monthlyAvg >= 500) {
    valueLevel = CUSTOMER_VALUE_LEVEL.VIP;
  } else if (monthlyAvg >= 100) {
    valueLevel = CUSTOMER_VALUE_LEVEL.REGULAR;
  } else {
    valueLevel = CUSTOMER_VALUE_LEVEL.CASUAL;
  }

  return {
    customerId:         customer.id,
    customerName:       customer.name,
    totalConsumed:      parseFloat(totalConsumed.toFixed(2)),
    totalRecharged:     parseFloat(totalRecharged.toFixed(2)),
    visitCount,
    avgPerVisit:        parseFloat(avgPerVisit.toFixed(2)),
    lastVisitDate,
    daysSinceLastVisit: daysSinceLastVisit === Infinity ? null : daysSinceLastVisit,
    favoriteProject,
    favoritePayment,
    valueLevel,
    monthlyAvg:         parseFloat(monthlyAvg.toFixed(2)),
    preferredStaffId,
  };
}

/**
 * 批量分析所有客户的消费画像
 *
 * @param {import('../types.js').Customer[]}     customers    - 全部会员列表
 * @param {import('../types.js').Transaction[]}  transactions - 全部流水
 * @returns {ReturnType<typeof analyzeCustomerProfile>[]}
 */
export function analyzeAllCustomerProfiles(customers, transactions) {
  return customers.map(c => analyzeCustomerProfile(c, transactions));
}

// ─────────────────────────────────────────────
// 流水撤销逻辑
// ─────────────────────────────────────────────

/**
 * 执行流水撤销操作，回滚余额/活动卡/预约状态
 *
 * @param {import('../types.js').SystemLog}      revokingLog   - 要撤销的日志对象
 * @param {import('../types.js').Transaction[]}  transactions  - 全部流水
 * @param {import('../types.js').Customer[]}     customers     - 全部会员
 * @param {import('../types.js').CustomerCard[]} customerCards - 全部活动卡
 * @param {import('../types.js').Appointment[]}  appointments  - 全部预约
 * @returns {{
 *   transactions:  import('../types.js').Transaction[],
 *   customers:     import('../types.js').Customer[],
 *   customerCards: import('../types.js').CustomerCard[],
 *   appointments:  import('../types.js').Appointment[],
 *   success:       boolean,
 *   error:         string|null
 * }}
 */
export function revokeTransaction(
  revokingLog,
  transactions,
  customers,
  customerCards,
  appointments
) {
  if (!revokingLog || !revokingLog.undoData) {
    return { transactions, customers, customerCards, appointments, success: false, error: '无效的撤销数据' };
  }

  const { type, targetId, secondaryId, amount, prevStatus, paymentMethod, customerCardId } = revokingLog.undoData;

  let updatedTransactions  = transactions;
  let updatedCustomers     = customers;
  let updatedCards         = customerCards;
  let updatedAppointments  = appointments;

  if (type === UNDO_TYPE.RECHARGE) {
    // 撤销充值：删除流水 + 扣回余额
    updatedTransactions = transactions.filter(t => t.id !== targetId);
    if (secondaryId) {
      updatedCustomers = customers.map(c =>
        c.id === secondaryId
          ? { ...c, balance: Math.max(0, c.balance - (amount || 0)) }
          : c
      );
    }
  } else if (type === UNDO_TYPE.CONSUME) {
    // 撤销消费：删除流水 + 退回余额/活动卡
    updatedTransactions = transactions.filter(t => t.id !== targetId);

    if (secondaryId && paymentMethod === PAYMENT_METHOD.BALANCE) {
      // 退回余额
      updatedCustomers = customers.map(c =>
        c.id === secondaryId ? { ...c, balance: c.balance + (amount || 0) } : c
      );
    }
    if (customerCardId && paymentMethod === PAYMENT_METHOD.PROMOTION_CARD) {
      // 退回活动卡余额
      updatedCards = customerCards.map(c =>
        c.id === customerCardId ? { ...c, balance: c.balance + (amount || 0) } : c
      );
    }
    if (prevStatus) {
      // 回滚预约状态（从 completed 回到 confirmed）
      updatedAppointments = appointments.map(a =>
        a.id === prevStatus ? { ...a, status: 'confirmed' } : a
      );
    }
  } else if (type === UNDO_TYPE.ADD_CUSTOMER_CARD) {
    // 撤销办卡：删除活动卡 + 删除对应充值流水
    updatedCards = customerCards.filter(c => c.id !== targetId);
    if (secondaryId) {
      updatedTransactions = transactions.filter(t => t.id !== secondaryId);
    }
  }

  return {
    transactions:  updatedTransactions,
    customers:     updatedCustomers,
    customerCards: updatedCards,
    appointments:  updatedAppointments,
    success:       true,
    error:         null,
  };
}

// ─────────────────────────────────────────────
// 报表导出
// ─────────────────────────────────────────────

/**
 * 支付方式中文名称映射
 * @param {string} method - 支付方式代码
 * @returns {string}
 */
export function getPaymentMethodLabel(method) {
  const map = {
    [PAYMENT_METHOD.BALANCE]:        '余额',
    [PAYMENT_METHOD.CASH]:           '现金',
    [PAYMENT_METHOD.WECHAT]:         '微信',
    [PAYMENT_METHOD.ALIPAY]:         '支付宝',
    [PAYMENT_METHOD.PROMOTION_CARD]: '活动卡',
    [PAYMENT_METHOD.MEITUAN]:        '美团',
  };
  return map[method] || method;
}

/**
 * 将流水列表导出为 CSV 字符串（含 UTF-8 BOM，兼容 Excel）
 *
 * @param {import('../types.js').Transaction[]} transactions - 要导出的流水列表
 * @param {string} [startDate='全部']  - 报表起始日期（仅用于文件名）
 * @param {string} [endDate='全部']    - 报表结束日期（仅用于文件名）
 * @returns {{ csvContent: string, filename: string }}
 */
export function exportTransactionsToCsv(transactions, startDate = '全部', endDate = '全部') {
  const headers = ['单号', '时间', '类型', '客户', '项目', '原价', '实收金额', '支付方式', '操作职员'];

  const rows = transactions.map(t => {
    const typeStr   = t.type === 'recharge' ? '充值' : '消费';
    const dateStr   = new Date(t.timestamp).toLocaleString('zh-CN');
    const amountStr = t.type === 'recharge' ? `+${t.amount}` : `-${t.amount}`;
    const origStr   = t.originalAmount != null ? t.originalAmount : t.amount;
    const methodStr = getPaymentMethodLabel(t.paymentMethod);

    return [
      t.id,
      `"${dateStr}"`,
      typeStr,
      `"${t.customerName}"`,
      `"${t.itemName || '-'}"`,
      origStr,
      amountStr,
      methodStr,
      t.staffId || '-',
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const filename   = `财务报表_${startDate}至${endDate}.csv`;

  return { csvContent, filename };
}

/**
 * 触发浏览器下载 CSV 文件
 *
 * @param {string} csvContent - CSV 字符串内容
 * @param {string} filename   - 文件名
 */
export function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// 统计计算
// ─────────────────────────────────────────────

/**
 * 计算今日财务统计数据
 *
 * @param {import('../types.js').Transaction[]} transactions - 全部流水
 * @param {string} [dateStr]                                 - 指定日期（默认今天）
 * @returns {{
 *   cashIncome:     number,  // 今日现金/第三方支付收入
 *   rechargeIncome: number,  // 今日充值收入
 *   balanceConsume: number,  // 今日余额消费
 *   meituanIncome:  number,  // 今日美团收入
 *   totalActual:    number,  // 今日实收（现金+充值）
 * }}
 */
export function calcDailyStats(transactions, dateStr) {
  const targetDate = dateStr || new Date().toDateString();
  const todayTrans = transactions.filter(t => {
    const d = new Date(t.timestamp).toDateString();
    return dateStr ? d === new Date(dateStr).toDateString() : d === targetDate;
  });

  const cashIncome = todayTrans.reduce((sum, t) => {
    if (t.type === 'consume' && t.paymentMethod !== PAYMENT_METHOD.BALANCE) {
      return sum + (t.amount || 0);
    }
    return sum;
  }, 0);

  const rechargeIncome = todayTrans.reduce((sum, t) => {
    return t.type === 'recharge' ? sum + (t.amount || 0) : sum;
  }, 0);

  const balanceConsume = todayTrans.reduce((sum, t) => {
    return (t.type === 'consume' && t.paymentMethod === PAYMENT_METHOD.BALANCE)
      ? sum + (t.amount || 0)
      : sum;
  }, 0);

  const meituanIncome = todayTrans.reduce((sum, t) => {
    return (t.type === 'consume' && t.paymentMethod === PAYMENT_METHOD.MEITUAN)
      ? sum + (t.amount || 0)
      : sum;
  }, 0);

  return {
    cashIncome:     parseFloat(cashIncome.toFixed(2)),
    rechargeIncome: parseFloat(rechargeIncome.toFixed(2)),
    balanceConsume: parseFloat(balanceConsume.toFixed(2)),
    meituanIncome:  parseFloat(meituanIncome.toFixed(2)),
    totalActual:    parseFloat((cashIncome + rechargeIncome).toFixed(2)),
  };
}

/**
 * 计算近 N 天的每日收入数据（用于折线图/柱状图）
 *
 * @param {import('../types.js').Transaction[]} transactions - 全部流水
 * @param {number} [days=7]                                  - 统计天数
 * @returns {{ name: string, income: number, meituan: number }[]}
 */
export function calcRecentDailyIncome(transactions, days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toDateString();

    const dayTrans = transactions.filter(
      t => t && new Date(t.timestamp).toDateString() === dateStr
    );

    const income = dayTrans.reduce((sum, t) => {
      if (t.type === 'recharge') return sum + (t.amount || 0);
      if (t.type === 'consume' && t.paymentMethod !== PAYMENT_METHOD.BALANCE) {
        return sum + (t.amount || 0);
      }
      return sum;
    }, 0);

    const meituan = dayTrans.reduce((sum, t) => {
      return (t.type === 'consume' && t.paymentMethod === PAYMENT_METHOD.MEITUAN)
        ? sum + (t.amount || 0)
        : sum;
    }, 0);

    return {
      name:    `${d.getMonth() + 1}/${d.getDate()}`,
      income:  parseFloat(income.toFixed(2)),
      meituan: parseFloat(meituan.toFixed(2)),
    };
  });
}

// ─────────────────────────────────────────────
// Supabase CRUD（纯 JS，需传入 supabaseClient）
// ─────────────────────────────────────────────

/**
 * 从 Supabase 获取流水列表（支持分页和日期过滤）
 *
 * @param {Object}  supabase          - Supabase 客户端实例
 * @param {Object}  [options]         - 查询选项
 * @param {string}  [options.startDate] - 开始日期，格式 "YYYY-MM-DD"
 * @param {string}  [options.endDate]   - 结束日期，格式 "YYYY-MM-DD"
 * @param {string}  [options.type]      - 流水类型 'consume' | 'recharge'
 * @param {string}  [options.customerId]- 按会员 ID 过滤
 * @param {number}  [options.limit=100] - 每页条数
 * @param {number}  [options.offset=0]  - 偏移量
 * @returns {Promise<import('../types.js').Transaction[]>}
 *
 * @example
 * const txns = await fetchTransactions(client, { startDate: '2026-03-01', type: 'consume' });
 */
export async function fetchTransactions(supabase, options = {}) {
  const {
    startDate,
    endDate,
    type,
    customerId,
    limit  = 100,
    offset = 0,
  } = options;

  let query = supabase
    .from('transactions')
    .select('*')
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) query = query.gte('timestamp', `${startDate}T00:00:00`);
  if (endDate)   query = query.lte('timestamp', `${endDate}T23:59:59`);
  if (type)      query = query.eq('type', type);
  if (customerId)query = query.eq('customer_id', customerId);

  const { data, error } = await query;

  if (error) {
    console.error('[Transaction] fetchTransactions error:', error.message);
    return [];
  }
  return (data || []).map(mapRowToTransaction);
}

/**
 * 向 Supabase 插入一条新流水记录
 *
 * @param {Object} supabase                                  - Supabase 客户端实例
 * @param {import('../types.js').Transaction} transaction    - 流水对象
 * @returns {Promise<import('../types.js').Transaction|null>}
 */
export async function insertTransaction(supabase, transaction) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([mapTransactionToRow(transaction)])
    .select()
    .single();

  if (error) {
    console.error('[Transaction] insertTransaction error:', error.message);
    return null;
  }
  return mapRowToTransaction(data);
}

/**
 * 从 Supabase 删除（作废）一条流水记录
 * 注意：此操作不会自动退回余额，需配合 revokeTransaction 使用
 *
 * @param {Object} supabase       - Supabase 客户端实例
 * @param {string} transactionId  - 流水 ID
 * @returns {Promise<boolean>}
 */
export async function deleteTransaction(supabase, transactionId) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) {
    console.error('[Transaction] deleteTransaction error:', error.message);
    return false;
  }
  return true;
}

/**
 * 批量插入流水记录（用于数据迁移场景）
 *
 * @param {Object} supabase                                   - Supabase 客户端实例
 * @param {import('../types.js').Transaction[]} transactions  - 流水列表
 * @returns {Promise<number>} - 成功插入的条数
 */
export async function batchInsertTransactions(supabase, transactions) {
  if (!transactions || transactions.length === 0) return 0;

  const rows = transactions.map(mapTransactionToRow);
  const { data, error } = await supabase
    .from('transactions')
    .insert(rows)
    .select();

  if (error) {
    console.error('[Transaction] batchInsertTransactions error:', error.message);
    return 0;
  }
  return (data || []).length;
}

// ─────────────────────────────────────────────
// 内部辅助：数据库行 ↔ JS 对象字段映射
// ─────────────────────────────────────────────

/**
 * 将数据库行（snake_case）映射为 JS 对象（camelCase）
 * @param {Object} row
 * @returns {import('../types.js').Transaction}
 */
function mapRowToTransaction(row) {
  return {
    id:              row.id,
    type:            row.type,
    customerId:      row.customer_id,
    customerName:    row.customer_name,
    customerCardId:  row.customer_card_id ?? undefined,
    originalAmount:  row.original_amount  ?? undefined,
    amount:          row.amount,
    paymentMethod:   row.payment_method,
    itemName:        row.item_name,
    staffId:         row.staff_id ?? undefined,
    timestamp:       row.timestamp,
  };
}

/**
 * 将 JS 对象（camelCase）映射为数据库行（snake_case）
 * @param {import('../types.js').Transaction} transaction
 * @returns {Object}
 */
function mapTransactionToRow(transaction) {
  return {
    id:               transaction.id,
    type:             transaction.type,
    customer_id:      transaction.customerId,
    customer_name:    transaction.customerName,
    customer_card_id: transaction.customerCardId ?? null,
    original_amount:  transaction.originalAmount  ?? null,
    amount:           transaction.amount,
    payment_method:   transaction.paymentMethod,
    item_name:        transaction.itemName,
    staff_id:         transaction.staffId ?? null,
    timestamp:        transaction.timestamp,
  };
}
