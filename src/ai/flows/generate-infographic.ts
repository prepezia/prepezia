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

// This is a simplified summary prompt. The full content might be too large.
// Let's first generate a summary, then generate an infographic from the summary.
const infographicSummaryPrompt = ai.definePrompt({
    name: 'infographicSummaryPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: { schema: z.object({ summary: z.string().describe("A concise summary of the key points, formatted as a list of 5-7 bullet points. Each point should be a short phrase or sentence suitable for an infographic.") }) },
    prompt: `You are an expert at distilling complex information into key points for an infographic. Based on the source content below, extract the 5 to 7 most important facts, concepts, or data points. Present them as a bulleted list.

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
    const imagePrompt = `A visually appealing, professional infographic about "${topic}". The style should be modern, clean, and educational, using a color palette of deep blue, purple, and light gray. The infographic must visually represent these key points:
${summaryOutput.summary}

Use clear icons, charts, and diagrams to illustrate each point. The text should be legible and minimal. The overall layout should be balanced and easy to follow.`;
    
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
