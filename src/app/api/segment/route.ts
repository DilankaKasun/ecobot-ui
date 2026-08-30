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
      You are the botanical vision system of an agricultural robot operating in Sri Lanka.
      An operator acts on what you report, so ACCURACY MATTERS MORE THAN COMPLETENESS.

      Give the segmentation masks for ONLY plants, crops, or leaves in the image.
      Do NOT segment any other objects (like chairs, people, pots, tables, or background items).
      Segment EVERY distinct plant you can see, not just the most prominent one.

      Output a JSON list where each entry contains the 2D bounding box in the key "box_2d",
      the segmentation mask in key "mask", and the text label in the key "label".

      RULES ON ACCURACY — follow these strictly:
      1. Never invent a number. If you are not confident in a figure, OMIT that field entirely.
         An omitted figure is displayed as "unknown", which is correct and useful. A guessed
         figure is a defect.
      2. Report ONLY what is genuinely determinable. You are looking at a photograph, so you
         CANNOT measure soil moisture, nutrient/NPK levels, light intensity, or the plant's
         history. Do not score or estimate any of those.
      3. Identify to the most specific level you are actually sure of. If the species is
         uncertain, give the genus or family and set "id_confidence" accordingly; if you cannot
         tell at all, use "Unknown Plant" with LOW confidence and omit the profile figures.
      4. Reference figures must be established values for the identified species — typical
         published figures for a MATURE specimen. They are not measurements of the individual
         in frame; do not try to measure it from the image.

      For EACH plant provide:
        - "label": the common name at the level you are sure of, or "Unknown Plant".
        - "scientific_name": botanical binomial. Omit if unsure.
        - "family": botanical family. Omit if unsure.
        - "id_confidence": "HIGH", "MEDIUM" or "LOW" — how sure you are of the identification.
        - "condition": what is VISIBLE in this image, and nothing more:
            "status": 1-4 words in caps describing the visible state, e.g. "HEALTHY FOLIAGE",
                      "LOWER-LEAF YELLOWING", "LEAF SPOTTING", "WILTING". If nothing is wrong,
                      say "NO VISIBLE ISSUES".
            "observations": 1-3 short factual notes about what you can see (leaf colour, drooping,
                      spotting, damage, new growth). Only visible evidence — no inferred causes
                      stated as fact.
        - "description": 2-3 sentences — what the species is, then what this specimen looks like.
        - "care_tips": 2-3 short care actions appropriate for the species and the visible state.
        - "profile": established reference figures for the species (omit any you are unsure of):
            "lifespan_days": typical lifespan in DAYS (an annual ~300, a long-lived houseplant ~3650).
            "average_height_cm": typical mature height, centimetres.
            "average_spread_cm": typical mature canopy diameter, centimetres.
            "average_girth_cm": typical mature stem or trunk girth (circumference), centimetres.
            "seed_size_min_mm" / "seed_size_max_mm": typical seed size range, millimetres.
            "growth_rate_cm_per_year": typical height gain per year, centimetres.
            "optimal_temp_min_c" / "optimal_temp_max_c": the species' preferred growing
                temperature band in Celsius.
            "water_need_ml_per_week": typical weekly water requirement in millilitres for a
                specimen of this size.
            "sri_lanka_zones": where this species is usually grown or found in Sri Lanka —
                climatic zone plus a few districts (e.g. "Wet zone — Kandy, Kalutara, Galle").
                If it is not commonly grown in Sri Lanka, say so plainly instead of guessing.
            "native_range": the species' native region.
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
                description: 'Common name at the most specific level you are sure of, or "Unknown Plant".',
              },
              scientific_name: {
                type: Type.STRING,
                description: 'Botanical binomial for the species. Omit if unsure.',
              },
              family: {
                type: Type.STRING,
                description: 'Botanical family. Omit if unsure.',
              },
              id_confidence: {
                type: Type.STRING,
                enum: ['HIGH', 'MEDIUM', 'LOW'],
                description: 'How confident you are in the identification.',
              },
              condition: {
                type: Type.OBJECT,
                description: 'Only what is visible in this image.',
                properties: {
                  status: {
                    type: Type.STRING,
                    description: 'Visible state in 1-4 words, caps. "NO VISIBLE ISSUES" if healthy.',
                  },
                  observations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'One to three short factual notes about visible evidence only.',
                  },
                },
                required: ['status', 'observations'],
              },
              description: {
                type: Type.STRING,
                description: "2-3 sentences on the species and this specimen's visible state.",
              },
              care_tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Two or three short care actions.',
              },
              profile: {
                type: Type.OBJECT,
                description:
                  'Established reference figures for a typical MATURE specimen of the identified species. Omit any figure you are not confident about — never guess.',
                properties: {
                  lifespan_days: { type: Type.INTEGER, description: 'Typical lifespan in days.' },
                  average_height_cm: { type: Type.NUMBER, description: 'Typical mature height in cm.' },
                  average_spread_cm: { type: Type.NUMBER, description: 'Typical mature canopy diameter in cm.' },
                  average_girth_cm: { type: Type.NUMBER, description: 'Typical mature stem/trunk girth in cm.' },
                  seed_size_min_mm: { type: Type.NUMBER, description: 'Smallest typical seed size in mm.' },
                  seed_size_max_mm: { type: Type.NUMBER, description: 'Largest typical seed size in mm.' },
                  growth_rate_cm_per_year: { type: Type.NUMBER, description: 'Typical height gain per year in cm.' },
                  optimal_temp_min_c: { type: Type.NUMBER, description: 'Low end of the preferred temperature band, Celsius.' },
                  optimal_temp_max_c: { type: Type.NUMBER, description: 'High end of the preferred temperature band, Celsius.' },
                  water_need_ml_per_week: { type: Type.NUMBER, description: 'Typical weekly water requirement in millilitres.' },
                  sri_lanka_zones: {
                    type: Type.STRING,
                    description: 'Where in Sri Lanka this species is usually grown or found: climatic zone plus districts.',
                  },
                  native_range: { type: Type.STRING, description: "The species' native region." },
                },
              },
            },
            required: ['box_2d', 'mask', 'label', 'id_confidence', 'condition', 'description', 'profile'],
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
