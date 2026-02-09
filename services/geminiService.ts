import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSubtasks = async (taskTitle: string, taskDescription: string): Promise<Array<{ title: string; completed: boolean }>> => {
  try {
    const ai = getAIClient();

    const prompt = `タスク名「${taskTitle}」に対する3〜5個の具体的なサブタスク（チェックリスト）を生成してください。
    説明: "${taskDescription}".
    出力は純粋なJSON文字列配列のみにしてください。日本語で出力してください。簡潔に。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              completed: { type: Type.BOOLEAN }
            },
            propertyOrdering: ["title", "completed"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text);
    // Ensure structure matches what we expect, though schema helps
    return Array.isArray(data) ? data.map((item: any) => ({
        title: item.title || "新しいサブタスク",
        completed: false
    })) : [];

  } catch (error) {
    console.error("AI Generation Error:", error);
    return [{ title: "サブタスクを生成できませんでした。手動で追加してください。", completed: false }];
  }
};

export const suggestCategoryName = async (existingCategories: string[]): Promise<string> => {
    try {
        const ai = getAIClient();
        const prompt = `現在のカテゴリ: ${existingCategories.join(', ')}. ソフトウェアプロジェクト管理ボード向けに、これらと異なる新しいカテゴリ名を1つ提案してください。日本語で、カテゴリ名の文字列のみを返してください。`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "新しいカテゴリ";
    } catch (e) {
        return "新しいカテゴリ";
    }
}