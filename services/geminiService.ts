
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, AIInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Perform a deep-dive audit on the process metrics.
 */
export const getAIInterpretation = async (stats: AnalysisResult): Promise<AIInsight> => {
  const prompt = `
    ROLE: Senior Metrology & Quality Audit Lead (Six Sigma Black Belt).
    DATASET: Inspection Audit for feature "${stats.columnName}".

    STATISTICAL PARAMETERS:
    - Sample Count: ${stats.count}
    - Mean: ${stats.mean.toFixed(6)}
    - Sigma (Std Dev): ${stats.stdDev.toFixed(6)}
    - Cp (Potential): ${stats.cp ?? 'N/A'}
    - Cpk (Actual Capability): ${stats.cpk ?? 'N/A'}
    - Limits: LSL ${stats.lsl} | USL ${stats.usl}
    - Yield: ${stats.yield.toFixed(2)}%
    - OOT Count: ${stats.outOfToleranceCount}

    TASK:
    Conduct a process capability audit. Identify if the process is centered, if the variance is excessive, 
    and provide high-impact corrective actions. Compare Cp vs Cpk to determine if centering or 
    spread is the primary issue.

    OUTPUT: Provide a JSON interpretation strictly following the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { 
              type: Type.STRING, 
              enum: ['Critical', 'Warning', 'Stable', 'Excellent'],
            },
            summary: { type: Type.STRING },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            rootCauseAnalysis: { type: Type.STRING }
          },
          required: ["status", "summary", "recommendations", "rootCauseAnalysis"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI response stream empty.");
    return JSON.parse(text) as AIInsight;
  } catch (error) {
    console.error("Metrology AI Error:", error);
    throw error;
  }
};

/**
 * Initializes a specialized chat session for metrology advice.
 */
export const startMetrologyChat = (stats: AnalysisResult): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are the 'QualityEngine Advisor', an expert AI focused on Statistical Process Control (SPC), metrology, and manufacturing engineering. 
      You have access to the current audit results: 
      Feature: ${stats.columnName}
      Mean: ${stats.mean}
      Cpk: ${stats.cpk}
      Yield: ${stats.yield}%
      Spec: ${stats.lsl} to ${stats.usl}

      Answer questions strictly from a technical, engineering-focused perspective. Use industrial terminology. 
      Help the user troubleshoot process drift, tool wear, or operator variance based on the provided stats.`,
    }
  });
};
