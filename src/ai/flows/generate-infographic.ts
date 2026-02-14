
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
  colorScheme: z.string().optional().describe("Preferred color scheme (e.g., 'blue tones', 'warm colors')"),
  maxPoints: z.number().min(3).max(8).optional().default(5).describe("Number of key points to include"),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;

const GenerateInfographicOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated infographic image."),
  prompt: z.string().describe("The prompt used to generate the image for debugging purposes."),
  keyPoints: z.array(z.object({
    title: z.string(),
    summary: z.string()
  })).optional().describe("The extracted key points for reference"),
  logs: z.array(z.string()).optional().describe("Debugging logs from the generation process.")
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

// Flow 1: Extract key points from content
export const extractKeyPointsFlow = ai.defineFlow({
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
    model: 'googleai/gemini-2.5-flash',
    prompt: `Extract ${input.maxPoints} key points from the following content. For each point, provide a short title (2-4 words) and a one-sentence summary (10-15 words). Format as JSON with keys "title" and "summary".

Academic Level: ${input.academicLevel || 'general'}

Content:
${input.content || input.sources?.map(s => `${s.name}: ${s.data || s.url}`).join('\n')}

Return ONLY the JSON array, no other text.`,
    output: { format: 'json' }
  });

  return output as any;
});

// Private prompt for designing the image generation prompt
const designInfographicPrompt = ai.definePrompt({
    name: 'designInfographicPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {
      schema: GenerateInfographicInputSchema.extend({
        keyPoints: z.array(z.object({
          title: z.string(),
          summary: z.string()
        }))
      })
    },
    output: {
        schema: z.object({
            imagePrompt: z.string().describe("A highly detailed, descriptive prompt for an image generation model to create a professional infographic.")
        })
    },
    prompt: `Create a professional infographic with the following specifications:
- Style: {{style}}, clean, modern, educational
- Colors: {{#if colorScheme}}{{colorScheme}}{{else}}Professional blue tones with accent colors{{/if}}
- Text: All text must be perfectly horizontal and legible
- Layout: Grid-based with clear sections for each point
- Title: "{{#if topic}}{{topic}}{{else}}Key Insights{{/if}}" at the top
- Footer: Include "Prepezia" at the bottom

Content to visualize:
{{#each keyPoints}}
{{@index_1}}. {{this.title}}: {{this.summary}}
{{/each}}

Generate a high-quality infographic image.`,
});

// Flow 2: Design the prompt for the image model
export const designInfographicFlow = ai.defineFlow({
    name: 'designInfographicFlow',
    inputSchema: GenerateInfographicInputSchema.extend({
        keyPoints: z.array(z.object({
          title: z.string(),
          summary: z.string()
        }))
    }),
    outputSchema: z.object({
        imagePrompt: z.string()
    }),
}, async (input) => {
    const promptResult = await designInfographicPrompt(input);
    const imagePrompt = promptResult.output?.imagePrompt;
    if (!imagePrompt) {
        throw new Error("Failed to generate image prompt");
    }
    return { imagePrompt };
});


// Fallback SVG generator
async function generateFallbackInfographic(keyPoints: Array<{title: string, summary: string}>, topic: string): Promise<string> {
    const width = 800;
    const height = 800;
    const pointHeight = Math.floor((height - 200) / Math.max(keyPoints.length, 3));
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="white" />
        
        <!-- Title -->
        <text x="50" y="60" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#333">
            ${topic}
        </text>
        <line x1="50" y1="70" x2="750" y2="70" stroke="#0077be" stroke-width="2" />
        
        <!-- Key Points -->
        ${keyPoints.map((point, index) => {
            const y = 120 + (index * pointHeight);
            return `
                <g transform="translate(50, ${y})">
                    <circle cx="20" cy="20" r="15" fill="#0077be" />
                    <text x="45" y="25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#333">
                        ${point.title}
                    </text>
                    <text x="45" y="50" font-family="Arial, sans-serif" font-size="14" fill="#666">
                        ${point.summary.substring(0, 60)}${point.summary.length > 60 ? '...' : ''}
                    </text>
                    <line x1="0" y1="70" x2="700" y2="70" stroke="#eee" stroke-width="1" />
                </g>
            `;
        }).join('')}
        
        <!-- Footer -->
        <text x="50" y="${height - 30}" font-family="Arial, sans-serif" font-size="14" fill="#999">
            Prepezia
        </text>
    </svg>`;
    
    const encodedSvg = encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29');
    return `data:image/svg+xml,${encodedSvg}`;
}

// Flow 3: Generate the image, with retries and fallback
export const generateImageFlow = ai.defineFlow({
    name: 'generateImageFlow',
    inputSchema: z.object({
        imagePrompt: z.string(),
        keyPoints: z.array(z.object({ title: z.string(), summary: z.string() })),
        topic: z.string()
    }),
    outputSchema: z.object({
        imageUrl: z.string(),
        logs: z.array(z.string()),
    }),
}, async ({ imagePrompt, keyPoints, topic }) => {
    const logs: string[] = [];

    const modelOptions = [
        'googleai/imagen-4.0-fast-generate-001',
    ];

    let lastError: any = null;
    
    for (const modelName of modelOptions) {
        try {
            logs.push(`-> Attempting with model: ${modelName}`);
            
            const result: any = await ai.generate({
                model: modelName as any,
                prompt: imagePrompt,
            });

            if (result) {
                let imageData: string | null = null;
                if (result.media?.url) imageData = result.media.url; 
                else if (result.output?.url) imageData = result.output.url;
                else if (result.output?.imageData) imageData = result.output.imageData;
                else if (typeof result === 'string' && result.startsWith('data:image')) imageData = result;
                else if (result.message?.media?.url) imageData = result.message.media.url;

                if (imageData) {
                    logs.push(`-> Success: Image generated with ${modelName}.`);
                    return { imageUrl: imageData, logs };
                }
            }
            
            logs.push(`-> Warning: Model ${modelName} returned an unexpected format.`);
            lastError = new Error('Unexpected response format');
            
        } catch (modelError) {
            logs.push(`-> Error with ${modelName}: ${modelError}`);
            lastError = modelError;
        }
    }

    try {
        logs.push("-> All image models failed. Attempting to generate a fallback SVG image.");
        const fallbackImageUrl = await generateFallbackInfographic(keyPoints, topic);
        logs.push("-> Success: Fallback SVG generated.");
        return {
            imageUrl: fallbackImageUrl,
            logs: logs,
        };
    } catch (fallbackError) {
        logs.push(`-> Critical Error: Fallback SVG generation also failed. ${fallbackError}`);
        throw lastError || new Error(`Image generation and fallback both failed`);
    }
});
