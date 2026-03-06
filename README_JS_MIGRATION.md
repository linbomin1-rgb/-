# JavaScript 降级迁移说明

## 概述

本次迁移将系统中所有 TypeScript 数据结构和核心逻辑，全部改写为**纯原生 JavaScript (ES6+)**，彻底移除所有 TS 特性，输出可直接在浏览器 `<script type="module">` 标签或 `.js` 文件中运行的代码。

---

## 文件清单

| 文件路径 | 说明 | 替代原文件 |
|---|---|---|
| `types.js` | 全局数据结构定义（JSDoc + 工厂函数） | `types.ts` |
| `models/staffReminder.js` | 员工提醒业务逻辑 + Supabase CRUD | `App.tsx` 内联逻辑 |
| `models/appointment.js` | 预约管理业务逻辑 + Supabase CRUD | `App.tsx` 内联逻辑 |
| `models/transaction.js` | 财务流水业务逻辑 + Supabase CRUD | `App.tsx` 内联逻辑 |
| `services/geminiService.js` | AI 经营诊断服务 | `services/geminiService.ts` |
| `services/supabaseService.js` | Supabase 客户端初始化 + 通用 CRUD + 数据迁移 | 新增 |

---

## 改写原则

### 1. 移除所有 TypeScript 特性

| TypeScript 写法 | 改写后的 JavaScript 写法 |
|---|---|
| `interface Staff { id: string; }` | `/** @typedef {Object} Staff @property {string} id */` |
| `type Role = 'admin' \| 'staff'` | `export const ROLE = { ADMIN: 'admin', STAFF: 'staff' }` |
| `const fn = (x: string): number => {}` | `const fn = (x) => {}` + JSDoc 注释 |
| `useState<Staff \| null>(null)` | `useState(null)` |
| `as Appointment` | 直接赋值，无需类型断言 |
| `?.` 可选链 | 保留（ES2020 原生支持） |
| `??` 空值合并 | 保留（ES2020 原生支持） |

### 2. 用 JSDoc 标注数据结构

所有 `interface` 和 `type` 均改用 JSDoc `@typedef` 注释，保留完整的字段说明和类型信息，便于 IDE 智能提示：

```js
/**
 * @typedef {Object} Transaction
 * @property {string}      id            - 流水唯一 ID
 * @property {string}      type          - 'consume' | 'recharge'
 * @property {string|null} customerId    - 关联会员 ID
 * @property {number}      amount        - 实际金额（元）
 * @property {string}      paymentMethod - 支付方式
 * @property {string}      timestamp     - ISO 8601 时间字符串
 */
```

### 3. 工厂函数替代 Class/Interface

每种数据结构提供对应的工厂函数，替代 TypeScript 的 `new` 实例化：

```js
// 创建一条交易记录
const tx = createTransaction({
  type:          'consume',
  customerId:    'C-001',
  customerName:  '张三',
  amount:        188,
  paymentMethod: PAYMENT_METHOD.MEITUAN,
  itemName:      '美团套餐·精油按摩',
});
```

---

## 核心模块说明

### `models/staffReminder.js` — 员工提醒

```js
import {
  autoGenerateReminders,  // 自动扫描生成生日+沉睡提醒
  markReminderDone,       // 标记提醒已完成
  createCustomReminder,   // 创建自定义提醒
  fetchReminders,         // Supabase 查询
  insertReminder,         // Supabase 新增
  updateReminderStatus,   // Supabase 更新状态
  deleteReminder,         // Supabase 删除
} from './models/staffReminder.js';

// 自动生成提醒（在 useEffect 中调用）
const updatedReminders = autoGenerateReminders(customers, transactions, reminders, currentUser);
```

### `models/appointment.js` — 预约管理

```js
import {
  addAppointment,         // 新增预约（含冲突校验）
  updateApptStatus,       // 更新预约状态
  voidAppointment,        // 作废删除预约
  checkApptConflict,      // 检测时间冲突
  buildScheduleGrid,      // 构建排班视图数据
  fetchAppointments,      // Supabase 查询
  insertAppointment,      // Supabase 新增
  updateAppointmentStatus,// Supabase 更新状态
  deleteAppointment,      // Supabase 删除
} from './models/appointment.js';

// 新增预约
const { success, appointment, error } = addAppointment(appointments, {
  customerId:   'C-001',
  customerName: '李四',
  staffId:      'STF-002',
  projectName:  '头皮护理',
  dateStr:      '2026-03-10',
  startHour:    14,
  duration:     1.5,
});
```

### `models/transaction.js` — 财务流水

```js
import {
  recharge,                    // 充值
  consume,                     // 消费结算（支持6种支付方式）
  processMeituanOrder,         // 美团订单专项处理
  analyzeCustomerProfile,      // 单客户画像分析
  analyzeAllCustomerProfiles,  // 批量客户画像
  revokeTransaction,           // 流水撤销回滚
  exportTransactionsToCsv,     // 导出 CSV
  downloadCsv,                 // 触发浏览器下载
  calcDailyStats,              // 今日财务统计
  calcRecentDailyIncome,       // 近N天收入趋势
  CUSTOMER_VALUE_LEVEL,        // 客户价值等级枚举
  fetchTransactions,           // Supabase 查询
  insertTransaction,           // Supabase 新增
  deleteTransaction,           // Supabase 删除
  batchInsertTransactions,     // Supabase 批量插入
} from './models/transaction.js';

// 美团支付结算
const { success, transaction } = processMeituanOrder(
  customers,
  null,             // 散客传 null
  '王五',
  '美团精油套餐',
  298,              // 美团标价
  268,              // 门店实收（扣除佣金）
  'STF-001',
  'MT20260306001'   // 美团订单号
);

// 客户画像分析
const profile = analyzeCustomerProfile(customer, transactions);
console.log(profile.valueLevel);     // 'VIP' | 'REGULAR' | 'CASUAL' | 'DORMANT' | 'NEW'
console.log(profile.favoriteProject); // '精油按摩'
console.log(profile.monthlyAvg);      // 月均消费金额
```

### `services/supabaseService.js` — Supabase 综合服务

```js
import { initSupabase, migrateLocalDataToSupabase } from './services/supabaseService.js';

// 初始化客户端
const client = initSupabase('https://xxx.supabase.co', 'your-anon-key');

// 一键迁移 localStorage 数据到 Supabase
const result = await migrateLocalDataToSupabase(client);
console.log(`迁移完成：${result.migrated.customers} 个会员，${result.migrated.transactions} 条流水`);
```

---

## Supabase 数据库表结构参考

```sql
-- 会员表
CREATE TABLE customers (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  phone             TEXT,
  balance           NUMERIC DEFAULT 0,
  remarks           TEXT DEFAULT '',
  gender            TEXT DEFAULT 'female',
  birthday          DATE,
  source            TEXT,
  tags              TEXT[] DEFAULT '{}',
  assigned_staff_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 预约表
CREATE TABLE appointments (
  id            TEXT PRIMARY KEY,
  customer_id   TEXT,
  customer_name TEXT NOT NULL,
  staff_id      TEXT NOT NULL,
  project_name  TEXT NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  start_hour    INTEGER NOT NULL,
  duration      NUMERIC NOT NULL,
  status        TEXT DEFAULT 'pending',
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 流水表
CREATE TABLE transactions (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  customer_id      TEXT,
  customer_name    TEXT NOT NULL,
  customer_card_id TEXT,
  original_amount  NUMERIC,
  amount           NUMERIC NOT NULL,
  payment_method   TEXT NOT NULL,
  item_name        TEXT,
  staff_id         TEXT,
  timestamp        TIMESTAMPTZ DEFAULT NOW()
);

-- 员工提醒表
CREATE TABLE staff_reminders (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,
  content       TEXT NOT NULL,
  customer_id   TEXT,
  staff_id      TEXT NOT NULL,
  reminder_date DATE,
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 余额原子更新 RPC（可选，提升并发安全性）
CREATE OR REPLACE FUNCTION increment_customer_balance(p_customer_id TEXT, p_delta NUMERIC)
RETURNS void AS $$
  UPDATE customers SET balance = GREATEST(0, balance + p_delta) WHERE id = p_customer_id;
$$ LANGUAGE sql;
```

---

## 浏览器直接使用示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <!-- 引入 Supabase CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
</head>
<body>
  <script type="module">
    import { initSupabase, fetchCustomers } from './services/supabaseService.js';
    import { recharge, consume, PAYMENT_METHOD } from './models/transaction.js';
    import { autoGenerateReminders } from './models/staffReminder.js';

    // 初始化
    const client = initSupabase('https://xxx.supabase.co', 'anon-key');

    // 查询会员
    const customers = await fetchCustomers(client);
    console.log('会员列表:', customers);

    // 美团充值
    const { success, transaction } = recharge(
      customers, 'C-001', '200', PAYMENT_METHOD.MEITUAN, 'STF-001', '美团充值'
    );
  </script>
</body>
</html>
```
