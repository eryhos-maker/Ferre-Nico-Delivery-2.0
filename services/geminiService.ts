
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const getLogisticsAdvice = async (prompt: string): Promise<string> => {
  if (!API_KEY) return "Servicio de IA no configurado.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `Eres un asistente experto en logística para FerreNico, una ferretería. 
        Tus respuestas deben ser profesionales, concisas y en español. 
        El sistema de precios ahora se basa en distancia (KM): 
        0-3km: $40, 4-6km: $65, 7-10km: $80, 11-15km: $120, 16-25km: $172, 26-35km: $205, 36-45km: $240, 46-60km: $272.
        Ayudas con cálculos de costos, redacción de avisos para clientes y resolución de dudas de transporte.`,
      },
    });
    return response.text || "No se pudo generar una respuesta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la inteligencia artificial.";
  }
};
