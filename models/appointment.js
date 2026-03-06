/**
 * @file models/appointment.js
 * @description 预约管理模块 —— 数据结构、业务逻辑与 Supabase CRUD（纯 ES6+ JavaScript）
 *
 * 功能说明：
 *  - 新增预约：校验时间冲突，创建预约对象
 *  - 确认/取消/完成预约：状态流转管理
 *  - 作废删除：从列表中彻底移除预约
 *  - 排班视图：按日期、按技师过滤预约列表
 *  - Supabase CRUD：增删改查完整实现
 *
 * 可直接在浏览器 <script type="module"> 中引入使用。
 */

import { createAppointment, APPT_STATUS } from '../types.js';

// ─────────────────────────────────────────────
// 预约业务逻辑
// ─────────────────────────────────────────────

/**
 * 检查新预约是否与现有预约存在时间冲突
 * 冲突条件：同一技师、同一天、时间段重叠
 *
 * @param {import('../types.js').Appointment[]} appointments - 现有预约列表
 * @param {string} staffId       - 技师 ID
 * @param {string} dateStr       - 日期字符串，格式 "YYYY-MM-DD"
 * @param {number} startHour     - 开始小时（整数，如 10）
 * @param {number} duration      - 时长（小时，支持小数，如 1.5）
 * @param {string} [excludeId]   - 排除的预约 ID（编辑时使用）
 * @returns {{ conflict: boolean, conflictAppt: import('../types.js').Appointment|null }}
 */
export function checkApptConflict(
  appointments,
  staffId,
  dateStr,
  startHour,
  duration,
  excludeId
) {
  const endHour = startHour + duration;

  const conflictAppt = appointments.find(appt => {
    // 跳过自身（编辑场景）
    if (excludeId && appt.id === excludeId) return false;
    // 跳过已取消/已作废的预约
    if (appt.status === APPT_STATUS.CANCELLED) return false;
    // 必须是同一技师
    if (appt.staffId !== staffId) return false;
    // 必须是同一天
    const apptDate = appt.startTime.split('T')[0];
    if (apptDate !== dateStr) return false;

    // 时间段重叠检测：[startHour, endHour) 与 [appt.startHour, appt.startHour + appt.duration)
    const apptEnd = appt.startHour + appt.duration;
    return startHour < apptEnd && endHour > appt.startHour;
  }) || null;

  return {
    conflict:     conflictAppt !== null,
    conflictAppt,
  };
}

/**
 * 新增预约（含冲突校验）
 *
 * @param {import('../types.js').Appointment[]} appointments - 现有预约列表
 * @param {Object} params                                    - 预约参数
 * @param {string|null} params.customerId    - 会员 ID（散客传 null）
 * @param {string}      params.customerName  - 客户姓名
 * @param {string}      params.staffId       - 技师 ID
 * @param {string}      params.projectName   - 服务项目
 * @param {string}      params.dateStr       - 日期，格式 "YYYY-MM-DD"
 * @param {number}      params.startHour     - 开始小时（8~22）
 * @param {number}      params.duration      - 时长（小时）
 * @param {string}      [params.note]        - 备注
 * @returns {{ success: boolean, appointment: import('../types.js').Appointment|null, error: string|null }}
 */
export function addAppointment(appointments, params) {
  const {
    customerId,
    customerName,
    staffId,
    projectName,
    dateStr,
    startHour,
    duration,
    note,
  } = params;

  // 基础校验
  if (!customerName) return { success: false, appointment: null, error: '请填写客户姓名' };
  if (!staffId)      return { success: false, appointment: null, error: '请选择服务技师' };
  if (!projectName)  return { success: false, appointment: null, error: '请填写服务项目' };
  if (startHour < 8 || startHour > 22) {
    return { success: false, appointment: null, error: '预约时间须在 08:00 ~ 22:00 之间' };
  }

  // 冲突检测
  const { conflict, conflictAppt } = checkApptConflict(
    appointments,
    staffId,
    dateStr,
    startHour,
    duration
  );
  if (conflict) {
    return {
      success:     false,
      appointment: null,
      error:       `该技师在 ${conflictAppt.startHour}:00 已有预约「${conflictAppt.projectName}」，请调整时间`,
    };
  }

  // 构建 ISO 时间字符串
  const startTime = `${dateStr}T${String(startHour).padStart(2, '0')}:00:00`;

  const newAppt = createAppointment({
    customerId,
    customerName,
    staffId,
    projectName,
    startTime,
    startHour,
    duration,
    note:   note ?? '',
    status: APPT_STATUS.PENDING,
  });

  return {
    success:     true,
    appointment: newAppt,
    error:       null,
  };
}

/**
 * 更新预约状态
 *
 * @param {import('../types.js').Appointment[]} appointments - 现有预约列表
 * @param {string} apptId                                    - 预约 ID
 * @param {string} newStatus                                 - 新状态，参见 APPT_STATUS 枚举
 * @returns {import('../types.js').Appointment[]}             - 更新后的列表（不可变）
 */
export function updateApptStatus(appointments, apptId, newStatus) {
  return appointments.map(a =>
    a.id === apptId ? { ...a, status: newStatus } : a
  );
}

/**
 * 作废并删除预约
 *
 * @param {import('../types.js').Appointment[]} appointments - 现有预约列表
 * @param {string} apptId                                    - 要删除的预约 ID
 * @returns {import('../types.js').Appointment[]}             - 删除后的列表（不可变）
 */
export function voidAppointment(appointments, apptId) {
  return appointments.filter(a => a.id !== apptId);
}

/**
 * 获取指定日期的预约列表（按开始时间升序排列）
 *
 * @param {import('../types.js').Appointment[]} appointments - 全部预约列表
 * @param {string} dateStr                                   - 日期，格式 "YYYY-MM-DD"
 * @returns {import('../types.js').Appointment[]}
 */
export function getApptsByDate(appointments, dateStr) {
  return appointments
    .filter(a => a.startTime.startsWith(dateStr))
    .sort((a, b) => a.startHour - b.startHour);
}

/**
 * 获取指定技师在指定日期的预约列表
 *
 * @param {import('../types.js').Appointment[]} appointments - 全部预约列表
 * @param {string} staffId                                   - 技师 ID
 * @param {string} dateStr                                   - 日期，格式 "YYYY-MM-DD"
 * @returns {import('../types.js').Appointment[]}
 */
export function getApptsByStaffAndDate(appointments, staffId, dateStr) {
  return appointments
    .filter(a => a.staffId === staffId && a.startTime.startsWith(dateStr))
    .sort((a, b) => a.startHour - b.startHour);
}

/**
 * 获取所有待确认的预约（按时间升序）
 *
 * @param {import('../types.js').Appointment[]} appointments
 * @returns {import('../types.js').Appointment[]}
 */
export function getPendingAppts(appointments) {
  return appointments
    .filter(a => a.status === APPT_STATUS.PENDING)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

/**
 * 搜索预约（按客户姓名或项目名称模糊匹配）
 *
 * @param {import('../types.js').Appointment[]} appointments - 全部预约列表
 * @param {string} keyword                                   - 搜索关键词
 * @returns {import('../types.js').Appointment[]}
 */
export function searchAppointments(appointments, keyword) {
  if (!keyword || !keyword.trim()) return appointments;
  const kw = keyword.trim().toLowerCase();
  return appointments.filter(
    a =>
      a.customerName.toLowerCase().includes(kw) ||
      a.projectName.toLowerCase().includes(kw)
  );
}

/**
 * 获取排班视图数据：将预约按技师分组，并计算每个时间格的占位信息
 *
 * @param {import('../types.js').Appointment[]} appointments - 指定日期的预约列表
 * @param {import('../types.js').Staff[]} staffList          - 技师列表
 * @param {number} [startHour=8]                             - 排班开始小时
 * @param {number} [endHour=22]                              - 排班结束小时
 * @returns {Object[]} - 每个技师的排班格数据
 */
export function buildScheduleGrid(appointments, staffList, startHour = 8, endHour = 22) {
  return staffList.map(staff => {
    const staffAppts = appointments.filter(a => a.staffId === staff.id);
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i
    );

    const slots = hours.map(hour => {
      const appt = staffAppts.find(
        a => a.startHour <= hour && hour < a.startHour + a.duration
      );
      return {
        hour,
        appt:      appt || null,
        isStart:   appt ? appt.startHour === hour : false,
        isBusy:    !!appt,
      };
    });

    return {
      staff,
      slots,
      totalAppts: staffAppts.length,
    };
  });
}

// ─────────────────────────────────────────────
// Supabase CRUD（纯 JS，需传入 supabaseClient）
// ─────────────────────────────────────────────

/**
 * 从 Supabase 获取指定日期范围内的所有预约
 *
 * @param {Object} supabase   - Supabase 客户端实例
 * @param {string} startDate  - 开始日期，格式 "YYYY-MM-DD"
 * @param {string} [endDate]  - 结束日期，格式 "YYYY-MM-DD"（可选，默认仅查 startDate）
 * @returns {Promise<import('../types.js').Appointment[]>}
 *
 * @example
 * const appts = await fetchAppointments(client, '2026-03-01', '2026-03-31');
 */
export async function fetchAppointments(supabase, startDate, endDate) {
  let query = supabase
    .from('appointments')
    .select('*')
    .gte('start_time', `${startDate}T00:00:00`)
    .order('start_time', { ascending: true });

  if (endDate) {
    query = query.lte('start_time', `${endDate}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Appointment] fetchAppointments error:', error.message);
    return [];
  }
  return (data || []).map(mapRowToAppt);
}

/**
 * 向 Supabase 插入一条新预约
 *
 * @param {Object} supabase                                - Supabase 客户端实例
 * @param {import('../types.js').Appointment} appointment  - 预约对象
 * @returns {Promise<import('../types.js').Appointment|null>}
 */
export async function insertAppointment(supabase, appointment) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([mapApptToRow(appointment)])
    .select()
    .single();

  if (error) {
    console.error('[Appointment] insertAppointment error:', error.message);
    return null;
  }
  return mapRowToAppt(data);
}

/**
 * 更新 Supabase 中预约的状态
 *
 * @param {Object} supabase  - Supabase 客户端实例
 * @param {string} apptId    - 预约 ID
 * @param {string} newStatus - 新状态，参见 APPT_STATUS 枚举
 * @returns {Promise<boolean>}
 */
export async function updateAppointmentStatus(supabase, apptId, newStatus) {
  const { error } = await supabase
    .from('appointments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', apptId);

  if (error) {
    console.error('[Appointment] updateAppointmentStatus error:', error.message);
    return false;
  }
  return true;
}

/**
 * 更新 Supabase 中预约的完整信息（编辑场景）
 *
 * @param {Object} supabase                                - Supabase 客户端实例
 * @param {string} apptId                                  - 预约 ID
 * @param {Partial<import('../types.js').Appointment>} updates - 要更新的字段
 * @returns {Promise<import('../types.js').Appointment|null>}
 */
export async function updateAppointment(supabase, apptId, updates) {
  const rowUpdates = {};
  if (updates.customerName !== undefined) rowUpdates.customer_name = updates.customerName;
  if (updates.customerId   !== undefined) rowUpdates.customer_id   = updates.customerId;
  if (updates.staffId      !== undefined) rowUpdates.staff_id      = updates.staffId;
  if (updates.projectName  !== undefined) rowUpdates.project_name  = updates.projectName;
  if (updates.startTime    !== undefined) rowUpdates.start_time    = updates.startTime;
  if (updates.startHour    !== undefined) rowUpdates.start_hour    = updates.startHour;
  if (updates.duration     !== undefined) rowUpdates.duration      = updates.duration;
  if (updates.status       !== undefined) rowUpdates.status        = updates.status;
  if (updates.note         !== undefined) rowUpdates.note          = updates.note;
  rowUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .update(rowUpdates)
    .eq('id', apptId)
    .select()
    .single();

  if (error) {
    console.error('[Appointment] updateAppointment error:', error.message);
    return null;
  }
  return mapRowToAppt(data);
}

/**
 * 从 Supabase 删除（作废）一条预约
 *
 * @param {Object} supabase - Supabase 客户端实例
 * @param {string} apptId   - 预约 ID
 * @returns {Promise<boolean>}
 */
export async function deleteAppointment(supabase, apptId) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', apptId);

  if (error) {
    console.error('[Appointment] deleteAppointment error:', error.message);
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
 * @returns {import('../types.js').Appointment}
 */
function mapRowToAppt(row) {
  return {
    id:           row.id,
    customerId:   row.customer_id,
    customerName: row.customer_name,
    staffId:      row.staff_id,
    projectName:  row.project_name,
    startTime:    row.start_time,
    startHour:    row.start_hour,
    duration:     row.duration,
    status:       row.status,
    note:         row.note ?? '',
  };
}

/**
 * 将 JS 对象（camelCase）映射为数据库行（snake_case）
 * @param {import('../types.js').Appointment} appt
 * @returns {Object}
 */
function mapApptToRow(appt) {
  return {
    id:            appt.id,
    customer_id:   appt.customerId,
    customer_name: appt.customerName,
    staff_id:      appt.staffId,
    project_name:  appt.projectName,
    start_time:    appt.startTime,
    start_hour:    appt.startHour,
    duration:      appt.duration,
    status:        appt.status,
    note:          appt.note ?? '',
  };
}
