
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { toPng } from 'html-to-image';

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GenerateInfographicInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
  style: z.enum(['modern', 'minimalist', 'colorful', 'corporate', 'educational']).optional().default('educational').describe("Visual style preference"),
  maxPoints: z.number().min(3).max(8).optional().default(5).describe("Number of key points to include"),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;

const GenerateInfographicOutputSchema = z.object({
  imageUrl: z.string().optional().describe("The data URI of the generated infographic image, if successful."),
  prompt: z.string().optional().describe("The prompt used to generate the image for debugging purposes."),
  keyPoints: z.array(z.object({
    title: z.string(),
    summary: z.string()
  })).optional().describe("The extracted key points for reference"),
  logs: z.array(z.string()).optional().describe("Debugging logs from the generation process."),
  fallbackHtml: z.string().optional().describe("The HTML content for a fallback infographic if image generation fails."),
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

// Flow 1: Extract key points from content
const extractKeyPointsFlow = ai.defineFlow({
  name: 'extractKeyPointsFlow',
  inputSchema: z.object({
    content: z.string().optional(),
    sources: z.array(SourceSchema).optional(),
    maxPoints: z.number().default(5),
    academicLevel: z.string().optional(),
  }),
  outputSchema: z.array(z.object({
    title: z.string(),
    summary: z.string()
  })),
}, async (input) => {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    prompt: `Extract the ${input.maxPoints} most important, distinct key points from the following content. Each point must have a very short, catchy title (2-3 words) and a concise one-sentence summary (max 15 words).

Academic Level: ${input.academicLevel || 'general'}
Content:
${input.content || input.sources?.map(s => `${s.name}: ${s.data || s.url}`).join('\n')}

Return ONLY the JSON array of objects, with keys "title" and "summary". Do not add any other text or commentary.`,
    output: { format: 'json' }
  });
  return output as any;
});

// Flow 2: Design the prompt for the image model
const designInfographicPromptFlow = ai.defineFlow({
    name: 'designInfographicPromptFlow',
    inputSchema: z.object({
        topic: z.string(),
        keyPoints: z.array(z.object({ title: z.string(), summary: z.string() }))
    }),
    outputSchema: z.object({ imagePrompt: z.string() }),
}, async ({ topic, keyPoints }) => {
    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-pro', // Using the more powerful model for better prompt design
        prompt: `Create a professional infographic about "${topic}". The infographic must be visually appealing, clean, and modern.

    **CRITICAL REQUIREMENTS:**
    1.  **Legible Text:** All text MUST be perfectly horizontal, clear, and easy to read. Do not use distorted, rotated, or unreadable text.
    2.  **Grid Layout:** Use a structured grid-based layout with clear sections for each key point.
    3.  **Title:** The main title "${topic}" should be prominent at the top.
    4.  **Visuals:** Use clean icons and simple graphics to represent each point. Avoid overly complex imagery.
    5.  **Color Scheme:** Use a professional color palette with 2-3 primary colors (e.g., shades of blue and a single accent color like orange or green). High contrast is essential.
    6.  **Footer:** Include the text "Prepezia" in a small, clean font at the bottom.

    **CONTENT TO VISUALIZE:**
    ${keyPoints.map((p, i) => `${i + 1}. **${p.title}:** ${p.summary}`).join('\n')}

    Generate a high-quality, professional infographic image that effectively visualizes these points.`,
        output: { schema: z.object({ imagePrompt: z.string() }) },
    });
    return output!;
});

// Flow 3: Generate the actual image, with retries and fallback
const generateImageWithFallbackFlow = ai.defineFlow({
    name: 'generateImageWithFallbackFlow',
    inputSchema: z.object({
        imagePrompt: z.string(),
    }),
    outputSchema: z.object({ imageUrl: z.string().optional() }),
}, async ({ imagePrompt }) => {
    try {
        const { media } = await ai.generate({
            model: 'googleai/imagen-4.0-fast-generate-001',
            prompt: imagePrompt,
        });
        return { imageUrl: media?.url };
    } catch (error) {
        console.error("Primary image generation failed:", error);
        // Fallback is now handled on the client side
        return { imageUrl: undefined };
    }
});


// Main flow that orchestrates the steps
export const generateInfographic = ai.defineFlow({
    name: 'generateInfographic',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
}, async (input) => {
    const logs = ['Starting infographic generation...'];
    
    // Step 1: Extract key points
    logs.push('Step 1: Extracting key points from content...');
    const keyPoints = await extractKeyPointsFlow(input);
    logs.push(`-> Success: Extracted ${keyPoints.length} key points.`);

    // Step 2: Design the image generation prompt
    logs.push('Step 2: Designing a detailed prompt for the image model...');
    const { imagePrompt } = await designInfographicPromptFlow({
        topic: input.topic || 'Key Insights',
        keyPoints,
    });
    logs.push('-> Success: Image prompt designed.');
    
    // Step 3: Attempt to generate the image
    logs.push('Step 3: Generating infographic image...');
    const { imageUrl } = await generateImageWithFallbackFlow({ imagePrompt });
    
    if (imageUrl) {
        logs.push('-> Success: Image generated.');
        return { imageUrl, prompt: imagePrompt, keyPoints, logs };
    }

    // Step 4: If image fails, create fallback HTML
    logs.push('-> Image generation failed. Generating fallback HTML design.');
    const fallbackHtml = generateFallbackHtml(keyPoints, input.topic || 'Key Insights');
    logs.push('-> Success: Fallback HTML generated.');
    return { fallbackHtml, prompt: imagePrompt, keyPoints, logs };
});

// Helper function to generate a fallback HTML string
function generateFallbackHtml(keyPoints: { title: string; summary: string }[], topic: string): string {
  const content = `
    <div style="width: 800px; height: 600px; background-color: white; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; display: flex; flex-direction: column;">
      <h1 style="font-size: 36px; font-weight: 700; color: #111; text-align: center; margin-bottom: 30px;">${topic}</h1>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex-grow: 1;">
        ${keyPoints.map((point) => `
          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 18px; font-weight: 600; color: #005A9C; margin: 0 0 8px 0;">${point.title}</h2>
            <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.5;">${point.summary}</p>
          </div>
        `).join('')}
      </div>
      <p style="text-align: center; font-size: 14px; color: #94a3b8; margin-top: 30px;">Prepezia</p>
    </div>
  `;
  return content;
}
