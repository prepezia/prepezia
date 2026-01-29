
'use server';
/**
 * @fileOverview A flow to generate an infographic from content.
 * - generateInfographic - A function that handles infographic generation.
 * - GenerateInfographicInput - The input type.
 * - GenerateInfographicOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;


const GenerateInfographicOutputSchema = z.object({
  imageUrl: z.string().url().describe("The data URI of the generated infographic image."),
  prompt: z.string().describe("The prompt that was used to generate the image."),
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

const infographicSummaryPrompt = ai.definePrompt({
    name: 'infographicSummaryPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: { schema: z.object({ summary: z.string().describe("A concise summary of the key points, formatted as a list of 5-7 very short, actionable phrases or keywords suitable for an infographic.") }) },
    prompt: `You are an expert at distilling complex information into key points for an infographic. Based on the source content below, extract the 5 to 7 most important facts, concepts, or data points. Present them as a bulleted list of short phrases.

### SOURCE CONTENT:
\`\`\`
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}
\`\`\`
`,
});


const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
  },
  async input => {
    // 1. Summarize content into key points for the infographic
    const { output: summaryOutput } = await infographicSummaryPrompt(input);
    if (!summaryOutput) {
        throw new Error("Failed to summarize content for infographic.");
    }

    const topic = input.topic || "the provided content";

    // 2. Create a detailed prompt for the image generation model
    const imagePrompt = `An ultra-high-quality, professional infographic with a **clean white background**. The style must be modern, minimalist, and use a flat design aesthetic.

The infographic is about: **"${topic}"**.

The infographic must visually represent the following key points using clear icons, simple charts, and diagrams. **Do NOT write full sentences on the image. Use minimal, legible keywords only if absolutely necessary.**

Key Points to Visualize:
${summaryOutput.summary}

Color Palette: Use a professional color scheme with the white background. Use deep blue (#3F51B5) and purple (#9C27B0) as accent colors. Text should be dark gray.

Branding: Place a small, discreet 'Learn with Temi' text mark in the bottom-left corner.

The overall layout must be balanced, uncluttered, and easy to follow.`;
    
    // 3. Generate the image
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imagePrompt,
    });

    if (!media?.url) {
        throw new Error('Image generation failed to return an image.');
    }

    return {
        imageUrl: media.url,
        prompt: imagePrompt,
    };
  }
);

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}
