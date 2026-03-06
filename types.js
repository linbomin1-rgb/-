/**
 * @file types.js
 * @description 美业门店管理系统 —— 全局数据结构定义（纯 ES6+ JavaScript）
 * 本文件使用 JSDoc 注释替代 TypeScript interface / type，
 * 可直接在 <script> 标签或 .js 文件中引入，无需任何编译步骤。
 */

// ─────────────────────────────────────────────
// 角色常量（替代 type Role = 'admin' | 'staff'）
// ─────────────────────────────────────────────
/**
 * 系统角色枚举
 * @readonly
 * @enum {string}
 */
export const ROLE = {
  ADMIN: 'admin',
  STAFF: 'staff',
};

// ─────────────────────────────────────────────
// 支付方式常量（替代联合类型 paymentMethod）
// ─────────────────────────────────────────────
/**
 * 支付方式枚举
 * @readonly
 * @enum {string}
 */
export const PAYMENT_METHOD = {
  BALANCE:        'balance',        // 余额支付
  CASH:           'cash',           // 现金
  WECHAT:         'wechat',         // 微信支付
  ALIPAY:         'alipay',         // 支付宝
  PROMOTION_CARD: 'promotion_card', // 活动卡抵扣
  MEITUAN:        'meituan',        // 美团支付
};

// ─────────────────────────────────────────────
// 预约状态常量
// ─────────────────────────────────────────────
/**
 * 预约状态枚举
 * @readonly
 * @enum {string}
 */
export const APPT_STATUS = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ─────────────────────────────────────────────
// 提醒类型常量
// ─────────────────────────────────────────────
/**
 * 员工提醒类型枚举
 * @readonly
 * @enum {string}
 */
export const REMINDER_TYPE = {
  BIRTHDAY: 'birthday',
  DORMANT:  'dormant',
  CUSTOM:   'custom',
};

// ─────────────────────────────────────────────
// 提醒状态常量
// ─────────────────────────────────────────────
/**
 * 提醒状态枚举
 * @readonly
 * @enum {string}
 */
export const REMINDER_STATUS = {
  PENDING:   'pending',
  COMPLETED: 'completed',
};

// ─────────────────────────────────────────────
// 性别常量
// ─────────────────────────────────────────────
/**
 * 性别枚举
 * @readonly
 * @enum {string}
 */
export const GENDER = {
  MALE:   'male',
  FEMALE: 'female',
  OTHER:  'other',
};

// ─────────────────────────────────────────────
// 撤销操作类型常量
// ─────────────────────────────────────────────
/**
 * 撤销操作类型枚举
 * @readonly
 * @enum {string}
 */
export const UNDO_TYPE = {
  ADD_CUSTOMER:      'add_customer',
  RECHARGE:          'recharge',
  CONSUME:           'consume',
  ADD_APPT:          'add_appt',
  UPDATE_APPT:       'update_appt',
  ADD_PROMOTION:     'add_promotion',
  ADD_CUSTOMER_CARD: 'add_customer_card',
};

// ─────────────────────────────────────────────
// JSDoc 数据结构定义（文档用途，无运行时开销）
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Staff
 * @property {string}   id          - 职员唯一 ID，格式 "STF-{timestamp}"
 * @property {string}   name        - 职员姓名
 * @property {string}   role        - 职位/角色描述，如 "总店长"、"技师"
 * @property {string}   [password]  - 登录密码（可选，存储时建议加密）
 * @property {string}   avatar      - 头像字符（通常取姓名首字）
 * @property {string[]} permissions - 权限列表，如 ['all'] 或 ['dashboard','appts']
 */

/**
 * @typedef {Object} Customer
 * @property {string}   id               - 会员唯一 ID，格式 "C-{timestamp}"
 * @property {string}   name             - 会员姓名
 * @property {string}   phone            - 手机号码
 * @property {number}   balance          - 账户余额（单位：元）
 * @property {string}   remarks          - 备注信息
 * @property {string}   createdAt        - 创建时间（ISO 8601 字符串）
 * @property {string}   [gender]         - 性别，参见 GENDER 枚举
 * @property {string}   [birthday]       - 生日，格式 "YYYY-MM-DD"
 * @property {string}   [source]         - 客户来源，如 "美团"、"转介绍"
 * @property {string[]} [tags]           - 标签列表，如 ['VIP','敏感肌']
 * @property {string}   [assignedStaffId]- 负责员工 ID（专属客服）
 */

/**
 * @typedef {Object} StaffReminder
 * @property {string} id           - 提醒唯一 ID
 * @property {string} type         - 提醒类型，参见 REMINDER_TYPE 枚举
 * @property {string} content      - 提醒正文内容
 * @property {string} customerId   - 关联的会员 ID
 * @property {string} staffId      - 关联的职员 ID
 * @property {string} reminderDate - 提醒日期，格式 "YYYY-MM-DD"
 * @property {string} status       - 处理状态，参见 REMINDER_STATUS 枚举
 * @property {string} createdAt    - 创建时间（ISO 8601 字符串）
 */

/**
 * @typedef {Object} Appointment
 * @property {string}      id           - 预约唯一 ID，格式 "APT-{timestamp}"
 * @property {string|null} customerId   - 关联会员 ID（散客为 null）
 * @property {string}      customerName - 客户姓名（冗余字段，便于展示）
 * @property {string}      staffId      - 服务技师 ID
 * @property {string}      projectName  - 服务项目名称
 * @property {string}      startTime    - 开始时间（ISO 8601 字符串）
 * @property {number}      startHour    - 开始小时（8~22 整数）
 * @property {number}      duration     - 时长（小时数，支持小数）
 * @property {string}      status       - 预约状态，参见 APPT_STATUS 枚举
 * @property {string}      [note]       - 备注（可选）
 */

/**
 * @typedef {Object} Promotion
 * @property {string} id           - 活动唯一 ID
 * @property {string} name         - 活动名称
 * @property {number} discountRate - 折扣率（0~1，如 0.8 表示 8 折）
 * @property {string} createdAt    - 创建时间（ISO 8601 字符串）
 */

/**
 * @typedef {Object} CustomerCard
 * @property {string} id          - 活动卡唯一 ID
 * @property {string} customerId  - 关联会员 ID
 * @property {string} promotionId - 关联活动 ID
 * @property {number} balance     - 卡内余额（单位：元）
 * @property {string} createdAt   - 创建时间（ISO 8601 字符串）
 */

/**
 * @typedef {Object} Transaction
 * @property {string}      id              - 流水唯一 ID，格式 "TRX-{timestamp}"
 * @property {string}      type            - 类型：'consume'（消费）| 'recharge'（充值）
 * @property {string|null} customerId      - 关联会员 ID（散客为 null）
 * @property {string}      customerName    - 客户姓名（冗余字段）
 * @property {string}      [customerCardId]- 使用的活动卡 ID（可选）
 * @property {number}      [originalAmount]- 消费原价（仅 consume + promotion_card 时存在）
 * @property {number}      amount          - 实际扣款/充值金额（单位：元）
 * @property {string}      paymentMethod   - 支付方式，参见 PAYMENT_METHOD 枚举
 * @property {string}      itemName        - 服务项目或充值说明
 * @property {string}      [staffId]       - 操作职员 ID（可选）
 * @property {string}      timestamp       - 交易时间（ISO 8601 字符串）
 */

/**
 * @typedef {Object} UndoData
 * @property {string} type            - 撤销操作类型，参见 UNDO_TYPE 枚举
 * @property {string} targetId        - 主操作对象 ID
 * @property {string} [secondaryId]   - 关联对象 ID（如交易关联的客户 ID）
 * @property {string} [customerCardId]- 活动卡 ID（消费撤销时使用）
 * @property {number} [amount]        - 金额（财务撤销时使用）
 * @property {number} [originalAmount]- 原始金额
 * @property {string} [prevStatus]    - 撤销前的状态（用于预约状态回滚）
 * @property {string} [paymentMethod] - 支付方式（撤销时判断余额退回逻辑）
 */

/**
 * @typedef {Object} SystemLog
 * @property {string}    id         - 日志唯一 ID，格式 "LOG-{timestamp}"
 * @property {string}    operator   - 操作人姓名
 * @property {string}    action     - 操作动作描述，如 "充值"、"消费结算"
 * @property {string}    detail     - 操作详情
 * @property {string}    timestamp  - 操作时间（ISO 8601 字符串）
 * @property {UndoData}  [undoData] - 撤销数据（可选，支持回滚的操作才有）
 * @property {boolean}   [isRevoked]- 是否已被撤销
 */

// ─────────────────────────────────────────────
// 工厂函数：创建各类数据对象（替代 new Class()）
// ─────────────────────────────────────────────

/**
 * 创建一个 Staff 对象
 * @param {Partial<Staff>} fields
 * @returns {Staff}
 */
export function createStaff(fields = {}) {
  return {
    id:          fields.id          ?? `STF-${Date.now()}`,
    name:        fields.name        ?? '',
    role:        fields.role        ?? '',
    password:    fields.password    ?? '',
    avatar:      fields.avatar      ?? (fields.name ? fields.name[0] : '?'),
    permissions: fields.permissions ?? ['all'],
  };
}

/**
 * 创建一个 Customer 对象
 * @param {Partial<Customer>} fields
 * @returns {Customer}
 */
export function createCustomer(fields = {}) {
  return {
    id:               fields.id               ?? `C-${Date.now()}`,
    name:             fields.name             ?? '',
    phone:            fields.phone            ?? '',
    balance:          fields.balance          ?? 0,
    remarks:          fields.remarks          ?? '',
    createdAt:        fields.createdAt        ?? new Date().toISOString(),
    gender:           fields.gender           ?? GENDER.FEMALE,
    birthday:         fields.birthday         ?? '',
    source:           fields.source           ?? '',
    tags:             fields.tags             ?? [],
    assignedStaffId:  fields.assignedStaffId  ?? '',
  };
}

/**
 * 创建一个 StaffReminder 对象
 * @param {Partial<StaffReminder>} fields
 * @returns {StaffReminder}
 */
export function createStaffReminder(fields = {}) {
  return {
    id:           fields.id           ?? `RMD-${Date.now()}`,
    type:         fields.type         ?? REMINDER_TYPE.CUSTOM,
    content:      fields.content      ?? '',
    customerId:   fields.customerId   ?? '',
    staffId:      fields.staffId      ?? '',
    reminderDate: fields.reminderDate ?? new Date().toISOString().split('T')[0],
    status:       fields.status       ?? REMINDER_STATUS.PENDING,
    createdAt:    fields.createdAt    ?? new Date().toISOString(),
  };
}

/**
 * 创建一个 Appointment 对象
 * @param {Partial<Appointment>} fields
 * @returns {Appointment}
 */
export function createAppointment(fields = {}) {
  return {
    id:           fields.id           ?? `APT-${Date.now()}`,
    customerId:   fields.customerId   ?? null,
    customerName: fields.customerName ?? '',
    staffId:      fields.staffId      ?? '',
    projectName:  fields.projectName  ?? '',
    startTime:    fields.startTime    ?? new Date().toISOString(),
    startHour:    fields.startHour    ?? 10,
    duration:     fields.duration     ?? 1,
    status:       fields.status       ?? APPT_STATUS.PENDING,
    note:         fields.note         ?? '',
  };
}

/**
 * 创建一个 Promotion 对象
 * @param {Partial<Promotion>} fields
 * @returns {Promotion}
 */
export function createPromotion(fields = {}) {
  return {
    id:           fields.id           ?? `PRO-${Date.now()}`,
    name:         fields.name         ?? '',
    discountRate: fields.discountRate ?? 1,
    createdAt:    fields.createdAt    ?? new Date().toISOString(),
  };
}

/**
 * 创建一个 CustomerCard 对象
 * @param {Partial<CustomerCard>} fields
 * @returns {CustomerCard}
 */
export function createCustomerCard(fields = {}) {
  return {
    id:          fields.id          ?? `CARD-${Date.now()}`,
    customerId:  fields.customerId  ?? '',
    promotionId: fields.promotionId ?? '',
    balance:     fields.balance     ?? 0,
    createdAt:   fields.createdAt   ?? new Date().toISOString(),
  };
}

/**
 * 创建一个 Transaction 对象
 * @param {Partial<Transaction>} fields
 * @returns {Transaction}
 */
export function createTransaction(fields = {}) {
  return {
    id:              fields.id              ?? `TRX-${Date.now()}`,
    type:            fields.type            ?? 'consume',
    customerId:      fields.customerId      ?? null,
    customerName:    fields.customerName    ?? '',
    customerCardId:  fields.customerCardId  ?? undefined,
    originalAmount:  fields.originalAmount  ?? undefined,
    amount:          fields.amount          ?? 0,
    paymentMethod:   fields.paymentMethod   ?? PAYMENT_METHOD.CASH,
    itemName:        fields.itemName        ?? '',
    staffId:         fields.staffId         ?? undefined,
    timestamp:       fields.timestamp       ?? new Date().toISOString(),
  };
}

/**
 * 创建一个 SystemLog 对象
 * @param {Partial<SystemLog>} fields
 * @returns {SystemLog}
 */
export function createSystemLog(fields = {}) {
  return {
    id:        fields.id        ?? `LOG-${Date.now()}`,
    operator:  fields.operator  ?? '系统',
    action:    fields.action    ?? '',
    detail:    fields.detail    ?? '',
    timestamp: fields.timestamp ?? new Date().toISOString(),
    undoData:  fields.undoData  ?? undefined,
    isRevoked: fields.isRevoked ?? false,
  };
}
