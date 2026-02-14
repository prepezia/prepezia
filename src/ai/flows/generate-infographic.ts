
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
    model: 'googleai/gemini-1.5-flash-latest',
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
    model: 'googleai/gemini-1.5-flash-latest',
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
    prompt: `You are an expert infographic designer. Create a detailed prompt for Imagen 3 to generate a professional infographic.

### CONTEXT:
- Style: {{style}} ({{style}} style with appropriate visuals)
- Color Scheme: {{#if colorScheme}}{{colorScheme}}{{else}}professionally coordinated palette{{/if}} (use these colors)
- Academic Level: {{academicLevel}} (adjust complexity accordingly)

### KEY POINTS TO VISUALIZE:
{{#each keyPoints}}
Point {{@index}}: "{{this.title}}" - {{this.summary}}
{{/each}}

### IMPERATIVE INSTRUCTIONS FOR YOUR PROMPT:
1. **Layout**: Create a clean {{keyPoints.length}}-point grid layout (2x3 or 2x2 as appropriate) with a clear main title at the top
2. **Main Title**: "{{#if topic}}{{topic}}{{else}}Key Insights{{/if}}" prominently displayed
3. **Text**: For each point, include both the title and summary text
4. **Icons**: Simple, professional icons representing each point
5. **Readability**: ALL TEXT MUST BE PERFECTLY HORIZONTAL, CLEAR, AND LEGIBLE. Use sans-serif fonts.
6. **Branding**: Include small "Learn with Temi" in bottom-left corner (subtle)

### SPECIFICATIONS:
- Format: Digital infographic, high resolution
- Colors: {{#if colorScheme}}{{colorScheme}}{{else}}professionally coordinated palette{{/if}}
- Style: Clean, modern, {{style}} aesthetic
- Text prominence: Text blocks should be clearly separated from visuals

Generate a single, detailed prompt for Imagen now.`,
});

const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async (input) => {
    // Step 1: Extract key points from the content
    let keyPoints = [];
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
    const imagenPrompt = `${imagePrompt}

IMPORTANT: All text must be horizontal, clear, and perfectly readable. Use clean sans-serif fonts.`;

    try {
        // Correct way to call Imagen with Genkit
        const { media } = await ai.generate({
            model: 'googleai/imagen-3.0-generate-001', // Updated to latest version
            prompt: imagenPrompt,
            config: {
                // Imagen-specific configurations
                safetyFilterLevel: 'BLOCK_MEDIUM_AND_ABOVE',
                personGeneration: 'ALLOW_ADULT',
                aspectRatio: '1:1', // or '16:9', '3:4', '9:16', '4:3'
                sampleCount: 1,
                // Add negative prompts to avoid common issues
                negativePrompt: "blurry text, distorted text, unreadable text, text not horizontal, cluttered layout, messy design, low quality, bad typography"
            }
        });

        if (!media?.url) {
            throw new Error('No image URL returned from Imagen');
        }

        return {
            imageUrl: media.url,
            prompt: imagenPrompt,
            keyPoints: keyPoints
        };
    } catch (imageError) {
        console.error('Imagen generation failed:', imageError);

        // Fallback: Generate a data URI representation using canvas or return error
        // You could implement a fallback here using a different approach
        throw new Error(`Image generation failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`);
    }
});

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}
