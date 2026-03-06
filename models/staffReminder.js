/**
 * @file models/staffReminder.js
 * @description 员工提醒模块 —— 数据结构、业务逻辑与 Supabase CRUD（纯 ES6+ JavaScript）
 *
 * 功能说明：
 *  - 生日提醒：未来 7 天内有生日的会员自动生成提醒
 *  - 沉睡唤醒：60 天未消费的会员自动生成提醒
 *  - 自定义提醒：手动创建任意内容的提醒
 *  - 标记完成：将提醒状态从 pending 改为 completed
 *
 * 可直接在浏览器 <script type="module"> 中引入使用。
 */

import { createStaffReminder, REMINDER_TYPE, REMINDER_STATUS } from '../types.js';

// ─────────────────────────────────────────────
// 本地状态辅助（兼容 React useState 和原生 JS 数组）
// ─────────────────────────────────────────────

/**
 * 生成生日提醒列表（未来 7 天内有生日的会员）
 *
 * @param {import('../types.js').Customer[]} customers      - 全部会员列表
 * @param {import('../types.js').StaffReminder[]} reminders - 已存在的提醒列表（用于去重）
 * @param {import('../types.js').Staff} currentUser         - 当前登录职员
 * @returns {import('../types.js').StaffReminder[]}          - 新生成的提醒列表（不含已存在的）
 */
export function generateBirthdayReminders(customers, reminders, currentUser) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const newReminders = [];

  customers.forEach(customer => {
    // 仅处理：有生日 + 是当前职员负责 或 当前职员是管理员
    const isAssigned =
      customer.assignedStaffId === currentUser.id ||
      currentUser.role === 'admin';

    if (!customer.birthday || !isAssigned) return;

    const bday = new Date(customer.birthday);
    // 计算本年度生日日期
    const nextBday = new Date(
      today.getFullYear(),
      bday.getMonth(),
      bday.getDate()
    );
    // 如果今年生日已过，则计算明年生日
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }

    const diffDays = Math.ceil(
      (nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 仅在 7 天内触发
    if (diffDays < 0 || diffDays > 7) return;

    // 去重：同一会员同一年度的生日提醒只生成一次
    const rid = `bday_${customer.id}_${nextBday.getFullYear()}`;
    if (reminders.find(r => r.id === rid)) return;

    const birthdayDisplay = customer.birthday.split('-').slice(1).join('-');
    newReminders.push(
      createStaffReminder({
        id:           rid,
        type:         REMINDER_TYPE.BIRTHDAY,
        content:      `顾客 ${customer.name} 将在 ${birthdayDisplay} 过生日，请提前准备惊喜！`,
        customerId:   customer.id,
        staffId:      currentUser.id,
        reminderDate: todayStr,
        status:       REMINDER_STATUS.PENDING,
        createdAt:    today.toISOString(),
      })
    );
  });

  return newReminders;
}

/**
 * 生成沉睡唤醒提醒列表（60 天未消费的会员）
 *
 * @param {import('../types.js').Customer[]} customers         - 全部会员列表
 * @param {import('../types.js').Transaction[]} transactions   - 全部交易流水
 * @param {import('../types.js').StaffReminder[]} reminders    - 已存在的提醒列表（用于去重）
 * @param {import('../types.js').Staff} currentUser            - 当前登录职员
 * @param {number} [dormantDays=60]                            - 沉睡天数阈值（默认 60 天）
 * @returns {import('../types.js').StaffReminder[]}             - 新生成的提醒列表
 */
export function generateDormantReminders(
  customers,
  transactions,
  reminders,
  currentUser,
  dormantDays = 60
) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const newReminders = [];

  customers.forEach(customer => {
    const isAssigned =
      customer.assignedStaffId === currentUser.id ||
      currentUser.role === 'admin';

    if (!isAssigned) return;

    // 筛选该会员的所有消费记录
    const custConsumeList = transactions.filter(
      t => t.customerId === customer.id && t.type === 'consume'
    );

    // 没有任何消费记录则跳过（新会员不算沉睡）
    if (custConsumeList.length === 0) return;

    // 找出最近一次消费时间
    const lastTransTime = Math.max(
      ...custConsumeList.map(t => new Date(t.timestamp).getTime())
    );
    const lastTrans = new Date(lastTransTime);
    const diffDays = Math.ceil(
      (today.getTime() - lastTrans.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < dormantDays) return;

    // 去重：以最后一次消费日期为 key，避免重复提醒
    const lastTransDateStr = lastTrans.toISOString().split('T')[0];
    const rid = `dormant_${customer.id}_${lastTransDateStr}`;
    if (reminders.find(r => r.id === rid)) return;

    newReminders.push(
      createStaffReminder({
        id:           rid,
        type:         REMINDER_TYPE.DORMANT,
        content:      `顾客 ${customer.name} 已有 ${diffDays} 天未到店消费，建议进行回访。`,
        customerId:   customer.id,
        staffId:      currentUser.id,
        reminderDate: todayStr,
        status:       REMINDER_STATUS.PENDING,
        createdAt:    today.toISOString(),
      })
    );
  });

  return newReminders;
}

/**
 * 创建一条自定义提醒
 *
 * @param {string} content    - 提醒内容
 * @param {string} customerId - 关联会员 ID
 * @param {string} staffId    - 关联职员 ID
 * @param {string} [date]     - 提醒日期（默认今天，格式 "YYYY-MM-DD"）
 * @returns {import('../types.js').StaffReminder}
 */
export function createCustomReminder(content, customerId, staffId, date) {
  return createStaffReminder({
    type:         REMINDER_TYPE.CUSTOM,
    content,
    customerId,
    staffId,
    reminderDate: date ?? new Date().toISOString().split('T')[0],
    status:       REMINDER_STATUS.PENDING,
  });
}

/**
 * 将指定提醒标记为已完成
 *
 * @param {import('../types.js').StaffReminder[]} reminders - 提醒列表
 * @param {string} reminderId                               - 要标记的提醒 ID
 * @returns {import('../types.js').StaffReminder[]}          - 更新后的提醒列表（不可变）
 */
export function markReminderDone(reminders, reminderId) {
  return reminders.map(r =>
    r.id === reminderId
      ? { ...r, status: REMINDER_STATUS.COMPLETED }
      : r
  );
}

/**
 * 批量合并新提醒到现有提醒列表（去重）
 *
 * @param {import('../types.js').StaffReminder[]} existing - 现有提醒列表
 * @param {import('../types.js').StaffReminder[]} incoming - 新生成的提醒列表
 * @returns {import('../types.js').StaffReminder[]}         - 合并后的提醒列表
 */
export function mergeReminders(existing, incoming) {
  if (!incoming || incoming.length === 0) return existing;
  const existingIds = new Set(existing.map(r => r.id));
  const filtered = incoming.filter(r => !existingIds.has(r.id));
  return [...existing, ...filtered];
}

/**
 * 自动扫描并生成所有类型提醒（生日 + 沉睡），一次性调用
 *
 * @param {import('../types.js').Customer[]} customers
 * @param {import('../types.js').Transaction[]} transactions
 * @param {import('../types.js').StaffReminder[]} reminders
 * @param {import('../types.js').Staff} currentUser
 * @returns {import('../types.js').StaffReminder[]} - 合并后的完整提醒列表
 */
export function autoGenerateReminders(customers, transactions, reminders, currentUser) {
  if (!currentUser) return reminders;

  const birthdayNew = generateBirthdayReminders(customers, reminders, currentUser);
  const dormantNew  = generateDormantReminders(customers, transactions, reminders, currentUser);

  return mergeReminders(reminders, [...birthdayNew, ...dormantNew]);
}

// ─────────────────────────────────────────────
// Supabase CRUD（纯 JS，需传入 supabaseClient）
// ─────────────────────────────────────────────

/**
 * 从 Supabase 获取指定职员的所有提醒
 *
 * @param {Object} supabase   - Supabase 客户端实例（由调用方传入）
 * @param {string} staffId    - 职员 ID
 * @returns {Promise<import('../types.js').StaffReminder[]>}
 *
 * @example
 * const { createClient } = supabase;
 * const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 * const reminders = await fetchReminders(client, 'STF-001');
 */
export async function fetchReminders(supabase, staffId) {
  const { data, error } = await supabase
    .from('staff_reminders')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[StaffReminder] fetchReminders error:', error.message);
    return [];
  }
  // 将数据库下划线字段映射为驼峰字段
  return (data || []).map(mapRowToReminder);
}

/**
 * 向 Supabase 插入一条新提醒
 *
 * @param {Object} supabase                              - Supabase 客户端实例
 * @param {import('../types.js').StaffReminder} reminder - 提醒对象
 * @returns {Promise<import('../types.js').StaffReminder|null>}
 */
export async function insertReminder(supabase, reminder) {
  const { data, error } = await supabase
    .from('staff_reminders')
    .insert([mapReminderToRow(reminder)])
    .select()
    .single();

  if (error) {
    console.error('[StaffReminder] insertReminder error:', error.message);
    return null;
  }
  return mapRowToReminder(data);
}

/**
 * 更新 Supabase 中提醒的状态（标记为已完成）
 *
 * @param {Object} supabase   - Supabase 客户端实例
 * @param {string} reminderId - 提醒 ID
 * @param {string} status     - 新状态，参见 REMINDER_STATUS 枚举
 * @returns {Promise<boolean>} - 是否更新成功
 */
export async function updateReminderStatus(supabase, reminderId, status) {
  const { error } = await supabase
    .from('staff_reminders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', reminderId);

  if (error) {
    console.error('[StaffReminder] updateReminderStatus error:', error.message);
    return false;
  }
  return true;
}

/**
 * 从 Supabase 删除一条提醒
 *
 * @param {Object} supabase   - Supabase 客户端实例
 * @param {string} reminderId - 提醒 ID
 * @returns {Promise<boolean>}
 */
export async function deleteReminder(supabase, reminderId) {
  const { error } = await supabase
    .from('staff_reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    console.error('[StaffReminder] deleteReminder error:', error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// 内部辅助：数据库行 ↔ JS 对象字段映射
// ─────────────────────────────────────────────

/**
 * 将数据库行（snake_case）映射为 JS 对象（camelCase）
 * @param {Object} row
 * @returns {import('../types.js').StaffReminder}
 */
function mapRowToReminder(row) {
  return {
    id:           row.id,
    type:         row.type,
    content:      row.content,
    customerId:   row.customer_id,
    staffId:      row.staff_id,
    reminderDate: row.reminder_date,
    status:       row.status,
    createdAt:    row.created_at,
  };
}

/**
 * 将 JS 对象（camelCase）映射为数据库行（snake_case）
 * @param {import('../types.js').StaffReminder} reminder
 * @returns {Object}
 */
function mapReminderToRow(reminder) {
  return {
    id:            reminder.id,
    type:          reminder.type,
    content:       reminder.content,
    customer_id:   reminder.customerId,
    staff_id:      reminder.staffId,
    reminder_date: reminder.reminderDate,
    status:        reminder.status,
    created_at:    reminder.createdAt,
  };
}
