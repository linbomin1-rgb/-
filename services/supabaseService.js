/**
 * @file services/supabaseService.js
 * @description Supabase 数据库综合服务 —— 客户端初始化、通用 CRUD、实时订阅（纯 ES6+ JavaScript）
 *
 * 功能说明：
 *  - 初始化 Supabase 客户端（支持浏览器 CDN 和 npm 两种方式）
 *  - 提供 Customer / Staff / Promotion / CustomerCard 的完整增删改查
 *  - 提供实时订阅（Realtime）接口，用于多端数据同步
 *  - 提供本地 localStorage ↔ Supabase 数据迁移工具
 *
 * 使用方式（浏览器 CDN）：
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 *   <script type="module" src="./services/supabaseService.js"></script>
 *
 * 使用方式（npm / ES Module）：
 *   import { initSupabase } from './services/supabaseService.js';
 *   const client = initSupabase('https://xxx.supabase.co', 'anon-key');
 */

// ─────────────────────────────────────────────
// 客户端初始化
// ─────────────────────────────────────────────

/** @type {Object|null} Supabase 客户端单例 */
let _supabaseClient = null;

/**
 * 初始化并返回 Supabase 客户端（单例模式）
 *
 * @param {string} supabaseUrl  - Supabase 项目 URL，如 "https://xxx.supabase.co"
 * @param {string} supabaseKey  - Supabase 匿名公钥（anon key）
 * @returns {Object}             - Supabase 客户端实例
 *
 * @example
 * // 方式一：通过 CDN 引入后调用
 * const client = initSupabase('https://xxx.supabase.co', 'your-anon-key');
 *
 * // 方式二：通过 npm 引入
 * import { createClient } from '@supabase/supabase-js';
 * const client = createClient(url, key);
 */
export function initSupabase(supabaseUrl, supabaseKey) {
  if (_supabaseClient) return _supabaseClient;

  // 兼容 CDN 全局变量和 npm 模块两种引入方式
  let createClient;
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    createClient = window.supabase.createClient;
  } else {
    try {
      // Node.js / bundler 环境
      ({ createClient } = require('@supabase/supabase-js'));
    } catch (e) {
      throw new Error(
        '[SupabaseService] 未找到 @supabase/supabase-js。' +
        '请通过 CDN 引入或运行 npm install @supabase/supabase-js'
      );
    }
  }

  _supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _supabaseClient;
}

/**
 * 获取已初始化的 Supabase 客户端
 * @returns {Object}
 * @throws {Error} 如果尚未调用 initSupabase
 */
export function getSupabaseClient() {
  if (!_supabaseClient) {
    throw new Error('[SupabaseService] 请先调用 initSupabase(url, key) 初始化客户端');
  }
  return _supabaseClient;
}

// ─────────────────────────────────────────────
// Customer CRUD
// ─────────────────────────────────────────────

/**
 * 获取所有会员（按创建时间降序）
 *
 * @param {Object} supabase - Supabase 客户端
 * @returns {Promise<import('../types.js').Customer[]>}
 */
export async function fetchCustomers(supabase) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseService] fetchCustomers error:', error.message);
    return [];
  }
  return (data || []).map(mapRowToCustomer);
}

/**
 * 根据手机号搜索会员
 *
 * @param {Object} supabase - Supabase 客户端
 * @param {string} phone    - 手机号（支持模糊搜索）
 * @returns {Promise<import('../types.js').Customer[]>}
 */
export async function searchCustomersByPhone(supabase, phone) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('phone', `%${phone}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseService] searchCustomersByPhone error:', error.message);
    return [];
  }
  return (data || []).map(mapRowToCustomer);
}

/**
 * 新增会员
 *
 * @param {Object} supabase                                - Supabase 客户端
 * @param {import('../types.js').Customer} customer        - 会员对象
 * @returns {Promise<import('../types.js').Customer|null>}
 */
export async function insertCustomer(supabase, customer) {
  const { data, error } = await supabase
    .from('customers')
    .insert([mapCustomerToRow(customer)])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseService] insertCustomer error:', error.message);
    return null;
  }
  return mapRowToCustomer(data);
}

/**
 * 更新会员信息
 *
 * @param {Object} supabase                                          - Supabase 客户端
 * @param {string} customerId                                        - 会员 ID
 * @param {Partial<import('../types.js').Customer>} updates          - 要更新的字段
 * @returns {Promise<import('../types.js').Customer|null>}
 */
export async function updateCustomer(supabase, customerId, updates) {
  const rowUpdates = {};
  if (updates.name             !== undefined) rowUpdates.name               = updates.name;
  if (updates.phone            !== undefined) rowUpdates.phone              = updates.phone;
  if (updates.balance          !== undefined) rowUpdates.balance            = updates.balance;
  if (updates.remarks          !== undefined) rowUpdates.remarks            = updates.remarks;
  if (updates.gender           !== undefined) rowUpdates.gender             = updates.gender;
  if (updates.birthday         !== undefined) rowUpdates.birthday           = updates.birthday;
  if (updates.source           !== undefined) rowUpdates.source             = updates.source;
  if (updates.tags             !== undefined) rowUpdates.tags               = updates.tags;
  if (updates.assignedStaffId  !== undefined) rowUpdates.assigned_staff_id  = updates.assignedStaffId;
  rowUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('customers')
    .update(rowUpdates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseService] updateCustomer error:', error.message);
    return null;
  }
  return mapRowToCustomer(data);
}

/**
 * 更新会员余额（原子操作，避免并发问题）
 *
 * @param {Object} supabase    - Supabase 客户端
 * @param {string} customerId  - 会员 ID
 * @param {number} delta       - 余额变化量（正数为增加，负数为减少）
 * @returns {Promise<boolean>}
 */
export async function updateCustomerBalance(supabase, customerId, delta) {
  // 使用 Supabase RPC 原子更新余额，防止并发覆盖
  const { error } = await supabase.rpc('increment_customer_balance', {
    p_customer_id: customerId,
    p_delta:       delta,
  });

  if (error) {
    // 降级方案：先读后写（非原子，仅在 RPC 不可用时使用）
    console.warn('[SupabaseService] RPC unavailable, falling back to read-then-write');
    const { data: current } = await supabase
      .from('customers')
      .select('balance')
      .eq('id', customerId)
      .single();

    if (!current) return false;
    const newBalance = Math.max(0, (current.balance || 0) + delta);
    const { error: updateError } = await supabase
      .from('customers')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (updateError) {
      console.error('[SupabaseService] updateCustomerBalance fallback error:', updateError.message);
      return false;
    }
  }
  return true;
}

/**
 * 删除会员
 *
 * @param {Object} supabase   - Supabase 客户端
 * @param {string} customerId - 会员 ID
 * @returns {Promise<boolean>}
 */
export async function deleteCustomer(supabase, customerId) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  if (error) {
    console.error('[SupabaseService] deleteCustomer error:', error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// Staff CRUD
// ─────────────────────────────────────────────

/**
 * 获取所有职员
 *
 * @param {Object} supabase - Supabase 客户端
 * @returns {Promise<import('../types.js').Staff[]>}
 */
export async function fetchStaff(supabase) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[SupabaseService] fetchStaff error:', error.message);
    return [];
  }
  return (data || []).map(mapRowToStaff);
}

/**
 * 新增职员
 *
 * @param {Object} supabase                              - Supabase 客户端
 * @param {import('../types.js').Staff} staff            - 职员对象
 * @returns {Promise<import('../types.js').Staff|null>}
 */
export async function insertStaff(supabase, staff) {
  const { data, error } = await supabase
    .from('staff')
    .insert([mapStaffToRow(staff)])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseService] insertStaff error:', error.message);
    return null;
  }
  return mapRowToStaff(data);
}

/**
 * 更新职员信息
 *
 * @param {Object} supabase                                       - Supabase 客户端
 * @param {string} staffId                                        - 职员 ID
 * @param {Partial<import('../types.js').Staff>} updates          - 要更新的字段
 * @returns {Promise<import('../types.js').Staff|null>}
 */
export async function updateStaff(supabase, staffId, updates) {
  const rowUpdates = {};
  if (updates.name        !== undefined) rowUpdates.name        = updates.name;
  if (updates.role        !== undefined) rowUpdates.role        = updates.role;
  if (updates.password    !== undefined) rowUpdates.password    = updates.password;
  if (updates.avatar      !== undefined) rowUpdates.avatar      = updates.avatar;
  if (updates.permissions !== undefined) rowUpdates.permissions = updates.permissions;
  rowUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('staff')
    .update(rowUpdates)
    .eq('id', staffId)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseService] updateStaff error:', error.message);
    return null;
  }
  return mapRowToStaff(data);
}

/**
 * 删除职员
 *
 * @param {Object} supabase - Supabase 客户端
 * @param {string} staffId  - 职员 ID
 * @returns {Promise<boolean>}
 */
export async function deleteStaff(supabase, staffId) {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', staffId);

  if (error) {
    console.error('[SupabaseService] deleteStaff error:', error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// Promotion & CustomerCard CRUD
// ─────────────────────────────────────────────

/**
 * 获取所有活动
 *
 * @param {Object} supabase - Supabase 客户端
 * @returns {Promise<import('../types.js').Promotion[]>}
 */
export async function fetchPromotions(supabase) {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseService] fetchPromotions error:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    id:           row.id,
    name:         row.name,
    discountRate: row.discount_rate,
    createdAt:    row.created_at,
  }));
}

/**
 * 新增活动
 *
 * @param {Object} supabase                                    - Supabase 客户端
 * @param {import('../types.js').Promotion} promotion          - 活动对象
 * @returns {Promise<import('../types.js').Promotion|null>}
 */
export async function insertPromotion(supabase, promotion) {
  const { data, error } = await supabase
    .from('promotions')
    .insert([{
      id:            promotion.id,
      name:          promotion.name,
      discount_rate: promotion.discountRate,
      created_at:    promotion.createdAt,
    }])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseService] insertPromotion error:', error.message);
    return null;
  }
  return {
    id:           data.id,
    name:         data.name,
    discountRate: data.discount_rate,
    createdAt:    data.created_at,
  };
}

/**
 * 删除活动
 *
 * @param {Object} supabase     - Supabase 客户端
 * @param {string} promotionId  - 活动 ID
 * @returns {Promise<boolean>}
 */
export async function deletePromotion(supabase, promotionId) {
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promotionId);

  if (error) {
    console.error('[SupabaseService] deletePromotion error:', error.message);
    return false;
  }
  return true;
}

/**
 * 获取指定会员的所有活动卡
 *
 * @param {Object} supabase   - Supabase 客户端
 * @param {string} customerId - 会员 ID
 * @returns {Promise<import('../types.js').CustomerCard[]>}
 */
export async function fetchCustomerCards(supabase, customerId) {
  const { data, error } = await supabase
    .from('customer_cards')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseService] fetchCustomerCards error:', error.message);
    return [];
  }
  return (data || []).map(row => ({
    id:          row.id,
    customerId:  row.customer_id,
    promotionId: row.promotion_id,
    balance:     row.balance,
    createdAt:   row.created_at,
  }));
}

/**
 * 新增活动卡
 *
 * @param {Object} supabase                                      - Supabase 客户端
 * @param {import('../types.js').CustomerCard} card              - 活动卡对象
 * @returns {Promise<import('../types.js').CustomerCard|null>}
 */
export async function insertCustomerCard(supabase, card) {
  const { data, error } = await supabase
    .from('customer_cards')
    .insert([{
      id:           card.id,
      customer_id:  card.customerId,
      promotion_id: card.promotionId,
      balance:      card.balance,
      created_at:   card.createdAt,
    }])
    .select()
    .single();

  if (error) {
    console.error('[SupabaseService] insertCustomerCard error:', error.message);
    return null;
  }
  return {
    id:          data.id,
    customerId:  data.customer_id,
    promotionId: data.promotion_id,
    balance:     data.balance,
    createdAt:   data.created_at,
  };
}

/**
 * 更新活动卡余额
 *
 * @param {Object} supabase - Supabase 客户端
 * @param {string} cardId   - 活动卡 ID
 * @param {number} newBalance - 新余额
 * @returns {Promise<boolean>}
 */
export async function updateCardBalance(supabase, cardId, newBalance) {
  const { error } = await supabase
    .from('customer_cards')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', cardId);

  if (error) {
    console.error('[SupabaseService] updateCardBalance error:', error.message);
    return false;
  }
  return true;
}

/**
 * 删除活动卡
 *
 * @param {Object} supabase - Supabase 客户端
 * @param {string} cardId   - 活动卡 ID
 * @returns {Promise<boolean>}
 */
export async function deleteCustomerCard(supabase, cardId) {
  const { error } = await supabase
    .from('customer_cards')
    .delete()
    .eq('id', cardId);

  if (error) {
    console.error('[SupabaseService] deleteCustomerCard error:', error.message);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// 实时订阅（Realtime）
// ─────────────────────────────────────────────

/**
 * 订阅指定表的实时变更
 *
 * @param {Object}   supabase    - Supabase 客户端
 * @param {string}   tableName   - 表名，如 'appointments'、'transactions'
 * @param {Function} onInsert    - 新增回调 (payload) => void
 * @param {Function} onUpdate    - 更新回调 (payload) => void
 * @param {Function} onDelete    - 删除回调 (payload) => void
 * @returns {Object}              - subscription 对象（调用 .unsubscribe() 取消订阅）
 *
 * @example
 * const sub = subscribeToTable(client, 'appointments',
 *   (p) => console.log('新增预约:', p.new),
 *   (p) => console.log('更新预约:', p.new),
 *   (p) => console.log('删除预约:', p.old)
 * );
 * // 组件卸载时取消订阅
 * sub.unsubscribe();
 */
export function subscribeToTable(supabase, tableName, onInsert, onUpdate, onDelete) {
  const channel = supabase
    .channel(`realtime:${tableName}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tableName }, onInsert)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tableName }, onUpdate)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tableName }, onDelete)
    .subscribe();

  return channel;
}

// ─────────────────────────────────────────────
// 数据迁移：localStorage → Supabase
// ─────────────────────────────────────────────

/**
 * 将 localStorage 中的本地数据迁移到 Supabase（一次性操作）
 *
 * @param {Object} supabase - Supabase 客户端
 * @returns {Promise<{ success: boolean, migrated: Object, errors: string[] }>}
 *
 * @example
 * const result = await migrateLocalDataToSupabase(client);
 * console.log('迁移结果:', result.migrated);
 */
export async function migrateLocalDataToSupabase(supabase) {
  const errors = [];
  const migrated = {
    customers:     0,
    staff:         0,
    appointments:  0,
    transactions:  0,
    promotions:    0,
    customerCards: 0,
    reminders:     0,
  };

  /**
   * 安全解析 localStorage 数据
   * @param {string} key
   * @returns {Array}
   */
  const safeParse = (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (e) {
      errors.push(`解析 ${key} 失败: ${e.message}`);
      return [];
    }
  };

  // 迁移各表数据
  const tables = [
    { key: 'bp_customers',      table: 'customers',      mapFn: mapCustomerToRow,     countKey: 'customers' },
    { key: 'bp_staff',          table: 'staff',          mapFn: mapStaffToRow,        countKey: 'staff' },
    { key: 'bp_promotions',     table: 'promotions',     mapFn: mapPromotionToRow,    countKey: 'promotions' },
    { key: 'bp_customer_cards', table: 'customer_cards', mapFn: mapCardToRow,         countKey: 'customerCards' },
    { key: 'bp_reminders',      table: 'staff_reminders',mapFn: mapReminderToRow,     countKey: 'reminders' },
  ];

  for (const { key, table, mapFn, countKey } of tables) {
    const items = safeParse(key).filter(Boolean);
    if (items.length === 0) continue;

    const rows = items.map(mapFn);
    const { data, error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      .select();

    if (error) {
      errors.push(`迁移 ${table} 失败: ${error.message}`);
    } else {
      migrated[countKey] = (data || []).length;
    }
  }

  // 单独处理 appointments（字段映射复杂）
  const appts = safeParse('bp_appts').filter(Boolean);
  if (appts.length > 0) {
    const rows = appts.map(a => ({
      id:            a.id,
      customer_id:   a.customerId,
      customer_name: a.customerName,
      staff_id:      a.staffId,
      project_name:  a.projectName,
      start_time:    a.startTime,
      start_hour:    a.startHour,
      duration:      a.duration,
      status:        a.status,
      note:          a.note ?? '',
    }));
    const { data, error } = await supabase
      .from('appointments')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      .select();
    if (error) errors.push(`迁移 appointments 失败: ${error.message}`);
    else migrated.appointments = (data || []).length;
  }

  // 单独处理 transactions
  const trans = safeParse('bp_trans').filter(Boolean);
  if (trans.length > 0) {
    const rows = trans.map(t => ({
      id:               t.id,
      type:             t.type,
      customer_id:      t.customerId,
      customer_name:    t.customerName,
      customer_card_id: t.customerCardId ?? null,
      original_amount:  t.originalAmount  ?? null,
      amount:           t.amount,
      payment_method:   t.paymentMethod,
      item_name:        t.itemName,
      staff_id:         t.staffId ?? null,
      timestamp:        t.timestamp,
    }));
    const { data, error } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      .select();
    if (error) errors.push(`迁移 transactions 失败: ${error.message}`);
    else migrated.transactions = (data || []).length;
  }

  return {
    success: errors.length === 0,
    migrated,
    errors,
  };
}

// ─────────────────────────────────────────────
// 内部辅助：字段映射函数
// ─────────────────────────────────────────────

function mapRowToCustomer(row) {
  return {
    id:              row.id,
    name:            row.name,
    phone:           row.phone,
    balance:         row.balance,
    remarks:         row.remarks ?? '',
    createdAt:       row.created_at,
    gender:          row.gender ?? 'female',
    birthday:        row.birthday ?? '',
    source:          row.source ?? '',
    tags:            row.tags ?? [],
    assignedStaffId: row.assigned_staff_id ?? '',
  };
}

function mapCustomerToRow(customer) {
  return {
    id:               customer.id,
    name:             customer.name,
    phone:            customer.phone,
    balance:          customer.balance,
    remarks:          customer.remarks ?? '',
    created_at:       customer.createdAt,
    gender:           customer.gender ?? 'female',
    birthday:         customer.birthday ?? null,
    source:           customer.source ?? null,
    tags:             customer.tags ?? [],
    assigned_staff_id:customer.assignedStaffId ?? null,
  };
}

function mapRowToStaff(row) {
  return {
    id:          row.id,
    name:        row.name,
    role:        row.role,
    password:    row.password ?? '',
    avatar:      row.avatar,
    permissions: row.permissions ?? ['all'],
  };
}

function mapStaffToRow(staff) {
  return {
    id:          staff.id,
    name:        staff.name,
    role:        staff.role,
    password:    staff.password ?? '',
    avatar:      staff.avatar,
    permissions: staff.permissions ?? ['all'],
  };
}

function mapPromotionToRow(promo) {
  return {
    id:            promo.id,
    name:          promo.name,
    discount_rate: promo.discountRate,
    created_at:    promo.createdAt,
  };
}

function mapCardToRow(card) {
  return {
    id:           card.id,
    customer_id:  card.customerId,
    promotion_id: card.promotionId,
    balance:      card.balance,
    created_at:   card.createdAt,
  };
}

function mapReminderToRow(r) {
  return {
    id:            r.id,
    type:          r.type,
    content:       r.content,
    customer_id:   r.customerId,
    staff_id:      r.staffId,
    reminder_date: r.reminderDate,
    status:        r.status,
    created_at:    r.createdAt,
  };
}
