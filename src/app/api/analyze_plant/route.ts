import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      You are the botanical vision system of an agricultural robot operating in Sri Lanka.
      Analyze the provided cropped image of a SINGLE plant.
      
      RULES ON ACCURACY:
      1. Never invent a number. If unsure, OMIT the field.
      2. Identify to the most specific level you are sure of.
      3. Focus ONLY on visible evidence for condition.

      Return a JSON object containing:
      - "label": common name
      - "scientific_name": botanical binomial
      - "family": botanical family
      - "id_confidence": "HIGH", "MEDIUM" or "LOW"
      - "condition": object with "status" (1-4 words caps) and "observations" (array of strings)
      - "description": 2-3 sentences about the plant and its visible state
      - "care_tips": array of 2-3 short care actions
      - "profile": object with established reference figures (lifespan_days, average_height_cm, etc.)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg',
          },
        },
      ],
      config: {
        thinkingConfig: {
          thinkingBudget: 0, 
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            scientific_name: { type: Type.STRING },
            family: { type: Type.STRING },
            id_confidence: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] },
            condition: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                observations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['status', 'observations'],
            },
            description: { type: Type.STRING },
            care_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            profile: {
              type: Type.OBJECT,
              properties: {
                lifespan_days: { type: Type.INTEGER },
                average_height_cm: { type: Type.NUMBER },
                average_spread_cm: { type: Type.NUMBER },
                average_girth_cm: { type: Type.NUMBER },
                seed_size_min_mm: { type: Type.NUMBER },
                seed_size_max_mm: { type: Type.NUMBER },
                growth_rate_cm_per_year: { type: Type.NUMBER },
                optimal_temp_min_c: { type: Type.NUMBER },
                optimal_temp_max_c: { type: Type.NUMBER },
                water_need_ml_per_week: { type: Type.NUMBER },
                sri_lanka_zones: { type: Type.STRING },
                native_range: { type: Type.STRING },
              },
            },
          },
          required: ['label', 'id_confidence', 'condition', 'description'],
        },
      },
    });

    const text = response.text();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return NextResponse.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Plant analysis error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze plant' }, { status: 500 });
  }
}
