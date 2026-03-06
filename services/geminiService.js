/**
 * @file services/geminiService.js
 * @description AI 经营诊断服务 —— 基于 Gemini API（纯 ES6+ JavaScript）
 *
 * 功能说明：
 *  - 调用 Google Gemini API 分析店务经营数据
 *  - 输出客单价、技师效率、会员转化等经营建议
 *
 * 可直接在浏览器 <script type="module"> 中引入使用（需配置 API Key）。
 */

/** @type {import('@google/genai').GoogleGenAI|null} */
let aiInstance = null;

/**
 * 获取或初始化 GoogleGenAI 实例（懒加载单例）
 * @returns {import('@google/genai').GoogleGenAI}
 * @throws {Error} 当 API Key 未配置时抛出
 */
function getAi() {
  if (!aiInstance) {
    // 支持 Node.js 环境变量 和 浏览器全局变量两种方式注入 API Key
    const apiKey =
      (typeof process !== 'undefined' && process.env && process.env.API_KEY) ||
      (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
      (typeof window !== 'undefined' && window.__GEMINI_API_KEY__) ||
      null;

    if (!apiKey) {
      throw new Error(
        '[GeminiService] GEMINI_API_KEY 未配置。' +
        '请在环境变量中设置 GEMINI_API_KEY，或在 window.__GEMINI_API_KEY__ 中注入。'
      );
    }

    // 动态导入，避免在不支持的环境中报错
    const { GoogleGenAI } = require('@google/genai');
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

/**
 * 调用 Gemini AI 分析店务经营数据，返回诊断报告
 *
 * @param {Object} data                   - 经营数据摘要
 * @param {Object} [data.summary]         - 今日/本月统计数据
 * @param {Object[]} [data.staffStats]    - 各技师业绩数据
 * @param {number}  [data.totalMembers]   - 会员总数
 * @param {number}  [data.pendingAppts]   - 待确认预约数
 * @returns {Promise<string>}              - AI 诊断报告文本
 *
 * @example
 * const report = await analyzeBusinessData({ summary: stats });
 * console.log(report);
 */
export async function analyzeBusinessData(data) {
  try {
    const ai = getAi();

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `分析以下店务经营数据并给出建议：${JSON.stringify(data)}`,
      config: {
        systemInstruction:
          '你是一个资深的美业经营顾问，请根据提供的数据（流水、预约、会员），' +
          '分析店内的经营状况（如客单价、技师效率、会员转化），' +
          '并给出3条具体的优化建议。请使用中文回答，并保持简洁。',
      },
    });

    return response.text || '暂无分析结果';
  } catch (error) {
    console.error('[GeminiService] analyzeBusinessData error:', error);
    return '暂时无法进行 AI 分析，请稍后重试。';
  }
}

/**
 * 生成客户个性化回访话术
 *
 * @param {import('../types.js').Customer} customer - 会员对象
 * @param {Object} profile                          - 客户画像数据（来自 analyzeCustomerProfile）
 * @returns {Promise<string>}                        - 回访话术建议
 */
export async function generateFollowUpScript(customer, profile) {
  try {
    const ai = getAi();

    const prompt = [
      `请为以下美业门店客户生成一段个性化的回访话术（微信/短信形式）：`,
      `客户姓名：${customer.name}`,
      `性别：${customer.gender === 'female' ? '女' : customer.gender === 'male' ? '男' : '未知'}`,
      `最近消费距今：${profile.daysSinceLastVisit ?? '未知'} 天`,
      `最常消费项目：${profile.favoriteProject ?? '未知'}`,
      `客户价值等级：${profile.valueLevel}`,
      `账户余额：¥${customer.balance}`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction:
          '你是一位美业门店的专业客服，请生成一段温馨、自然、有吸引力的回访话术，' +
          '不超过100字，适合通过微信或短信发送给客户。请使用中文。',
      },
    });

    return response.text || '亲爱的顾客，好久不见，欢迎回来！';
  } catch (error) {
    console.error('[GeminiService] generateFollowUpScript error:', error);
    return '暂时无法生成话术，请稍后重试。';
  }
}
