
import { GoogleGenAI, Type } from "@google/genai";
import { TattooStyle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to remove header from base64
 */
const cleanBase64 = (b64: string) => b64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

/**
 * TATTOO BLUEPRINT AI
 * The core engine for the "World Class" app.
 * Composes complex prompts based on style and requirements.
 */
export const generateTattooBlueprint = async (
  base64Image: string, 
  style: TattooStyle,
  options: {
    correctPerspective: boolean;
    simplify: boolean;
  }
): Promise<string> => {
  
  // 1. Define Style Parsers
  const stylePrompts: Record<TattooStyle, string> = {
    'fine-line': `
      STYLE: FINE LINE / SINGLE NEEDLE.
      - Output extremely thin, crisp, constant-width lines (approx 0.5px to 1px).
      - NO shading, NO gradients. Use stippling (dots) only if absolutely necessary for depth.
      - Minimalist aesthetic. High fidelity to the original shape but simplified for longevity.
    `,
    'old-school': `
      STYLE: AMERICAN TRADITIONAL (OLD SCHOOL).
      - Output BOLD, heavy, confident outlines (approx 4px-5px weight).
      - Simplify all details into strong readable shapes.
      - Indicate heavy black shading with solid black fill or heavy hatch marks.
      - Classic tattoo aesthetic: bold will hold.
    `,
    'neo-trad': `
      STYLE: NEO TRADITIONAL.
      - Varied line weight: Thick outer contours, thinner internal details.
      - Art Nouveau influence. Smooth, flowy curves.
      - High detail but clear separation between elements.
    `,
    'anime': `
      STYLE: ANIME / MANGA LINEART.
      - Extremely precise, mechanical lines.
      - varying line weights to indicate depth (thick foreground, thin background).
      - Clean facial features, sharp eyes, distinct hair spikes.
    `,
    'realism': `
      STYLE: REALISTIC STENCIL MAPPING.
      - Do NOT just outline. Create a "Topographical Map" of the shadows.
      - Use "Ghost Lines" (dotted or very faint) to indicate soft shadow boundaries.
      - Use solid lines only for hard edges (eyes, nostrils, lips).
      - This is a guide for a realism artist to know where to shade.
    `,
    'geometric': `
      STYLE: GEOMETRIC / MANDALA.
      - Perfect symmetry and mathematical precision.
      - Straight lines must be perfectly straight. Circles perfectly round.
      - Uniform line weight throughout.
    `,
    'planeart': `
      STYLE: DIGITAL ILLUSTRATION RECOVERY & FLATTENING.
      - OBJECTIVE: Correct all perspective distortion, wrapping, and warping.
      - Flatten the image as if it were a 2D digital vector file.
      - Do NOT change the artistic style. Maintain the original line character (sketchy, clean, or variable).
      - REPAIR: Fix any stretching or compression caused by the angle of the photo.
      - Output: High-contrast black lines on white. 
      - This is for taking a photo of a drawing/tattoo and restoring it to a flat design file.
    `,
    'custom': `
      STYLE: CLEAN TATTOO FLASH.
      - Standard professional tattoo line drawing.
      - Balanced line weight.
    `
  };

  // 2. Build the System Instruction
  const prompt = `
    You are a world-class Tattoo Stencil Artist and Image Processor.
    Your task is to convert the input image into a PERFECTIONIST TATTOO STENCIL ready for a thermal printer.

    ${stylePrompts[style]}

    CRITICAL PROCESSING INSTRUCTIONS:
    1. OUTPUT FORMAT: Pure Black lines (#000000) on Pure White background (#FFFFFF). No gray, no alpha, no noise.
    2. BODY CORRECTION: ${options.correctPerspective || style === 'planeart' ? 'DETECT if the image is on a body part (arm, leg, back) or angled paper. FLATTEN the image to a perfect 2D plane. Correct perspective distortion, cylinder wrapping, and camera tilt.' : 'Maintain original perspective.'}
    3. CLEANUP: Remove all skin texture, moles, hair, redness, and background noise.
    4. CONTINUITY: Repair broken lines. If a line is sketchy, replace it with a single confident vector-style stroke.
    5. THERMAL READY: Ensure lines are not too close together to prevent ink bleeding on the transfer paper.
    
    ${options.simplify ? 'SIMPLIFICATION: Reduce complexity by 30%. Merge small details into larger shapes.' : 'DETAIL: Maintain high level of detail.'}

    Return ONLY the processed image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: cleanBase64(base64Image) } },
          { text: prompt }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Blueprint AI Error:", error);
    throw error;
  }
};

/**
 * SMART SEGMENTATION ANALYZER
 * Analyzes a stencil to determine optimal printing layout based on US LETTER Size.
 */
export const analyzeSegmentation = async (base64Image: string, width: number, height: number): Promise<{ rows: number, cols: number, zone: string }> => {
  try {
    const prompt = `
      You are a Print Logistics Expert for Tattoo Artists.
      Input Image Dimensions: ${width}px width x ${height}px height.
      Target Paper Standard: US Letter Size (21.59 cm x 27.94 cm) / (8.5 x 11 inches).
      
      TASK: 
      Calculate the optimal grid (Rows x Columns) to split this image so it prints at a large, life-size scale (e.g., Full Back, Sleeve, Thigh) across multiple Letter sheets.
      
      LOGIC:
      1. Analyze the aspect ratio of the image (${(width/height).toFixed(2)}).
      2. Compare it to the aspect ratio of Letter Paper (~0.77 Portrait, ~1.29 Landscape).
      3. Determine how many sheets are needed to cover the area without excessive shrinking.
      4. Consider standard tattoo zones:
         - Full Back: Usually 2x2 or 3x2 (Width x Height).
         - Sleeve / Leg: Usually 1x3 or 1x4 (Long vertical strip).
         - Chest: Usually 2x1 or 2x2.
      
      Return JSON ONLY:
      {
        "zone": "Inferred Body Zone (e.g. Full Back, Sleeve)",
        "rows": number (Horizontal cuts),
        "cols": number (Vertical cuts)
      }
      
      EXAMPLE:
      If image is tall and thin (Sleeve), return rows=3, cols=1.
      If image is square and large (Back), return rows=2, cols=2.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: cleanBase64(base64Image) } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             zone: { type: Type.STRING },
             rows: { type: Type.INTEGER },
             cols: { type: Type.INTEGER }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis returned");
    return JSON.parse(text);

  } catch (e) {
    console.error("Segmentation Analysis Failed", e);
    // Fallback based on simple aspect ratio math
    const ratio = width / height;
    if (ratio < 0.5) return { rows: 3, cols: 1, zone: "Sleeve (Fallback)" };
    if (ratio > 2) return { rows: 1, cols: 3, zone: "Chest/Back (Fallback)" };
    return { rows: 2, cols: 2, zone: "Large Area (Fallback)" };
  }
};

export const generateImageEdit = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: cleanBase64(base64Image) } },
          { text: `Edit this image. ${prompt}` }
        ]
      }
    });
    
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.warn("AI did not return an image.");
    return base64Image;
  } catch (e) { 
    console.error("AI Edit Error", e);
    throw e; 
  }
};

export const cleanImageWithAI = (b64: string) => generateTattooBlueprint(b64, 'custom', { correctPerspective: false, simplify: true });
export const generatePlaneArt = (b64: string) => generateTattooBlueprint(b64, 'planeart', { correctPerspective: true, simplify: false });
