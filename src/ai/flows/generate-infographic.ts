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
  })).optional().describe("The extracted key points for reference")
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

// First, extract key points from content
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
    model: 'googleai/gemini-2.5-flash',
    prompt: `Extract ${input.maxPoints} key points from the following content. For each point, provide a short title (2-4 words) and a one-sentence summary (10-15 words). Format as JSON with keys "title" and "summary".

Academic Level: ${input.academicLevel || 'general'}

Content:
${input.content || input.sources?.map(s => `${s.name}: ${s.data || s.url}`).join('\n')}

Return ONLY the JSON array, no other text.`,
    output: { format: 'json' }
  });

  return output;
});

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
            imagePrompt: z.string().describe("A highly detailed, descriptive prompt for Imagen to create a professional infographic.")
        })
    },
    prompt: `You are an expert infographic designer. Create a detailed prompt for an image generation model to generate a professional infographic.

### CONTEXT:
- Style: {{style}}
- Color Scheme: {{#if colorScheme}}{{colorScheme}}{{else}}A professionally coordinated and aesthetically pleasing color palette{{/if}}
- Academic Level: {{academicLevel}}

### KEY POINTS TO VISUALIZE:
{{#each keyPoints}}
- Point {{@index}}: "{{this.title}}" - {{this.summary}}
{{/each}}

### IMPERATIVE INSTRUCTIONS FOR YOUR PROMPT:
1.  **Layout**: Create a clean, professional, visually balanced infographic layout. It should feature a prominent main title and clearly separated sections for each key point. Use a grid or a logical flow (e.g., top-to-bottom, circular).
2.  **Main Title**: The main title should be "{{#if topic}}{{topic}}{{else}}Key Insights{{/if}}". It must be large, prominent, and perfectly legible.
3.  **Text**: For each point, include both the title and the summary text. ALL TEXT MUST BE PERFECTLY HORIZONTAL, CLEAR, AND LEGIBLE. Use a clean, modern sans-serif font.
4.  **Icons/Visuals**: For each key point, describe a simple, professional, and relevant icon or visual metaphor that represents the concept. The visuals should be high-quality vector art.
5.  **Branding**: Include the text "Prepezia" in the bottom-left corner, small and subtle.
6.  **Overall Style**: The overall aesthetic should be modern, clean, and uncluttered. High resolution, digital art.

Generate a single, detailed, and descriptive prompt for an image generation model now.`,
});

const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async (input) => {
    // Step 1: Extract key points from the content
    let keyPoints: {title: string, summary: string}[] = [];
    try {
        const extractedPoints = await extractKeyPointsFlow({
            content: input.content,
            sources: input.sources,
            maxPoints: input.maxPoints || 5,
            academicLevel: input.academicLevel
        });
        keyPoints = extractedPoints || [];
    } catch (error) {
        console.error('Key point extraction failed:', error);
        // Fallback: create basic points from content
        keyPoints = [
            { title: "Main Concept", summary: input.content?.substring(0, 100) || "Key information presented" },
            { title: "Important Detail", summary: "Secondary information and context" }
        ];
    }

    // Step 2: Generate the detailed prompt for Imagen
    const promptResult = await designInfographicPrompt({
        ...input,
        keyPoints
    });

    const imagePrompt = promptResult.output?.imagePrompt;
    if (!imagePrompt) {
        throw new Error("Failed to generate image prompt");
    }

    // Step 3: Generate image using Imagen correctly
    const enhancedPrompt = `${imagePrompt}

IMPORTANT: All text must be horizontal, clear, and perfectly readable. Use clean sans-serif fonts.`;

    try {
        // Try different model names that might work
        const modelOptions = [
            'googleai/imagen-3.0-generate-001',  // Try imagen-3 first
            'googleai/imagen-3.0-fast-generate-001',
            'googleai/imagen-2.0-generate-001',
            'googleai/imagen-4.0-fast-generate-001'  // Your original
        ];

        let lastError: any = null;
        
        for (const modelName of modelOptions) {
            try {
                console.log(`Attempting with model: ${modelName}`);
                
                const result: any = await ai.generate({
                    model: modelName as any,
                    prompt: enhancedPrompt,
                    config: {
                        safetyFilterLevel: 'BLOCK_ONLY_HIGH',
                        personGeneration: 'ALLOW_ADULT',
                        aspectRatio: '1:1',
                        sampleCount: 1,
                    }
                });

                // Check different possible response structures
                if (result) {
                    // Try to extract the image URL/data from the response
                    let imageData: string | null = null;
                    
                    // Check for media property
                    if (result.media?.url) {
                        imageData = result.media.url;
                    } 
                    // Check for direct URL in output
                    else if (result.output?.url) {
                        imageData = result.output.url;
                    }
                    // Check for base64 data
                    else if (result.output?.imageData) {
                        imageData = result.output.imageData;
                    }
                    // Check if result itself is a string (data URL)
                    else if (typeof result === 'string' && result.startsWith('data:image')) {
                        imageData = result;
                    }
                    // Check for message with media
                    else if (result.message?.media?.url) {
                        imageData = result.message.media.url;
                    }

                    if (imageData) {
                        return {
                            imageUrl: imageData,
                            prompt: enhancedPrompt,
                            keyPoints: keyPoints
                        };
                    }
                }
                
                console.log(`Model ${modelName} didn't return expected format:`, result);
                lastError = new Error('Unexpected response format');
                
            } catch (modelError) {
                console.log(`Model ${modelName} failed:`, modelError);
                lastError = modelError;
                // Continue to next model
            }
        }

        throw lastError || new Error('All Imagen models failed');

    } catch (imageError) {
        console.error('Imagen generation failed:', imageError);
        
        // Enhanced fallback: Generate a data URI representation
        // This creates a simple SVG infographic as fallback
        try {
            const fallbackImageUrl = await generateFallbackInfographic(keyPoints, input.topic || 'Key Insights');
            return {
                imageUrl: fallbackImageUrl,
                prompt: enhancedPrompt,
                keyPoints: keyPoints
            };
        } catch (fallbackError) {
            throw new Error(`Image generation failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`);
        }
    }
});

// Add a fallback SVG generator
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
    
    // Convert SVG to data URL
    const encodedSvg = encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29');
    return `data:image/svg+xml,${encodedSvg}`;
}

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}
