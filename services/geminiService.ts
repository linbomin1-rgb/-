
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const analyzeBusinessData = async (data: any) => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `分析以下店务经营数据并给出建议：${JSON.stringify(data)}`,
      config: {
        systemInstruction: "你是一个资深的美业经营顾问，请根据提供的数据（流水、预约、会员），分析店内的经营状况（如客单价、技师效率、会员转化），并给出3条具体的优化建议。请使用中文回答，并保持简洁。",
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "暂时无法进行 AI 分析，请稍后重试。";
  }
};
