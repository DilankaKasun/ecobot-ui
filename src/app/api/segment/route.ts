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

    // Parse base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      Give the segmentation masks for ONLY plants, crops, or leaves in the image. 
      Do NOT segment any other objects (like chairs, people, pots, tables, or background items).
      Output a JSON list of segmentation masks where each entry contains the 2D bounding box in the key "box_2d", 
      the segmentation mask in key "mask", and the text label in the key "label". 
      For the "label", please IDENTIFY the exact plant species or common name (e.g., "Monstera deliciosa", "Tomato Plant", "Ficus"). If you cannot identify it, use "Unknown Plant".
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
          thinkingBudget: 0, // Disable thinking for speed
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              box_2d: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: 'The 2D bounding box of the item as [ymin, xmin, ymax, xmax] normalized to 0-1000.',
              },
              mask: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                },
                description: 'The segmentation mask of the item as a polygon of [x,y] coordinates, normalized to 0-1000.',
              },
              label: {
                type: Type.STRING,
                description: 'A descriptive label for the item.',
              },
            },
            required: ['box_2d', 'mask', 'label'],
          },
        },
      },
    });

    const outputText = response.text;
    
    if (!outputText) {
       return NextResponse.json({ error: 'Empty response from model' }, { status: 500 });
    }

    const items = JSON.parse(outputText);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Segmentation error:', error);
    return NextResponse.json({ error: error.message || 'Segmentation failed' }, { status: 500 });
  }
}
