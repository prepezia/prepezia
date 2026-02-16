'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  if (!output || !Array.isArray(output)) {
    throw new Error("The AI model failed to extract key points in the expected format.");
  }
  return output as any;
});


// Main flow that orchestrates the steps
export const generateInfographic = ai.defineFlow({
    name: 'generateInfographic',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
}, async (input) => {
    // Step 1: Extract key points
    const keyPoints = await extractKeyPointsFlow(input);

    // Step 2: Generate an icon for each key point in parallel
    const keyPointsWithIcons = await Promise.all(
        keyPoints.map(async (point) => {
            try {
                const { media } = await ai.generate({
                    model: 'googleai/imagen-4.0-fast-generate-001',
                    prompt: `A simple, minimalist, flat, 2D vector-style icon representing the concept: "${point.title}". The icon should have a transparent background, suitable for placing on a white infographic.`,
                });

                if (!media || !media.url) {
                    return { ...point, iconDataUrl: null };
                }
                return { ...point, iconDataUrl: media.url };
            } catch (e) {
                console.error(`Failed to generate icon for "${point.title}":`, e);
                return { ...point, iconDataUrl: null };
            }
        })
    );

    // Step 3: Generate HTML design from the key points and icons
    const fallbackHtml = generateInfographicHtml(keyPointsWithIcons, input.topic || 'Key Insights');

    // The client will handle the rendering to an image and the upload.
    return { fallbackHtml };
});

// Helper function to generate a well-styled HTML string
function generateInfographicHtml(keyPoints: { title: string; summary: string; iconDataUrl: string | null }[], topic: string): string {
    const content = `
      <div style="width: 800px; padding: 40px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border: 1px solid #e2e8f0; display: flex; flex-direction: column;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #E53E3E; margin-bottom: 30px;">
            <h1 style="font-size: 38px; font-weight: 800; color: #1a202c; margin: 0;">${topic}</h1>
        </div>
        <div style="display: flex; flex-direction: column; gap: 30px; flex-grow: 1;">
          ${keyPoints.map((point) => `
            <div style="display: flex; flex-direction: row; align-items: flex-start; gap: 20px;">
              ${point.iconDataUrl ? `
                <div style="width: 60px; height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <img src="${point.iconDataUrl}" alt="${point.title} icon" style="width: 40px; height: 40px; object-fit: contain;" />
                </div>
              ` : `
                <div style="width: 60px; height: 60px; flex-shrink: 0;"></div>
              `}
              <div style="flex-grow: 1;">
                <h2 style="font-size: 20px; font-weight: 700; color: #2d3748; margin: 0 0 8px 0;">${point.title}</h2>
                <p style="font-size: 15px; color: #4a5568; margin: 0; line-height: 1.6;">${point.summary}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <p style="text-align: center; font-size: 14px; color: #a0aec0; margin-top: 40px; font-weight: 600; padding-top: 20px; border-top: 1px solid #e2e8f0;">Prepezia</p>
      </div>
    `;
    return content;
}
